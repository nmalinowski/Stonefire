/**
 * Stonefire - AI Opponent
 * Decision making for computer-controlled player
 */

import { store, events } from '../game/state.js';
import { playCard, attack, endTurn, canPlayCard, canCreatureAttack, getValidAttackTargets } from '../game/engine.js';
import { evaluateBoard, evaluatePlay, evaluateAttack, hasLethal, calculatePotentialDamage } from './evaluation.js';
import { wait } from '../ui/animations.js';

// AI configuration
const AI_CONFIG = {
    THINK_DELAY: 800,      // Delay before making a move (ms)
    ACTION_DELAY: 600,     // Delay between actions (ms)
    AGGRESSION: 0.6,       // 0 = defensive, 1 = aggressive
    RANDOMNESS: 0.1        // Chance to make suboptimal plays
};

/**
 * Run the AI's turn
 */
export async function runAITurn() {
    const state = store.getState();

    if (state.activePlayer !== 'enemy' || state.gameOver) {
        return;
    }

    // Wait a moment before starting
    await wait(AI_CONFIG.THINK_DELAY);

    // Check for lethal first
    if (hasLethal(state, 'enemy')) {
        await executeLethal();
        return;
    }

    // Main AI loop - keep making moves while we can
    let madeMove = true;
    let iterations = 0;
    const maxIterations = 20; // Safety limit

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
            madeMove = true;
            await wait(AI_CONFIG.ACTION_DELAY);
            continue;
        }

        // Try to make attacks
        const attacked = await tryAttack();
        if (attacked) {
            madeMove = true;
            await wait(AI_CONFIG.ACTION_DELAY);
            continue;
        }
    }

    // End turn
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
    const boardSpace = 7 - state.enemy.board.length;

    // Get playable cards
    const playableCards = hand.filter(card => {
        if (card.cost > mana) return false;
        if (card.type === 'creature' && boardSpace <= 0) return false;
        return true;
    });

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
                return true;
            }
            continue;
        }

        // Play non-targeted card
        playCard('enemy', card.instanceId);
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
        attack('enemy', bestAttack.attacker.instanceId, 'player', bestAttack.target.id);
        return true;
    }

    // Check if we should go face with aggression factor
    const faceAttacks = attacks.filter(a => a.target.id === 'hero');
    if (faceAttacks.length > 0 && Math.random() < AI_CONFIG.AGGRESSION) {
        const faceAttack = faceAttacks[0];
        attack('enemy', faceAttack.attacker.instanceId, 'player', 'hero');
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
            // Add slight delay before AI starts thinking
            await wait(500);
            runAITurn();
        }
    });
}
