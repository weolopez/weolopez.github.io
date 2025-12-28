/**
 * db-manager.js
 * 
 * This module manages the IndexedDB storage for the Component Studio.
 * It handles two main types of storage:
 * 
 * 1. Local Files (STORE_NAME: 'files'):
 *    - Used for local-only components and experiments.
 *    - Uses auto-incrementing numeric IDs.
 * 
 * 2. GitHub Files (GH_STORE_NAME: 'github_files'):
 *    - Acts as a local cache for files synced with a GitHub repository.
 *    - Uses the file 'path' as the primary key.
 *    - Tracks sync status ('synced', 'modified', 'new') to support offline editing
 *      and bulk commits via the GitHub API.
 */

const DB_NAME = 'ComponentStudioDB';
const STORE_NAME = 'files';
const GH_STORE_NAME = 'github_files';

export async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2); // Bump version to 2
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(GH_STORE_NAME)) {
                db.createObjectStore(GH_STORE_NAME, { keyPath: 'path' });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

export async function getAllFiles() {
    const db = await initDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        store.getAll().onsuccess = (e) => resolve(e.target.result);
    });
}

export async function saveFile(file) {
    const db = await initDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(file);
        request.onsuccess = (e) => resolve(e.target.result);
    });
}

export async function deleteFile(id) {
    const db = await initDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id).onsuccess = () => resolve();
    });
}

// GitHub File Operations

/**
 * Saves or updates a GitHub file in the local cache.
 * @param {Object} file - The file object containing path, content, sha, and status.
 */
export async function saveGithubFile(file) {
    const db = await initDB();
    return new Promise((resolve) => {
        const tx = db.transaction(GH_STORE_NAME, 'readwrite');
        const store = tx.objectStore(GH_STORE_NAME);
        // Ensure metadata defaults
        const record = {
            status: 'synced',
            lastSynced: Date.now(),
            ...file
        };
        const request = store.put(record);
        request.onsuccess = (e) => resolve(e.target.result);
    });
}

/**
 * Retrieves a single GitHub file from the local cache by its path.
 * @param {string} path - The repository path of the file.
 */
export async function getGithubFile(path) {
    const db = await initDB();
    return new Promise((resolve) => {
        const tx = db.transaction(GH_STORE_NAME, 'readonly');
        const store = tx.objectStore(GH_STORE_NAME);
        store.get(path).onsuccess = (e) => resolve(e.target.result);
    });
}

/**
 * Retrieves all cached GitHub files.
 */
export async function getAllGithubFiles() {
    const db = await initDB();
    return new Promise((resolve) => {
        const tx = db.transaction(GH_STORE_NAME, 'readonly');
        const store = tx.objectStore(GH_STORE_NAME);
        store.getAll().onsuccess = (e) => resolve(e.target.result);
    });
}

/**
 * Retrieves all GitHub files that have unsaved local changes.
 * Statuses include 'modified' (existing file changed) and 'new' (created locally).
 */
export async function getDirtyGithubFiles() {
    const db = await initDB();
    return new Promise((resolve) => {
        const tx = db.transaction(GH_STORE_NAME, 'readonly');
        const store = tx.objectStore(GH_STORE_NAME);
        store.getAll().onsuccess = (e) => {
            const all = e.target.result;
            resolve(all.filter(f => f.status !== 'synced'));
        };
    });
}

/**
 * Removes a GitHub file from the local cache.
 * @param {string} path - The repository path of the file.
 */
export async function deleteGithubFile(path) {
    const db = await initDB();
    return new Promise((resolve) => {
        const tx = db.transaction(GH_STORE_NAME, 'readwrite');
        const store = tx.objectStore(GH_STORE_NAME);
        store.delete(path).onsuccess = () => resolve();
    });
}
