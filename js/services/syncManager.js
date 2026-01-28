/**
 * Stonefire - Sync Manager
 * Handles offline queue and background sync with Supabase
 */

import { getClient, isOnline } from './supabase.js';

const SYNC_QUEUE_KEY = 'stonefire.syncQueue';
const MAX_RETRIES = 3;

/**
 * Status: 'synced' | 'syncing' | 'offline' | 'error'
 */
let syncStatus = 'synced';
let statusListeners = [];
let isProcessing = false;

export function getSyncStatus() {
    return syncStatus;
}

export function onSyncStatusChange(callback) {
    statusListeners.push(callback);
    return () => {
        statusListeners = statusListeners.filter(cb => cb !== callback);
    };
}

function setSyncStatus(status) {
    syncStatus = status;
    statusListeners.forEach(cb => cb(status));
}

/**
 * Queue an operation for sync
 * @param {string} table - Supabase table name
 * @param {string} operation - 'upsert' | 'delete'
 * @param {object} data - Data to sync
 */
export function queueSync(table, operation, data) {
    const queue = getQueue();
    queue.push({
        table,
        operation,
        data,
        timestamp: Date.now(),
        retries: 0
    });
    saveQueue(queue);
    processQueue();
}

/**
 * Process queued sync operations
 */
export async function processQueue() {
    if (isProcessing) return;
    if (!isOnline()) {
        setSyncStatus('offline');
        return;
    }

    const queue = getQueue();
    if (queue.length === 0) {
        setSyncStatus('synced');
        return;
    }

    isProcessing = true;
    setSyncStatus('syncing');
    const client = getClient();
    const remaining = [];

    try {
        for (const item of queue) {
            try {
                if (item.operation === 'upsert') {
                    const { error } = await client.from(item.table).upsert(item.data);
                    if (error) throw error;
                } else if (item.operation === 'delete') {
                    const { error } = await client.from(item.table).delete().match(item.data);
                    if (error) throw error;
                }
            } catch (e) {
                console.warn(`Sync failed for ${item.table}:`, e);
                item.retries++;
                if (item.retries < MAX_RETRIES) {
                    remaining.push(item);
                }
            }
        }

        saveQueue(remaining);
        setSyncStatus(remaining.length > 0 ? 'error' : 'synced');
    } finally {
        isProcessing = false;
    }
}

function getQueue() {
    try {
        return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveQueue(queue) {
    try {
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch {
        // localStorage full or unavailable
    }
}

/**
 * Try to process queue when coming back online
 */
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => processQueue());
}
