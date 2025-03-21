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
        if (this._dbPromise) return this._dbPromise;
        this._dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // Create or upgrade each store defined in the type.
                for (const type of this.types) {
                    let store;
                    if (!db.objectStoreNames.contains(type)) {
                        store = db.createObjectStore(type, {
                            keyPath: "id",
                            autoIncrement: !!true,
                        });
                    } else {
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

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
        return this._dbPromise;
    }

    /**
     * Retrieves the database instance, initializing it if necessary.
     * @returns {Promise<IDBDatabase>}
     * @private
     */
    async _getDB() {
        return this._dbPromise ? this._dbPromise : this.init();
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
        //   this._validate(storeName, record);
        const db = await this._getDB();
        const tx = db.transaction(storeName, "readwrite");
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
        record.id = result;
        if (result>0) this._updateParentRecord(record);
        return result;
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
        const db = await this._getDB();
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const records = await promisifyRequest(store.getAll());
        await transactionPromise(tx);
        if (!queryObj || !Object.keys(queryObj).length) return records;
        const [field, value] = Object.entries(queryObj)[0];
        return records.filter((r) => r[field] === value);
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
                    action: "dropResult",
                    success: true,
                });
                break;

            default:
                throw new Error(`Unsupported action: ${action}`);
        }
    } catch (err) {
        // Send back an error response.
        port.postMessage({
            requestId,
            action: "error",
            error: err.message || String(err),
        });
    }
}
