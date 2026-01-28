/**
 * Stonefire - Profile Service
 * Manages user profile, preferences, and sync with Supabase
 */

import { getClient, isOnline } from './supabase.js';
import { getCurrentUser } from './auth.js';
import { queueSync } from './syncManager.js';

const LOCAL_PROFILE_KEY = 'stonefire.profile';

const DEFAULT_PREFERENCES = {
    playerName: '',
    factions: { player: null, enemy: null },
    fullscreen: false
};

/**
 * Get local profile
 */
export function getLocalProfile() {
    try {
        const stored = JSON.parse(localStorage.getItem(LOCAL_PROFILE_KEY) || 'null');
        return stored || { display_name: '', preferences: { ...DEFAULT_PREFERENCES } };
    } catch {
        return { display_name: '', preferences: { ...DEFAULT_PREFERENCES } };
    }
}

/**
 * Save profile locally
 */
function saveLocalProfile(profile) {
    try {
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
    } catch {
        // localStorage unavailable
    }
}

/**
 * Migrate old localStorage keys to unified profile
 * Call once on app startup
 */
export function migrateOldPreferences() {
    const profile = getLocalProfile();
    let migrated = false;

    try {
        const oldName = localStorage.getItem('stonefire.playerName');
        if (oldName && !profile.display_name) {
            profile.display_name = oldName;
            migrated = true;
        }

        const oldFactions = JSON.parse(localStorage.getItem('stonefire.factions') || 'null');
        if (oldFactions && !profile.preferences.factions.player) {
            profile.preferences.factions = oldFactions;
            migrated = true;
        }

        const oldFullscreen = localStorage.getItem('stonefire.fullscreen');
        if (oldFullscreen !== null) {
            profile.preferences.fullscreen = oldFullscreen === '1';
            migrated = true;
        }

        if (migrated) {
            saveLocalProfile(profile);
        }
    } catch {
        // Migration failed, no big deal
    }
}

/**
 * Update a preference and sync
 */
export async function updatePreference(key, value) {
    const profile = getLocalProfile();
    profile.preferences[key] = value;
    profile.updated_at = Date.now();
    saveLocalProfile(profile);

    // Sync to Supabase
    const user = getCurrentUser();
    if (user && isOnline()) {
        queueSync('profiles', 'upsert', {
            id: user.id,
            preferences: profile.preferences,
            updated_at: new Date().toISOString()
        });
    }
}

/**
 * Update display name and sync
 */
export async function updateDisplayName(name) {
    const profile = getLocalProfile();
    profile.display_name = name;
    profile.updated_at = Date.now();
    saveLocalProfile(profile);

    const user = getCurrentUser();
    if (user && isOnline()) {
        queueSync('profiles', 'upsert', {
            id: user.id,
            display_name: name,
            updated_at: new Date().toISOString()
        });
    }
}

/**
 * Fetch remote profile and merge with local
 */
export async function fetchAndMergeProfile() {
    const client = getClient();
    const user = getCurrentUser();
    if (!client || !user) return getLocalProfile();

    try {
        const { data, error } = await client
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error || !data) return getLocalProfile();

        const local = getLocalProfile();
        const localTime = local.updated_at || 0;
        const remoteTime = new Date(data.updated_at).getTime();

        // Remote is newer - use remote
        if (remoteTime > localTime) {
            const merged = {
                display_name: data.display_name || local.display_name,
                preferences: { ...DEFAULT_PREFERENCES, ...data.preferences },
                updated_at: remoteTime
            };
            saveLocalProfile(merged);
            return merged;
        }

        return local;
    } catch {
        return getLocalProfile();
    }
}
