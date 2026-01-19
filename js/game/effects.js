/**
 * Stonefire - Effect Processing
 * Handles card abilities, spells, and triggered effects
 */

import { store, actions, events } from './state.js';

/**
 * Process a card effect
 * @param {Object} effect - The effect definition
 * @param {string} sourcePlayer - 'player' | 'enemy'
 * @param {Object} target - Target information { player, id }
 */
export function processEffect(effect, sourcePlayer, target) {
    if (!effect) return;

    const state = store.getState();
    const opponent = sourcePlayer === 'player' ? 'enemy' : 'player';

    switch (effect.type) {
        case 'damage':
            processDamageEffect(effect, sourcePlayer, opponent, target, state);
            break;

        case 'heal':
            processHealEffect(effect, sourcePlayer, opponent, target, state);
            break;

        case 'buff':
            processBuffEffect(effect, sourcePlayer, opponent, target, state);
            break;

        case 'debuff':
            processDebuffEffect(effect, sourcePlayer, opponent, target, state);
            break;

        case 'draw':
            processDrawEffect(effect, sourcePlayer);
            break;

        case 'destroy':
            processDestroyEffect(effect, sourcePlayer, opponent, target, state);
            break;

        case 'summon':
            processSummonEffect(effect, sourcePlayer);
            break;

        case 'mana':
            processManaEffect(effect, sourcePlayer);
            break;

        case 'transform':
            processTransformEffect(effect, sourcePlayer, opponent, target, state);
            break;

        case 'silence':
            processSilenceEffect(effect, target, state);
            break;

        case 'conditional':
            processConditionalEffect(effect, sourcePlayer, target, state);
            break;

        case 'multiple':
            // Process multiple effects in sequence
            effect.effects.forEach(e => processEffect(e, sourcePlayer, target));
            break;

        default:
            console.warn('Unknown effect type:', effect.type);
    }
}

/**
 * Process damage effect
 */
function processDamageEffect(effect, sourcePlayer, opponent, target, state) {
    const amount = effect.amount;

    switch (effect.target) {
        case 'target':
            // Requires target selection
            if (target) {
                store.dispatch(actions.dealDamage(target.player, target.id, amount));
            }
            break;

        case 'all_enemies':
            // Damage all enemy creatures
            state[opponent].board.forEach(creature => {
                if (creature) {
                    store.dispatch(actions.dealDamage(opponent, creature.instanceId, amount));
                }
            });
            break;

        case 'all_creatures':
            // Damage all creatures on board
            ['player', 'enemy'].forEach(playerKey => {
                state[playerKey].board.forEach(creature => {
                    if (creature) {
                        store.dispatch(actions.dealDamage(playerKey, creature.instanceId, amount));
                    }
                });
            });
            break;

        case 'enemy_hero':
            store.dispatch(actions.dealDamage(opponent, 'hero', amount));
            break;

        case 'random_enemy':
            const enemyTargets = [...state[opponent].board.filter(c => c)];
            // Optionally include hero
            if (effect.includeHero) {
                enemyTargets.push({ instanceId: 'hero' });
            }
            if (enemyTargets.length > 0) {
                const randomTarget = enemyTargets[Math.floor(Math.random() * enemyTargets.length)];
                store.dispatch(actions.dealDamage(opponent, randomTarget.instanceId, amount));
            }
            break;

        case 'random_enemy_creature':
            const enemyCreatures = state[opponent].board.filter(c => c);
            if (enemyCreatures.length > 0) {
                const randomCreature = enemyCreatures[Math.floor(Math.random() * enemyCreatures.length)];
                store.dispatch(actions.dealDamage(opponent, randomCreature.instanceId, amount));
            }
            break;
    }

    events.emit('EFFECT_DAMAGE', { effect, sourcePlayer, target });
}

/**
 * Process heal effect
 */
function processHealEffect(effect, sourcePlayer, opponent, target, state) {
    const amount = effect.amount;

    switch (effect.target) {
        case 'target':
            if (target) {
                store.dispatch(actions.heal(target.player, target.id, amount));
            }
            break;

        case 'self_hero':
            store.dispatch(actions.heal(sourcePlayer, 'hero', amount));
            break;

        case 'all_friendly':
            state[sourcePlayer].board.forEach(creature => {
                if (creature) {
                    store.dispatch(actions.heal(sourcePlayer, creature.instanceId, amount));
                }
            });
            break;

        case 'all_creatures':
            ['player', 'enemy'].forEach(playerKey => {
                state[playerKey].board.forEach(creature => {
                    if (creature) {
                        store.dispatch(actions.heal(playerKey, creature.instanceId, amount));
                    }
                });
            });
            break;
    }

    events.emit('EFFECT_HEAL', { effect, sourcePlayer, target });
}

/**
 * Process buff effect (increase attack/health)
 */
function processBuffEffect(effect, sourcePlayer, opponent, target, state) {
    const { attack = 0, health = 0 } = effect;

    const applyBuff = (playerKey, creatureId) => {
        const creature = state[playerKey].board.find(c => c?.instanceId === creatureId);
        if (creature) {
            const changes = {};
            if (attack) changes.currentAttack = creature.currentAttack + attack;
            if (health) {
                changes.currentHealth = creature.currentHealth + health;
                changes.maxHealth = creature.maxHealth + health;
            }
            store.dispatch(actions.modifyCreature(playerKey, creatureId, changes));
        }
    };

    switch (effect.target) {
        case 'target':
            if (target && target.id !== 'hero') {
                applyBuff(target.player, target.id);
            }
            break;

        case 'all_friendly':
            state[sourcePlayer].board.forEach(creature => {
                if (creature) applyBuff(sourcePlayer, creature.instanceId);
            });
            break;

        case 'all_creatures':
            ['player', 'enemy'].forEach(playerKey => {
                state[playerKey].board.forEach(creature => {
                    if (creature) applyBuff(playerKey, creature.instanceId);
                });
            });
            break;

        case 'random_friendly':
            const friendlyCreatures = state[sourcePlayer].board.filter(c => c);
            if (friendlyCreatures.length > 0) {
                const random = friendlyCreatures[Math.floor(Math.random() * friendlyCreatures.length)];
                applyBuff(sourcePlayer, random.instanceId);
            }
            break;
    }

    events.emit('EFFECT_BUFF', { effect, sourcePlayer, target });
}

/**
 * Process debuff effect (reduce attack/health)
 */
function processDebuffEffect(effect, sourcePlayer, opponent, target, state) {
    const { attack = 0, health = 0 } = effect;

    const applyDebuff = (playerKey, creatureId) => {
        const creature = state[playerKey].board.find(c => c?.instanceId === creatureId);
        if (creature) {
            const changes = {};
            if (attack) changes.currentAttack = Math.max(0, creature.currentAttack - attack);
            if (health) changes.currentHealth = creature.currentHealth - health;
            store.dispatch(actions.modifyCreature(playerKey, creatureId, changes));
        }
    };

    switch (effect.target) {
        case 'target':
            if (target && target.id !== 'hero') {
                applyDebuff(target.player, target.id);
            }
            break;

        case 'all_enemies':
            state[opponent].board.forEach(creature => {
                if (creature) applyDebuff(opponent, creature.instanceId);
            });
            break;
    }

    events.emit('EFFECT_DEBUFF', { effect, sourcePlayer, target });
}

/**
 * Process draw cards effect
 */
function processDrawEffect(effect, sourcePlayer) {
    const amount = effect.amount || 1;
    const targetPlayer = effect.target === 'opponent'
        ? (sourcePlayer === 'player' ? 'enemy' : 'player')
        : sourcePlayer;

    for (let i = 0; i < amount; i++) {
        store.dispatch(actions.drawCard(targetPlayer));
    }

    events.emit('EFFECT_DRAW', { amount, player: targetPlayer });
}

/**
 * Process destroy effect
 */
function processDestroyEffect(effect, sourcePlayer, opponent, target, state) {
    switch (effect.target) {
        case 'target':
            if (target && target.id !== 'hero') {
                store.dispatch(actions.destroyCreature(target.player, target.id));
            }
            break;

        case 'all_enemies':
            state[opponent].board.forEach(creature => {
                if (creature) {
                    store.dispatch(actions.destroyCreature(opponent, creature.instanceId));
                }
            });
            break;

        case 'all_creatures':
            ['player', 'enemy'].forEach(playerKey => {
                state[playerKey].board.forEach(creature => {
                    if (creature) {
                        store.dispatch(actions.destroyCreature(playerKey, creature.instanceId));
                    }
                });
            });
            break;

        case 'random_enemy':
            const enemies = state[opponent].board.filter(c => c);
            if (enemies.length > 0) {
                const random = enemies[Math.floor(Math.random() * enemies.length)];
                store.dispatch(actions.destroyCreature(opponent, random.instanceId));
            }
            break;

        case 'lowest_health':
            // Destroy creature with lowest health on enemy board
            const sorted = state[opponent].board
                .filter(c => c)
                .sort((a, b) => a.currentHealth - b.currentHealth);
            if (sorted.length > 0) {
                store.dispatch(actions.destroyCreature(opponent, sorted[0].instanceId));
            }
            break;
    }

    events.emit('EFFECT_DESTROY', { effect, sourcePlayer, target });
}

/**
 * Process summon effect (create creature tokens)
 */
function processSummonEffect(effect, sourcePlayer) {
    const state = store.getState();
    const board = state[sourcePlayer].board;

    // Check board space
    const count = Math.min(effect.count || 1, 7 - board.length);

    for (let i = 0; i < count; i++) {
        if (board.length >= 7) break;

        // Create token creature
        const token = {
            ...effect.creature,
            instanceId: `token_${Date.now()}_${i}`,
            currentAttack: effect.creature.attack,
            currentHealth: effect.creature.health,
            maxHealth: effect.creature.health,
            canAttack: effect.creature.keywords?.includes('charge'),
            hasAttacked: false,
            summoningSick: !effect.creature.keywords?.includes('charge')
        };

        // Dispatch directly to add to board
        store.dispatch(actions.playCard(sourcePlayer, token.instanceId, null));

        events.emit('CREATURE_SUMMONED', { player: sourcePlayer, creature: token });
    }
}

/**
 * Process mana effect
 */
function processManaEffect(effect, sourcePlayer) {
    const state = store.getState();
    const player = state[sourcePlayer];

    if (effect.gain) {
        const newMana = Math.min(10, player.mana + effect.gain);
        store.dispatch(actions.modifyMana(sourcePlayer, newMana, undefined));
    }

    if (effect.crystal) {
        const newMaxMana = Math.min(10, player.maxMana + effect.crystal);
        store.dispatch(actions.modifyMana(sourcePlayer, undefined, newMaxMana));
    }

    events.emit('EFFECT_MANA', { effect, sourcePlayer });
}

/**
 * Process transform effect (change a creature into another)
 */
function processTransformEffect(effect, sourcePlayer, opponent, target, state) {
    if (!target || target.id === 'hero') return;

    const targetPlayer = target.player;
    const creatureIndex = state[targetPlayer].board.findIndex(
        c => c?.instanceId === target.id
    );

    if (creatureIndex === -1) return;

    // Replace the creature with the transform target
    const newCreature = {
        ...effect.into,
        instanceId: target.id, // Keep same instance ID for tracking
        currentAttack: effect.into.attack,
        currentHealth: effect.into.health,
        maxHealth: effect.into.health,
        canAttack: false,
        hasAttacked: true,
        summoningSick: true
    };

    store.dispatch(actions.modifyCreature(targetPlayer, target.id, newCreature));

    events.emit('EFFECT_TRANSFORM', { effect, target, newCreature });
}

/**
 * Process silence effect (remove all abilities)
 */
function processSilenceEffect(effect, target, state) {
    if (!target || target.id === 'hero') return;

    store.dispatch(actions.modifyCreature(target.player, target.id, {
        keywords: [],
        abilities: [],
        battlecry: null,
        extinctEffect: null,
        text: ''
    }));

    events.emit('EFFECT_SILENCE', { target });
}

/**
 * Process conditional effect
 */
function processConditionalEffect(effect, sourcePlayer, target, state) {
    const condition = evaluateCondition(effect.condition, sourcePlayer, state);

    if (condition) {
        processEffect(effect.then, sourcePlayer, target);
    } else if (effect.else) {
        processEffect(effect.else, sourcePlayer, target);
    }
}

/**
 * Evaluate a condition
 */
function evaluateCondition(condition, sourcePlayer, state) {
    const opponent = sourcePlayer === 'player' ? 'enemy' : 'player';

    switch (condition.type) {
        case 'board_count':
            const count = state[sourcePlayer].board.filter(c => c).length;
            return evaluateComparison(count, condition.operator, condition.value);

        case 'health':
            const health = state[sourcePlayer].health;
            return evaluateComparison(health, condition.operator, condition.value);

        case 'enemy_board_count':
            const enemyCount = state[opponent].board.filter(c => c).length;
            return evaluateComparison(enemyCount, condition.operator, condition.value);

        case 'hand_count':
            const handCount = state[sourcePlayer].hand.length;
            return evaluateComparison(handCount, condition.operator, condition.value);

        case 'mana':
            const mana = state[sourcePlayer].mana;
            return evaluateComparison(mana, condition.operator, condition.value);

        default:
            return false;
    }
}

/**
 * Evaluate comparison operators
 */
function evaluateComparison(a, operator, b) {
    switch (operator) {
        case '>=': return a >= b;
        case '<=': return a <= b;
        case '>': return a > b;
        case '<': return a < b;
        case '==': return a === b;
        case '!=': return a !== b;
        default: return false;
    }
}

/**
 * Check for triggered effects (turn start, turn end, etc.)
 */
export function checkTriggeredEffects(trigger, context) {
    const state = store.getState();

    ['player', 'enemy'].forEach(playerKey => {
        state[playerKey].board.forEach(creature => {
            if (!creature) return;

            // Check creature's triggered abilities
            creature.abilities?.forEach(ability => {
                if (ability.trigger === trigger) {
                    // Check if trigger conditions match
                    if (ability.triggerPlayer && ability.triggerPlayer !== context.player) {
                        return;
                    }

                    processEffect(ability.effect, playerKey, null);
                }
            });
        });
    });
}

/**
 * Apply Evolve mechanic - transform creature when condition met
 */
export function checkEvolve(playerKey, creatureId) {
    const state = store.getState();
    const creature = state[playerKey].board.find(c => c?.instanceId === creatureId);

    if (!creature || !creature.evolveInto || !creature.evolveCondition) {
        return false;
    }

    const conditionMet = evaluateCondition(creature.evolveCondition, playerKey, state);

    if (conditionMet) {
        const evolvedForm = creature.evolveInto;
        store.dispatch(actions.modifyCreature(playerKey, creatureId, {
            ...evolvedForm,
            currentAttack: evolvedForm.attack,
            currentHealth: creature.currentHealth + (evolvedForm.health - creature.maxHealth),
            maxHealth: evolvedForm.health,
            keywords: evolvedForm.keywords || creature.keywords,
            text: evolvedForm.text || creature.text
        }));

        events.emit('CREATURE_EVOLVED', { player: playerKey, creature, evolvedForm });
        return true;
    }

    return false;
}
