/**
 * Wraps an IndexedDB request in a Promise.
 * @param {IDBRequest} request - The IndexedDB request.
 * @returns {Promise<any>} Resolves with the request result.
 */
const promisifyRequest = (request) =>
    new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

/**
 * Returns a Promise that resolves when a transaction completes.
 * @param {IDBTransaction} tx - The IndexedDB transaction.
 * @returns {Promise<void>}
 */
const transactionPromise = (tx) =>
    new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });

/**
 * Database actions used for inter-worker messaging.
 */
export const DB_ACTIONS = {
    INIT: "init",
    PING: "ping",
    CREATE: "create",
    UPDATE: "update",
    DELETE: "delete",
    READ: "read",
    READ_ALL: "readAll",
    CLOSE: "close",
    DROP: "drop",
    LIST_DATABASES: "listDatabases", // Add this new action
};

/**
 * AdvancedDBEngine is a wrapper around IndexedDB that supports type initialization,
 * validation, and basic CRUD operations.
 */
export class AdvancedDBEngine {
    /**
     * Creates an AdvancedDBEngine instance.
     * @param {string} dbName - The name of the database.
     * @param {Array<Object>} type - Schema definitions for the object stores.
     * @param {number} [version=1] - The database version.
     */
    constructor(dbName, types, version = 1) {
        this.dbName = dbName;
        this.types = types;
        this.version = version;
        this._dbPromise = null;
    }

    /**
     * Initializes (or upgrades) the database based on the provided type.
     * @returns {Promise<IDBDatabase>} The opened database instance.
     */
    async init() {
        console.log(`[DB-WORKER] Starting database initialization for: ${this.dbName}`);
        if (this._dbPromise) {
            console.log(`[DB-WORKER] Database already initialized, returning existing promise`);
            const db = await this._dbPromise;
            // Check if the database connection is still valid
            if (db && !db.objectStoreNames.contains('__invalid__')) {
                console.log(`[DB-WORKER] Existing database connection is valid`);
                return db;
            } else {
                console.log(`[DB-WORKER] Existing database connection is invalid, reinitializing`);
                this._dbPromise = null;
            }
        }
        
        this._dbPromise = new Promise((resolve, reject) => {
            // Instead of deleting, try to open existing database first
            console.log(`[DB-WORKER] Attempting to open existing database: ${this.dbName}`);
            const request = indexedDB.open(this.dbName, this.version);
            this._setupDatabaseRequest(request, resolve, reject);
        });
        return this._dbPromise;
    }

    _setupDatabaseRequest(request, resolve, reject) {
            console.log(`[DB-WORKER] Setting up database request for: ${this.dbName}`);

            request.onupgradeneeded = (event) => {
                console.log(`[DB-WORKER] onupgradeneeded fired - creating object stores for: ${this.dbName}`);
                const db = event.target.result;
                console.log(`[DB-WORKER] Existing object stores:`, Array.from(db.objectStoreNames));
                console.log(`[DB-WORKER] Types to create:`, this.types);
                
                // Create or upgrade each store defined in the type.
                for (const type of this.types) {
                    let store;
                    if (!db.objectStoreNames.contains(type)) {
                        console.log(`[DB-WORKER] Creating object store: ${type}`);
                        store = db.createObjectStore(type, {
                            keyPath: "id",
                            autoIncrement: !!true,
                        });
                    } else {
                        console.log(`[DB-WORKER] Object store ${type} already exists`);
                        // When upgrading, re-open the existing store.
                        store = request.transaction.objectStore(type);
                    }
                    // Create any missing indexes.
                    // if (storeDef.indexes) {
                    //   for (const idx of storeDef.indexes) {
                    //     if (!store.indexNames.contains(idx.name)) {
                    //       store.createIndex(idx.name, idx.keyPath, idx.options || {});
                    //     }
                    //   }
                    // }
                }
            };

            request.onsuccess = (event) => {
                console.log(`[DB-WORKER] Database opened successfully: ${this.dbName}`);
                const db = event.target.result;
                // Attach an event listener to handle version changes.
                db.onversionchange = () => {
                    console.log(`[DB-WORKER] Database version change detected for ${this.dbName}. Closing connection.`);
                    db.close();
                };
                console.log(`[DB-WORKER] Final object stores:`, Array.from(db.objectStoreNames));
                console.log(`[DB-WORKER] Database connection state:`, db.readyState);
                resolve(db);
            };
            request.onerror = (event) => {
                console.error(`[DB-WORKER] Database open error for ${this.dbName}:`, event.target.error);
                reject(event.target.error);
            };
    }

    /**
     * Retrieves the database instance, initializing it if necessary.
     * @returns {Promise<IDBDatabase>}
     * @private
     */
    async _getDB() {
        console.log(`[DB-WORKER] _getDB called for: ${this.dbName}`);
        if (!this._dbPromise) {
            console.log(`[DB-WORKER] No existing promise, initializing database: ${this.dbName}`);
            return this.init();
        }
        
        try {
            console.log(`[DB-WORKER] Using existing database promise for: ${this.dbName}`);
            const db = await this._dbPromise;
            console.log(`[DB-WORKER] Database connection state:`, db.readyState);
            
            // Validate the database connection is still active
            if (!db || db.readyState === 'closed') {
                console.log(`[DB-WORKER] Database connection is closed, reinitializing`);
                this._dbPromise = null;
                return this.init();
            }
            
            // Additional validation - try to access object store names
            try {
                const storeNames = Array.from(db.objectStoreNames);
                console.log(`[DB-WORKER] Database has ${storeNames.length} object stores:`, storeNames);
                return db;
            } catch (error) {
                console.log(`[DB-WORKER] Database connection validation failed:`, error);
                this._dbPromise = null;
                return this.init();
            }
        } catch (error) {
            console.error(`[DB-WORKER] Error getting database:`, error);
            this._dbPromise = null;
            return this.init();
        }
    }

    /**
     * Validates data using the store’s validation function (if provided).
     * @param {string} storeName - The name of the store.
     * @param {Object} data - The record data.
     * @throws {Error} If no schema is found for the store.
     */
    // _validate(storeName, data) {
    //   const storeDef = this.schema.find((s) => s.name === storeName);
    //   if (!storeDef) throw new Error(`No schema for store "${storeName}"`);
    //   if (storeDef.validate) storeDef.validate(data);
    // }

    /**
     * Creates a new record in the specified object store.
     * Ensures that the unique index value does not already exist.
     * @param {string} storeName - The name of the store.
     * @param {Object} record - The record to add.
     * @returns {Promise<any>} The primary key of the new record.
     * @throws {Error} If a record with the same unique index already exists.
     */
    async create(storeName, record) {
        console.log(`[DB-WORKER] Creating record in store: ${storeName}`, record);
        //   this._validate(storeName, record);
        const db = await this._getDB();
        console.log(`[DB-WORKER] Got database for create operation, state:`, db.readyState);
        
        try {
            const tx = db.transaction(storeName, "readwrite");
            console.log(`[DB-WORKER] Created transaction for store: ${storeName}`);
            const store = tx.objectStore(storeName);

            //   const storeDef = this.schema.find((s) => s.name === storeName);
            //   if (!storeDef) throw new Error(`No schema for store "${storeName}"`);
            //   const uniqueIndex = storeDef.indexes?.find((idx) => idx.unique);
            //   if (!uniqueIndex) throw new Error(`No unique index found for store "${storeName}"`);

            //   const index = store.index(uniqueIndex.name);
            //   const existing = await promisifyRequest(index.get(record[uniqueIndex.keyPath]));
            //   if (existing) throw new Error("Record already exists");

            const result = await promisifyRequest(store.add(record));
            await transactionPromise(tx);
            console.log(`[DB-WORKER] Successfully created record with ID: ${result}`);
            record.id = result;
            if (result>0) this._updateParentRecord(record);
            return result;
        } catch (error) {
            console.error(`[DB-WORKER] Error creating record in ${storeName}:`, error);
            throw error;
        }
    }
    //function to check if an array of strings is defined and is not empty string
    isDefined(arrayOfStrings) {
        return arrayOfStrings.every((str) => str !== undefined && str !== "");
    }
    async _updateParentRecord(fields) {
        if (this.isDefined([fields.parentID, fields.parentType])) {
            let parentRecord = await this.read(fields.parentType, fields.parentID);
            if (parentRecord) {
                const parentType = fields.type;
                if (Array.isArray(parentRecord[parentType])) {
                    parentRecord[parentType].push(fields.id);
                } else {
                    parentRecord[parentType] = [fields.id];
                }
                return await this.update(parentRecord);

            }
        }
    }

    /**
     * Reads a record from the specified store by its primary key.
     * @param {string} storeName - The name of the store.
     * @param {any} key - The primary key.
     * @returns {Promise<Object|null>} The record object or null if not found.
     */
    async read(storeName, key) {
        const db = await this._getDB();
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const result = await promisifyRequest(store.get(key));
        await transactionPromise(tx);
        return result ?? null;
    }

    /**
     * Updates (or creates) a record in the specified store.
     * @param {string} storeName - The name of the store.
     * @param {Object} record - The record to update.
     * @returns {Promise<any>} The primary key of the updated record.
     */
    async update(record) {
        //   this._validate(storeName, record);
        const db = await this._getDB();
        const tx = db.transaction(record.type, "readwrite");
        const store = tx.objectStore(record.type);
        const result = await promisifyRequest(store.put(record));
        await transactionPromise(tx);
        return result;
    }

    /**
     * Removes a record from the specified store by its primary key.
     * @param {string} storeName - The name of the store.
     * @param {any} key - The primary key of the record to remove.
     * @returns {Promise<void>}
     */
    async remove(storeName, key) {
        const db = await this._getDB();
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        await promisifyRequest(store.delete(key));
        await transactionPromise(tx);
    }

    /**
     * Reads all records from a store and applies an in-memory filter.
     * @param {string} storeName - The name of the store.
     * @param {Object} queryObj - Filter criteria (e.g. { field: value }).
     * @returns {Promise<Array>} An array of matching records.
     */
    async readAllAndFilter(storeName, queryObj) {
        console.log(`[DB-WORKER] Reading and filtering from store: ${storeName}`, queryObj);
        const db = await this._getDB();
        console.log(`[DB-WORKER] Got database for read operation, state:`, db.readyState);
        
        try {
            const tx = db.transaction(storeName, "readonly");
            console.log(`[DB-WORKER] Created read transaction for store: ${storeName}`);
            const store = tx.objectStore(storeName);
            const records = await promisifyRequest(store.getAll());
            await transactionPromise(tx);
            console.log(`[DB-WORKER] Successfully read ${records.length} records from ${storeName}`);
            if (!queryObj || !Object.keys(queryObj).length) return records;
            const [field, value] = Object.entries(queryObj)[0];
            const filtered = records.filter((r) => r[field] === value);
            console.log(`[DB-WORKER] Filtered to ${filtered.length} records`);
            return filtered;
        } catch (error) {
            console.error(`[DB-WORKER] Error reading from ${storeName}:`, error);
            throw error;
        }
    }

    /**
     * Reads multiple records by an array of primary keys.
     * @param {string} storeName - The name of the store.
     * @param {Array<any>} keys - The primary keys.
     * @returns {Promise<Array<Object|null>>} An array of records or null for missing entries.
     */
    async readAll(storeName, keys) {
        const db = await this._getDB();
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const results = await Promise.all(
            keys.map((key) => promisifyRequest(store.get(key))),
        );
        await transactionPromise(tx);
        return results.map((r) => r ?? null);
    }

    /**
     * Closes the database connection.
     * @returns {Promise<void>}
     */
    async close() {
        const db = await this._getDB();
        db.close();
        this._dbPromise = null;
    }

    /**
     * Drops (deletes) the entire database.
     * @returns {Promise<void>}
     */
    async drop() {
        const db = await this._getDB();
        db.close();
        indexedDB.deleteDatabase(this.dbName);
        this._dbPromise = null;
    }
}

/* ================= Worker Message Handler ================= */

/**
 * The worker listens for incoming connections (SharedWorker style)
 * and messages to perform database actions.
 */
let engine = null;
let initialized = false;
console.log("Worker started");

// Listen for incoming connections.
self.addEventListener("connect", (event) => {
    const port = event.ports[0];
    port.onmessage = onMessage;
});

/**
 * Handles incoming messages and routes them to the appropriate DB action.
 * @param {MessageEvent} e - The message event.
 */
async function onMessage(e) {
    const port = e.currentTarget;
    const msg = e.data;
    const { requestId, action } = msg || {};

    try {
        let result;

        // Special actions that do not require prior initialization.
        if (action === DB_ACTIONS.PING) {
            port.postMessage({
                requestId,
                action: DB_ACTIONS.PING,
                success: true,
            });
            return;
        } else if (action === DB_ACTIONS.INIT) {
            if (initialized) {
                // throw new Error("Engine already initialized.");
                // TODO test if engine is in a good state
                port.postMessage({
                    requestId,
                    action: "initResult",
                    success: true,
                });
                return;
            }
            engine = new AdvancedDBEngine(
                msg.dbName,
                msg.types,
                msg.version || 1,
            );
            await engine.init();
            initialized = true;
            port.postMessage({
                requestId,
                action: "initResult",
                success: true,
            });
            return;
        } else if (action === DB_ACTIONS.CLOSE) {
            if (engine) await engine.close();
            port.postMessage({
                requestId,
                action: DB_ACTIONS.CLOSE,
                success: true,
            });
            self.close();
            return;
        } else if (action === DB_ACTIONS.LIST_DATABASES) { // New case for listing databases
            if (indexedDB.databases) {
                const databases = await indexedDB.databases();
                result = databases.map(dbInfo => dbInfo.name); // Extract only names
                port.postMessage({
                    requestId,
                    action: "listDatabasesResult",
                    result,
                });
            } else {
                port.postMessage({
                    requestId,
                    action: "listDatabasesResult",
                    error: "indexedDB.databases() is not supported in this browser.",
                });
            }
            return;
        }

        // Ensure the engine is initialized before processing further actions.
        if (!initialized) {
            throw new Error(
                "Engine not initialized. Send an 'init' message first with dbName & type.",
            );
        }

        // Determine the store name from either msg.record.type or msg.storeName.
        const storeName = msg.record?.type || msg.storeName;
        switch (action) {
            case DB_ACTIONS.CREATE:
                // Expected format: { record: { type: <storeName>, ... } }
                result = await engine.create(storeName, msg.record);
                port.postMessage({ requestId, action: "createResult", result });
                break;

            case DB_ACTIONS.UPDATE:
                result = await engine.update(msg.record);
                port.postMessage({ requestId, action: "updateResult", result });
                break;

            case DB_ACTIONS.DELETE:
                // Expected format: { record: { type: <storeName>, key: <primaryKey> } }
                await engine.remove(storeName, msg.record.key);
                port.postMessage({
                    requestId,
                    action: "deleteResult",
                    success: true,
                });
                break;

            case DB_ACTIONS.READ_ALL:
                // Expected format: { storeName, keys: [ ... ] }
                if (!msg.storeName) {
                    throw new Error("readAll requires 'storeName'");
                }
                if (!msg.keys || !Array.isArray(msg.keys)) {
                    throw new Error("readAll requires a 'keys' array");
                }
                result = await engine.readAll(msg.storeName, msg.keys);
                port.postMessage({
                    requestId,
                    action: "readAllResult",
                    result,
                });
                break;

            case DB_ACTIONS.READ:
                // Expected format: { storeName, query: { key?: <primaryKey>, ... } }
                if (!msg.storeName) {
                    throw new Error("read requires 'storeName'");
                }
                if (msg.query && "key" in msg.query) {
                    result = await engine.read(msg.storeName, msg.query.key);
                } else {
                    result = await engine.readAllAndFilter(
                        msg.storeName,
                        msg.query,
                    );
                }
                port.postMessage({ requestId, action: "readResult", result });
                break;

            case DB_ACTIONS.DROP:
                // Drop (delete) the entire database.
                await engine.drop();
                engine = null;
                initialized = false;
                port.postMessage({
                    requestId,
                    action: DB_ACTIONS.DROP,
                    success: true,
                });
                break;

            default:
                throw new Error(`Unknown action: ${action}`);
        }
    } catch (error) {
        console.error(`[DB-WORKER] Error processing message for action ${action}:`, error);
        port.postMessage({
            requestId,
            action: "error",
            error: error.message,
        });
    }
}
