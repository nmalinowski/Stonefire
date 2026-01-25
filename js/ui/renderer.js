/**
 * Stonefire - Main Renderer
 * Orchestrates all UI rendering based on game state
 */

import { store, events } from '../game/state.js';
import { renderCard, renderCardBack } from './cards.js';
import { renderBoard } from './board.js';
import { showDamageNumber, showTurnBanner, animateCardPlay, animateAttack, animateDeath, screenShake, flashElement } from './animations.js';
import { Faction } from '../data/cards.js';

// DOM element cache
let elements = {};

// Track known hand cards to only animate newly drawn cards
const knownHandCards = {
    player: new Set(),
    enemy: new Set()
};

/**
 * Initialize the renderer
 */
export function initRenderer() {
    cacheElements();
    subscribeToState();
    subscribeToEvents();

    // Load persisted faction choices (if any) and update hero icons
    const stored = (function() {
        try { return JSON.parse(localStorage.getItem('stonefire.factions') || 'null'); } catch (e) { return null; }
    })();

    if (stored && stored.player) {
        elements.currentHeroFactions.player = stored.player;
        elements.currentHeroFactions.enemy = stored.enemy || 'JURASSIC';
        setHeroFactions(stored.player, stored.enemy);
    }
}

/**
 * Cache DOM elements for performance
 */
function cacheElements() {
    elements = {
        // Player info
        playerHealth: document.getElementById('player-health'),
        playerMana: document.getElementById('player-mana'),
        playerDeckCount: document.getElementById('player-deck-count'),
        enemyHealth: document.getElementById('enemy-health'),
        enemyMana: document.getElementById('enemy-mana'),
        enemyDeckCount: document.getElementById('enemy-deck-count'),

        // Hands
        playerHand: document.getElementById('player-hand'),
        enemyHand: document.getElementById('enemy-hand'),

        // Boards
        playerBoard: document.getElementById('player-board'),
        enemyBoard: document.getElementById('enemy-board'),

        // Heroes
        playerHero: document.getElementById('player-hero'),
        enemyHero: document.getElementById('enemy-hero'),

        // UI elements
        turnIndicator: document.getElementById('turn-indicator'),
        turnText: document.getElementById('turn-text'),
        turnNumber: document.getElementById('turn-number'),
        endTurnBtn: document.getElementById('end-turn-btn'),

        // Overlays
        gameOverOverlay: document.getElementById('game-over-overlay'),
        gameOverText: document.getElementById('game-over-text'),
        restartBtn: document.getElementById('restart-btn'),

        // Faction selector
        factionSelector: document.getElementById('faction-selector'),
        factionButtons: document.querySelectorAll('.faction-selector-card'),
        factionApply: document.getElementById('faction-apply'),
        factionCancel: document.getElementById('faction-cancel'),

        // Faction confirmation overlay
        factionConfirm: document.getElementById('faction-confirm'),
        factionConfirmApply: document.getElementById('faction-confirm-apply'),
        factionConfirmCancel: document.getElementById('faction-confirm-cancel'),
        confirmPlayerIcon: document.getElementById('confirm-player-icon'),
        confirmEnemyIcon: document.getElementById('confirm-enemy-icon'),
        confirmPlayerLabel: document.getElementById('confirm-player-label'),
        confirmEnemyLabel: document.getElementById('confirm-enemy-label'),

        // Keep currently displayed hero faction (upper-case key or null)
        currentHeroFactions: { player: null, enemy: null },

        // Effects
        attackArrow: document.getElementById('attack-arrow'),
        arrowLine: document.getElementById('arrow-line'),
        damageNumbers: document.getElementById('damage-numbers')
    };
}

/**
 * Subscribe to state changes
 */
function subscribeToState() {
    store.subscribe((state, prevState, action) => {
        render(state);
    });
}

/**
 * Subscribe to game events for animations
 */
function subscribeToEvents() {
    events.on('TURN_STARTED', ({ player }) => {
        const text = player === 'player' ? 'Your Turn' : "Enemy's Turn";
        showTurnBanner(text);
    });

    events.on('DAMAGE_DEALT', ({ targetPlayer, targetId, amount }) => {
        if (amount > 0) {
            const targetEl = getTargetElement(targetPlayer, targetId);
            if (targetEl) {
                showDamageNumber(targetEl, amount);
            }
        }
    });

    events.on('CREATURE_DIED', ({ player, creature }) => {
        // Death animation is handled by the board renderer
    });

    events.on('GAME_OVER', ({ winner }) => {
        showGameOver(winner);
    });

    events.on('GAME_STARTED', () => {
        knownHandCards.player.clear();
        knownHandCards.enemy.clear();
    });
}

/**
 * Main render function - updates all UI based on state
 */
export function render(state) {
    if (!state) state = store.getState();

    renderPlayerInfo(state);
    renderHands(state);
    renderBoards(state);
    renderTurnIndicator(state);
    renderHeroes(state);
    updateInteractiveStates(state);
}

/**
 * Render player info (health, mana, deck count)
 */
function renderPlayerInfo(state) {
    // Player
    elements.playerHealth.textContent = state.player.health;
    elements.playerMana.textContent = `${state.player.mana}/${state.player.maxMana}`;
    elements.playerDeckCount.textContent = state.player.deck.length;

    // Enemy
    elements.enemyHealth.textContent = state.enemy.health;
    elements.enemyMana.textContent = `${state.enemy.mana}/${state.enemy.maxMana}`;
    elements.enemyDeckCount.textContent = state.enemy.deck.length;

    // Health color changes
    updateHealthDisplay(elements.playerHealth, state.player.health, state.player.maxHealth);
    updateHealthDisplay(elements.enemyHealth, state.enemy.health, state.enemy.maxHealth);
}

/**
 * Update health display color based on amount
 */
function updateHealthDisplay(element, current, max) {
    const percentage = current / max;
    if (percentage <= 0.3) {
        element.style.color = '#e74c3c';
    } else if (percentage <= 0.6) {
        element.style.color = '#f39c12';
    } else {
        element.style.color = '#e74c3c';
    }
}

/**
 * Render both hands
 */
function renderHands(state) {
    // Player hand (visible)
    renderHand(elements.playerHand, state.player.hand, 'player', state);

    // Enemy hand (face down)
    renderEnemyHand(elements.enemyHand, state.enemy.hand.length);
}

/**
 * Render player's hand
 */
function renderHand(container, cards, playerId, state) {
    container.innerHTML = '';

    // Get current card instanceIds in hand
    const currentCardIds = new Set(cards.map(card => card.instanceId));

    // Clean up tracking: remove instanceIds no longer in hand
    for (const instanceId of knownHandCards[playerId]) {
        if (!currentCardIds.has(instanceId)) {
            knownHandCards[playerId].delete(instanceId);
        }
    }

    cards.forEach((card, index) => {
        const canPlay = state.activePlayer === playerId &&
            card.cost <= state[playerId].mana &&
            (card.type !== 'creature' || state[playerId].board.length < 7);

        const cardEl = renderCard(card, {
            playable: canPlay,
            inHand: true,
            playerId
        });

        // Check if this is a new card - only animate newly drawn cards
        if (!knownHandCards[playerId].has(card.instanceId)) {
            cardEl.classList.add('card-entering');
            knownHandCards[playerId].add(card.instanceId);
            // Remove class after animation completes
            setTimeout(() => cardEl.classList.remove('card-entering'), 150);
        }

        // Add hover effect positioning
        cardEl.style.setProperty('--card-index', index);
        cardEl.style.setProperty('--total-cards', cards.length);

        container.appendChild(cardEl);
    });
}

/**
 * Render enemy's hand (face down)
 */
function renderEnemyHand(container, cardCount) {
    container.innerHTML = '';

    for (let i = 0; i < cardCount; i++) {
        const cardBack = renderCardBack();
        container.appendChild(cardBack);
    }
}

/**
 * Render both boards
 */
function renderBoards(state) {
    renderBoard(elements.playerBoard, state.player.board, 'player', state);
    renderBoard(elements.enemyBoard, state.enemy.board, 'enemy', state);
}

/**
 * Render turn indicator
 */
function renderTurnIndicator(state) {
    const isPlayerTurn = state.activePlayer === 'player';

    elements.turnText.textContent = isPlayerTurn ? 'Your Turn' : "Enemy's Turn";
    elements.turnNumber.textContent = `Turn ${state.turn}`;

    // Update end turn button
    elements.endTurnBtn.disabled = !isPlayerTurn || state.gameOver;
}

/**
 * Render hero portraits
 */
function renderHeroes(state) {
    // Update targetable state based on selection
    const selection = state.selection;

    elements.playerHero.classList.remove('targetable');
    elements.enemyHero.classList.remove('targetable');

    if (selection.type === 'board_creature' && selection.playerId === 'player') {
        // Player creature selected, enemy hero is targetable
        const hasGuards = state.enemy.board.some(c => c && c.keywords?.includes('guard'));
        if (!hasGuards) {
            elements.enemyHero.classList.add('targetable');
        }
    }
}

/**
 * Update interactive states (playable cards, attackable creatures)
 */
function updateInteractiveStates(state) {
    if (state.gameOver) {
        elements.endTurnBtn.disabled = true;
        return;
    }

    const isPlayerTurn = state.activePlayer === 'player';

    // Update hand cards
    const handCards = elements.playerHand.querySelectorAll('.card');
    handCards.forEach(cardEl => {
        const canPlay = isPlayerTurn && cardEl.classList.contains('playable');
        cardEl.style.cursor = canPlay ? 'pointer' : 'default';
    });
}

/**
 * Get DOM element for a target (creature or hero)
 */
function getTargetElement(player, targetId) {
    if (targetId === 'hero') {
        return player === 'player' ? elements.playerHero : elements.enemyHero;
    }

    // Find creature on board
    const boardEl = player === 'player' ? elements.playerBoard : elements.enemyBoard;
    return boardEl.querySelector(`[data-instance-id="${targetId}"]`);
}

/**
 * Show game over overlay
 */
function showGameOver(winner) {
    elements.gameOverOverlay.classList.remove('hidden');

    if (winner === 'player') {
        elements.gameOverText.textContent = 'Victory!';
        elements.gameOverText.className = 'victory';
        flashElement(elements.gameOverText, 'rgba(212,175,55,0.15)', 600);
        screenShake(4, 300);
    } else {
        elements.gameOverText.textContent = 'Defeat';
        elements.gameOverText.className = 'defeat';
        flashElement(elements.gameOverText, 'rgba(255,20,20,0.12)', 600);
        screenShake(6, 450);
    }
}

/**
 * Hide game over overlay
 */
export function hideGameOver() {
    elements.gameOverOverlay.classList.add('hidden');
}

/**
 * Show faction selector overlay
 */
export function showFactionSelector(options = {}) {
    if (!elements.factionSelector) return;

    // If called for initial startup, set a flag so cancel can auto-start a game
    elements._initialSelector = options.initial === true;

    // Initialize current selection from existing hero data if available
    const playerFaction = elements.currentHeroFactions.player || 'CRETACEOUS';
    const enemyFaction = elements.currentHeroFactions.enemy || 'JURASSIC';

    // Clear previous selection state
    elements.factionButtons.forEach(btn => btn.classList.remove('selected'));

    // Select buttons that match current selection
    elements.factionButtons.forEach(btn => {
        const target = btn.dataset.target;
        const f = btn.dataset.faction;
        if ((target === 'player' && f === playerFaction) || (target === 'enemy' && f === enemyFaction)) {
            btn.classList.add('selected');
        }
        btn.addEventListener('click', onFactionButtonClick);
    });

    elements.factionApply?.addEventListener('click', onFactionApply);
    elements.factionCancel?.addEventListener('click', hideFactionSelector);

    elements.factionSelector.classList.remove('hidden');
}

/**
 * Hide faction selector overlay
 */
export function hideFactionSelector() {
    if (!elements.factionSelector) return;
    elements.factionSelector.classList.add('hidden');

    // Remove handlers
    elements.factionButtons.forEach(btn => btn.removeEventListener('click', onFactionButtonClick));
    elements.factionApply?.removeEventListener('click', onFactionApply);
    elements.factionCancel?.removeEventListener('click', hideFactionSelector);

    // If this was the initial selector and the user cancelled (didn't confirm), auto-start a game
    if (elements._initialSelector) {
        elements._initialSelector = false;

        // Try to read persisted choices, fallback to defaults
        let stored = null;
        try { stored = JSON.parse(localStorage.getItem('stonefire.factions') || 'null'); } catch (e) { stored = null; }

        const playerFaction = (stored && stored.player) ? stored.player : 'CRETACEOUS';
        const enemyFaction = (stored && stored.enemy) ? stored.enemy : 'JURASSIC';

        // Emit SELECT_FACTION so main starts the game with these choices
        events.emit('SELECT_FACTION', { playerFaction, enemyFaction });
    }
}

function onFactionButtonClick(e) {
    const btn = e.currentTarget;
    const target = btn.dataset.target; // 'player' or 'enemy'
    const faction = btn.dataset.faction;

    // Deselect any previously selected button for this target
    document.querySelectorAll(`.faction-selector-card[data-target="${target}"]`).forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
}

function onFactionApply() {
    // Read selected buttons
    const playerBtn = document.querySelector('.faction-selector-card[data-target="player"].selected');
    const enemyBtn = document.querySelector('.faction-selector-card[data-target="enemy"].selected');

    const playerFaction = playerBtn ? playerBtn.dataset.faction : 'CRETACEOUS';
    const enemyFaction = enemyBtn ? enemyBtn.dataset.faction : 'JURASSIC';

    // Update local record (preview)
    elements.currentHeroFactions.player = playerFaction;
    elements.currentHeroFactions.enemy = enemyFaction;

    // If this selector was opened on initial startup, apply immediately (no confirmation)
    if (elements._initialSelector) {
        elements._initialSelector = false;

        // Persist choices to localStorage
        try {
            localStorage.setItem('stonefire.factions', JSON.stringify({ player: playerFaction, enemy: enemyFaction }));
        } catch (e) {
            // ignore storage errors
        }

        // Update hero icons immediately for feedback
        setHeroFactions(playerFaction, enemyFaction);

        // Hide selector and emit selection to start the game
        hideFactionSelector();
        setTimeout(() => {
            events.emit('SELECT_FACTION', { playerFaction, enemyFaction });
        }, 30);

        return;
    }

    // Show confirmation dialog before applying for non-initial changes
    showFactionConfirm(playerFaction, enemyFaction);
}

function showFactionConfirm(playerFaction, enemyFaction) {
    if (!elements.factionConfirm) return;

    // Map keys to labels and icons
    const labelMap = {
        TRIASSIC: 'Triassic',
        JURASSIC: 'Jurassic',
        CRETACEOUS: 'Cretaceous',
        PRIMORDIAL: 'Primordial',
        ICE_AGE: 'Ice Age',
        NEUTRAL: 'Neutral'
    };

    const iconMap = {
        TRIASSIC: 'assets/icons/triassic.svg',
        JURASSIC: 'assets/icons/jurassic.svg',
        CRETACEOUS: 'assets/icons/cretaceous.svg',
        PRIMORDIAL: 'assets/icons/primordial.svg',
        ICE_AGE: 'assets/icons/ice_age.svg',
        NEUTRAL: 'assets/icons/neutral.svg'
    };

    // Populate confirm UI
    if (elements.confirmPlayerIcon) elements.confirmPlayerIcon.innerHTML = `<img src="${iconMap[playerFaction]}" class="hero-icon" alt="${labelMap[playerFaction] || playerFaction} faction icon" loading="lazy">`;
    if (elements.confirmEnemyIcon) elements.confirmEnemyIcon.innerHTML = `<img src="${iconMap[enemyFaction]}" class="hero-icon" alt="${labelMap[enemyFaction] || enemyFaction} faction icon" loading="lazy">`;
    if (elements.confirmPlayerLabel) elements.confirmPlayerLabel.textContent = labelMap[playerFaction] || playerFaction;
    if (elements.confirmEnemyLabel) elements.confirmEnemyLabel.textContent = labelMap[enemyFaction] || enemyFaction;

    // Attach confirm handlers
    elements.factionConfirmApply?.addEventListener('click', onFactionConfirmApply);
    elements.factionConfirmCancel?.addEventListener('click', hideFactionConfirm);

    elements.factionConfirm.classList.remove('hidden');
}

function hideFactionConfirm() {
    if (!elements.factionConfirm) return;

    elements.factionConfirm.classList.add('hidden');
    elements.factionConfirmApply?.removeEventListener('click', onFactionConfirmApply);
    elements.factionConfirmCancel?.removeEventListener('click', hideFactionConfirm);

    // Re-enable the confirm button in case the user re-opens the dialog
    if (elements.factionConfirmApply) {
        elements.factionConfirmApply.disabled = false;
    }
}

function onFactionConfirmApply() {
    const playerFaction = elements.currentHeroFactions.player || 'CRETACEOUS';
    const enemyFaction = elements.currentHeroFactions.enemy || 'JURASSIC';

    // Prevent double-clicks
    if (elements.factionConfirmApply) {
        elements.factionConfirmApply.disabled = true;
    }

    // Persist choices to localStorage
    try {
        localStorage.setItem('stonefire.factions', JSON.stringify({ player: playerFaction, enemy: enemyFaction }));
    } catch (e) {
        // ignore storage errors
    }

    // Clear initial selector flag so hideFactionSelector won't auto-start again
    elements._initialSelector = false;

    // Hide confirmation and selector immediately (so UI reflects action)
    hideFactionConfirm();
    hideFactionSelector();

    // Emit event shortly after to allow UI to update/hide overlays
    setTimeout(() => {
        events.emit('SELECT_FACTION', { playerFaction, enemyFaction });
    }, 30);
}

export function setHeroFactions(playerFactionKeyOrValue, enemyFactionKeyOrValue) {
    // Normalize to uppercase keys (accept either 'cretaceous' or 'CRETACEOUS' or enum value)
    const valueToKey = (v) => {
        if (!v) return null;
        // If value is already a key
        if (Object.keys(Faction).includes(v)) return v;
        // If value is enum value like 'cretaceous', find key
        const key = Object.keys(Faction).find(k => Faction[k] === v);
        return key || null;
    };

    const pKey = valueToKey(playerFactionKeyOrValue);
    const eKey = valueToKey(enemyFactionKeyOrValue);

    const iconMap = {
        TRIASSIC: 'assets/icons/triassic.svg',
        JURASSIC: 'assets/icons/jurassic.svg',
        CRETACEOUS: 'assets/icons/cretaceous.svg',
        PRIMORDIAL: 'assets/icons/primordial.svg',
        ICE_AGE: 'assets/icons/ice_age.svg',
        NEUTRAL: 'assets/icons/neutral.svg'
    };

    const labelMap = {
        TRIASSIC: 'Triassic',
        JURASSIC: 'Jurassic',
        CRETACEOUS: 'Cretaceous',
        PRIMORDIAL: 'Primordial',
        ICE_AGE: 'Ice Age',
        NEUTRAL: 'Neutral'
    };

    const playerHero = document.getElementById('player-hero');
    const enemyHero = document.getElementById('enemy-hero');

    if (playerHero) {
        const avatar = playerHero.querySelector('.hero-avatar');
        if (avatar) avatar.innerHTML = `<img src="${iconMap[pKey] || iconMap.CRETACEOUS}" class="hero-icon" alt="${labelMap[pKey] || pKey} faction icon" loading="lazy">`;
        playerHero.dataset.faction = pKey || '';
    }

    if (enemyHero) {
        const avatar = enemyHero.querySelector('.hero-avatar');
        if (avatar) avatar.innerHTML = `<img src="${iconMap[eKey] || iconMap.JURASSIC}" class="hero-icon" alt="${labelMap[eKey] || eKey} faction icon" loading="lazy">`;
        enemyHero.dataset.faction = eKey || '';
    }

    elements.currentHeroFactions.player = pKey;
    elements.currentHeroFactions.enemy = eKey;
}

/**
 * Show attack arrow from attacker to target
 */
export function showAttackArrow(attackerEl, targetEl) {
    if (!attackerEl || !targetEl) return;

    const attackerRect = attackerEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    const startX = attackerRect.left + attackerRect.width / 2;
    const startY = attackerRect.top + attackerRect.height / 2;
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;

    elements.arrowLine.setAttribute('x1', startX);
    elements.arrowLine.setAttribute('y1', startY);
    elements.arrowLine.setAttribute('x2', endX);
    elements.arrowLine.setAttribute('y2', endY);

    elements.attackArrow.classList.remove('hidden');
}

/**
 * Hide attack arrow
 */
export function hideAttackArrow() {
    elements.attackArrow.classList.add('hidden');
}

/**
 * Get cached elements
 */
export function getElements() {
    return elements;
}
