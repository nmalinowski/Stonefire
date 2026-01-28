/**
 * Stonefire - Auth Modal UI
 * Handles sign-in/sign-up modal interactions
 */

import {
    signInWithOAuth,
    signInWithEmail,
    signUpWithEmail,
    linkOAuthProvider,
    linkEmail,
    getCurrentUser,
    isAuthenticated,
    signOut,
    onAuthChange
} from '../services/auth.js';

let isSignUp = false;
let elements = null;

function cacheElements() {
    elements = {
        modal: document.getElementById('auth-modal'),
        close: document.querySelector('.auth-modal-close'),
        github: document.getElementById('auth-github'),
        google: document.getElementById('auth-google'),
        emailInput: document.getElementById('auth-email'),
        passwordInput: document.getElementById('auth-password'),
        submitBtn: document.getElementById('auth-email-submit'),
        toggleBtn: document.getElementById('auth-toggle-mode'),
        errorEl: document.getElementById('auth-error'),
        loadingEl: document.getElementById('auth-loading'),
        profileBtn: document.getElementById('profileBtn'),
        mobileProfileBtn: document.getElementById('mobileProfileBtn'),
    };
}

/**
 * Initialize auth modal event listeners
 */
export function initAuthModal() {
    cacheElements();
    if (!elements.modal) return;

    // Open modal
    elements.profileBtn?.addEventListener('click', handleProfileClick);
    elements.mobileProfileBtn?.addEventListener('click', handleProfileClick);

    // Close modal
    elements.close?.addEventListener('click', hideModal);
    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) hideModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !elements.modal.classList.contains('hidden')) {
            hideModal();
        }
    });

    // OAuth buttons
    elements.github?.addEventListener('click', () => handleOAuth('github'));
    elements.google?.addEventListener('click', () => handleOAuth('google'));

    // Email form
    elements.submitBtn?.addEventListener('click', handleEmailSubmit);
    elements.toggleBtn?.addEventListener('click', toggleMode);

    // Enter key on password field
    elements.passwordInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleEmailSubmit();
    });

    // Update button state on auth changes
    onAuthChange(updateProfileButton);
    updateProfileButton(getCurrentUser());
}

function handleProfileClick() {
    const user = getCurrentUser();
    if (!user || user.is_anonymous) {
        showModal();
    } else {
        toggleProfileDropdown();
    }
}

function toggleProfileDropdown() {
    let dropdown = document.getElementById('profile-dropdown');

    if (dropdown && !dropdown.classList.contains('hidden')) {
        dropdown.classList.add('hidden');
        return;
    }

    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'profile-dropdown';
        dropdown.className = 'profile-dropdown';
        elements.profileBtn.style.position = 'relative';
        elements.profileBtn.appendChild(dropdown);
    }

    const user = getCurrentUser();
    const name = user?.user_metadata?.name || user?.email || 'Player';

    dropdown.innerHTML = `
        <div class="profile-dropdown-name"></div>
        <a href="profile.html" class="profile-dropdown-item">📊 View Profile</a>
        <button class="profile-dropdown-item" id="dropdown-signout">🚪 Sign Out</button>
    `;
    dropdown.querySelector('.profile-dropdown-name').textContent = name;
    dropdown.classList.remove('hidden');

    document.getElementById('dropdown-signout')?.addEventListener('click', async () => {
        await signOut();
        dropdown.classList.add('hidden');
    });

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
            if (!dropdown.contains(e.target) && e.target !== elements.profileBtn) {
                dropdown.classList.add('hidden');
                document.removeEventListener('click', closeDropdown);
            }
        });
    }, 0);
}

export function showModal() {
    if (!elements) cacheElements();
    elements.modal.classList.remove('hidden');
    clearError();
    elements.emailInput.value = '';
    elements.passwordInput.value = '';
}

export function hideModal() {
    elements.modal.classList.add('hidden');
}

function showError(message) {
    elements.errorEl.textContent = message;
    elements.errorEl.classList.remove('hidden');
}

function clearError() {
    elements.errorEl.classList.add('hidden');
}

function showLoading() {
    elements.loadingEl.classList.remove('hidden');
    elements.submitBtn.disabled = true;
    elements.github.disabled = true;
    elements.google.disabled = true;
}

function hideLoading() {
    elements.loadingEl.classList.add('hidden');
    elements.submitBtn.disabled = false;
    elements.github.disabled = false;
    elements.google.disabled = false;
}

async function handleOAuth(provider) {
    clearError();
    showLoading();

    try {
        const user = getCurrentUser();
        if (user?.is_anonymous) {
            await linkOAuthProvider(provider);
        } else {
            await signInWithOAuth(provider);
        }
        // OAuth redirects, so hideLoading not needed
    } catch (e) {
        hideLoading();
        showError(e.message || 'Authentication failed');
    }
}

async function handleEmailSubmit() {
    const email = elements.emailInput.value.trim();
    const password = elements.passwordInput.value;

    if (!email || !password) {
        showError('Please enter email and password');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }

    clearError();
    showLoading();

    try {
        const user = getCurrentUser();

        if (user?.is_anonymous) {
            // Link anonymous to email
            await linkEmail(email, password);
        } else if (isSignUp) {
            await signUpWithEmail(email, password);
        } else {
            await signInWithEmail(email, password);
        }

        hideLoading();
        hideModal();
    } catch (e) {
        hideLoading();
        showError(e.message || 'Authentication failed');
    }
}

function toggleMode() {
    isSignUp = !isSignUp;
    elements.submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    elements.toggleBtn.textContent = isSignUp
        ? 'Already have an account? Sign In'
        : "Don't have an account? Sign Up";
    clearError();
}

function updateProfileButton(user) {
    if (!elements?.profileBtn) return;

    if (user && !user.is_anonymous) {
        const initial = (user.user_metadata?.name?.[0] || user.email?.[0] || '?').toUpperCase();
        elements.profileBtn.textContent = initial;
        elements.mobileProfileBtn && (elements.mobileProfileBtn.textContent = initial);
    } else {
        elements.profileBtn.textContent = '👤';
        elements.mobileProfileBtn && (elements.mobileProfileBtn.textContent = '👤');
    }
}
