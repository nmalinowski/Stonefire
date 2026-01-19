/**
 * Stonefire - Animation System
 * Handles all game animations
 */

// Animation queue for sequencing
let animationQueue = [];
let isAnimating = false;

/**
 * Show floating damage number
 */
export function showDamageNumber(targetEl, amount, isHeal = false) {
    if (!targetEl) return;

    const rect = targetEl.getBoundingClientRect();
    const container = document.getElementById('damage-numbers');

    const numberEl = document.createElement('div');
    numberEl.className = `damage-number ${isHeal ? 'heal' : ''}`;
    numberEl.textContent = isHeal ? `+${amount}` : `-${amount}`;

    // Position at center of target with some randomness
    const offsetX = (Math.random() - 0.5) * 30;
    numberEl.style.left = `${rect.left + rect.width / 2 + offsetX}px`;
    numberEl.style.top = `${rect.top + rect.height / 2}px`;

    container.appendChild(numberEl);

    // Add shake animation to target
    targetEl.classList.add('taking-damage');

    // Remove after animation
    setTimeout(() => {
        numberEl.remove();
        targetEl.classList.remove('taking-damage');
    }, 1000);
}

/**
 * Show turn banner
 */
export function showTurnBanner(text) {
    const banner = document.createElement('div');
    banner.className = 'turn-banner';
    banner.textContent = text;
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');

    const turnIndicator = document.getElementById('turn-indicator');
    if (turnIndicator) {
        turnIndicator.classList.add('temp-hidden');
    }

    document.body.appendChild(banner);

    // Keep visible for the duration of the CSS animation (2.2s)
    setTimeout(() => {
        banner.remove();
        if (turnIndicator) {
            turnIndicator.classList.remove('temp-hidden');
        }
    }, 2200);
}

/**
 * Animate card being played from hand to board
 */
export function animateCardPlay(cardEl, targetSlot) {
    return new Promise(resolve => {
        if (!cardEl || !targetSlot) {
            resolve();
            return;
        }

        cardEl.classList.add('playing');

        setTimeout(() => {
            cardEl.classList.remove('playing');
            resolve();
        }, 300);
    });
}

/**
 * Animate attack
 */
export function animateAttack(attackerEl, targetEl) {
    return new Promise(resolve => {
        if (!attackerEl) {
            resolve();
            return;
        }

        attackerEl.classList.add('attacking');

        setTimeout(() => {
            attackerEl.classList.remove('attacking');
            resolve();
        }, 400);
    });
}

/**
 * Animate creature death
 */
export function animateDeath(creatureEl) {
    return new Promise(resolve => {
        if (!creatureEl) {
            resolve();
            return;
        }

        creatureEl.classList.add('dying');

        setTimeout(() => {
            resolve();
        }, 500);
    });
}

/**
 * Animate spell effect
 */
export function animateSpellEffect(x, y, type = 'default') {
    const effectEl = document.createElement('div');
    effectEl.className = 'spell-effect';
    effectEl.style.left = `${x - 100}px`;
    effectEl.style.top = `${y - 100}px`;

    document.body.appendChild(effectEl);

    setTimeout(() => {
        effectEl.remove();
    }, 600);
}

/**
 * Animate card draw
 */
export function animateCardDraw(cardEl) {
    if (!cardEl) return;

    cardEl.classList.add('drawing');

    setTimeout(() => {
        cardEl.classList.remove('drawing');
    }, 400);
}

/**
 * Animate buff applied
 */
export function animateBuff(targetEl) {
    if (!targetEl) return;

    targetEl.classList.add('buffed');

    setTimeout(() => {
        targetEl.classList.remove('buffed');
    }, 500);
}

/**
 * Animate card glow
 */
export function animateGlow(cardEl, duration = 1500) {
    if (!cardEl) return;

    cardEl.classList.add('glowing');

    if (duration > 0) {
        setTimeout(() => {
            cardEl.classList.remove('glowing');
        }, duration);
    }
}

/**
 * Queue an animation
 */
export function queueAnimation(animationFn) {
    animationQueue.push(animationFn);
    processQueue();
}

/**
 * Process animation queue
 */
async function processQueue() {
    if (isAnimating || animationQueue.length === 0) return;

    isAnimating = true;

    while (animationQueue.length > 0) {
        const animationFn = animationQueue.shift();
        await animationFn();
    }

    isAnimating = false;
}

/**
 * Clear animation queue
 */
export function clearAnimationQueue() {
    animationQueue = [];
    isAnimating = false;
}

/**
 * Wait for a duration
 */
export function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Animate hero damage
 */
export function animateHeroDamage(heroEl) {
    if (!heroEl) return;

    heroEl.classList.add('taking-damage');

    setTimeout(() => {
        heroEl.classList.remove('taking-damage');
    }, 400);
}

/**
 * Shake the screen (for big effects)
 */
export function screenShake(intensity = 5, duration = 300) {
    const container = document.getElementById('game-container');
    const startTime = Date.now();

    function shake() {
        const elapsed = Date.now() - startTime;
        if (elapsed > duration) {
            container.style.transform = '';
            return;
        }

        const progress = elapsed / duration;
        const currentIntensity = intensity * (1 - progress);

        const x = (Math.random() - 0.5) * currentIntensity * 2;
        const y = (Math.random() - 0.5) * currentIntensity * 2;

        container.style.transform = `translate(${x}px, ${y}px)`;
        requestAnimationFrame(shake);
    }

    shake();
}

/**
 * Pulse element
 */
export function pulseElement(el, duration = 500) {
    return new Promise(resolve => {
        el.style.transition = `transform ${duration / 2}ms ease-out`;
        el.style.transform = 'scale(1.1)';

        setTimeout(() => {
            el.style.transform = 'scale(1)';
            setTimeout(resolve, duration / 2);
        }, duration / 2);
    });
}

/**
 * Flash element with color
 */
export function flashElement(el, color = '#ffffff', duration = 200) {
    const originalBg = el.style.backgroundColor;
    el.style.transition = `background-color ${duration / 2}ms ease`;
    el.style.backgroundColor = color;

    setTimeout(() => {
        el.style.backgroundColor = originalBg;
    }, duration / 2);
}
