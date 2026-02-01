/**
 * Achievement Toast Notifications
 * Displays toast notifications when achievements are unlocked
 * Bundles multiple achievements into a single notification
 */

import { events } from '../game/state.js';

let buffer = [];
let debounceTimer = null;
const DEBOUNCE_MS = 500;
const BASE_DURATION_MS = 4000;
const EXTRA_DURATION_MS = 1000;
const MAX_DURATION_MS = 8000;

/**
 * Initialize achievement toast listener
 */
export function initAchievementToasts() {
    events.on('ACHIEVEMENT_UNLOCKED', handleAchievementUnlocked);
}

/**
 * Handle incoming achievement unlock event
 */
function handleAchievementUnlocked(achievement) {
    buffer.push(achievement);

    // Start or reset debounce timer
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(flushBuffer, DEBOUNCE_MS);
}

/**
 * Flush buffered achievements and show toast
 */
function flushBuffer() {
    if (buffer.length === 0) return;

    const achievements = [...buffer];
    buffer = [];
    debounceTimer = null;

    showToast(achievements);
}

/**
 * Create and display achievement toast
 */
function showToast(achievements) {
    const container = document.getElementById('achievement-toasts');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'achievement-toast';

    const count = achievements.length;
    const label = count === 1
        ? 'Achievement Unlocked!'
        : `${count} Achievements Unlocked!`;

    let namesHtml;
    if (count === 1) {
        namesHtml = `<div class="achievement-name">${escapeHtml(achievements[0].name)}</div>`;
    } else {
        namesHtml = `<div class="achievement-names">
            ${achievements.map(a => `<div class="achievement-name">${escapeHtml(a.name)}</div>`).join('')}
        </div>`;
    }

    toast.innerHTML = `
        <div class="achievement-icon">🏆</div>
        <div class="achievement-content">
            <div class="achievement-label">${label}</div>
            ${namesHtml}
        </div>
    `;

    container.appendChild(toast);

    // Calculate duration based on number of achievements
    const duration = Math.min(
        BASE_DURATION_MS + (count - 1) * EXTRA_DURATION_MS,
        MAX_DURATION_MS
    );

    // Auto-dismiss after duration
    setTimeout(() => {
        toast.classList.add('dismissing');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
