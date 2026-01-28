/**
 * Stonefire - Progress Tracking Service
 * Tracks game stats with Supabase sync
 */

import { getClient, isOnline } from './supabase.js';
import { getCurrentUser } from './auth.js';

const LOCAL_STATS_KEY = 'stonefire.stats';

const DEFAULT_STATS = {
    games_played: 0,
    wins: 0,
    losses: 0,
    current_streak: 0,
    best_streak: 0,
    faction_stats: {}
};

/**
 * Get local stats
 */
export function getStats() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_STATS_KEY) || 'null') || { ...DEFAULT_STATS };
    } catch {
        return { ...DEFAULT_STATS };
    }
}

function saveStats(stats) {
    try {
        localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(stats));
    } catch {
        // ignore
    }
}

/**
 * Record a game result
 * @param {'win'|'loss'} result
 * @param {string} playerFaction
 * @param {string} enemyFaction
 */
export async function recordGameResult(result, playerFaction, enemyFaction) {
    const stats = getStats();

    stats.games_played++;

    if (result === 'win') {
        stats.wins++;
        stats.current_streak++;
        if (stats.current_streak > stats.best_streak) {
            stats.best_streak = stats.current_streak;
        }
    } else {
        stats.losses++;
        stats.current_streak = 0;
    }

    // Per-faction stats
    if (!stats.faction_stats[playerFaction]) {
        stats.faction_stats[playerFaction] = { games: 0, wins: 0, losses: 0 };
    }
    stats.faction_stats[playerFaction].games++;
    stats.faction_stats[playerFaction][result === 'win' ? 'wins' : 'losses']++;

    saveStats(stats);
    await syncStats(stats);
}

/**
 * Sync stats to Supabase
 */
async function syncStats(stats) {
    const client = getClient();
    const user = getCurrentUser();
    if (!client || !user || !isOnline()) return;

    try {
        await client.from('progress').upsert({
            user_id: user.id,
            stats,
            updated_at: new Date().toISOString()
        });
    } catch (e) {
        console.warn('Failed to sync stats:', e);
    }
}

/**
 * Fetch remote stats and merge
 */
export async function fetchAndMergeStats() {
    const client = getClient();
    const user = getCurrentUser();
    if (!client || !user) return getStats();

    try {
        const { data, error } = await client
            .from('progress')
            .select('stats')
            .eq('user_id', user.id)
            .single();

        if (error || !data) return getStats();

        const local = getStats();
        const remote = data.stats || DEFAULT_STATS;

        // Merge: take the higher values (handles simultaneous play)
        const merged = {
            games_played: Math.max(local.games_played, remote.games_played),
            wins: Math.max(local.wins, remote.wins),
            losses: Math.max(local.losses, remote.losses),
            current_streak: Math.max(local.current_streak, remote.current_streak),
            best_streak: Math.max(local.best_streak, remote.best_streak),
            faction_stats: { ...remote.faction_stats }
        };

        // Merge per-faction stats
        for (const faction of Object.keys(local.faction_stats)) {
            if (!merged.faction_stats[faction]) {
                merged.faction_stats[faction] = local.faction_stats[faction];
            } else {
                merged.faction_stats[faction] = {
                    games: Math.max(local.faction_stats[faction].games, merged.faction_stats[faction].games),
                    wins: Math.max(local.faction_stats[faction].wins, merged.faction_stats[faction].wins),
                    losses: Math.max(local.faction_stats[faction].losses, merged.faction_stats[faction].losses)
                };
            }
        }

        saveStats(merged);
        return merged;
    } catch {
        return getStats();
    }
}
