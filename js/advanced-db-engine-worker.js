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

export class AdvancedDBEngine {

  constructor(dbName, schema, version = 1) {
    this.dbName = dbName;
    this.schema = schema;
    this.version = version;
    this._dbPromise = null;
  }

  async init() {
    if (this._dbPromise) return this._dbPromise;
    this._dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // Create/upgrade stores & indexes based on schema
        for (const storeDef of this.schema) {
          let store;
          if (!db.objectStoreNames.contains(storeDef.name)) {
            store = db.createObjectStore(storeDef.name, {
              keyPath: storeDef.keyPath,
              autoIncrement: !!storeDef.autoIncrement,
            });
          } else {
            // If store exists, open it to possibly create new indexes
            const upgradeTx = request.transaction;
            store = upgradeTx.objectStore(storeDef.name);
          }
          // Create indexes if they don’t already exist
          if (storeDef.indexes) {
            storeDef.indexes.forEach((idx) => {
              if (!store.indexNames.contains(idx.name)) {
                store.createIndex(idx.name, idx.keyPath, idx.options || {});
              }
            });
          }
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
    return this._dbPromise;
  }

  async _getDB() {
    if (!this._dbPromise) {
      await this.init();
    }
    return this._dbPromise;
  }

  // Validate data if storeDef.validate is set
  _validate(storeName, data) {
    const storeDef = this.schema.find((s) => s.name === storeName);
    if (!storeDef) throw new Error(`No schema for store "${storeName}"`);
    if (storeDef.validate) {
      storeDef.validate(data);
    }
  }

  // -- CREATE
  async create(storeName, record) {
    this._validate(storeName, record);
    const db = await this._getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);

      // Check if the record already exists
      const index = store.index("NameIndex"); // Assuming you have an index on a unique field
      const getRequest = index.get(record.name); // Replace 'uniqueField' with the actual unique field

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          reject(new Error("Record already exists"));
        } else {
          const req = store.add(record);
          req.onsuccess = () => resolve(req.result);
          req.onerror = (e) => reject(e.target.error);
        }
      };

      getRequest.onerror = () => {
        console.error(getRequest.error);
        return reject(getRequest.error);
      }
    });
  }

  // -- READ single record by primary key
  async read(storeName, key) {
    const db = await this._getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // -- UPDATE (put)
  async update(storeName, record) {
    this._validate(storeName, record);
    const db = await this._getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.put(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // -- DELETE
  async remove(storeName, key) {
    const db = await this._getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // -- READ ALL + FILTER (simplistic approach)
  async readAllAndFilter(storeName, queryObj) {
    // If you want real index queries, you can do so; here, we just fetch all and filter in memory
    const db = await this._getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = req.result || [];
        if (!queryObj || !Object.keys(queryObj).length) {
          return resolve(records);
        }
        // Filter in memory by the first field in queryObj
        const [field, value] = Object.entries(queryObj)[0];
        resolve(records.filter((r) => r[field] === value));
      };
      req.onerror = (e) => reject(e.target.error);
    })
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
    
  // -- CLOSE
  async close() {
    const db = await this._dbPromise;
    db.close();
    this._dbPromise = null;
  }
  async drop() {
    indexedDB.deleteDatabase(this.dbName);
    this._dbPromise = null;
  }
}

// -- STEP 2: Worker state
let engine = null;
let initialized = false;
console.log("Worker started");
self.addEventListener('connect', (event) => {
  const port = event.ports[0];

  port.onmessage = onMessage;
})

async function onMessage(e) { 
  const port = e.currentTarget
  const msg = e.data;
  const { requestId } = msg || {};

  try {
    let result;
    // console.error("Worker received message:", msg);

    // The FIRST message must be an "init" containing { dbName, schema, version? }
    if (msg.action === DB_ACTIONS.PING) {
      port.postMessage({ requestId, action: DB_ACTIONS.PING, success: true });
      return;
    } else if (msg.action === DB_ACTIONS.INIT) {
      if (initialized) {
        throw new Error("Engine already initialized.");
      }
      engine = new AdvancedDBEngine(msg.dbName, msg.schema, msg.version || 1);
      await engine.init();
      initialized = true;

      port.postMessage({ requestId, action: "initResult", success: true });
      return;
    } else if (msg.action === DB_ACTIONS.CLOSE) {
      if (engine) await engine.close();
      port.postMessage({ requestId, action: DB_ACTIONS.CLOSE, success: true });
      self.close()
      return;
    } 

    if (!initialized) {
      throw new Error(
        "Engine not initialized. Send 'init' message first with dbName & schema.",
      );
    }

    // Subsequent messages:
    // create/update/delete => { type: <storeName>, action: "create|update|delete", record?, key? }
    // read => { type: "read", storeName: <string>, query: { key? <PK> or field match } }

    switch (msg.action) {
      case "create": {
        // { type: <storeName>, action: "create", record: {...} }
        result = await engine.create(msg.record.type, msg.record);
        port.postMessage({ requestId, action: "createResult", result });
        break;
      }
      case "update": {
        result = await engine.update(msg.record.type, msg.record);
        port.postMessage({ requestId, action: "updateResult", result });
        break;
      }
      case "delete": {
        await engine.remove(msg.record.type, msg.record.key);
        port.postMessage({ requestId, action: "deleteResult", success: true });
        break;
      }
      case "readAll": {
        // read by keys
        const { storeName, keys } = msg;
        if (!storeName) throw new Error("readAll requires 'storeName'");
        if (!keys || !Array.isArray(keys)) throw new Error("readAll requires 'keys' array");
        result = await engine.readAll(storeName, keys);
        port.postMessage({ requestId, action: "readAllResult", result });
        break;
      }
      case "read": {
        // read by key or filter all
        const { storeName, query } = msg;
        if (!storeName) throw new Error("read requires 'storeName'");
        if (query && typeof query !== "object" ) {
          // let key = Object.keys(query || {})[0];
          // e.g. read single record by key
          result = await engine.read(storeName, query.key);
        } else {
          // e.g. read all & filter
          result = await engine.readAllAndFilter(storeName, query);
        }
        port.postMessage({ requestId, action: "readResult", result });
        break;
      }
      case DB_ACTIONS.DROP: {
        // Drop the database
        const db = await engine._getDB();
        db.close();
        indexedDB.deleteDatabase(engine.dbName);
        engine = null;
        initialized = false;
        port.postMessage({ requestId, action: "dropResult", success: true });
        break;
      }
      default:
        throw new Error(`Unsupported action: ${msg.action}`);
    }
  } catch (err) {
    // Return an error response
    port.postMessage({
      requestId,
      action: "error",
      error: err.message || String(err),
    });
  }
};
