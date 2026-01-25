/**
 * Stonefire - Prehistoric Trading Card Game
 * Main Entry Point
 */

import { events } from './game/state.js';
import { startGame } from './game/engine.js';
import { initRenderer, render, hideGameOver, hideFactionSelector, setHeroFactions, showFactionSelector } from './ui/renderer.js';
import { initInput } from './ui/input.js';
import { initAI, setAIPersonality } from './ai/opponent.js';
import { createStarterDeck, createBalancedDeck, Faction } from './data/cards.js';
import { initWizard, showWizard } from './ui/wizard.js';
import { initChatBubble } from './ui/chatBubble.js';

/**
 * Initialize the game
 */
function init() {
    console.log('Stonefire - Prehistoric Trading Card Game');
    console.log('Initializing...');

    // Initialize UI systems
    initRenderer();
    initInput();
    initAI();
    initChatBubble();

    // Set up event listeners
    setupEventListeners();

    // Initialize wizard
    initWizard();

    // Show the game setup wizard on first load unless already completed
    const setupComplete = localStorage.getItem('stonefire.setupComplete');
    const storedFactions = (function() { try { return JSON.parse(localStorage.getItem('stonefire.factions') || 'null'); } catch(e){return null;} })();
    if (!setupComplete) {
        showWizard();
    } else {
        // Auto-start with stored factions or sensible defaults
        const playerFaction = (storedFactions && storedFactions.player) ? storedFactions.player : 'CRETACEOUS';
        const enemyFaction = (storedFactions && storedFactions.enemy) ? storedFactions.enemy : 'JURASSIC';
        events.emit('SELECT_FACTION', { playerFaction, enemyFaction });
    }

    console.log('Game initialized!');
}

/**
 * Get a random faction key
 */
function getRandomFaction(exclude = null) {
    const factions = ['TRIASSIC', 'JURASSIC', 'CRETACEOUS', 'PRIMORDIAL', 'ICE_AGE'];
    const available = exclude ? factions.filter(f => f !== exclude) : factions;
    return available[Math.floor(Math.random() * available.length)];
}

/**
 * Set up global event listeners
 */
function setupEventListeners() {
    // Restart game with randomized factions
    events.on('RESTART_GAME', () => {
        hideGameOver();

        // Randomize both factions (ensure they're different)
        const playerFaction = getRandomFaction();
        const enemyFaction = getRandomFaction(playerFaction);

        // Set AI personality for new enemy faction
        setAIPersonality(enemyFaction);

        // Start new game with random factions
        const playerFactionValue = Faction[playerFaction];
        const enemyFactionValue = Faction[enemyFaction];
        newGame(playerFactionValue, enemyFactionValue);

        // Update hero icons
        setHeroFactions(playerFaction, enemyFaction);
    });

    // Choose factions (emitted by UI)
    events.on('SELECT_FACTION', ({ playerFaction, enemyFaction }) => {
        // Hide any selector overlay
        hideFactionSelector();

        // Normalize values: event provides keys like 'CRETACEOUS'
        const playerFactionValue = Faction[playerFaction] || Faction.CRETACEOUS;
        const enemyFactionValue = Faction[enemyFaction] || (playerFactionValue === Faction.CRETACEOUS ? Faction.JURASSIC : Faction.CRETACEOUS);

        // Set AI personality based on enemy faction
        setAIPersonality(enemyFaction);

        newGame(playerFactionValue, enemyFactionValue);

        // Update hero icons to match choices (pass keys)
        setHeroFactions(playerFaction, enemyFaction);
    });

    // Log game events (for debugging)
    if (window.location.search.includes('debug')) {
        events.on('CARD_PLAYED', ({ player, card }) => {
            console.log(`${player} played ${card.name}`);
        });

        events.on('ATTACK_STARTED', ({ attackerPlayer, targetPlayer, targetId }) => {
            console.log(`${attackerPlayer} attacks ${targetId}`);
        });

        events.on('CREATURE_DIED', ({ player, creature }) => {
            console.log(`${creature.name} died (${player})`);
        });

        events.on('GAME_OVER', ({ winner }) => {
            console.log(`Game Over! ${winner} wins!`);
        });
    }
}

/**
 * Start a new game
 */
function newGame(playerFaction = Faction.CRETACEOUS, enemyFaction = Faction.JURASSIC) {
    // Create decks for both players using chosen factions
    const playerDeck = createStarterDeck(playerFaction);
    const enemyDeck = createStarterDeck(enemyFaction);

    // Start the game
    startGame(playerDeck, enemyDeck);

    // Render initial state
    render();

    // Update hero icons to match factions (pass keys if available)
    // Try mapping back to keys, else fallback to defaults
    const playerKey = Object.keys(Faction).find(k => Faction[k] === playerFaction) || 'CRETACEOUS';
    const enemyKey = Object.keys(Faction).find(k => Faction[k] === enemyFaction) || 'JURASSIC';
    setHeroFactions(playerKey, enemyKey);
}

/**
 * Expose useful functions to window for debugging
 */
if (typeof window !== 'undefined') {
    window.Stonefire = {
        newGame,
        events,
        debug: {
            getState: () => {
                const { store } = require('./game/state.js');
                return store.getState();
            }
        }
    };
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        init();
        initUIEnhancements();
    });
} else {
    init();
    initUIEnhancements();
}

/**
 * UI enhancements: nav toggle and service worker registration
 */
function initUIEnhancements() {
    // Nav toggle for small screens
    const navToggle = document.getElementById('navToggle');
    const primaryNav = document.getElementById('primaryNav');
    const installBtn = document.getElementById('installBtn');
    let deferredPrompt = null;

    if (navToggle && primaryNav) {
        // Toggle mobile nav dropdown
        navToggle.addEventListener('click', () => {
            const expanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', String(!expanded));
            primaryNav.classList.toggle('open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (ev) => {
            if (primaryNav.classList.contains('open') && !primaryNav.contains(ev.target) && ev.target !== navToggle) {
                primaryNav.classList.remove('open');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });

        // Close on Escape
        document.addEventListener('keydown', (ev) => {
            if (ev.key === 'Escape' && primaryNav.classList.contains('open')) {
                primaryNav.classList.remove('open');
                navToggle.setAttribute('aria-expanded', 'false');
                navToggle.focus();
            }
        });
    }

    // beforeinstallprompt - show install CTA when available
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); // prevent default mini-infobar
        deferredPrompt = e;
        if (installBtn) {
            installBtn.hidden = false;
            installBtn.setAttribute('aria-hidden', 'false');
            installBtn.classList.add('visible');
            // attach click handler
            const onInstall = async () => {
                installBtn.disabled = true;
                try {
                    await deferredPrompt.prompt();
                    const choice = await deferredPrompt.userChoice;
                    if (choice && choice.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                    } else {
                        console.log('User dismissed the install prompt');
                    }
                } catch (err) {
                    console.warn('Install prompt error', err);
                }
                // cleanup
                deferredPrompt = null;
                installBtn.classList.remove('visible');
                installBtn.hidden = true;
                installBtn.setAttribute('aria-hidden', 'true');
                installBtn.disabled = false;
                installBtn.removeEventListener('click', onInstall);
            };
            installBtn.addEventListener('click', onInstall);
        }
    });

    // When app is installed
    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
        if (installBtn) {
            installBtn.hidden = true;
            installBtn.classList.remove('visible');
            installBtn.setAttribute('aria-hidden', 'true');
        }
    });

    // Service worker registration for PWA offline caching
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            console.log('ServiceWorker registered:', reg.scope);
        }).catch(err => {
            console.warn('ServiceWorker registration failed:', err);
        });
    }

    // Fullscreen mode toggle
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');

    function toggleFullscreen() {
        document.body.classList.toggle('fullscreen-mode');
        const isFullscreen = document.body.classList.contains('fullscreen-mode');

        if (isFullscreen) {
            // Try native fullscreen with vendor prefixes
            const docEl = document.documentElement;
            const requestFS = docEl.requestFullscreen ||
                             docEl.webkitRequestFullscreen ||
                             docEl.mozRequestFullScreen ||
                             docEl.msRequestFullscreen;
            if (requestFS) {
                requestFS.call(docEl).catch(() => {
                    // Fallback: CSS-only fullscreen mode already applied
                });
            }
        } else {
            // Exit fullscreen with vendor prefixes
            const exitFS = document.exitFullscreen ||
                          document.webkitExitFullscreen ||
                          document.mozCancelFullScreen ||
                          document.msExitFullscreen;
            const fsEl = document.fullscreenElement ||
                        document.webkitFullscreenElement ||
                        document.mozFullScreenElement ||
                        document.msFullscreenElement;
            if (exitFS && fsEl) {
                exitFS.call(document).catch(() => {});
            }
        }

        localStorage.setItem('stonefire.fullscreen', isFullscreen ? '1' : '0');
    }

    function exitFullscreen() {
        document.body.classList.remove('fullscreen-mode');
        const exitFS = document.exitFullscreen ||
                      document.webkitExitFullscreen ||
                      document.mozCancelFullScreen ||
                      document.msExitFullscreen;
        const fsEl = document.fullscreenElement ||
                    document.webkitFullscreenElement ||
                    document.mozFullScreenElement ||
                    document.msFullscreenElement;
        if (exitFS && fsEl) {
            exitFS.call(document).catch(() => {});
        }
        localStorage.setItem('stonefire.fullscreen', '0');
    }

    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    if (exitFullscreenBtn) {
        exitFullscreenBtn.addEventListener('click', exitFullscreen);
    }

    // Mobile fullscreen button
    const mobileFullscreenBtn = document.getElementById('mobileFullscreenBtn');
    if (mobileFullscreenBtn) {
        mobileFullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    // Handle native fullscreen exit (Escape key) - with vendor prefixes
    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(event => {
        document.addEventListener(event, () => {
            const fsEl = document.fullscreenElement ||
                        document.webkitFullscreenElement ||
                        document.mozFullScreenElement ||
                        document.msFullscreenElement;
            if (!fsEl) {
                document.body.classList.remove('fullscreen-mode');
                localStorage.setItem('stonefire.fullscreen', '0');
            }
        });
    });

    // Keyboard shortcut: F11 or F to toggle fullscreen
    document.addEventListener('keydown', (ev) => {
        if ((ev.key === 'F11' || (ev.key === 'f' && !ev.ctrlKey && !ev.metaKey)) &&
            !ev.target.matches('input, textarea')) {
            ev.preventDefault();
            toggleFullscreen();
        }
    });

    // Orientation handling / rotate overlay
    const rotateOverlay = document.getElementById('rotate-overlay');
    const rotateContinue = document.getElementById('rotate-continue');
    const rotateDismiss = document.getElementById('rotate-dismiss');

    function checkOrientation() {
        const forced = sessionStorage.getItem('rotate-continue');
        const isPortraitNarrow = window.matchMedia('(max-width: 900px) and (orientation: portrait)').matches;
        const game = document.getElementById('game-container');
        if (isPortraitNarrow && !forced && rotateOverlay) {
            rotateOverlay.classList.remove('hidden');
            rotateOverlay.setAttribute('aria-hidden', 'false');
            game && game.classList.add('blurred');
        } else if (rotateOverlay) {
            rotateOverlay.classList.add('hidden');
            rotateOverlay.setAttribute('aria-hidden', 'true');
            game && game.classList.remove('blurred');
        }
    }

    if (rotateContinue) rotateContinue.addEventListener('click', () => { sessionStorage.setItem('rotate-continue', '1'); checkOrientation(); });
    if (rotateDismiss) rotateDismiss.addEventListener('click', () => { sessionStorage.setItem('rotate-continue', '1'); checkOrientation(); });

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    checkOrientation();

    // Auto-fullscreen on mobile landscape
    let pendingFullscreen = false;

    function requestNativeFullscreen() {
        const docEl = document.documentElement;
        const fsEl = document.fullscreenElement ||
                    document.webkitFullscreenElement ||
                    document.mozFullScreenElement;
        const requestFS = docEl.requestFullscreen ||
                         docEl.webkitRequestFullscreen ||
                         docEl.mozRequestFullScreen;
        if (requestFS && !fsEl) {
            requestFS.call(docEl).catch(() => {
                // Native fullscreen not available, CSS fallback is already applied
            });
        }
        pendingFullscreen = false;
    }

    function handleFullscreenGesture() {
        if (pendingFullscreen) {
            requestNativeFullscreen();
            document.removeEventListener('touchstart', handleFullscreenGesture);
            document.removeEventListener('click', handleFullscreenGesture);
        }
    }

    function checkMobileLandscape() {
        const isMobileLandscape = window.matchMedia('(max-height: 500px) and (orientation: landscape)').matches;
        if (isMobileLandscape) {
            document.body.classList.add('fullscreen-mode');

            const docEl = document.documentElement;
            const fsEl = document.fullscreenElement ||
                        document.webkitFullscreenElement ||
                        document.mozFullScreenElement;
            const requestFS = docEl.requestFullscreen ||
                             docEl.webkitRequestFullscreen ||
                             docEl.mozRequestFullScreen;

            if (!fsEl && requestFS) {
                requestFS.call(docEl).catch(() => {
                    pendingFullscreen = true;
                    document.addEventListener('touchstart', handleFullscreenGesture, { once: true });
                    document.addEventListener('click', handleFullscreenGesture, { once: true });
                });
            }
        } else {
            document.body.classList.remove('fullscreen-mode');
            pendingFullscreen = false;

            const exitFS = document.exitFullscreen ||
                          document.webkitExitFullscreen ||
                          document.mozCancelFullScreen;
            const fsEl = document.fullscreenElement ||
                        document.webkitFullscreenElement ||
                        document.mozFullScreenElement;
            if (fsEl && exitFS) {
                exitFS.call(document).catch(() => {});
            }
        }
    }

    window.addEventListener('resize', checkMobileLandscape);
    window.addEventListener('orientationchange', checkMobileLandscape);
    checkMobileLandscape();

    // iOS-specific: Prevent zoom on double-tap and pinch
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }

    // Card magnification for mobile - tap to see larger card
    initCardMagnification();
}

/**
 * Card magnification system
 * Hover over a card to see it full-size in an overlay (doesn't block clicks)
 */
function initCardMagnification() {
    // Create magnification overlay if it doesn't exist
    let overlay = document.querySelector('.card-magnify-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'card-magnify-overlay';
        overlay.innerHTML = '<div class="magnified-card-container"></div>';
        document.body.appendChild(overlay);
    }

    const container = overlay.querySelector('.magnified-card-container');
    let hideTimeout = null;

    function showMagnifiedCard(card) {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }

        // Clone the card for display
        const clone = card.cloneNode(true);
        clone.classList.add('magnified-card');
        clone.classList.remove('can-attack', 'selected', 'targetable', 'hover-target');

        container.innerHTML = '';
        container.appendChild(clone);
        overlay.classList.add('active');
    }

    function hideMagnifiedCard() {
        // Small delay before hiding to prevent flicker
        hideTimeout = setTimeout(() => {
            overlay.classList.remove('active');
            container.innerHTML = '';
        }, 100);
    }

    // Close on escape
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && overlay.classList.contains('active')) {
            overlay.classList.remove('active');
            container.innerHTML = '';
        }
    });

    // Hover handlers (delegated) - only for HAND cards, not board cards
    document.addEventListener('mouseenter', (ev) => {
        const isMobile = window.matchMedia('(max-height: 500px) and (orientation: landscape)').matches ||
                         window.matchMedia('(max-width: 600px)').matches;
        if (!isMobile) return;

        // ev.target might be a text node, so check it's an Element
        if (!(ev.target instanceof Element)) return;
        // Only magnify hand cards, not board cards (board cards need to be clickable for attacks)
        const card = ev.target.closest('.player-hand .card');
        if (card) {
            showMagnifiedCard(card);
        }
    }, true);

    document.addEventListener('mouseleave', (ev) => {
        // ev.target might be a text node, so check it's an Element
        if (!(ev.target instanceof Element)) return;
        const card = ev.target.closest('.player-hand .card');
        if (card) {
            hideMagnifiedCard();
        }
    }, true);

    // For touch devices: long-press to magnify (only hand cards)
    let longPressTimer = null;
    let longPressCard = null;

    document.addEventListener('touchstart', (ev) => {
        // ev.target might be a text node, so check it's an Element
        if (!(ev.target instanceof Element)) return;
        // Only magnify hand cards, not board cards
        const card = ev.target.closest('.player-hand .card');
        if (!card) return;

        longPressCard = card;
        longPressTimer = setTimeout(() => {
            showMagnifiedCard(card);
        }, 500); // 500ms long press
    }, { passive: true });

    document.addEventListener('touchend', () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        longPressCard = null;
        hideMagnifiedCard();
    }, { passive: true });

    document.addEventListener('touchmove', () => {
        // Cancel long press if user moves finger
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }, { passive: true });
}

