/**
 * Stonefire - Prehistoric Trading Card Game
 * Main Entry Point
 */

import { events } from './game/state.js';
import { startGame } from './game/engine.js';
import { initRenderer, render, hideGameOver, hideFactionSelector, setHeroFactions, showFactionSelector } from './ui/renderer.js';
import { initInput } from './ui/input.js';
import { initAI } from './ai/opponent.js';
import { createStarterDeck, createBalancedDeck, Faction } from './data/cards.js';

/**
 * Game Setup modal (first-visit flow)
 */
function showGameSetup() {
    const modal = document.getElementById('game-setup');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    const steps = Array.from(modal.querySelectorAll('.setup-step'));
    let current = 1;

    const nameInput = document.getElementById('player-name');
    const nameNext = document.getElementById('setup-name-next');
    const playerNext = document.getElementById('setup-player-next');
    const enemyNext = document.getElementById('setup-enemy-next');
    const startBtn = document.getElementById('setup-start');
    const cancelBtn = document.getElementById('setup-cancel');

    const setupFactions = { player: null, enemy: null };

    function showStep(n) {
        steps.forEach(s => s.classList.add('hidden'));
        const s = modal.querySelector(`.setup-step[data-step="${n}"]`);
        if (s) s.classList.remove('hidden');
        current = n;
    }

    // Prefill name if present
    const storedName = localStorage.getItem('stonefire.playerName') || '';
    if (nameInput) nameInput.value = storedName;

    if (nameNext) {
        nameNext.addEventListener('click', () => {
            const name = (nameInput.value || '').trim();
            if (!name) { nameInput.focus(); return; }
            localStorage.setItem('stonefire.playerName', name);
            showStep(2);
        });
    }

    // faction button behavior (works for both player and enemy lists)
    modal.querySelectorAll('.setup-faction-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const faction = btn.dataset.faction;
            const parent = btn.closest('.setup-step');
            // clear selections in this parent
            parent.querySelectorAll('.setup-faction-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            if (parent.dataset.step === '2') {
                setupFactions.player = faction;
                if (playerNext) playerNext.disabled = false;
            } else if (parent.dataset.step === '3') {
                setupFactions.enemy = faction;
                if (enemyNext) enemyNext.disabled = false;
            }
        });
    });

    if (playerNext) {
        playerNext.addEventListener('click', () => {
            if (!setupFactions.player) return;
            showStep(3);
        });
    }

    if (enemyNext) {
        enemyNext.addEventListener('click', () => {
            if (!setupFactions.enemy) return;
            // populate summary
            const summary = document.getElementById('setup-summary');
            const name = localStorage.getItem('stonefire.playerName') || 'Player';
            if (summary) {
                summary.innerHTML = `<div><strong>${name}</strong> — ${setupFactions.player}</div><div style="margin-top:0.5rem;">Opponent — ${setupFactions.enemy}</div>`;
            }
            showStep(4);
        });
    }

    if (startBtn) {
        startBtn.addEventListener('click', () => {
            // persist factions
            const payload = { player: setupFactions.player || 'CRETACEOUS', enemy: setupFactions.enemy || 'JURASSIC' };
            try { localStorage.setItem('stonefire.factions', JSON.stringify(payload)); } catch (e) {}
            localStorage.setItem('stonefire.setupComplete', '1');
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
            // begin the game using existing SELECT_FACTION flow
            events.emit('SELECT_FACTION', { playerFaction: payload.player, enemyFaction: payload.enemy });
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
            // If user cancels entire setup, fall back to sensible defaults and start game
            localStorage.setItem('stonefire.setupComplete', '1');
            const playerFaction = 'CRETACEOUS';
            const enemyFaction = 'JURASSIC';
            events.emit('SELECT_FACTION', { playerFaction, enemyFaction });
        });
    }

    // show step 1 initially (or skip to 2 if name exists)
    if (nameInput && nameInput.value.trim()) {
        showStep(2);
    } else {
        showStep(1);
    }

    // Close on Escape
    const escHandler = (ev) => {
        if (ev.key === 'Escape') {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

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

    // Set up event listeners
    setupEventListeners();

    // Show the game setup modal on first load unless already completed
    const setupComplete = localStorage.getItem('stonefire.setupComplete');
    const storedFactions = (function() { try { return JSON.parse(localStorage.getItem('stonefire.factions') || 'null'); } catch(e){return null;} })();
    if (!setupComplete) {
        showGameSetup();
    } else {
        // Auto-start with stored factions or sensible defaults
        const playerFaction = (storedFactions && storedFactions.player) ? storedFactions.player : 'CRETACEOUS';
        const enemyFaction = (storedFactions && storedFactions.enemy) ? storedFactions.enemy : 'JURASSIC';
        events.emit('SELECT_FACTION', { playerFaction, enemyFaction });
    }

    console.log('Game initialized!');
}

/**
 * Set up global event listeners
 */
function setupEventListeners() {
    // Restart game
    events.on('RESTART_GAME', () => {
        hideGameOver();
        newGame();
    });

    // Choose factions (emitted by UI)
    events.on('SELECT_FACTION', ({ playerFaction, enemyFaction }) => {
        // Hide any selector overlay
        hideFactionSelector();

        // Normalize values: event provides keys like 'CRETACEOUS'
        const playerFactionValue = Faction[playerFaction] || Faction.CRETACEOUS;
        const enemyFactionValue = Faction[enemyFaction] || (playerFactionValue === Faction.CRETACEOUS ? Faction.JURASSIC : Faction.CRETACEOUS);

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

        // Try to use native fullscreen API if available
        if (isFullscreen && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {
                // Fallback: CSS-only fullscreen mode already applied
            });
        } else if (!isFullscreen && document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }

        // Store preference
        localStorage.setItem('stonefire.fullscreen', isFullscreen ? '1' : '0');
    }

    function exitFullscreen() {
        document.body.classList.remove('fullscreen-mode');
        if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
        localStorage.setItem('stonefire.fullscreen', '0');
    }

    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    if (exitFullscreenBtn) {
        exitFullscreenBtn.addEventListener('click', exitFullscreen);
    }

    // Handle native fullscreen exit (Escape key)
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            document.body.classList.remove('fullscreen-mode');
            localStorage.setItem('stonefire.fullscreen', '0');
        }
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
}

