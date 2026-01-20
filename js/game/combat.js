/**
 * Stonefire - Combat Resolution
 * Handles attack resolution and damage calculation
 */

import { store, actions, events } from './state.js';
import { checkTriggeredEffects } from './effects.js';

/**
 * Resolve combat between attacker and defender
 */
export function resolveCombat(attackerPlayer, attackerId, targetPlayer, targetId) {
    const state = store.getState();

    const attacker = state[attackerPlayer].board.find(c => c.instanceId === attackerId);
    if (!attacker) return;

    // Attacking hero
    if (targetId === 'hero') {
        resolveHeroAttack(attackerPlayer, attacker, targetPlayer);
        return;
    }

    // Attacking creature
    const defender = state[targetPlayer].board.find(c => c.instanceId === targetId);
    if (!defender) return;

    resolveCreatureAttack(attackerPlayer, attacker, targetPlayer, defender);
}

/**
 * Resolve attack against enemy hero
 */
function resolveHeroAttack(attackerPlayer, attacker, targetPlayer) {
    const damage = attacker.currentAttack;

    events.emit('ATTACK_STARTED', {
        attackerPlayer,
        attackerId: attacker.instanceId,
        targetPlayer,
        targetId: 'hero'
    });

    // Deal damage to hero
    store.dispatch(actions.dealDamage(targetPlayer, 'hero', damage, attacker.instanceId));

    events.emit('HERO_ATTACKED', {
        attackerPlayer,
        attacker,
        targetPlayer,
        damage
    });

    events.emit('HERO_DAMAGED', {
        player: targetPlayer,
        amount: damage,
        source: attacker.instanceId
    });
}

/**
 * Resolve combat between two creatures
 */
function resolveCreatureAttack(attackerPlayer, attacker, targetPlayer, defender) {
    events.emit('ATTACK_STARTED', {
        attackerPlayer,
        attackerId: attacker.instanceId,
        targetPlayer,
        targetId: defender.instanceId
    });

    // Calculate damage with Armored keyword
    const attackerDamage = calculateDamage(attacker.currentAttack, defender);
    const defenderDamage = calculateDamage(defender.currentAttack, attacker);

    // Deal damage to defender
    store.dispatch(actions.dealDamage(
        targetPlayer,
        defender.instanceId,
        attackerDamage,
        attacker.instanceId
    ));

    // Deal damage back to attacker (creatures fight back)
    store.dispatch(actions.dealDamage(
        attackerPlayer,
        attacker.instanceId,
        defenderDamage,
        defender.instanceId
    ));

    // Check for TAKES_DAMAGE triggered abilities (e.g., Kentrosaurus)
    if (attackerDamage > 0) {
        checkTriggeredEffects('TAKES_DAMAGE', {
            player: targetPlayer,
            creature: { player: targetPlayer, id: defender.instanceId },
            attacker: { player: attackerPlayer, id: attacker.instanceId },
            damage: attackerDamage
        });
    }
    if (defenderDamage > 0) {
        checkTriggeredEffects('TAKES_DAMAGE', {
            player: attackerPlayer,
            creature: { player: attackerPlayer, id: attacker.instanceId },
            attacker: { player: targetPlayer, id: defender.instanceId },
            damage: defenderDamage
        });
    }

    // Check for Venomous keyword
    checkVenomous(attackerPlayer, attacker, targetPlayer, defender, attackerDamage);
    checkVenomous(targetPlayer, defender, attackerPlayer, attacker, defenderDamage);

    events.emit('COMBAT_RESOLVED', {
        attackerPlayer,
        attacker,
        targetPlayer,
        defender,
        attackerDamage,
        defenderDamage
    });
}

/**
 * Calculate damage considering Armored keyword
 */
function calculateDamage(rawDamage, target) {
    let damage = rawDamage;

    // Check for Armored keyword
    const armoredKeyword = target.keywords?.find(k => k.startsWith('armored'));
    if (armoredKeyword) {
        // Extract armor value (e.g., 'armored_2' -> 2)
        const armorValue = parseInt(armoredKeyword.split('_')[1]) || 1;
        damage = Math.max(0, damage - armorValue);
    }

    return damage;
}

/**
 * Check and apply Venomous effect
 */
function checkVenomous(sourcePlayer, source, targetPlayer, target, damageDealt) {
    if (damageDealt > 0 && source.keywords?.includes('venomous')) {
        // Venomous - destroy any creature this damages
        // Get fresh state to check if target is still alive
        const state = store.getState();
        const currentTarget = state[targetPlayer].board.find(
            c => c.instanceId === target.instanceId
        );

        if (currentTarget && currentTarget.currentHealth > 0) {
            // Set health to 0 to trigger death
            store.dispatch(actions.modifyCreature(targetPlayer, target.instanceId, {
                currentHealth: 0
            }));

            events.emit('VENOMOUS_TRIGGERED', {
                source: source.instanceId,
                target: target.instanceId
            });
        }
    }
}

/**
 * Calculate potential damage preview (for UI)
 */
export function calculateCombatPreview(attackerPlayer, attackerId, targetPlayer, targetId) {
    const state = store.getState();

    const attacker = state[attackerPlayer].board.find(c => c.instanceId === attackerId);
    if (!attacker) return null;

    if (targetId === 'hero') {
        return {
            attackerDamageToHero: attacker.currentAttack,
            attackerSurvives: true,
            defenderHealth: state[targetPlayer].health - attacker.currentAttack
        };
    }

    const defender = state[targetPlayer].board.find(c => c.instanceId === targetId);
    if (!defender) return null;

    const attackerDamage = calculateDamage(attacker.currentAttack, defender);
    const defenderDamage = calculateDamage(defender.currentAttack, attacker);

    // Check for Venomous kills
    const attackerKilledByVenom = defenderDamage > 0 && defender.keywords?.includes('venomous');
    const defenderKilledByVenom = attackerDamage > 0 && attacker.keywords?.includes('venomous');

    const attackerHealthAfter = attackerKilledByVenom ? 0 : attacker.currentHealth - defenderDamage;
    const defenderHealthAfter = defenderKilledByVenom ? 0 : defender.currentHealth - attackerDamage;

    return {
        attackerDamage,
        defenderDamage,
        attackerSurvives: attackerHealthAfter > 0,
        defenderSurvives: defenderHealthAfter > 0,
        attackerHealthAfter,
        defenderHealthAfter,
        attackerKilledByVenom,
        defenderKilledByVenom
    };
}

/**
 * Check if this attack would be lethal to the enemy hero
 */
export function wouldBeLethal(attackerPlayer) {
    const state = store.getState();
    const targetPlayer = attackerPlayer === 'player' ? 'enemy' : 'player';

    // Calculate total potential damage from all attackers
    let totalDamage = 0;

    state[attackerPlayer].board.forEach(creature => {
        if (creature && canAttackHero(attackerPlayer, creature, state)) {
            totalDamage += creature.currentAttack;
        }
    });

    return totalDamage >= state[targetPlayer].health;
}

/**
 * Check if a creature can attack the enemy hero
 */
function canAttackHero(attackerPlayer, creature, state) {
    if (!creature.canAttack || creature.hasAttacked) return false;
    if (creature.summoningSick && !creature.keywords?.includes('charge')) return false;
    if (creature.currentAttack <= 0) return false;

    // Check for Guards
    const targetPlayer = attackerPlayer === 'player' ? 'enemy' : 'player';
    const guards = state[targetPlayer].board.filter(c =>
        c && c.keywords?.includes('guard')
    );

    return guards.length === 0;
}
