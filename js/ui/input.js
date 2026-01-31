/**
 * Stonefire - Input Handling
 * Handles user interactions (clicks, drags)
 */

import { store, actions, events } from '../game/state.js';
import { playCard, attack, endTurn, canPlayCard, canCreatureAttack, getValidAttackTargets, getValidTargets } from '../game/engine.js';
import { showCardPreview, hideCardPreview } from './cards.js';
import { highlightAttackTargets, highlightSpellTargets, clearTargetHighlights, clearSelectionHighlights, shakeGuardCreatures } from './board.js';
import { showAttackArrow, hideAttackArrow, render } from './renderer.js';
import { showWizard, showFactionSelection } from './wizard.js';

// Input state
let isDragging = false;
let draggedCard = null;
let dragOffset = { x: 0, y: 0 };

// Track last hovered target when showing a dynamic spell/attack arrow
let lastHoverTarget = null;

// Touch preview state
let touchPreviewTimer = null;
let touchPreviewActive = false;
let touchStartPos = null;
let suppressNextClick = false;
let touchPreviewShown = false;

const TOUCH_PREVIEW_DELAY = 350;
const TOUCH_PREVIEW_MOVE_THRESHOLD = 10;
const TOUCH_PREVIEW_SUPPRESS_TIMEOUT = 300;

/**
 * Initialize input handlers
 */
export function initInput() {
    // End turn button
    document.getElementById('end-turn-btn').addEventListener('click', handleEndTurn);

    // Restart button
    document.getElementById('restart-btn').addEventListener('click', handleRestart);

    // Faction button (in header) - shows only faction selection, not full wizard
    const factionBtn = document.getElementById('factionBtn');
    if (factionBtn) {
        factionBtn.addEventListener('click', () => showFactionSelection());
    }

    // Mobile faction button (shown in mobile landscape)
    const mobileFactionBtn = document.getElementById('mobileFactionBtn');
    if (mobileFactionBtn) {
        mobileFactionBtn.addEventListener('click', () => showFactionSelection());
    }

    // Global click handler for cards and targets
    document.addEventListener('click', handleClick);

    // Right click to cancel selection
    document.addEventListener('contextmenu', handleRightClick);

    // Mouse move for card preview and attack arrow
    document.addEventListener('mousemove', handleMouseMove);

    // Touch/pen hold for card preview
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);
}

/**
 * Handle click events
 */
function handleClick(e) {
    if (suppressNextClick) {
        suppressNextClick = false;
        touchPreviewShown = false;
        return;
    }
    const state = store.getState();
    if (state.gameOver) return;

    // Check if clicked on a card
    const cardEl = e.target.closest('.card');
    const heroEl = e.target.closest('.hero-portrait');
    const slotEl = e.target.closest('.board-slot');

    // Handle card clicks
    if (cardEl) {
        handleCardClick(cardEl, state);
        return;
    }

    // Handle hero clicks (for attacking)
    if (heroEl) {
        handleHeroClick(heroEl, state);
        return;
    }

    // Handle empty slot clicks (for playing creatures)
    if (slotEl && !slotEl.querySelector('.card')) {
        handleSlotClick(slotEl, state);
        return;
    }

    // Clicked elsewhere - clear selection
    clearSelection();
}

/**
 * Handle card click
 */
function handleCardClick(cardEl, state) {
    const instanceId = cardEl.dataset.instanceId;
    const playerId = cardEl.dataset.playerId;
    const selection = state.selection;

    // Is this card in hand?
    const inHand = cardEl.closest('.hand') !== null;
    const onBoard = cardEl.closest('.board') !== null;

    if (inHand && playerId === 'player') {
        // Clicking a card in player's hand
        handleHandCardClick(instanceId, state);
    } else if (onBoard) {
        // Clicking a creature on the board
        handleBoardCreatureClick(instanceId, playerId, state);
    }
}

/**
 * Handle clicking a card in hand
 */
function handleHandCardClick(instanceId, state) {
    // Check if we can play this card
    if (!canPlayCard('player', instanceId)) {
        // Can't play - just select it to show info
        store.dispatch(actions.setSelection('hand_card', instanceId, 'player'));
        render(state);
        return;
    }

    const card = state.player.hand.find(c => c.instanceId === instanceId);

    // If card requires target, check if we can auto-target
    if (card.requiresTarget) {
        const validTargets = getValidTargets('player', card);

        // Auto-target if only one valid target exists
        if (validTargets.length === 1) {
            playCard('player', instanceId, validTargets[0]);
            return;
        }

        // Multiple targets - require selection
        if (validTargets.length > 1) {
            store.dispatch(actions.setSelection('hand_card', instanceId, 'player'));
            render(state);
            highlightSpellTargets('player', card);
            return;
        }

        // No valid targets - can't play the card
        console.warn('No valid targets for card');
        return;
    }

    // Play the card directly (no target needed)
    playCard('player', instanceId);
}

/**
 * Handle clicking a creature on the board
 */
function handleBoardCreatureClick(instanceId, playerId, state) {
    const selection = state.selection;

    // If we have a creature selected and click on an enemy, try to attack
    if (selection.type === 'board_creature' && selection.playerId === 'player' && playerId === 'enemy') {
        // Check if this is a valid target
        const targets = getValidAttackTargets('player');
        const isValidTarget = targets.some(t => t.id === instanceId);

        if (isValidTarget) {
            attack('player', selection.cardId, 'enemy', instanceId);
            clearSelection();
            return;
        } else {
            // Invalid target - check if guards are blocking
            const enemyState = state.enemy;
            const hasGuards = enemyState.board.some(c => c && c.keywords?.includes('guard'));
            if (hasGuards) {
                shakeGuardCreatures('enemy');
            }
        }
    }

    // If we have a spell that targets creatures
    if (selection.type === 'hand_card' && selection.playerId === 'player') {
        const card = state.player.hand.find(c => c.instanceId === selection.cardId);
        if (card && card.requiresTarget) {
            // Check if this creature is a valid target based on targetType
            const isValid = isValidSpellTarget(card, playerId, instanceId, state);
            if (isValid) {
                playCard('player', selection.cardId, { player: playerId, id: instanceId });
                clearSelection();
                return;
            }
        }
    }

    // If clicking own creature that can attack, select it
    if (playerId === 'player' && canCreatureAttack('player', instanceId)) {
        store.dispatch(actions.setSelection('board_creature', instanceId, 'player'));
        highlightAttackTargets('player', store.getState());
        render(state);
        return;
    }

    // Otherwise just show selection (for info)
    store.dispatch(actions.setSelection('board_creature', instanceId, playerId));
    render(state);
}

/**
 * Check if a creature is a valid spell target
 */
function isValidSpellTarget(card, targetPlayerId, targetId, state) {
    switch (card.targetType) {
        case 'enemy_creature':
            return targetPlayerId === 'enemy';
        case 'friendly_creature':
            return targetPlayerId === 'player';
        case 'any_creature':
        case 'any':
            return true;
        case 'enemy':
            return targetPlayerId === 'enemy';
        default:
            return false;
    }
}

function getCardDataFromElement(cardEl, state) {
    if (!cardEl || cardEl.classList.contains('face-down')) return null;
    const instanceId = cardEl.dataset.instanceId;
    const playerId = cardEl.dataset.playerId;
    if (!instanceId || !playerId) return null;
    const playerState = state[playerId];
    if (!playerState) return null;

    if (cardEl.closest('.hand')) {
        return playerState.hand.find(c => c.instanceId === instanceId) || null;
    }

    if (cardEl.closest('.board')) {
        return playerState.board.find(c => c?.instanceId === instanceId) || null;
    }

    return null;
}

function getPreviewAnchor(cardEl) {
    const rect = cardEl.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}

function clearTouchPreview() {
    if (touchPreviewTimer) {
        clearTimeout(touchPreviewTimer);
        touchPreviewTimer = null;
    }
    if (touchPreviewActive) {
        hideCardPreview();
    }
    touchPreviewActive = false;
    touchStartPos = null;
}

function handlePointerDown(e) {
    if (e.pointerType !== 'touch') return;
    const state = store.getState();
    const cardEl = e.target.closest('.card:not(.face-down)');
    if (!cardEl) return;

    const card = getCardDataFromElement(cardEl, state);
    if (!card) return;

    clearTouchPreview();
    touchStartPos = { x: e.clientX, y: e.clientY };
    touchPreviewTimer = setTimeout(() => {
        const anchor = getPreviewAnchor(cardEl);
        showCardPreview(card, anchor.x, anchor.y);
        touchPreviewActive = true;
        suppressNextClick = true;
        touchPreviewShown = true;
    }, TOUCH_PREVIEW_DELAY);
}

function handlePointerMove(e) {
    if (e.pointerType !== 'touch' || !touchPreviewTimer || !touchStartPos) return;
    const deltaX = e.clientX - touchStartPos.x;
    const deltaY = e.clientY - touchStartPos.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance > TOUCH_PREVIEW_MOVE_THRESHOLD) {
        clearTouchPreview();
    }
}

function handlePointerUp(e) {
    if (e.pointerType !== 'touch') return;
    const hadPreview = touchPreviewShown;
    clearTouchPreview();
    if (hadPreview) {
        touchPreviewShown = false;
        setTimeout(() => {
            suppressNextClick = false;
        }, TOUCH_PREVIEW_SUPPRESS_TIMEOUT);
    }
}

/**
 * Handle clicking on a hero portrait
 */
function handleHeroClick(heroEl, state) {
    const isEnemy = heroEl.classList.contains('enemy-hero');
    const selection = state.selection;

    // If nothing selected and clicking your own hero, open wizard
    if (!selection.type && !isEnemy) {
        showWizard();
        return;
    }

    // If we have an attacker selected and clicking enemy hero
    if (selection.type === 'board_creature' && selection.playerId === 'player' && isEnemy) {
        const targets = getValidAttackTargets('player');
        const canAttackHero = targets.some(t => t.id === 'hero');

        if (canAttackHero) {
            attack('player', selection.cardId, 'enemy', 'hero');
            clearSelection();
            return;
        } else {
            // Can't attack hero - guards blocking
            const enemyState = state.enemy;
            const hasGuards = enemyState.board.some(c => c && c.keywords?.includes('guard'));
            if (hasGuards) {
                shakeGuardCreatures('enemy');
            }
        }
    }

    // If we have a spell that can target heroes
    if (selection.type === 'hand_card' && selection.playerId === 'player') {
        const card = state.player.hand.find(c => c.instanceId === selection.cardId);
        if (card && card.requiresTarget) {
            const targetPlayer = isEnemy ? 'enemy' : 'player';
            if (card.targetType === 'any' || card.targetType === 'hero' ||
                (card.targetType === 'enemy' && isEnemy)) {
                playCard('player', selection.cardId, { player: targetPlayer, id: 'hero' });
                clearSelection();
                return;
            }
        }
    }

    clearSelection();
}

/**
 * Handle clicking on an empty board slot
 */
function handleSlotClick(slotEl, state) {
    const selection = state.selection;
    const boardEl = slotEl.closest('.board');
    const isPlayerBoard = boardEl.id === 'player-board';

    // If we have a creature card selected, play it to this slot
    if (selection.type === 'hand_card' && selection.playerId === 'player' && isPlayerBoard) {
        const card = state.player.hand.find(c => c.instanceId === selection.cardId);
        if (card && card.type === 'creature') {
            playCard('player', selection.cardId);
            clearSelection();
            return;
        }
    }

    clearSelection();
}

/**
 * Handle right click (cancel selection)
 */
function handleRightClick(e) {
    e.preventDefault();
    clearSelection();
}

/**
 * Handle mouse move
 */
function handleMouseMove(e) {
    const state = store.getState();
    const selection = state.selection;

    const svg = document.getElementById('attack-arrow');
    const line = document.getElementById('arrow-line');

    // Helper to update hover class tracking
    function setHoverTarget(el) {
        if (lastHoverTarget && lastHoverTarget !== el) {
            lastHoverTarget.classList.remove('hover-target');
            lastHoverTarget = null;
        }
        if (el && el !== lastHoverTarget) {
            el.classList.add('hover-target');
            lastHoverTarget = el;
        }
    }

    // Handle creature attacker selection (existing behavior), but snap to hovered valid target when present
    if (selection.type === 'board_creature' && selection.playerId === 'player') {
        const attackerEl = document.querySelector(`[data-instance-id="${selection.cardId}"]`);
        if (attackerEl) {
            const rect = attackerEl.getBoundingClientRect();
            const startX = rect.left + rect.width / 2;
            const startY = rect.top + rect.height / 2;

            // If hovering a valid target, snap to it
            const targetEl = e.target.closest('.card.targetable, .hero-portrait.targetable');
            if (targetEl) {
                const targetRect = targetEl.getBoundingClientRect();
                line.setAttribute('x2', targetRect.left + targetRect.width / 2);
                line.setAttribute('y2', targetRect.top + targetRect.height / 2);
                setHoverTarget(targetEl);
            } else {
                line.setAttribute('x2', e.clientX);
                line.setAttribute('y2', e.clientY);
                setHoverTarget(null);
            }

            line.setAttribute('x1', startX);
            line.setAttribute('y1', startY);

            svg.classList.remove('hidden');
            return; // early return so spell preview logic below doesn't interfere
        }
    }

    // If a spell in hand is selected and requires a target, show dynamic arrow from the card to hover/mouse
    if (selection.type === 'hand_card' && selection.playerId === 'player') {
        const card = state.player.hand.find(c => c.instanceId === selection.cardId);
        if (card && card.requiresTarget) {
            const cardEl = document.querySelector(`[data-instance-id="${selection.cardId}"]`);
            // Fallback start point is player hero if card isn't in DOM for some reason
            let startX = window.innerWidth / 2;
            let startY = window.innerHeight - 100;
            if (cardEl) {
                const rect = cardEl.getBoundingClientRect();
                startX = rect.left + rect.width / 2;
                startY = rect.top + rect.height / 2;
            }

            const targetEl = e.target.closest('.card.targetable, .hero-portrait.targetable');
            if (targetEl) {
                const tr = targetEl.getBoundingClientRect();
                line.setAttribute('x2', tr.left + tr.width / 2);
                line.setAttribute('y2', tr.top + tr.height / 2);
                setHoverTarget(targetEl);
            } else {
                line.setAttribute('x2', e.clientX);
                line.setAttribute('y2', e.clientY);
                setHoverTarget(null);
            }

            line.setAttribute('x1', startX);
            line.setAttribute('y1', startY);

            svg.classList.remove('hidden');
            return;
        }
    }

    // Card preview on hover (for hand cards and board cards)
    const cardEl = e.target.closest('.card:not(.face-down)');
    if (cardEl && (cardEl.closest('.hand') || cardEl.closest('.board'))) {
        const card = getCardDataFromElement(cardEl, state);
        if (card) {
            showCardPreview(card, e.clientX, e.clientY);
        }
    } else if (!e.target.closest('.card-preview')) {
        hideCardPreview();
    }

    // If no relevant selection, hide the arrow and any hover-target
    svg.classList.add('hidden');
    if (lastHoverTarget) {
        lastHoverTarget.classList.remove('hover-target');
        lastHoverTarget = null;
    }
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyDown(e) {
    const state = store.getState();

    switch (e.key) {
        case 'Escape':
            clearSelection();
            break;

        case ' ':
        case 'Enter':
            if (state.activePlayer === 'player' && !state.gameOver) {
                handleEndTurn();
            }
            break;

        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
            // Quick play card from hand by position
            const index = parseInt(e.key) - 1;
            if (state.player.hand[index]) {
                const card = state.player.hand[index];
                if (canPlayCard('player', card.instanceId)) {
                    if (!card.requiresTarget) {
                        playCard('player', card.instanceId);
                    } else {
                        // Check for auto-target
                        const validTargets = getValidTargets('player', card);
                        if (validTargets.length === 1) {
                            playCard('player', card.instanceId, validTargets[0]);
                        } else if (validTargets.length > 1) {
                            store.dispatch(actions.setSelection('hand_card', card.instanceId, 'player'));
                            render(state);
                            highlightSpellTargets('player', card);
                        }
                    }
                }
            }
            break;
    }
}

/**
 * Clear current selection
 */
function clearSelection() {
    store.dispatch(actions.clearSelection());
    clearTargetHighlights();
    clearSelectionHighlights();
    hideAttackArrow();
    render(store.getState());
}

/**
 * Handle end turn button click
 */
function handleEndTurn() {
    const state = store.getState();
    if (state.activePlayer !== 'player' || state.gameOver) return;

    clearSelection();
    endTurn();
}

/**
 * Handle restart button click
 */
function handleRestart() {
    events.emit('RESTART_GAME');
}

/**
 * Disable all input (during AI turn or animations)
 */
export function disableInput() {
    document.body.classList.add('input-disabled');
}

/**
 * Enable input
 */
export function enableInput() {
    document.body.classList.remove('input-disabled');
}
