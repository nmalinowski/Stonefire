/**
 * Stonefire - Game Engine
 * Handles turn flow, game rules, and win conditions
 */

import { store, actions, events } from './state.js';
import { resolveCombat } from './combat.js';
import { processEffect, checkTriggeredEffects } from './effects.js';
import { saveGame, deleteSave } from '../services/saveGame.js';
import { recordGameResult, registerAchievementTracking } from '../services/progress.js';

// Game configuration
export const CONFIG = {
    STARTING_HEALTH: 30,
    STARTING_HAND_SIZE: 3,
    STARTING_HAND_SIZE_SECOND: 4, // Player going second gets 4 cards
    MAX_MANA: 10,
    MAX_BOARD_SIZE: 7,
    MAX_HAND_SIZE: 10
};

// Track if event listeners are registered
let listenersRegistered = false;

/**
 * Register event listeners for triggered abilities
 */
function registerTriggerListeners() {
    if (listenersRegistered) return;
    listenersRegistered = true;

    // CARD_DRAWN trigger (for Oviraptor etc.)
    events.on('DRAW_CARD', (payload) => {
        const state = store.getState();
        if (state.gameOver) return;
        console.log('[DEBUG] DRAW_CARD event, triggering CARD_DRAWN effects');
        checkTriggeredEffects('CARD_DRAWN', { player: payload.player });
    });

    // CREATURE_SUMMONED trigger (for Dire Wolf etc.)
    events.on('CREATURE_SUMMONED', (payload) => {
        const state = store.getState();
        if (state.gameOver) return;
        console.log('[DEBUG] CREATURE_SUMMONED event, triggering effects');
        checkTriggeredEffects('CREATURE_SUMMONED', {
            player: payload.player,
            creature: payload.creature
        });
    });
}

/**
 * Initialize and start a new game
 */
export function startGame(playerDeck, enemyDeck) {
    // Register event listeners for triggered abilities
    registerTriggerListeners();
    registerAchievementTracking();

    // Reset the store
    store.reset();

    // Shuffle decks
    const shuffledPlayerDeck = shuffleDeck([...playerDeck]);
    const shuffledEnemyDeck = shuffleDeck([...enemyDeck]);

    // Initialize game state
    store.dispatch(actions.startGame(shuffledPlayerDeck, shuffledEnemyDeck));

    // Draw starting hands
    // Player goes first, gets 3 cards
    for (let i = 0; i < CONFIG.STARTING_HAND_SIZE; i++) {
        store.dispatch(actions.drawCard('player'));
    }

    // Enemy goes second, gets 4 cards
    for (let i = 0; i < CONFIG.STARTING_HAND_SIZE_SECOND; i++) {
        store.dispatch(actions.drawCard('enemy'));
    }

    // Start player's first turn
    startTurn('player');

    events.emit('GAME_STARTED', store.getState());
}

/**
 * Shuffle a deck using Fisher-Yates algorithm
 */
function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Start a player's turn
 */
export function startTurn(player) {
    const state = store.getState();
    if (state.gameOver) return;

    // Dispatch start turn action (increments mana, refreshes crystals)
    store.dispatch(actions.startTurn(player));

    // Draw a card (skip on turn 1 for the first player)
    if (!(state.turn === 1 && player === 'player')) {
        store.dispatch(actions.drawCard(player));
    }

    // Check for triggered effects at turn start
    checkTriggeredEffects('TURN_START', { player });

    console.log('[ENGINE] Emitting TURN_STARTED for:', player);
    events.emit('TURN_STARTED', { player, state: store.getState() });
}

/**
 * End the current player's turn
 */
export function endTurn() {
    const state = store.getState();
    if (state.gameOver) return;

    const currentPlayer = state.activePlayer;

    // Check for end-of-turn triggered effects
    checkTriggeredEffects('TURN_END', { player: currentPlayer });

    store.dispatch(actions.endTurn());

    events.emit('TURN_ENDED', { player: currentPlayer });

    // Start the next player's turn
    const nextPlayer = currentPlayer === 'player' ? 'enemy' : 'player';
    startTurn(nextPlayer);

    // Auto-save after each turn
    saveGame();
}

/**
 * Attempt to play a card from hand
 */
export function playCard(player, cardId, target = null) {
    const state = store.getState();

    // Validate it's the player's turn
    if (state.activePlayer !== player) {
        console.warn('Not your turn!');
        return false;
    }

    // Find the card in hand
    const playerState = state[player];
    const card = playerState.hand.find(c => c.instanceId === cardId);

    if (!card) {
        console.warn('Card not found in hand');
        return false;
    }

    // Check mana cost
    if (card.cost > playerState.mana) {
        console.warn('Not enough mana');
        return false;
    }

    // Type-specific validation
    if (card.type === 'creature') {
        // Check board space
        if (playerState.board.length >= CONFIG.MAX_BOARD_SIZE) {
            console.warn('Board is full');
            return false;
        }
    }

    // Validate targeting if required
    if (card.requiresTarget && !target) {
        console.warn('Card requires a target');
        return false;
    }

    // Play the card
    store.dispatch(actions.playCard(player, cardId, target));

    // Process card effects
    if (card.effect) {
        processEffect(card.effect, player, target);
    }

    // Check for battlecry triggers
    if (card.type === 'creature' && card.battlecry) {
        console.log('[DEBUG] Battlecry detected for', card.name, ':', card.battlecry);
        // For 'self' targeting effects, pass the played creature as the target
        let battlecryTarget = target;
        if (!target && (card.battlecry.target === 'self' ||
            (card.battlecry.type === 'multiple' && card.battlecry.effects?.some(e => e.target === 'self')))) {
            battlecryTarget = { player: player, id: card.instanceId };
            console.log('[DEBUG] Self-targeting battlecry, target set to:', battlecryTarget);
        }
        console.log('[DEBUG] Processing battlecry effect with target:', battlecryTarget);
        processEffect(card.battlecry, player, battlecryTarget);
    } else if (card.type === 'creature') {
        console.log('[DEBUG] Creature played without battlecry:', card.name, 'battlecry prop:', card.battlecry);
    }

    // Clear any selection
    store.dispatch(actions.clearSelection());

    events.emit('CARD_PLAYED', { player, card, target });

    // Check for death triggers after effects resolve
    checkDeaths();

    return true;
}

/**
 * Attempt to attack with a creature
 */
export function attack(attackerPlayer, attackerId, targetPlayer, targetId) {
    const state = store.getState();

    // Validate it's the attacker's turn
    if (state.activePlayer !== attackerPlayer) {
        console.warn('Not your turn!');
        return false;
    }

    // Find the attacker
    const attackerState = state[attackerPlayer];
    const attacker = attackerState.board.find(c => c.instanceId === attackerId);

    if (!attacker) {
        console.warn('Attacker not found');
        return false;
    }

    // Check if can attack
    if (!attacker.canAttack || attacker.hasAttacked) {
        console.warn('Creature cannot attack');
        return false;
    }

    if (attacker.summoningSick && !attacker.keywords?.includes('charge')) {
        console.warn('Creature has summoning sickness');
        return false;
    }

    // Check for Guard - must attack Guard creatures first
    const defenderState = state[targetPlayer];
    const guardsOnBoard = defenderState.board.filter(c =>
        c && c.keywords?.includes('guard')
    );

    if (guardsOnBoard.length > 0 && targetId !== 'hero') {
        const target = defenderState.board.find(c => c.instanceId === targetId);
        if (!target?.keywords?.includes('guard')) {
            console.warn('Must attack Guard creature first');
            return false;
        }
    } else if (guardsOnBoard.length > 0 && targetId === 'hero') {
        console.warn('Must attack Guard creature first');
        return false;
    }

    // Mark attacker as having attacked
    store.dispatch(actions.attack(attackerPlayer, attackerId, targetPlayer, targetId));

    // Resolve combat
    resolveCombat(attackerPlayer, attackerId, targetPlayer, targetId);

    // Clear selection
    store.dispatch(actions.clearSelection());

    // Check for deaths after combat
    checkDeaths();

    return true;
}

/**
 * Check all creatures for death (health <= 0)
 */
export function checkDeaths() {
    const state = store.getState();
    let hadDeaths = false;

    ['player', 'enemy'].forEach(playerKey => {
        const player = state[playerKey];
        const deadCreatures = player.board.filter(c => c && c.currentHealth <= 0);

        deadCreatures.forEach(creature => {
            // Trigger Extinct effects before removing
            if (creature.extinctEffect) {
                console.log('[DEBUG] Extinct effect triggered for', creature.name);
                processEffect(creature.extinctEffect, playerKey, null);
            }

            store.dispatch(actions.destroyCreature(playerKey, creature.instanceId));
            hadDeaths = true;
        });
    });

    // Recursively check for more deaths if something died
    // (in case an Extinct effect killed something)
    if (hadDeaths) {
        checkDeaths();
    }
}

/**
 * Check if the game is over
 */
export function checkGameOver() {
    const state = store.getState();
    const factions = (function() { try { return JSON.parse(localStorage.getItem('stonefire.factions') || 'null'); } catch(e) { return null; } })();
    const playerFaction = (factions && factions.player) || 'UNKNOWN';
    const enemyFaction = (factions && factions.enemy) || 'UNKNOWN';

    if (state.player.health <= 0) {
        store.dispatch(actions.setGameOver('enemy'));
        deleteSave();
        recordGameResult('loss', playerFaction, enemyFaction);
        return true;
    }

    if (state.enemy.health <= 0) {
        store.dispatch(actions.setGameOver('player'));
        deleteSave();
        recordGameResult('win', playerFaction, enemyFaction);
        return true;
    }

    return false;
}

/**
 * Get valid targets for a card or ability
 */
export function getValidTargets(player, card) {
    const state = store.getState();
    const targets = [];

    if (!card.targetType) {
        return targets;
    }

    const opponent = player === 'player' ? 'enemy' : 'player';

    switch (card.targetType) {
        case 'enemy_creature':
            state[opponent].board.forEach(c => {
                if (c) targets.push({ player: opponent, id: c.instanceId });
            });
            break;

        case 'friendly_creature':
            state[player].board.forEach(c => {
                if (c) targets.push({ player: player, id: c.instanceId });
            });
            break;

        case 'any_creature':
            ['player', 'enemy'].forEach(p => {
                state[p].board.forEach(c => {
                    if (c) targets.push({ player: p, id: c.instanceId });
                });
            });
            break;

        case 'enemy':
            // Enemy creatures and hero
            state[opponent].board.forEach(c => {
                if (c) targets.push({ player: opponent, id: c.instanceId });
            });
            targets.push({ player: opponent, id: 'hero' });
            break;

        case 'any':
            // All creatures and both heroes
            ['player', 'enemy'].forEach(p => {
                state[p].board.forEach(c => {
                    if (c) targets.push({ player: p, id: c.instanceId });
                });
                targets.push({ player: p, id: 'hero' });
            });
            break;

        case 'hero':
            targets.push({ player: opponent, id: 'hero' });
            break;
    }

    return targets;
}

/**
 * Get valid attack targets for a creature
 */
export function getValidAttackTargets(attackerPlayer) {
    const state = store.getState();
    const opponent = attackerPlayer === 'player' ? 'enemy' : 'player';
    const targets = [];

    // Check for Guard creatures
    const guards = state[opponent].board.filter(c =>
        c && c.keywords?.includes('guard')
    );

    if (guards.length > 0) {
        // Can only attack Guard creatures
        guards.forEach(c => {
            targets.push({ player: opponent, id: c.instanceId });
        });
    } else {
        // Can attack any creature or hero
        state[opponent].board.forEach(c => {
            if (c) targets.push({ player: opponent, id: c.instanceId });
        });
        targets.push({ player: opponent, id: 'hero' });
    }

    return targets;
}

/**
 * Check if a creature can attack
 */
export function canCreatureAttack(player, creatureId) {
    const state = store.getState();

    if (state.activePlayer !== player) return false;

    const creature = state[player].board.find(c => c.instanceId === creatureId);
    if (!creature) return false;

    if (creature.hasAttacked) return false;
    if (creature.currentAttack <= 0) return false;
    if (creature.summoningSick && !creature.keywords?.includes('charge')) return false;

    return true;
}

/**
 * Check if a card can be played
 */
export function canPlayCard(player, cardId) {
    const state = store.getState();

    if (state.activePlayer !== player) return false;

    const card = state[player].hand.find(c => c.instanceId === cardId);
    if (!card) return false;

    // Check mana
    if (card.cost > state[player].mana) return false;

    // Check board space for creatures
    if (card.type === 'creature' && state[player].board.length >= CONFIG.MAX_BOARD_SIZE) {
        return false;
    }

    return true;
}
