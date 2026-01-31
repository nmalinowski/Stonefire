/**
 * Stonefire - Card Component Rendering
 * Creates DOM elements for cards
 */

/**
 * Render a card element
 * @param {Object} card - Card data
 * @param {Object} options - Rendering options
 * @returns {HTMLElement}
 */
export function renderCard(card, options = {}) {
    const {
        playable = false,
        inHand = false,
        onBoard = false,
        canAttack = false,
        selected = false,
        targetable = false,
        summoningSick = false,
        playerId = null
    } = options;

    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.dataset.cardId = card.id;
    cardEl.dataset.instanceId = card.instanceId;
    cardEl.dataset.playerId = playerId;

    // Add type class
    cardEl.classList.add(`type-${card.type}`);

    // Add faction class
    cardEl.classList.add(`faction-${card.faction}`);

    // Add state classes
    if (playable) cardEl.classList.add('playable');
    if (!playable && inHand) cardEl.classList.add('unplayable');
    if (canAttack) cardEl.classList.add('can-attack');
    if (selected) cardEl.classList.add('selected');
    if (targetable) cardEl.classList.add('targetable');
    if (summoningSick) cardEl.classList.add('summoning-sick');

    // Check for Guard keyword
    if (card.keywords?.includes('guard')) {
        cardEl.classList.add('has-guard');
    }

    // Build card structure
    cardEl.innerHTML = `
        <div class="card-inner">
            <div class="card-cost">${card.cost}</div>
            <div class="card-art">${card.icon || getDefaultIcon(card)}</div>
            <div class="card-name">${card.name}</div>
            ${card.text ? `<div class="card-text">${card.text}</div>` : '<div class="card-text"></div>'}
            ${card.type === 'creature' ? renderStats(card) : ''}
        </div>
        ${renderKeywords(card)}
    `;

    return cardEl;
}

/**
 * Render card stats (attack/health)
 */
function renderStats(card) {
    const attack = card.currentAttack !== undefined ? card.currentAttack : card.attack;
    const health = card.currentHealth !== undefined ? card.currentHealth : card.health;
    const maxHealth = card.maxHealth || card.health;

    // Determine stat classes for buffs/damage
    let attackClass = '';
    let healthClass = '';

    if (card.currentAttack !== undefined) {
        if (attack > card.attack) attackClass = 'stat-buffed';
        else if (attack < card.attack) attackClass = 'stat-damaged';
    }

    if (card.currentHealth !== undefined) {
        if (health < maxHealth) healthClass = 'stat-damaged';
        else if (health > card.health) healthClass = 'stat-buffed';
    }

    return `
        <div class="card-stats">
            <span class="card-attack ${attackClass}">${attack}</span>
            <span class="card-health ${healthClass}">${health}</span>
        </div>
    `;
}

/**
 * Render keyword badges
 */
function renderKeywords(card) {
    if (!card.keywords || card.keywords.length === 0) return '';

    const badges = card.keywords.map(keyword => {
        // Handle armored_X format
        if (keyword.startsWith('armored')) {
            const value = keyword.split('_')[1] || 1;
            return `<span class="keyword-badge armored">Armored ${value}</span>`;
        }
        return `<span class="keyword-badge ${keyword}">${formatKeyword(keyword)}</span>`;
    }).join('');

    return `<div class="card-keywords">${badges}</div>`;
}

/**
 * Format keyword for display
 */
function formatKeyword(keyword) {
    return keyword.charAt(0).toUpperCase() + keyword.slice(1);
}

/**
 * Get default icon based on card type/faction
 */
function getDefaultIcon(card) {
    const factionIcons = {
        triassic: '🦎',
        jurassic: '🦖',
        cretaceous: '🦕',
        primordial: '🐙',
        iceage: '🦣',
        neutral: '🦴'
    };

    const typeIcons = {
        spell: '✨',
        relic: '💎'
    };

    if (card.type !== 'creature') {
        return typeIcons[card.type] || '✨';
    }

    return factionIcons[card.faction] || '🦴';
}

/**
 * Render a face-down card (enemy hand)
 */
export function renderCardBack() {
    const cardEl = document.createElement('div');
    cardEl.className = 'card face-down';
    return cardEl;
}

/**
 * Render a card for the board (smaller version)
 */
export function renderBoardCard(card, options = {}) {
    return renderCard(card, { ...options, onBoard: true });
}

/**
 * Create card preview element (larger view)
 */
export function createCardPreview(card) {
    const previewEl = document.createElement('div');
    previewEl.className = 'card-preview';

    const cardEl = renderCard(card, { playable: false });
    previewEl.appendChild(cardEl);

    return previewEl;
}

/**
 * Show card preview at position
 */
let activePreview = null;

export function showCardPreview(card, x, y) {
    hideCardPreview();

    activePreview = createCardPreview(card);
    document.body.appendChild(activePreview);

    // Position the preview
    const previewWidth = activePreview.offsetWidth || 200;
    const previewHeight = activePreview.offsetHeight || 280;
    const padding = 20;

    let posX = x + padding;
    let posY = y - previewHeight / 2;

    // Keep on screen
    if (posX + previewWidth > window.innerWidth) {
        posX = x - previewWidth - padding;
    }
    if (posY < padding) {
        posY = padding;
    }
    if (posY + previewHeight > window.innerHeight - padding) {
        posY = window.innerHeight - previewHeight - padding;
    }

    activePreview.style.left = `${posX}px`;
    activePreview.style.top = `${posY}px`;

    // Trigger animation
    requestAnimationFrame(() => {
        if (activePreview) {
            activePreview.classList.add('visible');
        }
    });
}

/**
 * Hide card preview
 */
export function hideCardPreview() {
    if (activePreview) {
        activePreview.remove();
        activePreview = null;
    }
}

/**
 * Update card element with new data
 */
export function updateCardElement(cardEl, card, options = {}) {
    // Update stats
    const attackEl = cardEl.querySelector('.card-attack');
    const healthEl = cardEl.querySelector('.card-health');

    if (attackEl && card.currentAttack !== undefined) {
        attackEl.textContent = card.currentAttack;
        attackEl.className = 'card-attack';
        if (card.currentAttack > card.attack) {
            attackEl.classList.add('stat-buffed');
        } else if (card.currentAttack < card.attack) {
            attackEl.classList.add('stat-damaged');
        }
    }

    if (healthEl && card.currentHealth !== undefined) {
        healthEl.textContent = card.currentHealth;
        healthEl.className = 'card-health';
        const maxHealth = card.maxHealth || card.health;
        if (card.currentHealth < maxHealth) {
            healthEl.classList.add('stat-damaged');
        } else if (card.currentHealth > card.health) {
            healthEl.classList.add('stat-buffed');
        }
    }

    // Update classes
    cardEl.classList.toggle('can-attack', options.canAttack || false);
    cardEl.classList.toggle('selected', options.selected || false);
    cardEl.classList.toggle('targetable', options.targetable || false);
    cardEl.classList.toggle('summoning-sick', options.summoningSick || false);
}
