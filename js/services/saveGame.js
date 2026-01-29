/**
 * Stonefire - Save Game Service
 * Single-slot save/load with Supabase sync
 */

import { getClient, isOnline } from './supabase.js';
import { getCurrentUser } from './auth.js';
import { store, events } from '../game/state.js';

const LOCAL_SAVE_KEY = 'stonefire.saveGame';

/**
 * Save current game state
 */
export function saveGame() {
    const state = store.getState();
    if (state.gameOver) return; // Don't save finished games

    const saveData = {
        gameState: state,
        savedAt: Date.now()
    };

    // Save locally
    try {
        localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(saveData));
    } catch {
        console.warn('Failed to save game locally');
        return;
    }

    // Sync to Supabase
    syncSave(saveData);
}

/**
 * Load saved game
 * Returns game state or null
 */
export function loadLocalSave() {
    try {
        const data = JSON.parse(localStorage.getItem(LOCAL_SAVE_KEY) || 'null');
        return data;
    } catch {
        return null;
    }
}

/**
 * Delete saved game
 */
export async function deleteSave() {
    try {
        localStorage.removeItem(LOCAL_SAVE_KEY);
    } catch {
        // ignore
    }

    const client = getClient();
    const user = getCurrentUser();
    if (client && user) {
        try {
            await client.from('save_games').delete().eq('user_id', user.id);
        } catch {
            // ignore
        }
    }
}

/**
 * Check if a save exists
 */
export function hasSavedGame() {
    return loadLocalSave() !== null;
}

/**
 * Sync save to Supabase
 */
async function syncSave(saveData) {
    const client = getClient();
    const user = getCurrentUser();
    if (!client || !user || !isOnline()) return;

    try {
        // Upsert save (requires unique constraint on user_id in Supabase)
        await client.from('save_games').upsert({
            user_id: user.id,
            game_state: saveData.gameState,
            saved_at: new Date(saveData.savedAt).toISOString()
        }, { onConflict: 'user_id' });
    } catch (e) {
        console.warn('Failed to sync save:', e);
    }
}

/**
 * Fetch remote save (for cross-device continue)
 */
export async function fetchRemoteSave() {
    const client = getClient();
    const user = getCurrentUser();
    if (!client || !user) return null;

    try {
        const { data, error } = await client
            .from('save_games')
            .select('*')
            .eq('user_id', user.id)
            .order('saved_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) return null;

        const localSave = loadLocalSave();
        const remoteTime = new Date(data.saved_at).getTime();
        const localTime = localSave?.savedAt || 0;

        // Return whichever is newer
        if (remoteTime > localTime) {
            return {
                gameState: data.game_state,
                savedAt: remoteTime
            };
        }

        return localSave;
    } catch {
        return loadLocalSave();
    }
}

/**
 * Get the best available save (remote if logged in and newer, else local)
 */
export async function getBestSave() {
    const user = getCurrentUser();
    if (user && !user.is_anonymous) {
        // Try to get remote save for logged-in users
        return await fetchRemoteSave();
    }
    return loadLocalSave();
}

/**
 * Restore a saved game state
 * @param {object} saveData - Save data with gameState and savedAt
 * @returns {boolean} - True if restore succeeded
 */
export function restoreGame(saveData) {
    if (!saveData || !saveData.gameState) {
        console.warn('Invalid save data');
        return false;
    }

    try {
        // Restore the game state
        store.restoreState(saveData.gameState);

        // Emit event so UI can react
        events.emit('GAME_RESTORED', { savedAt: saveData.savedAt });

        return true;
    } catch (e) {
        console.error('Failed to restore game:', e);
        return false;
    }
}
