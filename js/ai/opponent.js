/**
 * Stonefire - AI Opponent
 * Decision making for computer-controlled player
 */

import { store, events } from '../game/state.js';
import { playCard, attack, endTurn, canPlayCard, canCreatureAttack, getValidAttackTargets } from '../game/engine.js';
import { evaluateBoard, evaluatePlay, evaluateAttack, hasLethal, calculatePotentialDamage, setEvaluationPersonality } from './evaluation.js';
import { wait } from '../ui/animations.js';
import { getPersonality, getTaunt, shouldTaunt, TAUNT_TRIGGERS } from './personality.js';

// Current AI personality (set based on enemy faction)
let currentPersonality = null;

// AI configuration (defaults, overridden by personality)
let AI_CONFIG = {
    THINK_DELAY: 800,
    ACTION_DELAY: 600,
    AGGRESSION: 0.6,
    RANDOMNESS: 0.1
};

/**
 * Set AI personality based on faction
 */
export function setAIPersonality(faction) {
    currentPersonality = getPersonality(faction);
    AI_CONFIG = {
        THINK_DELAY: currentPersonality.THINK_DELAY,
        ACTION_DELAY: currentPersonality.ACTION_DELAY,
        AGGRESSION: currentPersonality.AGGRESSION,
        RANDOMNESS: currentPersonality.RANDOMNESS
    };
    // Also update evaluation weights
    setEvaluationPersonality(currentPersonality);
    console.log(`[AI] Personality set to ${currentPersonality.name} (${currentPersonality.style})`);
}

/**
 * Emit a taunt if conditions are met
 */
function emitTaunt(trigger, extraData = {}) {
    if (!currentPersonality) return;
    if (!shouldTaunt(trigger)) return;

    const taunt = getTaunt(currentPersonality.name, trigger);
    if (taunt) {
        events.emit('AI_TAUNT', {
            message: taunt,
            personality: currentPersonality,
            trigger,
            ...extraData
        });
    }
}

/**
 * Run the AI's turn
 */
export async function runAITurn() {
    const state = store.getState();
    console.log('[AI] runAITurn called, activePlayer:', state.activePlayer, 'gameOver:', state.gameOver);

    if (state.activePlayer !== 'enemy' || state.gameOver) {
        console.log('[AI] Skipping - not enemy turn or game over');
        return;
    }

    // Taunt at turn start
    emitTaunt(TAUNT_TRIGGERS.TURN_START);

    // Wait a moment before starting
    await wait(AI_CONFIG.THINK_DELAY);

    // Check for low health taunt
    if (state.enemy.health <= 10 && state.enemy.health > 0) {
        emitTaunt(TAUNT_TRIGGERS.LOW_HEALTH);
    }

    // Check for lethal first
    if (hasLethal(state, 'enemy')) {
        console.log('[AI] Has lethal! Executing...');
        emitTaunt(TAUNT_TRIGGERS.HAS_LETHAL);
        await wait(400);
        await executeLethal();
        return;
    }

    // Main AI loop - keep making moves while we can
    let madeMove = true;
    let iterations = 0;
    const maxIterations = 20; // Safety limit

    console.log('[AI] Starting main loop, hand size:', state.enemy.hand.length, 'mana:', state.enemy.mana);

    while (madeMove && iterations < maxIterations) {
        madeMove = false;
        iterations++;

        const currentState = store.getState();
        if (currentState.activePlayer !== 'enemy' || currentState.gameOver) {
            break;
        }

        // Try to play cards
        const cardPlayed = await tryPlayCard();
        if (cardPlayed) {
            console.log('[AI] Played a card');
            madeMove = true;
            await wait(AI_CONFIG.ACTION_DELAY);
            continue;
        }

        // Try to make attacks
        const attacked = await tryAttack();
        if (attacked) {
            console.log('[AI] Made an attack');
            madeMove = true;
            await wait(AI_CONFIG.ACTION_DELAY);
            continue;
        }
    }

    // End turn
    console.log('[AI] Ending turn after', iterations, 'iterations');
    await wait(AI_CONFIG.ACTION_DELAY);

    const finalState = store.getState();
    if (finalState.activePlayer === 'enemy' && !finalState.gameOver) {
        endTurn();
    }
}

/**
 * Execute lethal if available
 */
async function executeLethal() {
    const state = store.getState();
    const targets = getValidAttackTargets('enemy');
    const canHitFace = targets.some(t => t.id === 'hero');

    if (!canHitFace) {
        // Need to clear guards first
        await clearGuards();
    }

    // Attack face with everything
    const attackers = state.enemy.board.filter(c =>
        c && canCreatureAttack('enemy', c.instanceId)
    );

    for (const attacker of attackers) {
        const currentState = store.getState();
        if (currentState.gameOver) break;

        const currentTargets = getValidAttackTargets('enemy');
        const canHit = currentTargets.some(t => t.id === 'hero');

        if (canHit) {
            await wait(AI_CONFIG.ACTION_DELAY);
            attack('enemy', attacker.instanceId, 'player', 'hero');
        }
    }

    // End turn if game isn't over
    const finalState = store.getState();
    if (!finalState.gameOver && finalState.activePlayer === 'enemy') {
        await wait(AI_CONFIG.ACTION_DELAY);
        endTurn();
    }
}

/**
 * Clear guard creatures
 */
async function clearGuards() {
    let hasGuards = true;

    while (hasGuards) {
        const state = store.getState();
        const guards = state.player.board.filter(c =>
            c && c.keywords?.includes('guard')
        );

        if (guards.length === 0) {
            hasGuards = false;
            break;
        }

        // Find best attacker for each guard
        const attackers = state.enemy.board.filter(c =>
            c && canCreatureAttack('enemy', c.instanceId)
        );

        if (attackers.length === 0) break;

        // Attack the guard with lowest health
        const targetGuard = guards.reduce((lowest, g) =>
            g.currentHealth < lowest.currentHealth ? g : lowest
        );

        // Find attacker that can kill it with minimal loss
        let bestAttacker = null;
        let bestScore = -Infinity;

        for (const attacker of attackers) {
            const score = evaluateAttack(state, attacker, targetGuard.instanceId);
            if (score > bestScore) {
                bestScore = score;
                bestAttacker = attacker;
            }
        }

        if (bestAttacker) {
            await wait(AI_CONFIG.ACTION_DELAY);
            attack('enemy', bestAttacker.instanceId, 'player', targetGuard.instanceId);
        } else {
            break;
        }
    }
}

/**
 * Try to play a card from hand
 */
async function tryPlayCard() {
    const state = store.getState();
    const hand = state.enemy.hand;
    const mana = state.enemy.mana;
    const boardSpace = 7 - state.enemy.board.filter(c => c).length;

    console.log('[AI] tryPlayCard - hand:', hand.length, 'cards, mana:', mana, 'boardSpace:', boardSpace);

    // Get playable cards
    const playableCards = hand.filter(card => {
        if (card.cost > mana) return false;
        if (card.type === 'creature' && boardSpace <= 0) return false;
        return true;
    });

    console.log('[AI] Playable cards:', playableCards.length, playableCards.map(c => c.name));

    if (playableCards.length === 0) return false;

    // Evaluate each playable card
    const cardScores = playableCards.map(card => ({
        card,
        score: evaluatePlay(state, card) + (Math.random() * AI_CONFIG.RANDOMNESS * 10)
    }));

    // Sort by score
    cardScores.sort((a, b) => b.score - a.score);

    // Try to play the best card
    for (const { card, score } of cardScores) {
        // Skip if score is negative and we have other options
        if (score < 0 && cardScores.length > 1) continue;

        // Handle targeted cards
        if (card.requiresTarget) {
            const target = selectTarget(state, card);
            if (target) {
                playCard('enemy', card.instanceId, target);
                emitTaunt(TAUNT_TRIGGERS.CARD_PLAYED);
                return true;
            }
            continue;
        }

        // Play non-targeted card
        playCard('enemy', card.instanceId);
        emitTaunt(TAUNT_TRIGGERS.CARD_PLAYED);
        return true;
    }

    return false;
}

/**
 * Select best target for a card
 */
function selectTarget(state, card) {
    const targets = getTargetsForCard(state, card);
    if (targets.length === 0) return null;

    // Evaluate each target
    let bestTarget = null;
    let bestScore = -Infinity;

    for (const target of targets) {
        const score = evaluateTargetForCard(state, card, target);
        if (score > bestScore) {
            bestScore = score;
            bestTarget = target;
        }
    }

    return bestTarget;
}

/**
 * Get valid targets for a card
 */
function getTargetsForCard(state, card) {
    const targets = [];

    switch (card.targetType) {
        case 'enemy_creature':
            state.player.board.forEach(c => {
                if (c) targets.push({ player: 'player', id: c.instanceId });
            });
            break;

        case 'friendly_creature':
            state.enemy.board.forEach(c => {
                if (c) targets.push({ player: 'enemy', id: c.instanceId });
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
            state.player.board.forEach(c => {
                if (c) targets.push({ player: 'player', id: c.instanceId });
            });
            targets.push({ player: 'player', id: 'hero' });
            break;

        case 'any':
            ['player', 'enemy'].forEach(p => {
                state[p].board.forEach(c => {
                    if (c) targets.push({ player: p, id: c.instanceId });
                });
                targets.push({ player: p, id: 'hero' });
            });
            break;
    }

    return targets;
}

/**
 * Evaluate a target for a card
 */
function evaluateTargetForCard(state, card, target) {
    let score = 0;

    if (target.id === 'hero') {
        // Damage to hero
        if (card.effect?.type === 'damage' && target.player === 'player') {
            score = card.effect.amount * 2;
            if (state.player.health <= card.effect.amount) {
                score = 1000; // Lethal
            }
        } else if (card.effect?.type === 'heal' && target.player === 'enemy') {
            const missing = state.enemy.maxHealth - state.enemy.health;
            score = Math.min(card.effect.amount, missing);
        }
        return score;
    }

    // Target is a creature
    const creature = target.player === 'player'
        ? state.player.board.find(c => c?.instanceId === target.id)
        : state.enemy.board.find(c => c?.instanceId === target.id);

    if (!creature) return -100;

    // Evaluate based on effect type
    if (card.effect?.type === 'damage' && target.player === 'player') {
        // Prioritize killing high-value targets
        if (card.effect.amount >= creature.currentHealth) {
            score = creature.currentAttack * 2 + creature.currentHealth;
        } else {
            score = card.effect.amount * 0.5;
        }
        // Bonus for Guards
        if (creature.keywords?.includes('guard')) {
            score += 3;
        }
    } else if (card.effect?.type === 'buff' && target.player === 'enemy') {
        // Buff our creatures
        score = creature.currentAttack + (card.effect.attack || 0);
    } else if (card.effect?.type === 'destroy' && target.player === 'player') {
        // Destroy enemy creatures
        score = creature.currentAttack * 2 + creature.currentHealth;
    }

    return score;
}

/**
 * Try to make an attack
 */
async function tryAttack() {
    const state = store.getState();

    // Get creatures that can attack
    const attackers = state.enemy.board.filter(c =>
        c && canCreatureAttack('enemy', c.instanceId)
    );

    if (attackers.length === 0) return false;

    // Get valid targets
    const targets = getValidAttackTargets('enemy');
    if (targets.length === 0) return false;

    // Evaluate all possible attacks
    const attacks = [];

    for (const attacker of attackers) {
        for (const target of targets) {
            const score = evaluateAttack(state, attacker, target.id);
            attacks.push({
                attacker,
                target,
                score: score + (Math.random() * AI_CONFIG.RANDOMNESS * 5)
            });
        }
    }

    // Sort by score
    attacks.sort((a, b) => b.score - a.score);

    // Execute best attack if score is positive
    const bestAttack = attacks[0];
    if (bestAttack && bestAttack.score > 0) {
        // Check if this attack will kill the target
        const targetCreature = bestAttack.target.id !== 'hero'
            ? state.player.board.find(c => c?.instanceId === bestAttack.target.id)
            : null;
        const willKill = targetCreature && bestAttack.attacker.currentAttack >= targetCreature.currentHealth;

        attack('enemy', bestAttack.attacker.instanceId, 'player', bestAttack.target.id);
        emitTaunt(TAUNT_TRIGGERS.ATTACK);

        // Emit kill taunt after a short delay if we killed something
        if (willKill) {
            setTimeout(() => emitTaunt(TAUNT_TRIGGERS.KILL), 300);
        }
        return true;
    }

    // Check if we should go face with aggression factor
    const faceAttacks = attacks.filter(a => a.target.id === 'hero');
    if (faceAttacks.length > 0 && Math.random() < AI_CONFIG.AGGRESSION) {
        const faceAttack = faceAttacks[0];
        attack('enemy', faceAttack.attacker.instanceId, 'player', 'hero');
        emitTaunt(TAUNT_TRIGGERS.ATTACK);
        return true;
    }

    return false;
}

/**
 * Subscribe to turn changes to trigger AI
 */
export function initAI() {
    events.on('TURN_STARTED', async ({ player }) => {
        if (player === 'enemy') {
            console.log('[AI] Enemy turn started, AI will act soon...');
            // Add slight delay before AI starts thinking
            await wait(500);
            try {
                await runAITurn();
            } catch (error) {
                console.error('[AI] Error during AI turn:', error);
                // Ensure turn ends even if AI errors
                const state = store.getState();
                if (state.activePlayer === 'enemy' && !state.gameOver) {
                    endTurn();
                }
            }
        }
    });

    // Listen for damage to enemy hero
    events.on('HERO_DAMAGED', ({ player, amount }) => {
        if (player === 'enemy' && amount > 0) {
            emitTaunt(TAUNT_TRIGGERS.TAKE_DAMAGE);
        }
    });

    // Listen for game over
    events.on('GAME_OVER', ({ winner }) => {
        if (winner === 'enemy') {
            setTimeout(() => emitTaunt(TAUNT_TRIGGERS.VICTORY), 500);
        }
    });
}
