/**
 * Game Start Wizard
 * Mobile-friendly step-by-step game setup
 */

import { events } from '../game/state.js';

// Faction data with icons
const FACTION_DATA = {
    TRIASSIC: { icon: '🦎', name: 'Triassic' },
    JURASSIC: { icon: '🦕', name: 'Jurassic' },
    CRETACEOUS: { icon: '🦖', name: 'Cretaceous' },
    PRIMORDIAL: { icon: '🌋', name: 'Primordial' },
    ICE_AGE: { icon: '🦣', name: 'Ice Age' },
    NEUTRAL: { icon: '🥚', name: 'Neutral' }
};

// Wizard state
let wizardState = {
    currentStep: 1,
    totalSteps: 4,
    playerName: '',
    playerFaction: null,
    enemyFaction: null
};

// DOM element cache
let elements = null;

/**
 * Cache DOM elements
 */
function cacheElements() {
    elements = {
        overlay: document.getElementById('game-wizard'),
        progressDots: document.querySelectorAll('.wizard-progress-dot'),
        steps: document.querySelectorAll('.wizard-step'),
        nameInput: document.getElementById('wizard-name'),
        playerFactions: document.getElementById('wizard-player-factions'),
        enemyFactions: document.getElementById('wizard-enemy-factions'),
        backBtn: document.getElementById('wizard-back'),
        nextBtn: document.getElementById('wizard-next'),
        playerNameDisplay: document.getElementById('wizard-player-name-display'),
        confirmPlayerIcon: document.getElementById('wizard-confirm-player-icon'),
        confirmPlayerName: document.getElementById('wizard-confirm-player-name'),
        confirmEnemyIcon: document.getElementById('wizard-confirm-enemy-icon'),
        confirmEnemyName: document.getElementById('wizard-confirm-enemy-name')
    };
}

/**
 * Update progress dots
 */
function updateProgress() {
    elements.progressDots.forEach((dot, index) => {
        const stepNum = index + 1;
        dot.classList.remove('active', 'completed');
        if (stepNum === wizardState.currentStep) {
            dot.classList.add('active');
        } else if (stepNum < wizardState.currentStep) {
            dot.classList.add('completed');
        }
    });
}

/**
 * Show a specific step
 */
function showStep(stepNum) {
    const prevStep = wizardState.currentStep;
    wizardState.currentStep = stepNum;

    elements.steps.forEach(step => {
        const num = parseInt(step.dataset.step, 10);
        step.classList.remove('active', 'prev');
        if (num === stepNum) {
            step.classList.add('active');
        } else if (num < stepNum) {
            step.classList.add('prev');
        }
    });

    updateProgress();
    updateNavButtons();

    // Focus name input on step 1
    if (stepNum === 1 && elements.nameInput) {
        setTimeout(() => elements.nameInput.focus(), 300);
    }

    // Update confirmation display on step 4
    if (stepNum === 4) {
        updateConfirmation();
    }
}

/**
 * Update navigation button states
 */
function updateNavButtons() {
    const { currentStep, playerName, playerFaction, enemyFaction } = wizardState;

    // Back button visibility
    elements.backBtn.style.display = currentStep > 1 ? 'block' : 'none';

    // Next button state and text
    let canProceed = false;
    let buttonText = 'Next';

    switch (currentStep) {
        case 1:
            canProceed = wizardState.playerName.trim().length > 0;
            break;
        case 2:
            canProceed = playerFaction !== null;
            break;
        case 3:
            canProceed = enemyFaction !== null;
            break;
        case 4:
            canProceed = true;
            buttonText = 'Start Battle!';
            elements.nextBtn.classList.add('wizard-btn-start');
            break;
    }

    if (currentStep !== 4) {
        elements.nextBtn.classList.remove('wizard-btn-start');
    }

    elements.nextBtn.disabled = !canProceed;
    elements.nextBtn.textContent = buttonText;
}

/**
 * Update confirmation step display
 */
function updateConfirmation() {
    const { playerName, playerFaction, enemyFaction } = wizardState;

    elements.playerNameDisplay.textContent = `${playerName}, your battle awaits`;

    if (playerFaction) {
        elements.confirmPlayerIcon.textContent = FACTION_DATA[playerFaction].icon;
        elements.confirmPlayerName.textContent = FACTION_DATA[playerFaction].name;
    }

    if (enemyFaction) {
        elements.confirmEnemyIcon.textContent = FACTION_DATA[enemyFaction].icon;
        elements.confirmEnemyName.textContent = FACTION_DATA[enemyFaction].name;
    }
}

/**
 * Handle faction card selection
 */
function handleFactionSelect(container, faction, isPlayer) {
    // Clear previous selection in this container
    container.querySelectorAll('.wizard-faction-card').forEach(card => {
        card.classList.remove('selected');
    });

    // Select the clicked card
    const card = container.querySelector(`[data-faction="${faction}"]`);
    if (card) {
        card.classList.add('selected');
    }

    // Update state
    if (isPlayer) {
        wizardState.playerFaction = faction;
    } else {
        wizardState.enemyFaction = faction;
    }

    updateNavButtons();
}

/**
 * Go to next step
 */
function nextStep() {
    if (wizardState.currentStep < wizardState.totalSteps) {
        showStep(wizardState.currentStep + 1);
    } else {
        // Final step - start the game
        startGame();
    }
}

/**
 * Go to previous step
 */
function prevStep() {
    if (wizardState.currentStep > 1) {
        showStep(wizardState.currentStep - 1);
    }
}

/**
 * Start the game
 */
function startGame() {
    const { playerName, playerFaction, enemyFaction } = wizardState;

    // Persist to localStorage (with error handling for private browsing)
    try {
        localStorage.setItem('stonefire.playerName', playerName);
        localStorage.setItem('stonefire.factions', JSON.stringify({
            player: playerFaction,
            enemy: enemyFaction
        }));
        localStorage.setItem('stonefire.setupComplete', '1');
    } catch (e) {
        // localStorage unavailable (private browsing)
    }

    // Hide wizard
    hideWizard();

    // Emit event to start game (uses existing flow)
    events.emit('SELECT_FACTION', {
        playerFaction: playerFaction,
        enemyFaction: enemyFaction
    });
}

/**
 * Show the wizard
 */
export function showWizard() {
    if (!elements) {
        cacheElements();
    }

    // Get stored name (with error handling)
    let storedName = '';
    try {
        storedName = localStorage.getItem('stonefire.playerName') || '';
    } catch (e) {
        // localStorage unavailable
    }

    // Reset state
    wizardState = {
        currentStep: 1,
        totalSteps: 4,
        playerName: storedName,
        playerFaction: null,
        enemyFaction: null
    };

    // Load stored name if present
    if (elements.nameInput) {
        elements.nameInput.value = wizardState.playerName;
    }

    // Clear faction selections
    if (elements.playerFactions) {
        elements.playerFactions.querySelectorAll('.wizard-faction-card').forEach(card => {
            card.classList.remove('selected');
        });
    }
    if (elements.enemyFactions) {
        elements.enemyFactions.querySelectorAll('.wizard-faction-card').forEach(card => {
            card.classList.remove('selected');
        });
    }

    // Show overlay
    elements.overlay.classList.remove('hidden');

    // If name exists, start at step 2
    if (wizardState.playerName.trim()) {
        showStep(2);
    } else {
        showStep(1);
    }
}

/**
 * Hide the wizard
 */
export function hideWizard() {
    if (elements && elements.overlay) {
        elements.overlay.classList.add('hidden');
    }
}

/**
 * Initialize the wizard
 */
export function initWizard() {
    cacheElements();

    if (!elements.overlay) {
        console.warn('Wizard: overlay element not found');
        return;
    }

    // Name input handler
    if (elements.nameInput) {
        elements.nameInput.addEventListener('input', (e) => {
            wizardState.playerName = e.target.value;
            updateNavButtons();
        });

        // Enter key on name input
        elements.nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && wizardState.playerName.trim()) {
                nextStep();
            }
        });
    }

    // Player faction selection
    if (elements.playerFactions) {
        elements.playerFactions.addEventListener('click', (e) => {
            const card = e.target.closest('.wizard-faction-card');
            if (card) {
                handleFactionSelect(elements.playerFactions, card.dataset.faction, true);
            }
        });
    }

    // Enemy faction selection
    if (elements.enemyFactions) {
        elements.enemyFactions.addEventListener('click', (e) => {
            const card = e.target.closest('.wizard-faction-card');
            if (card) {
                handleFactionSelect(elements.enemyFactions, card.dataset.faction, false);
            }
        });
    }

    // Navigation buttons
    if (elements.backBtn) {
        elements.backBtn.addEventListener('click', prevStep);
    }

    if (elements.nextBtn) {
        elements.nextBtn.addEventListener('click', nextStep);
    }

    // Escape key to close (with defaults)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !elements.overlay.classList.contains('hidden')) {
            // Start with defaults instead of closing
            wizardState.playerFaction = wizardState.playerFaction || 'CRETACEOUS';
            wizardState.enemyFaction = wizardState.enemyFaction || 'JURASSIC';
            wizardState.playerName = wizardState.playerName.trim() || 'Hunter';
            startGame();
        }
    });

    // Touch swipe navigation
    let touchStartX = 0;
    let touchEndX = 0;

    elements.overlay.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    elements.overlay.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) < swipeThreshold) return;

        if (diff > 0) {
            // Swipe left -> next
            if (!elements.nextBtn.disabled) {
                nextStep();
            }
        } else {
            // Swipe right -> back
            if (wizardState.currentStep > 1) {
                prevStep();
            }
        }
    }

    updateNavButtons();
}
