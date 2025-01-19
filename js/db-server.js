/**
 * @typedef {Object} StoreIndex
 * @property {string} name           - Index name (e.g. 'NameIndex').
 * @property {string|string[]} keyPath - Field(s) on which to index (e.g. 'Name' or ['lastName','firstName']).
 * @property {IDBIndexParameters} [options] - Additional index options (e.g. { unique: false, multiEntry: false }).

 * @typedef {Object} StoreSchema
 * @property {string} name                - The name of the object store (e.g. 'Users').
 * @property {string} keyPath             - The primary key field (e.g. 'id').
 * @property {boolean} [autoIncrement]    - Whether to auto-increment the key.
 * @property {StoreIndex[]} [indexes]     - Array of indexes to create for this store.
 * @property {Function} [validate]        - Optional function to validate data before insertion/update.
 *
 * @typedef {Object} QueryOptions
 * @property {string} index               - The index name to use for the query (must be created in the schema).
 * @property {IDBKeyRange} [range]        - A key range (IDBKeyRange) for more complex queries (e.g. IDBKeyRange.bound(...)).
 * @property {boolean} [direction]        - 'next' (default), 'prev', 'nextunique', or 'prevunique'.
 */

/**
 * AdvancedDBEngine - A robust IndexedDB-based engine that supports:
 * - Schema definitions with indexes
 * - JSON data validation hooks
 * - Parent/child references for nesting
 * - Advanced queries using indexes and cursors
 * - Async/await for all DB operations
 */
export class AdvancedDBEngine {
    /**
     * Constructs a new AdvancedDBEngine instance.
     * @param {string} dbName         - Name of the IndexedDB database.
     * @param {StoreSchema[]} schema  - An array of store definitions.
     * @param {number} [version=1]    - The database version (useful for upgrades/migrations).
     */
    constructor(dbName, schema, version = 2) {
      /**
       * @private
       * @type {string}
       */
      this.dbName = dbName;
  
      /**
       * @private
       * @type {number}
       */
      this.version = version;
  
      /**
       * @private
       * @type {StoreSchema[]}
       */
      this.schema = schema;
  
      /**
       * @private
       * @type {Promise<IDBDatabase>|null}
       */
      this._dbPromise = null;
    }
  
    /**
     * Initialize (or upgrade) the database, creating stores and indexes as per the schema.
     * Must be called before using create/read/update/delete/query.
     *
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
      if (this._dbPromise) {
        return this._dbPromise;
      }
  
      this._dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.version);
  
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          this._createOrUpgradeSchema(db);
        };
  
        request.onsuccess = (event) => {
          const db = event.target.result;
          db.onversionchange = () => {
            // If another tab upgrades the DB, we can close or reload.  
            // For now, we’ll just console log.
            console.warn("Database version changed in another context. Closing this connection.");
            db.close();
          };
          resolve(db);
        };
  
        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
  
      return this._dbPromise;
    }
  
    /**
     * Internal method to create/upgrade stores and indexes based on the schema.
     * @private
     * @param {IDBDatabase} db
     */
    _createOrUpgradeSchema(db) {
      // For each store definition, create the objectStore if it doesn’t exist
      this.schema.forEach((storeDef) => {
        let objectStore;

        if (!db.objectStoreNames.contains(storeDef.name)) {
          objectStore = db.createObjectStore(storeDef.name, {
            keyPath: storeDef.keyPath,
            autoIncrement: !!storeDef.autoIncrement,
          });
        } else {
          // If store already exists, open it for possible index upgrades
          objectStore = db.transaction.objectStore(storeDef.name);
        }
  
        // Create indexes
        if (storeDef.indexes) {
          storeDef.indexes.forEach((idx) => {
            if (!objectStore.indexNames.contains(idx.name)) {
              objectStore.createIndex(idx.name, idx.keyPath, idx.options || {});
            }
          });
        }
      });
    }
  
    /**
     * Get the open database (awaits init if necessary).
     * @private
     * @returns {Promise<IDBDatabase>}
     */
    async _getDB() {
      if (!this._dbPromise) {
        await this.init();
      }
      return await this._dbPromise;
    }
  
    /**
     * Validate data against the store's schema, if a validate function is specified.
     * @private
     * @param {string} storeName
     * @param {any} data   The object to validate
     */
    _validateSchema(storeName, data) {
      const storeDef = this.schema.find((s) => s.name === storeName);
      if (!storeDef) {
        throw new Error(`No schema found for store: ${storeName}`);
      }
      if (storeDef.validate) {
        // If validate is provided, it should throw on invalid data
        storeDef.validate(data);
      }
    }
  
    /**
     * Creates a new record in the specified store.
     * - Auto-increments the key if store is defined that way
     * - Validates data if a validate function is provided in schema
     * @param {string} storeName  Name of the store
     * @param {Object} record     JSON data to insert
     * @returns {Promise<number>} The generated key (ID) of the new record
     */
    async create(storeName, record) {
      this._validateSchema(storeName, record);
  
      const db = await this._getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);

    // Check if the record already exists
    const index = store.index('name'); // Assuming you have an index on a unique field
    const getRequest = index.get(record.name); // Replace 'uniqueField' with the actual unique field

        getRequest.onsuccess = () => {
          if (getRequest.result) {
            reject(new Error('Record already exists'));
          } else {
            const addRequest = store.add(record);
            addRequest.onsuccess = () => resolve(addRequest.result);
            addRequest.onerror = () => reject(addRequest.error);
          }
        };
    
        getRequest.onerror = () => {
          console.error(getRequest.error);
          return reject(getRequest.error);
        }
      });
    }
     /**
     * Reads a record by array of primary keys (or auto-increment ID).
     * @param {string} storeName
     * @param  keys
     * @returns {Promise<Object|null>} Returns the record object or null if not found
     */ 
    async readAll(storeName, keys) {
      const db = await this._getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const results = [];
        keys.forEach(key => {
          const request = store.get(key);
          request.onsuccess = () => {
            results.push(request.result || null);
          };
          request.onerror = (e) => reject(e.target.error);
        });
        tx.oncomplete = () => resolve(results);
      });
    }

    /**
     * Reads a record by primary key (or auto-increment ID).
     * @param {string} storeName
     * @param {IDBValidKey} key
     * @returns {Promise<Object|null>} Returns the record object or null if not found
     */
    async read(storeName, key) {
      const db = await this._getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const request = store.get(key);
  
        request.onsuccess = () => {
          resolve(request.result || null);
        };
        request.onerror = (e) => reject(e.target.error);
      });
    }
  
    /**
     * Updates (puts) a record in the specified store.
     * - If the record does not exist, it will be created.
     * - If you only have partial fields, you may want to fetch the existing object first, merge, then put.
     * @param {string} storeName
     * @param {Object} record
     * @returns {Promise<IDBValidKey>} The key of the updated record
     */
    async update(storeName, record) {
      this._validateSchema(storeName, record);
  
      const db = await this._getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const request = store.put(record);
  
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
      });
    }
  
    /**
     * Deletes a record by primary key.
     * @param {string} storeName
     * @param {IDBValidKey} key
     * @returns {Promise<void>}
     */
    async delete(storeName, key) {
      const db = await this._getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const request = store.delete(key);
  
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      });
    }
  
    /**
     * Perform a **basic** index-based query.
     * Example usage:
     *   const results = await db.query("Users", {
     *     index: "Email",
     *     range: IDBKeyRange.bound("a@a.com", "z@z.com"),
     *   });
     *
     * For more advanced logic (like filtering or pagination),
     * you could add optional callbacks, or chain multiple queries.
     *
     * @param {string} storeName    - Name of the store to query.
     * @param {QueryOptions} options
     * @returns {Promise<Object[]>}  - An array of matching records.
     */
    async query(storeName, options) {
      const db = await this._getDB();
      const { index, range, direction } = options;
      const results = [];
  
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        let idx;
        try {
          idx = store.index(index);
        } catch (e) {
          reject(new Error(`Index "${index}" not found in store "${storeName}"`));
          return;
        }
  
        const cursorRequest = idx.openCursor(range || null, direction || "next");
        cursorRequest.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        cursorRequest.onerror = (e) => reject(e.target.error);
      });
    }
  
    /**
     * Example of a more advanced function that finds child references
     * if your data structure uses parentID / parentType to nest objects.
     * @param {string} storeName        - Name of the store to search for children.
     * @param {IDBValidKey} parentID    - The parent's ID.
     * @param {string} [parentType]     - e.g. "Users" if referencing the parent store type.
     * @returns {Promise<Object[]>}     - All children referencing the given parent.
     */
    async findChildren(storeName, parentID, parentType) {
      // This requires that we have an index on (parentID) or (parentID + parentType).
      // For simplicity, let’s assume we have an index named "parentID" on each store that might have a parent.
      return this.query(storeName, {
        index: "parentID",
        range: IDBKeyRange.only(String(parentID)), // or parentID if you store as string
      }).then((records) => {
        // Optionally filter by parentType if needed
        if (parentType) {
          return records.filter((r) => r.parentType === parentType);
        }
        return records;
      });
    }
  
    /**
     * Close the database connection (useful if you need to re-open or upgrade).
     */
    async close() {
      const db = await this._dbPromise;
      db.close();
      this._dbPromise = null;
    }
    /**
   * Drop the entire database.
   */
  async dropDatabase(dbName) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => {
        console.log(`Database ${dbName} deleted successfully`);
        resolve();
      };
      request.onerror = (event) => {
        console.error(`Error deleting database ${dbName}`, event);
        reject(event);
      };
      request.onblocked = () => {
        console.warn(`Database ${dbName} deletion blocked`);
      };
    });
  }

  }