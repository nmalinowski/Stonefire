/**
 * Stonefire - Auth Service
 * Handles authentication with Supabase (anonymous, GitHub, Google, Email)
 */

import { getClient } from './supabase.js';
import { events } from '../game/state.js';

let currentUser = null;
let authListeners = [];

/**
 * Get current user (null if anonymous/not logged in)
 */
export function getCurrentUser() {
    return currentUser;
}

/**
 * Is user authenticated (non-anonymous)?
 */
export function isAuthenticated() {
    return currentUser && !currentUser.is_anonymous;
}

/**
 * Subscribe to auth changes
 */
export function onAuthChange(callback) {
    authListeners.push(callback);
    return () => {
        authListeners = authListeners.filter(cb => cb !== callback);
    };
}

function notifyAuthChange(user) {
    currentUser = user;
    authListeners.forEach(cb => cb(user));
    events.emit('AUTH_CHANGED', { user });
}

/**
 * Initialize auth - call on app startup
 * Creates anonymous session if none exists
 */
export async function initAuth() {
    const client = getClient();
    if (!client) {
        console.warn('Auth: running offline');
        return null;
    }

    // Listen for auth state changes
    client.auth.onAuthStateChange((event, session) => {
        notifyAuthChange(session?.user || null);
    });

    // Check existing session
    const { data: { session } } = await client.auth.getSession();

    if (session?.user) {
        currentUser = session.user;
        notifyAuthChange(currentUser);
        return currentUser;
    }

    // No session - create anonymous user
    try {
        const { data, error } = await client.auth.signInAnonymously();
        if (error) throw error;
        currentUser = data.user;
        notifyAuthChange(currentUser);
        return currentUser;
    } catch (e) {
        console.warn('Auth: anonymous sign-in failed:', e);
        return null;
    }
}

/**
 * Sign in with OAuth (GitHub or Google)
 */
export async function signInWithOAuth(provider) {
    const client = getClient();
    if (!client) throw new Error('Offline');

    const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: window.location.origin
        }
    });

    if (error) throw error;
    return data;
}

/**
 * Sign in with email/password
 */
export async function signInWithEmail(email, password) {
    const client = getClient();
    if (!client) throw new Error('Offline');

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
}

/**
 * Sign up with email/password
 */
export async function signUpWithEmail(email, password) {
    const client = getClient();
    if (!client) throw new Error('Offline');

    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    return data.user;
}

/**
 * Link anonymous account to OAuth provider
 */
export async function linkOAuthProvider(provider) {
    const client = getClient();
    if (!client) throw new Error('Offline');

    const { data, error } = await client.auth.linkIdentity({
        provider,
        options: {
            redirectTo: window.location.origin
        }
    });

    if (error) throw error;
    return data;
}

/**
 * Link anonymous account to email/password
 */
export async function linkEmail(email, password) {
    const client = getClient();
    if (!client) throw new Error('Offline');

    const { data, error } = await client.auth.updateUser({
        email,
        password
    });

    if (error) throw error;
    return data.user;
}

/**
 * Sign out
 */
export async function signOut() {
    const client = getClient();
    if (!client) return;

    const { error } = await client.auth.signOut();
    if (error) console.warn('Sign out error:', error);

    currentUser = null;
    notifyAuthChange(null);
}
