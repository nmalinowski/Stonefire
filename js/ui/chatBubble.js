/**
 * Stonefire - Chat Bubble UI
 * Displays AI taunts in speech bubbles
 */

import { events } from '../game/state.js';

// Chat bubble element reference
let chatBubbleEl = null;
let hideTimeout = null;

// Minimum viewport size to show chat bubbles
const MIN_VIEWPORT_WIDTH = 932;
const MIN_VIEWPORT_HEIGHT = 430;

/**
 * Check if viewport is large enough for chat bubbles
 */
function isViewportLargeEnough() {
    return window.innerWidth >= MIN_VIEWPORT_WIDTH && window.innerHeight >= MIN_VIEWPORT_HEIGHT;
}

/**
 * Initialize chat bubble system
 */
export function initChatBubble() {
    // Create chat bubble element if it doesn't exist
    if (!chatBubbleEl) {
        chatBubbleEl = document.createElement('div');
        chatBubbleEl.id = 'ai-chat-bubble';
        chatBubbleEl.className = 'ai-chat-bubble';
        chatBubbleEl.setAttribute('aria-live', 'polite');
        chatBubbleEl.innerHTML = `
            <div class="chat-bubble-content">
                <span class="chat-bubble-text"></span>
            </div>
        `;
        document.body.appendChild(chatBubbleEl);
    }

    // Listen for AI taunts
    events.on('AI_TAUNT', handleTaunt);

    // Update visibility on resize
    window.addEventListener('resize', updateVisibility);
}

/**
 * Handle incoming taunt
 */
function handleTaunt({ message, personality, trigger }) {
    if (!isViewportLargeEnough()) return;
    if (!message) return;

    showChatBubble(message, personality);
}

/**
 * Show chat bubble with message
 */
function showChatBubble(message, personality) {
    if (!chatBubbleEl) return;

    // Clear any pending hide
    if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
    }

    // Set the message
    const textEl = chatBubbleEl.querySelector('.chat-bubble-text');
    if (textEl) {
        textEl.textContent = message;
    }

    // Set personality-based styling
    chatBubbleEl.className = 'ai-chat-bubble';
    if (personality?.name) {
        chatBubbleEl.classList.add(`personality-${personality.name.toLowerCase().replace('_', '-')}`);
    }

    // Show the bubble
    chatBubbleEl.classList.add('visible');

    // Auto-hide after delay based on message length
    const displayTime = Math.max(2500, message.length * 60);
    hideTimeout = setTimeout(() => {
        hideChatBubble();
    }, displayTime);
}

/**
 * Hide chat bubble
 */
function hideChatBubble() {
    if (!chatBubbleEl) return;
    chatBubbleEl.classList.remove('visible');
}

/**
 * Update visibility based on viewport
 */
function updateVisibility() {
    if (!isViewportLargeEnough()) {
        hideChatBubble();
    }
}

/**
 * Clean up chat bubble
 */
export function destroyChatBubble() {
    if (hideTimeout) {
        clearTimeout(hideTimeout);
    }
    if (chatBubbleEl) {
        chatBubbleEl.remove();
        chatBubbleEl = null;
    }
    events.off('AI_TAUNT', handleTaunt);
    window.removeEventListener('resize', updateVisibility);
}
