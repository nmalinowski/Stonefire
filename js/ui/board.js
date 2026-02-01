/**
 * Stonefire - Board Rendering
 * Handles rendering of game boards and creatures
 */

import { renderCard } from './cards.js';
import { getValidAttackTargets } from '../game/engine.js';
import { store } from '../game/state.js';

/**
 * Render a board with creatures
 * @param {HTMLElement} boardEl - Board container element
 * @param {Array} creatures - Array of creatures on the board
 * @param {string} playerId - 'player' | 'enemy'
 * @param {Object} state - Current game state
 */
export function renderBoard(boardEl, creatures, playerId, state) {
    if (!boardEl) return;
    const slotsContainer = boardEl.querySelector('.board-slots');
    if (!slotsContainer) return;
    const slots = slotsContainer.querySelectorAll('.board-slot');

    // Clear all slots first
    slots.forEach(slot => {
        slot.innerHTML = '';
        slot.classList.remove('valid-target', 'hover-target');
    });

    // Render creatures in slots
    creatures.forEach((creature, index) => {
        if (!creature || index >= slots.length) return;

        const slot = slots[index];
        const cardOptions = getCreatureOptions(creature, playerId, state);
        const cardEl = renderCard(creature, cardOptions);

        slot.appendChild(cardEl);
    });

    // Update slot states based on selection
    updateSlotStates(boardEl, playerId, state);
}

/**
 * Get rendering options for a creature
 */
function getCreatureOptions(creature, playerId, state) {
    const isPlayerTurn = state.activePlayer === 'player';
    const isPlayerCreature = playerId === 'player';
    const selection = state.selection;

    // Can this creature attack?
    const canAttack = isPlayerTurn &&
        isPlayerCreature &&
        !creature.hasAttacked &&
        creature.currentAttack > 0 &&
        creature.canAttack !== false &&
        (!creature.summoningSick || creature.keywords?.includes('charge'));

    // Is this creature selected for attacking?
    const selected = selection.type === 'board_creature' &&
        selection.cardId === creature.instanceId &&
        selection.playerId === playerId;

    // Is this creature a valid attack target?
    let targetable = false;
    if (selection.type === 'board_creature' && selection.playerId !== playerId) {
        // Check if this creature is a valid target
        const targets = getValidAttackTargets(selection.playerId);
        targetable = targets.some(t => t.id === creature.instanceId);
    }

    return {
        onBoard: true,
        canAttack,
        selected,
        targetable,
        summoningSick: creature.summoningSick && !creature.keywords?.includes('charge'),
        playerId
    };
}

/**
 * Update board slot visual states
 */
function updateSlotStates(boardEl, playerId, state) {
    const slots = boardEl.querySelectorAll('.board-slot');
    const selection = state.selection;

    // If player has a hand card selected and it's a creature, show valid placement
    if (selection.type === 'hand_card' && selection.playerId === 'player' && playerId === 'player') {
        const card = state.player.hand.find(c => c.instanceId === selection.cardId);
        if (card && card.type === 'creature') {
            // Highlight empty slots as valid targets
            slots.forEach((slot, index) => {
                if (!state.player.board[index]) {
                    slot.classList.add('valid-target');
                }
            });
        }
    }
}

/**
 * Find the board slot element for a creature
 */
export function findCreatureSlot(boardEl, instanceId) {
    const slots = boardEl.querySelectorAll('.board-slot');
    for (const slot of slots) {
        const card = slot.querySelector('.card');
        if (card && card.dataset.instanceId === instanceId) {
            return slot;
        }
    }
    return null;
}

/**
 * Get creature element by instance ID
 */
export function getCreatureElement(instanceId) {
    return document.querySelector(`[data-instance-id="${instanceId}"]`);
}

/**
 * Highlight valid attack targets
 */
export function highlightAttackTargets(attackerPlayer, state) {
    const targets = getValidAttackTargets(attackerPlayer);
    const opponent = attackerPlayer === 'player' ? 'enemy' : 'player';

    // Highlight valid creature targets
    targets.forEach(target => {
        if (target.id === 'hero') {
            const heroEl = document.getElementById(`${opponent}-hero`);
            if (heroEl) heroEl.classList.add('targetable');
        } else {
            const creatureEl = getCreatureElement(target.id);
            if (creatureEl) creatureEl.classList.add('targetable');
        }
    });
}

/**
 * Highlight valid spell targets for a given card and player
 */
export function highlightSpellTargets(playerId, card) {
    const targets = getValidTargets(playerId, card);

    targets.forEach(t => {
        if (t.id === 'hero') {
            const heroEl = document.getElementById(`${t.player}-hero`);
            if (heroEl) heroEl.classList.add('targetable');
        } else {
            const creatureEl = getCreatureElement(t.id);
            if (creatureEl) creatureEl.classList.add('targetable');
        }
    });
}

/**
 * Clear all target highlights
 */
export function clearTargetHighlights() {
    // Clear creature highlights
    document.querySelectorAll('.card.targetable, .card.hover-target').forEach(el => {
        el.classList.remove('targetable');
        el.classList.remove('hover-target');
    });

    // Clear hero highlights
    document.querySelectorAll('.hero-portrait.targetable, .hero-portrait.hover-target').forEach(el => {
        el.classList.remove('targetable');
        el.classList.remove('hover-target');
    });

    // Clear slot highlights
    document.querySelectorAll('.board-slot.valid-target').forEach(el => {
        el.classList.remove('valid-target');
    });
}

/**
 * Clear selection highlights
 */
export function clearSelectionHighlights() {
    document.querySelectorAll('.card.selected').forEach(el => {
        el.classList.remove('selected');
    });
}

/**
 * Get board element for a player
 */
export function getBoardElement(playerId) {
    return document.getElementById(`${playerId}-board`);
}

/**
 * Get the position of an empty slot on the board
 */
export function getEmptySlotPosition(playerId, state) {
    const board = state[playerId].board;
    const boardEl = getBoardElement(playerId);
    if (!boardEl) return null;
    const slots = boardEl.querySelectorAll('.board-slot');

    for (let i = 0; i < slots.length; i++) {
        if (!board[i]) {
            const rect = slots[i].getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                slot: slots[i]
            };
        }
    }

    return null;
}

/**
 * Animate creature entering the board
 */
export function animateCreatureEnter(creatureEl) {
    creatureEl.classList.add('entering-board');
    creatureEl.addEventListener('animationend', () => {
        creatureEl.classList.remove('entering-board');
    }, { once: true });
}

/**
 * Animate creature leaving the board (death)
 */
export function animateCreatureLeave(creatureEl) {
    return new Promise(resolve => {
        creatureEl.classList.add('dying');
        creatureEl.addEventListener('animationend', () => {
            resolve();
        }, { once: true });
    });
}

/**
 * Shake all guard creatures to indicate they must be attacked first
 */
export function shakeGuardCreatures(targetPlayer) {
    const state = store.getState();
    const guards = state[targetPlayer].board.filter(c =>
        c && c.keywords?.includes('guard')
    );

    guards.forEach(guard => {
        const el = document.querySelector(`[data-instance-id="${guard.instanceId}"]`);
        if (el) {
            el.classList.add('guard-warning');
            setTimeout(() => el.classList.remove('guard-warning'), 500);
        }
    });
}
