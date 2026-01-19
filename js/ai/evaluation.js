/**
 * Stonefire - AI Board Evaluation
 * Heuristics for scoring board states and moves
 */

/**
 * Weights for evaluation heuristics
 */
const WEIGHTS = {
    // Health-related
    HERO_HEALTH: 2,
    ENEMY_HEALTH: -2,
    LETHAL_BONUS: 1000,

    // Board-related
    CREATURE_ATTACK: 1.5,
    CREATURE_HEALTH: 1,
    CREATURE_ON_BOARD: 3,
    BOARD_CONTROL: 5,

    // Card advantage
    HAND_SIZE: 0.5,
    DECK_SIZE: 0.1,

    // Mana efficiency
    MANA_SPENT: 0.5,

    // Keyword values
    GUARD_VALUE: 2,
    CHARGE_VALUE: 1.5,
    VENOMOUS_VALUE: 2,
    ARMORED_VALUE: 1.5,

    // Trade evaluation
    FAVORABLE_TRADE: 3,
    UNFAVORABLE_TRADE: -2,
    EVEN_TRADE: 0.5
};

/**
 * Evaluate the current board state for a player
 * Higher score = better for the player
 */
export function evaluateBoard(state, forPlayer) {
    const opponent = forPlayer === 'player' ? 'enemy' : 'player';
    let score = 0;

    // Health differential
    score += state[forPlayer].health * WEIGHTS.HERO_HEALTH;
    score += state[opponent].health * WEIGHTS.ENEMY_HEALTH;

    // Check for lethal
    if (state[opponent].health <= 0) {
        return WEIGHTS.LETHAL_BONUS;
    }
    if (state[forPlayer].health <= 0) {
        return -WEIGHTS.LETHAL_BONUS;
    }

    // Board presence
    score += evaluateBoardPresence(state[forPlayer].board);
    score -= evaluateBoardPresence(state[opponent].board);

    // Card advantage
    score += state[forPlayer].hand.length * WEIGHTS.HAND_SIZE;
    score -= state[opponent].hand.length * WEIGHTS.HAND_SIZE * 0.5;

    // Deck consideration
    score += state[forPlayer].deck.length * WEIGHTS.DECK_SIZE;

    // Tempo consideration - prefer having mana spent
    score += (state[forPlayer].maxMana - state[forPlayer].mana) * WEIGHTS.MANA_SPENT;

    return score;
}

/**
 * Evaluate board presence (creatures on board)
 */
function evaluateBoardPresence(board) {
    let score = 0;

    board.forEach(creature => {
        if (!creature) return;

        // Base value from stats
        score += creature.currentAttack * WEIGHTS.CREATURE_ATTACK;
        score += creature.currentHealth * WEIGHTS.CREATURE_HEALTH;
        score += WEIGHTS.CREATURE_ON_BOARD;

        // Keyword bonuses
        if (creature.keywords) {
            if (creature.keywords.includes('guard')) {
                score += WEIGHTS.GUARD_VALUE;
            }
            if (creature.keywords.includes('charge')) {
                score += WEIGHTS.CHARGE_VALUE;
            }
            if (creature.keywords.includes('venomous')) {
                score += WEIGHTS.VENOMOUS_VALUE;
            }
            const armored = creature.keywords.find(k => k.startsWith('armored'));
            if (armored) {
                const armorValue = parseInt(armored.split('_')[1]) || 1;
                score += armorValue * WEIGHTS.ARMORED_VALUE;
            }
        }

        // Can attack bonus
        if (creature.canAttack && !creature.hasAttacked) {
            score += creature.currentAttack * 0.5;
        }
    });

    return score;
}

/**
 * Evaluate a potential play (playing a card)
 */
export function evaluatePlay(state, card, target = null) {
    let score = 0;

    // Mana efficiency - prefer using mana efficiently
    const manaEfficiency = card.cost / (state.enemy.maxMana || 1);
    score += manaEfficiency * WEIGHTS.MANA_SPENT;

    // Type-specific evaluation
    if (card.type === 'creature') {
        score += evaluateCreaturePlay(state, card);
    } else if (card.type === 'spell') {
        score += evaluateSpellPlay(state, card, target);
    }

    return score;
}

/**
 * Evaluate playing a creature
 */
function evaluateCreaturePlay(state, card) {
    let score = 0;

    // Base value from stats
    score += card.attack * WEIGHTS.CREATURE_ATTACK;
    score += card.health * WEIGHTS.CREATURE_HEALTH;

    // Keyword bonuses
    if (card.keywords) {
        if (card.keywords.includes('guard')) {
            // Guard is more valuable when we have low health or valuable creatures
            const guardBonus = state.enemy.health < 15 ? WEIGHTS.GUARD_VALUE * 2 : WEIGHTS.GUARD_VALUE;
            score += guardBonus;
        }
        if (card.keywords.includes('charge')) {
            // Charge is more valuable for immediate impact
            score += card.attack + WEIGHTS.CHARGE_VALUE;
        }
        if (card.keywords.includes('venomous')) {
            score += WEIGHTS.VENOMOUS_VALUE;
        }
    }

    // Battlecry value
    if (card.battlecry) {
        score += evaluateEffectValue(state, card.battlecry);
    }

    return score;
}

/**
 * Evaluate playing a spell
 */
function evaluateSpellPlay(state, card, target) {
    let score = 0;

    if (card.effect) {
        score += evaluateEffectValue(state, card.effect, target);
    }

    return score;
}

/**
 * Evaluate an effect's value
 */
function evaluateEffectValue(state, effect, target = null) {
    let score = 0;

    switch (effect.type) {
        case 'damage':
            score += evaluateDamageEffect(state, effect);
            break;

        case 'heal':
            score += evaluateHealEffect(state, effect);
            break;

        case 'buff':
            score += (effect.attack || 0) * 1.5 + (effect.health || 0);
            break;

        case 'debuff':
            score += (effect.attack || 0) * 1.5 + (effect.health || 0);
            break;

        case 'draw':
            score += (effect.amount || 1) * 2;
            break;

        case 'destroy':
            score += evaluateDestroyEffect(state, effect);
            break;

        case 'multiple':
            effect.effects?.forEach(e => {
                score += evaluateEffectValue(state, e, target);
            });
            break;
    }

    return score;
}

/**
 * Evaluate damage effect
 */
function evaluateDamageEffect(state, effect) {
    let score = effect.amount * 1.5;

    switch (effect.target) {
        case 'all_enemies':
            // More valuable with more enemies
            score *= state.player.board.filter(c => c).length;
            break;
        case 'all_creatures':
            // Risky if we have more creatures
            const ourCount = state.enemy.board.filter(c => c).length;
            const theirCount = state.player.board.filter(c => c).length;
            score = effect.amount * (theirCount - ourCount);
            break;
        case 'enemy_hero':
            // Direct damage is good for lethal
            if (state.player.health <= effect.amount * 2) {
                score *= 2;
            }
            break;
    }

    return score;
}

/**
 * Evaluate heal effect
 */
function evaluateHealEffect(state, effect) {
    let score = 0;
    const healthMissing = state.enemy.maxHealth - state.enemy.health;

    if (effect.target === 'self_hero') {
        // Healing is more valuable when low
        const healValue = Math.min(effect.amount, healthMissing);
        score = healValue * (healthMissing > 15 ? 2 : 1);
    }

    return score;
}

/**
 * Evaluate destroy effect
 */
function evaluateDestroyEffect(state, effect) {
    let score = 0;

    const enemyCreatures = state.player.board.filter(c => c);

    if (enemyCreatures.length > 0) {
        // Value based on best target
        const bestTarget = enemyCreatures.reduce((best, c) =>
            (c.currentAttack + c.currentHealth > best.currentAttack + best.currentHealth) ? c : best
        );
        score = bestTarget.currentAttack * 2 + bestTarget.currentHealth;
    }

    return score;
}

/**
 * Evaluate a potential attack
 */
export function evaluateAttack(state, attacker, target) {
    let score = 0;

    // Attacking hero
    if (target === 'hero') {
        score = attacker.currentAttack * WEIGHTS.HERO_HEALTH;

        // Bonus for lethal
        if (state.player.health <= attacker.currentAttack) {
            score = WEIGHTS.LETHAL_BONUS;
        }

        return score;
    }

    // Attacking creature - evaluate trade
    const targetCreature = state.player.board.find(c => c?.instanceId === target);
    if (!targetCreature) return 0;

    const tradeResult = evaluateTrade(attacker, targetCreature);
    score = tradeResult.score;

    // Bonus for removing threatening creatures
    if (targetCreature.currentAttack >= 4) {
        score += WEIGHTS.FAVORABLE_TRADE;
    }

    // Bonus for removing Guard
    if (targetCreature.keywords?.includes('guard')) {
        score += WEIGHTS.GUARD_VALUE;
    }

    return score;
}

/**
 * Evaluate a trade between two creatures
 */
export function evaluateTrade(attacker, defender) {
    // Calculate damage with armored
    const attackerDamage = calculateDamageWithArmor(attacker.currentAttack, defender);
    const defenderDamage = calculateDamageWithArmor(defender.currentAttack, attacker);

    // Check for venomous
    const attackerDies = defenderDamage >= attacker.currentHealth ||
        (defender.keywords?.includes('venomous') && defender.currentAttack > 0);
    const defenderDies = attackerDamage >= defender.currentHealth ||
        (attacker.keywords?.includes('venomous') && attacker.currentAttack > 0);

    // Calculate value of each creature
    const attackerValue = attacker.currentAttack + attacker.currentHealth;
    const defenderValue = defender.currentAttack + defender.currentHealth;

    let score = 0;
    let result = 'neutral';

    if (defenderDies && !attackerDies) {
        // We kill them, we live - favorable
        score = defenderValue + WEIGHTS.FAVORABLE_TRADE;
        result = 'favorable';
    } else if (defenderDies && attackerDies) {
        // Both die - evaluate value difference
        score = defenderValue - attackerValue;
        if (defenderValue > attackerValue) {
            result = 'favorable';
            score += WEIGHTS.EVEN_TRADE;
        } else if (defenderValue < attackerValue) {
            result = 'unfavorable';
            score += WEIGHTS.UNFAVORABLE_TRADE;
        } else {
            result = 'even';
            score += WEIGHTS.EVEN_TRADE;
        }
    } else if (!defenderDies && attackerDies) {
        // We die, they live - unfavorable
        score = -attackerValue + WEIGHTS.UNFAVORABLE_TRADE;
        result = 'unfavorable';
    } else {
        // Neither dies - just damage
        score = attackerDamage - defenderDamage;
        result = 'neutral';
    }

    return { score, result, attackerDies, defenderDies };
}

/**
 * Calculate damage considering Armored
 */
function calculateDamageWithArmor(rawDamage, target) {
    const armored = target.keywords?.find(k => k.startsWith('armored'));
    if (armored) {
        const armorValue = parseInt(armored.split('_')[1]) || 1;
        return Math.max(0, rawDamage - armorValue);
    }
    return rawDamage;
}

/**
 * Calculate total possible damage to hero
 */
export function calculatePotentialDamage(state, forPlayer) {
    const board = state[forPlayer].board;
    let totalDamage = 0;

    board.forEach(creature => {
        if (creature && creature.canAttack && !creature.hasAttacked) {
            totalDamage += creature.currentAttack;
        }
    });

    return totalDamage;
}

/**
 * Check if player has lethal on board
 */
export function hasLethal(state, forPlayer) {
    const opponent = forPlayer === 'player' ? 'enemy' : 'player';

    // Check for guards
    const hasGuards = state[opponent].board.some(c =>
        c && c.keywords?.includes('guard')
    );

    if (hasGuards) {
        // Need to calculate if we can clear guards and still have lethal
        return false; // Simplified - could be enhanced
    }

    const potentialDamage = calculatePotentialDamage(state, forPlayer);
    return potentialDamage >= state[opponent].health;
}
