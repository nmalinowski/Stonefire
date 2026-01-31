/**
 * Stonefire - Supabase Client
 * Initializes and exports the Supabase client
 */

const SUPABASE_URL = 'https://ncismicjskecizbzbdod.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jaXNtaWNqc2tlY2l6YnpiZG9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NTkxODMsImV4cCI6MjA4NDQzNTE4M30.uasZIYrSl6bcXORf76nIEwucd0fgkzrbNuhWiiPTKgk';

let client = null;

/**
 * Get the Supabase client (lazy init)
 * Returns null if SDK not loaded (offline/blocked)
 */
export function getClient() {
    if (client) return client;

    if (typeof window === 'undefined') {
        return null;
    }

    if (typeof window.supabase === 'undefined') {
        console.warn('Supabase SDK not loaded - running in offline mode');
        return null;
    }

    if (SUPABASE_URL.includes('YOUR_PROJECT') || SUPABASE_ANON_KEY === 'YOUR_ANON_KEY') {
        console.warn('Supabase credentials not configured - running in offline mode');
        return null;
    }

    try {
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return client;
    } catch (e) {
        console.warn('Failed to init Supabase client:', e);
        return null;
    }
}

/**
 * Check if Supabase is available
 */
export function isOnline() {
    return getClient() !== null;
}
