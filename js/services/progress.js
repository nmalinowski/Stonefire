/**
 * Stonefire - Progress Tracking Service
 * Tracks game stats with Supabase sync
 */

import { getClient, isOnline } from './supabase.js';
import { getCurrentUser } from './auth.js';
import { store, ActionTypes, events } from '../game/state.js';

const LOCAL_STATS_KEY = 'stonefire.stats';

const DEFAULT_STATS = {
    games_played: 0,
    wins: 0,
    losses: 0,
    current_streak: 0,
    best_streak: 0,
    faction_stats: {},
    enemy_faction_stats: {},
    achievement_stats: {}
};

const DEFAULT_ACHIEVEMENT_STATS = {
    total_spells_cast: 0,
    total_creatures_summoned: 0,
    total_attacks: 0,
    total_damage_to_hero: 0,
    total_damage_to_creatures: 0,
    total_creatures_killed: 0,
    turns_played: 0,
    total_healing: 0,
    total_cards_played: 0,
    total_relics_played: 0,
    total_player_creatures_lost: 0,
    full_board_turns: 0,
    enemy_board_clears: 0,
    enemy_board_clears_single_spell: 0,
    enemy_board_clears_single_attack: 0,
    enemy_board_clears_single_effect: 0,
    wins_without_creature_loss: 0,
    wins_with_full_board: 0,
    wins_low_health: 0,
    max_damage_in_turn: 0,
    max_heal_in_turn: 0
};

const FACTION_NAMES = {
    triassic: 'Triassic',
    jurassic: 'Jurassic',
    cretaceous: 'Cretaceous',
    primordial: 'Primordial',
    iceage: 'Ice Age'
};

const FACTION_ID_MAP = {
    TRIASSIC: 'triassic',
    JURASSIC: 'jurassic',
    CRETACEOUS: 'cretaceous',
    PRIMORDIAL: 'primordial',
    ICE_AGE: 'iceage',
    NEUTRAL: 'neutral'
};

const MAX_BOARD_SIZE = 7;
const LOW_HEALTH_THRESHOLD = 5;

const buildCounterAchievements = (options) => options.values.map((value) => ({
    id: `${options.idPrefix}_${value}`,
    name: `${options.namePrefix} ${value}`,
    description: options.description(value),
    difficulty: options.difficulty(value),
    isUnlocked: (stats) => options.getValue(stats) >= value
}));

const buildFactionWinAchievements = (values) => Object.entries(FACTION_NAMES).flatMap(([factionId, factionName]) => (
    values.map((value) => ({
        id: `faction_${factionId}_wins_${value}`,
        name: `${factionName} Victories ${value}`,
        description: `Win ${value} matches as ${factionName}.`,
        difficulty: 35 + value * 3,
        isUnlocked: (stats) => (stats.faction_stats?.[factionId]?.wins || 0) >= value
    }))
));

const ACHIEVEMENTS = [
    ...buildCounterAchievements({
        idPrefix: 'games_played',
        namePrefix: 'Matches Played',
        description: (value) => `Play ${value} total matches.`,
        values: [1, 5, 10, 25, 50, 100, 200, 500, 1000],
        getValue: (stats) => stats.games_played,
        difficulty: (value) => value
    }),
    ...buildCounterAchievements({
        idPrefix: 'wins',
        namePrefix: 'Total Wins',
        description: (value) => `Win ${value} total matches.`,
        values: [1, 5, 10, 25, 50, 100, 200, 500],
        getValue: (stats) => stats.wins,
        difficulty: (value) => value * 1.2
    }),
    ...buildCounterAchievements({
        idPrefix: 'losses',
        namePrefix: 'Lessons Learned',
        description: (value) => `Finish ${value} matches (losses counted).`,
        values: [1, 5, 10, 25, 50, 100, 200],
        getValue: (stats) => stats.losses,
        difficulty: (value) => value * 0.9
    }),
    ...buildCounterAchievements({
        idPrefix: 'streak',
        namePrefix: 'Win Streak',
        description: (value) => `Reach a ${value}-win streak.`,
        values: [2, 3, 5, 7, 10, 15, 25],
        getValue: (stats) => stats.best_streak,
        difficulty: (value) => 20 + value * 8
    }),
    ...buildCounterAchievements({
        idPrefix: 'creatures_summoned',
        namePrefix: 'Herd Builder',
        description: (value) => `Summon ${value} creatures.`,
        values: [5, 10, 25, 50, 100, 200, 400, 800],
        getValue: (stats) => stats.achievement_stats.total_creatures_summoned,
        difficulty: (value) => value * 0.6
    }),
    ...buildCounterAchievements({
        idPrefix: 'spells_cast',
        namePrefix: 'Spellweaver',
        description: (value) => `Cast ${value} spells.`,
        values: [5, 10, 25, 50, 100, 200, 400],
        getValue: (stats) => stats.achievement_stats.total_spells_cast,
        difficulty: (value) => value * 0.8
    }),
    ...buildCounterAchievements({
        idPrefix: 'attacks',
        namePrefix: 'Predator Strikes',
        description: (value) => `Declare ${value} attacks.`,
        values: [10, 50, 100, 250, 500, 1000, 2000],
        getValue: (stats) => stats.achievement_stats.total_attacks,
        difficulty: (value) => value * 0.5
    }),
    ...buildCounterAchievements({
        idPrefix: 'damage_hero',
        namePrefix: 'Hero Slayer',
        description: (value) => `Deal ${value} total damage to enemy heroes.`,
        values: [30, 100, 250, 500, 1000, 2000],
        getValue: (stats) => stats.achievement_stats.total_damage_to_hero,
        difficulty: (value) => value * 0.7
    }),
    ...buildCounterAchievements({
        idPrefix: 'damage_creatures',
        namePrefix: 'Bone Crusher',
        description: (value) => `Deal ${value} total damage to enemy creatures.`,
        values: [50, 150, 300, 600, 1200, 2400],
        getValue: (stats) => stats.achievement_stats.total_damage_to_creatures,
        difficulty: (value) => value * 0.65
    }),
    ...buildCounterAchievements({
        idPrefix: 'creature_kills',
        namePrefix: 'Apex Hunter',
        description: (value) => `Destroy ${value} enemy creatures.`,
        values: [10, 25, 50, 100, 200, 400, 800],
        getValue: (stats) => stats.achievement_stats.total_creatures_killed,
        difficulty: (value) => value * 0.85
    }),
    ...buildCounterAchievements({
        idPrefix: 'turns_played',
        namePrefix: 'Long Game',
        description: (value) => `Play ${value} turns.`,
        values: [5, 25, 50, 100, 250, 500],
        getValue: (stats) => stats.achievement_stats.turns_played,
        difficulty: (value) => value * 0.6
    }),
    ...buildCounterAchievements({
        idPrefix: 'healing',
        namePrefix: 'Survivor',
        description: (value) => `Restore ${value} total health.`,
        values: [50, 150, 300, 600, 1200],
        getValue: (stats) => stats.achievement_stats.total_healing,
        difficulty: (value) => value * 0.7
    }),
    ...buildCounterAchievements({
        idPrefix: 'cards_played',
        namePrefix: 'Card Slinger',
        description: (value) => `Play ${value} total cards.`,
        values: [10, 50, 100, 250, 500, 1000],
        getValue: (stats) => stats.achievement_stats.total_cards_played,
        difficulty: (value) => value * 0.55
    }),
    ...buildCounterAchievements({
        idPrefix: 'relics_played',
        namePrefix: 'Relic Keeper',
        description: (value) => `Play ${value} relics.`,
        values: [1, 5, 10, 25],
        getValue: (stats) => stats.achievement_stats.total_relics_played,
        difficulty: (value) => 15 + value * 6
    }),
    ...buildCounterAchievements({
        idPrefix: 'full_board_turns',
        namePrefix: 'Full Stampede',
        description: (value) => `Fill all ${MAX_BOARD_SIZE} slots in a single turn ${value} times.`,
        values: [1, 5, 10, 25],
        getValue: (stats) => stats.achievement_stats.full_board_turns,
        difficulty: (value) => 60 + value * 12
    }),
    ...buildCounterAchievements({
        idPrefix: 'board_clears_turn',
        namePrefix: 'Field Cleaner',
        description: (value) => `Clear the enemy board in a single turn ${value} times.`,
        values: [1, 5, 10, 25],
        getValue: (stats) => stats.achievement_stats.enemy_board_clears,
        difficulty: (value) => 70 + value * 12
    }),
    ...buildCounterAchievements({
        idPrefix: 'board_clear_spell',
        namePrefix: 'Cataclysmic Spell',
        description: (value) => `Clear the enemy board with one spell ${value} times.`,
        values: [1, 3, 5, 10],
        getValue: (stats) => stats.achievement_stats.enemy_board_clears_single_spell,
        difficulty: (value) => 85 + value * 14
    }),
    ...buildCounterAchievements({
        idPrefix: 'board_clear_attack',
        namePrefix: 'One-Strike Wipe',
        description: (value) => `Clear the enemy board with a single attack ${value} times.`,
        values: [1, 3, 5, 10],
        getValue: (stats) => stats.achievement_stats.enemy_board_clears_single_attack,
        difficulty: (value) => 90 + value * 16
    }),
    ...buildCounterAchievements({
        idPrefix: 'board_clear_effect',
        namePrefix: 'Devastating Effect',
        description: (value) => `Clear the enemy board with one effect ${value} times.`,
        values: [1, 3, 5, 10],
        getValue: (stats) => stats.achievement_stats.enemy_board_clears_single_effect,
        difficulty: (value) => 88 + value * 15
    }),
    ...buildCounterAchievements({
        idPrefix: 'wins_no_loss',
        namePrefix: 'Unscathed',
        description: (value) => `Win ${value} matches without losing a creature.`,
        values: [1, 3, 5, 10],
        getValue: (stats) => stats.achievement_stats.wins_without_creature_loss,
        difficulty: (value) => 75 + value * 15
    }),
    ...buildCounterAchievements({
        idPrefix: 'wins_full_board',
        namePrefix: 'Overwhelming Force',
        description: (value) => `Win ${value} matches with a full board.`,
        values: [1, 3, 5, 10],
        getValue: (stats) => stats.achievement_stats.wins_with_full_board,
        difficulty: (value) => 70 + value * 12
    }),
    ...buildCounterAchievements({
        idPrefix: 'wins_low_health',
        namePrefix: 'Edge of Extinction',
        description: (value) => `Win ${value} matches with ${LOW_HEALTH_THRESHOLD} or less health.`,
        values: [1, 3, 5],
        getValue: (stats) => stats.achievement_stats.wins_low_health,
        difficulty: (value) => 90 + value * 20
    }),
    ...buildCounterAchievements({
        idPrefix: 'max_damage_turn',
        namePrefix: 'Burst Turn',
        description: (value) => `Deal ${value} or more damage in a single turn.`,
        values: [10, 20, 30, 40, 50],
        getValue: (stats) => stats.achievement_stats.max_damage_in_turn,
        difficulty: (value) => 65 + value * 2
    }),
    ...buildCounterAchievements({
        idPrefix: 'max_heal_turn',
        namePrefix: 'Recovery Turn',
        description: (value) => `Restore ${value} or more health in a single turn.`,
        values: [10, 20, 30, 40],
        getValue: (stats) => stats.achievement_stats.max_heal_in_turn,
        difficulty: (value) => 60 + value * 2
    }),
    ...buildFactionWinAchievements([1, 5, 15])
];

let trackingRegistered = false;
let sessionState = null;
let syncTimeout = null;

function ensureAchievementStats(stats) {
    return {
        ...stats,
        achievement_stats: {
            ...DEFAULT_ACHIEVEMENT_STATS,
            ...(stats.achievement_stats || {})
        }
    };
}

function normalizeStats(stats) {
    const baseStats = {
        ...DEFAULT_STATS,
        ...(stats || {})
    };

    return ensureAchievementStats({
        ...baseStats,
        faction_stats: baseStats.faction_stats || {},
        enemy_faction_stats: baseStats.enemy_faction_stats || {}
    });
}

/**
 * Safe max that validates both values are numbers
 */
function safeMax(a, b) {
    const numA = typeof a === 'number' && !isNaN(a) ? a : 0;
    const numB = typeof b === 'number' && !isNaN(b) ? b : 0;
    return Math.max(numA, numB);
}

/**
 * Get local stats
 */
export function getStats() {
    try {
        return normalizeStats(JSON.parse(localStorage.getItem(LOCAL_STATS_KEY) || 'null'));
    } catch {
        return normalizeStats(null);
    }
}

/**
 * Calculate achievements from stats
 */
export function getAchievements(stats = getStats()) {
    const normalizedStats = normalizeStats(stats);
    return ACHIEVEMENTS.map((achievement) => ({
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        difficulty: achievement.difficulty,
        unlocked: achievement.isUnlocked(normalizedStats)
    }));
}

function saveStats(stats) {
    try {
        localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(normalizeStats(stats)));
    } catch {
        // ignore
    }
}

/**
 * Detect newly unlocked achievements and emit events
 * @param {Object} statsBefore - Stats before the update
 * @param {Object} statsAfter - Stats after the update
 */
function emitNewAchievements(statsBefore, statsAfter) {
    const unlockedBefore = new Set(
        getAchievements(statsBefore).filter(a => a.unlocked).map(a => a.id)
    );

    const newlyUnlocked = getAchievements(statsAfter)
        .filter(a => a.unlocked && !unlockedBefore.has(a.id));

    newlyUnlocked.forEach(achievement => {
        events.emit('ACHIEVEMENT_UNLOCKED', achievement);
    });
}

/**
 * Record a game result
 * @param {'win'|'loss'} result
 * @param {string} playerFaction
 * @param {string} enemyFaction
 */
export async function recordGameResult(result, playerFaction, enemyFaction) {
    const statsBefore = getStats();
    const stats = { ...statsBefore };
    const normalizedFaction = normalizeFactionId(playerFaction);
    const normalizedEnemyFaction = normalizeFactionId(enemyFaction);

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
    if (!stats.faction_stats[normalizedFaction]) {
        stats.faction_stats[normalizedFaction] = { games: 0, wins: 0, losses: 0 };
    }
    stats.faction_stats[normalizedFaction].games++;
    stats.faction_stats[normalizedFaction][result === 'win' ? 'wins' : 'losses']++;

    if (!stats.enemy_faction_stats[normalizedEnemyFaction]) {
        stats.enemy_faction_stats[normalizedEnemyFaction] = { games: 0, wins: 0, losses: 0 };
    }
    stats.enemy_faction_stats[normalizedEnemyFaction].games++;
    stats.enemy_faction_stats[normalizedEnemyFaction][result === 'win' ? 'wins' : 'losses']++;

    saveStats(stats);
    emitNewAchievements(statsBefore, stats);
    await syncStats(stats);
}

function normalizeFactionId(faction) {
    if (!faction) return 'unknown';
    const mapped = FACTION_ID_MAP[faction.toUpperCase()];
    if (mapped) return mapped;
    return faction.toLowerCase().replace(/[^a-z]/g, '') || 'unknown';
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
        const remote = normalizeStats(data.stats || DEFAULT_STATS);

        // Merge: take the higher values (handles simultaneous play)
        const merged = normalizeStats({
            games_played: safeMax(local.games_played, remote.games_played),
            wins: safeMax(local.wins, remote.wins),
            losses: safeMax(local.losses, remote.losses),
            current_streak: safeMax(local.current_streak, remote.current_streak),
            best_streak: safeMax(local.best_streak, remote.best_streak),
            faction_stats: { ...remote.faction_stats },
            enemy_faction_stats: { ...remote.enemy_faction_stats },
            achievement_stats: { ...remote.achievement_stats }
        });

        // Merge per-faction stats
        for (const faction of Object.keys(local.faction_stats)) {
            if (!merged.faction_stats[faction]) {
                merged.faction_stats[faction] = local.faction_stats[faction];
            } else {
                merged.faction_stats[faction] = {
                    games: safeMax(local.faction_stats[faction].games, merged.faction_stats[faction].games),
                    wins: safeMax(local.faction_stats[faction].wins, merged.faction_stats[faction].wins),
                    losses: safeMax(local.faction_stats[faction].losses, merged.faction_stats[faction].losses)
                };
            }
        }

        for (const faction of Object.keys(local.enemy_faction_stats)) {
            if (!merged.enemy_faction_stats[faction]) {
                merged.enemy_faction_stats[faction] = local.enemy_faction_stats[faction];
            } else {
                merged.enemy_faction_stats[faction] = {
                    games: safeMax(local.enemy_faction_stats[faction].games, merged.enemy_faction_stats[faction].games),
                    wins: safeMax(local.enemy_faction_stats[faction].wins, merged.enemy_faction_stats[faction].wins),
                    losses: safeMax(local.enemy_faction_stats[faction].losses, merged.enemy_faction_stats[faction].losses)
                };
            }
        }

        for (const [key, value] of Object.entries(local.achievement_stats)) {
            merged.achievement_stats[key] = safeMax(value, merged.achievement_stats[key]);
        }

        saveStats(merged);
        return merged;
    } catch {
        return getStats();
    }
}

function createSessionState() {
    return {
        turnDamage: 0,
        turnHealing: 0,
        turnEnemyBoardStart: 0,
        turnFullBoardRecorded: false,
        currentAction: null,
        playerHadCreatureDeath: false
    };
}

function updateAchievementStats(mutator) {
    const statsBefore = getStats();
    const result = mutator(statsBefore);
    if (result.didUpdate) {
        saveStats(result.stats);
        emitNewAchievements(statsBefore, result.stats);
        scheduleStatsSync();
    }
}

function scheduleStatsSync() {
    const user = getCurrentUser();
    if (!user || user.is_anonymous || !isOnline()) return;

    if (syncTimeout) {
        clearTimeout(syncTimeout);
    }

    syncTimeout = setTimeout(() => {
        syncTimeout = null;
        syncStats(getStats());
    }, 2000);
}

function setMaxStat(stats, key, value) {
    if (value > stats.achievement_stats[key]) {
        return {
            stats: {
                ...stats,
                achievement_stats: {
                    ...stats.achievement_stats,
                    [key]: value
                }
            },
            updated: true
        };
    }
    return { stats, updated: false };
}

function incrementStat(stats, key, amount = 1) {
    return {
        ...stats,
        achievement_stats: {
            ...stats.achievement_stats,
            [key]: (stats.achievement_stats[key] || 0) + amount
        }
    };
}

export function registerAchievementTracking() {
    if (trackingRegistered) return;
    trackingRegistered = true;
    sessionState = createSessionState();

    store.subscribe((state, prevState, action) => {
        if (!action || !action.type) return;

        // Reset session state for new, reset, or restored games
        if (action.type === ActionTypes.START_GAME || action.type === 'RESTORE' || action.type === 'RESET') {
            sessionState = createSessionState();
            return;
        }

        updateAchievementStats((initialStats) => {
            let stats = initialStats;
            let didUpdate = false;

            if (!prevState?.gameOver && state.gameOver) {
                if (state.winner === 'player') {
                    if (!sessionState.playerHadCreatureDeath) {
                        stats = incrementStat(stats, 'wins_without_creature_loss');
                        didUpdate = true;
                    }
                    if (state.player.board.length === MAX_BOARD_SIZE) {
                        stats = incrementStat(stats, 'wins_with_full_board');
                        didUpdate = true;
                    }
                    if (state.player.health <= LOW_HEALTH_THRESHOLD) {
                        stats = incrementStat(stats, 'wins_low_health');
                        didUpdate = true;
                    }
                }
            }

            switch (action.type) {
                case ActionTypes.START_TURN: {
                    if (action.payload.player === 'player') {
                        sessionState.turnDamage = 0;
                        sessionState.turnHealing = 0;
                        sessionState.turnEnemyBoardStart = prevState?.enemy?.board?.length || 0;
                        sessionState.turnFullBoardRecorded = false;
                        sessionState.currentAction = null;
                        stats = incrementStat(stats, 'turns_played');
                        didUpdate = true;
                    }
                    break;
                }
                case ActionTypes.END_TURN: {
                    if (prevState?.activePlayer === 'player') {
                        if (sessionState.turnEnemyBoardStart > 0 && state.enemy.board.length === 0) {
                            stats = incrementStat(stats, 'enemy_board_clears');
                            didUpdate = true;
                        }
                        const maxDamageResult = setMaxStat(stats, 'max_damage_in_turn', sessionState.turnDamage);
                        stats = maxDamageResult.stats;
                        if (maxDamageResult.updated) {
                            didUpdate = true;
                        }
                        const maxHealResult = setMaxStat(stats, 'max_heal_in_turn', sessionState.turnHealing);
                        stats = maxHealResult.stats;
                        if (maxHealResult.updated) {
                            didUpdate = true;
                        }
                    }
                    break;
                }
                case ActionTypes.PLAY_CARD: {
                    if (action.payload.player === 'player') {
                        // Card is already removed from hand in current state, so use prevState
                        const playedCard = prevState?.player?.hand?.find(
                            (card) => card.instanceId === action.payload.cardId
                        );
                        if (playedCard) {
                            stats = incrementStat(stats, 'total_cards_played');
                            didUpdate = true;

                            if (playedCard.type === 'spell') {
                                stats = incrementStat(stats, 'total_spells_cast');
                                sessionState.currentAction = {
                                    type: 'spell',
                                    enemyBoardBefore: prevState.enemy.board.length,
                                    counted: false
                                };
                                didUpdate = true;
                            }

                            if (playedCard.type === 'creature') {
                                stats = incrementStat(stats, 'total_creatures_summoned');
                                sessionState.currentAction = {
                                    type: playedCard.battlecry || playedCard.effect ? 'effect' : 'creature',
                                    enemyBoardBefore: prevState.enemy.board.length,
                                    counted: false
                                };
                                didUpdate = true;
                            }

                            if (playedCard.type === 'relic') {
                                stats = incrementStat(stats, 'total_relics_played');
                                sessionState.currentAction = {
                                    type: 'relic',
                                    enemyBoardBefore: prevState.enemy.board.length,
                                    counted: false
                                };
                                didUpdate = true;
                            }
                        }
                    }
                    break;
                }
                case ActionTypes.SUMMON_CREATURE: {
                    if (action.payload.player === 'player') {
                        stats = incrementStat(stats, 'total_creatures_summoned');
                        didUpdate = true;
                    }
                    break;
                }
                case ActionTypes.ATTACK: {
                    if (action.payload.attackerPlayer === 'player') {
                        stats = incrementStat(stats, 'total_attacks');
                        sessionState.currentAction = {
                            type: 'attack',
                            enemyBoardBefore: prevState.enemy.board.length,
                            counted: false
                        };
                        didUpdate = true;
                    }
                    break;
                }
                case ActionTypes.DEAL_DAMAGE: {
                    if (action.payload.targetPlayer === 'enemy') {
                        if (action.payload.targetId === 'hero') {
                            stats = incrementStat(stats, 'total_damage_to_hero', action.payload.amount);
                        } else {
                            stats = incrementStat(stats, 'total_damage_to_creatures', action.payload.amount);
                        }
                        sessionState.turnDamage += action.payload.amount;
                        didUpdate = true;
                    }
                    break;
                }
                case ActionTypes.HEAL: {
                    if (action.payload.targetPlayer === 'player') {
                        stats = incrementStat(stats, 'total_healing', action.payload.amount);
                        sessionState.turnHealing += action.payload.amount;
                        didUpdate = true;
                    }
                    break;
                }
                case ActionTypes.DESTROY_CREATURE: {
                    if (action.payload.player === 'enemy') {
                        stats = incrementStat(stats, 'total_creatures_killed');
                        didUpdate = true;
                    }
                    if (action.payload.player === 'player') {
                        stats = incrementStat(stats, 'total_player_creatures_lost');
                        sessionState.playerHadCreatureDeath = true;
                        didUpdate = true;
                    }
                    break;
                }
                default:
                    break;
            }

            if (action.type === ActionTypes.PLAY_CARD || action.type === ActionTypes.SUMMON_CREATURE) {
                if (action.payload.player === 'player' && state.player.board.length === MAX_BOARD_SIZE) {
                    if (!sessionState.turnFullBoardRecorded) {
                        stats = incrementStat(stats, 'full_board_turns');
                        sessionState.turnFullBoardRecorded = true;
                        didUpdate = true;
                    }
                }
            }

            if (sessionState.currentAction && !sessionState.currentAction.counted) {
                if (sessionState.currentAction.enemyBoardBefore > 0 && state.enemy.board.length === 0) {
                    if (sessionState.currentAction.type === 'spell') {
                        stats = incrementStat(stats, 'enemy_board_clears_single_spell');
                        didUpdate = true;
                    }
                    if (sessionState.currentAction.type === 'attack') {
                        stats = incrementStat(stats, 'enemy_board_clears_single_attack');
                        didUpdate = true;
                    }
                    if (sessionState.currentAction.type === 'effect') {
                        stats = incrementStat(stats, 'enemy_board_clears_single_effect');
                        didUpdate = true;
                    }
                    sessionState.currentAction.counted = true;
                }
            }

            return { stats, didUpdate };
        });
    });
}

export function hydrateAchievementTrackingState(state) {
    if (!sessionState) {
        sessionState = createSessionState();
    }

    const playerGraveyardCount = state?.player?.graveyard?.length || 0;
    if (playerGraveyardCount > 0) {
        sessionState.playerHadCreatureDeath = true;
    }
}
