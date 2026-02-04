// KVDatabase.js
// A combined implementation of Key-Value Database Functions
// Supports dynamic store creation, robust transaction handling, and legacy API compatibility.

export class KVDatabase {
    // Static map to hold instances: "dbName::storeName" -> KVDatabase instance
    static instances = new Map();

    /**
     * @param {string} dbName - The name of the IndexedDB database.
     * @param {string} storeName - The name of the Object Store.
     */
    constructor(dbName, storeName) {
        const key = `${dbName}::${storeName}`;
        if (KVDatabase.instances.has(key)) {
            return KVDatabase.instances.get(key);
        }

        this.dbName = dbName;
        this.storeName = storeName;
        
        this.globalListeners = [];
        this.keyListeners = new Map(); // Key -> Set of callbacks
        this.cache = new Map(); // Cache for quick reads (v2 compatibility)
        
        // A static lock to prevent multiple instances from trying to upgrade the DB simultaneously
        if (!window.KVDatabaseLocks) window.KVDatabaseLocks = {};

        KVDatabase.instances.set(key, this);
    }

    /**
     * Helper: List all object stores (tables) in a specific database
     * @param {string} dbName 
     * @returns {Promise<string[]>}
     */
    static async listStores(dbName) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName);

            request.onerror = (e) => reject(`Error opening DB: ${e.target.error}`);

            request.onsuccess = (e) => {
                const db = e.target.result;
                const storeNames = Array.from(db.objectStoreNames);
                db.close();
                resolve(storeNames);
            };
        });
    }

    /**
     * Internal: Opens DB, checking if store exists. 
     * If not, it closes, increments version, and creates the store.
     */
    async _getDB() {
        return new Promise((resolve, reject) => {
            // 1. Try to open to check current version and stores
            const request = indexedDB.open(this.dbName);

            request.onerror = (e) => reject(`Error opening DB: ${e.target.error}`);

            request.onsuccess = (e) => {
                const db = e.target.result;

                // Handle version changes (e.g. from resetStore) to prevent blocking
                db.onversionchange = () => {
                    db.close();
                    console.log(`[KVDatabase] Closing connection to ${this.dbName} due to version change request.`);
                };

                // Check if our store exists
                if (db.objectStoreNames.contains(this.storeName)) {
                    resolve(db);
                } else {
                    // Store doesn't exist. We need to upgrade.
                    const currentVersion = db.version;
                    db.close(); // Close immediately to allow upgrade
                    this._upgradeDB(currentVersion + 1).then(resolve).catch(reject);
                }
            };
            
            // Handle edge case where DB doesn't exist yet at all
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
        });
    }

    /**
     * Internal: Handles the Version Change transaction safely
     */
    async _upgradeDB(newVersion) {
        // Simple mutex to prevent race conditions if you create db1 and db2 instantly
        let attempts = 0;
        while (window.KVDatabaseLocks[this.dbName]) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
            if (attempts > 50) break; // Break deadlocks after 5s
        }
        window.KVDatabaseLocks[this.dbName] = true;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, newVersion);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };

            request.onsuccess = (e) => {
                window.KVDatabaseLocks[this.dbName] = false;
                resolve(e.target.result);
            };

            request.onerror = (e) => {
                window.KVDatabaseLocks[this.dbName] = false;
                reject(e.target.error);
            };
            
            request.onblocked = () => {
                console.warn("Database upgrade blocked. Close other tabs/connections.");
                window.KVDatabaseLocks[this.dbName] = false; 
            };
        });
    }

    /**
     * Internal: Helper to run a transaction
     */
    async _tx(mode, callback) {
        const db = await this._getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, mode);
            const store = tx.objectStore(this.storeName);
            const request = callback(store);

            // Handle request result if it exists (for get/keys)
            if (request) {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } 
            
            // For transactions that don't return a specific request, 
            // or rely on tx completion
            tx.oncomplete = () => {
                if (!request) resolve();
                db.close(); // Close connection
            };
            
            tx.onerror = (e) => {
                reject(e.target.error);
                db.close();
            };
        });
    }

    _notify(key, value, action = 'set') {
        // 1. Notify global listeners (v1 style)
        this.globalListeners.forEach(cb => cb({ action, key, value }));

        // 2. Notify key-specific listeners (v2 style)
        if (this.keyListeners.has(key)) {
            this.keyListeners.get(key).forEach(cb => cb(value));
        }
    }

    // --- Core API ---

    /**
     * Sets a key-value pair.
     */
    async set(key, value, retry = true) {
        try {
            await this._tx('readwrite', (store) => {
                if (store.keyPath) {
                     return store.put(value);
                }
                return store.put(value, key);
            });
            this.cache.set(key, value);
            this._notify(key, value, 'set');
            return true;
        } catch (error) {
            if (retry && error.name === 'DataError') {
                console.warn(`[KVDatabase] Schema mismatch detected. Resetting store to fix... DB: ${this.dbName}`);
                await this.resetStore();
                return this.set(key, value, false);
            }
            console.error(`[KVDatabase] Error setting value. DB: ${this.dbName}, Store: ${this.storeName}, Key: ${key}`, value, error);
            throw error;
        }
    }

    /**
     * Gets a value by key.
     */
    async get(key) {
        // Optional: Check cache first? 
        // v2 behavior uses cache. v1 always read from DB.
        // Let's read from DB to be safe with cross-tab updates, but update cache.
        const val = await this._tx('readonly', (store) => {
            return store.get(key)
        });
        this.cache.set(key, val);
        return val;
    }

    /**
     * Removes a key.
     */
    async remove(key) {
        await this._tx('readwrite', (store) => store.delete(key));
        this.cache.delete(key);
        this._notify(key, undefined, 'remove');
        return true;
    }

    /**
     * Returns all keys.
     */
    async keys() {
        return this._tx('readonly', (store) => store.getAllKeys());
    }

    /**
     * Search values.
     */
    async find(searchStr) {
        const db = await this._getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.openCursor();
            const results = {};

            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    const val = cursor.value;
                    if (String(JSON.stringify(val)).includes(searchStr)) {
                        results[cursor.key] = val;
                    }
                    cursor.continue();
                } else {
                    resolve(results);
                    db.close();
                }
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }

    /**
     * Flexible Subscribe:
     * 1. subscribe(callback) -> Global listener (arg: event object)
     * 2. subscribe(key, callback) -> Key listener (arg: value)
     */
    subscribe(arg1, arg2) {
        if (typeof arg1 === 'function') {
            // Global listener
            const callback = arg1;
            this.globalListeners.push(callback);
            return () => {
                this.globalListeners = this.globalListeners.filter(l => l !== callback);
            };
        } else {
            // Key listener
            const key = arg1;
            const callback = arg2;
            if (!this.keyListeners.has(key)) {
                this.keyListeners.set(key, new Set());
            }
            this.keyListeners.get(key).add(callback);
            return () => {
                if (this.keyListeners.has(key)) {
                    this.keyListeners.get(key).delete(callback);
                }
            };
        }
    }

    /**
     * Clears all data from the store.
     */
    async clear() {
        await this._tx('readwrite', (store) => store.clear());
        this.cache.clear();
        this._notify(undefined, undefined, 'clear');
        return true;
    }

    /**
     * Deletes and recreates the object store to fix schema mismatches.
     * WARNING: This deletes all data in the store.
     */
    async resetStore() {
        const currentVer = await new Promise((resolve, reject) => {
            const req = indexedDB.open(this.dbName);
            req.onsuccess = (e) => {
                const v = e.target.result.version;
                e.target.result.close();
                resolve(v);
            };
            req.onerror = (e) => reject(e.target.error);
        });

        let attempts = 0;
        while (window.KVDatabaseLocks[this.dbName]) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
            if (attempts > 50) break;
        }
        window.KVDatabaseLocks[this.dbName] = true;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, currentVer + 1);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (db.objectStoreNames.contains(this.storeName)) {
                    db.deleteObjectStore(this.storeName);
                }
                db.createObjectStore(this.storeName);
            };

            request.onsuccess = (e) => {
                window.KVDatabaseLocks[this.dbName] = false;
                e.target.result.close();
                this.cache.clear();
                resolve();
            };

            request.onerror = (e) => {
                window.KVDatabaseLocks[this.dbName] = false;
                reject(e.target.error);
            };
            
            request.onblocked = () => {
                 window.KVDatabaseLocks[this.dbName] = false;
                 console.warn(`[KVDatabase] Reset blocked for ${this.dbName}. Forcing reload to clear connections.`);
                 window.location.reload();
            };
        });
    }

    // --- v2 Compatibility / Extensions ---

    async getValue(key) { return this.get(key); }
    async putValue(key, value) { return this.set(key, value); }
    async getAllKeys() { return this.keys(); }

    /**
     * Appends a value to an array at key.
     */
    async append(key, value) {
        const current = await this.get(key);
        let arr = Array.isArray(current) ? current : [];
        if (!arr.includes(value)) {
            arr.push(value);
        }
        return this.set(key, arr);
    }

    /**
     * Deletes a value from an array at key, OR deletes the key if no value provided (overload).
     * @param {string} key 
     * @param {any} [value] - If provided, removes this value from the array. If undefined, removes the key.
     */
    async delete(key, value) {
        if (value === undefined) {
            return this.remove(key);
        }
        const current = await this.get(key);
        if (!Array.isArray(current)) return;
        const index = current.indexOf(value);
        if (index > -1) {
            current.splice(index, 1);
            return this.set(key, current);
        }
    }

    async hasUpdate(record) {
        record.status = "hasUpdated";
        console.log("RESULT: ", await this.set(record.key || 'unknown', record));
        return record;
    }

    // Stub for v2 initDB (noop as we handle it lazily, but returns promise)
    async initDB() { return Promise.resolve(); }
    async waitForDB() { return Promise.resolve(); }
}
