// advanced-db-engine-worker.js

// 1) Inline definition of AdvancedDBEngine (no exports, it’s internal).
class AdvancedDBEngine {
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
        for (const storeDef of this.schema) {
          let store;
          if (!db.objectStoreNames.contains(storeDef.name)) {
            store = db.createObjectStore(storeDef.name, {
              keyPath: storeDef.keyPath,
              autoIncrement: !!storeDef.autoIncrement,
            });
          } else {
            // If store exists, open it for possible index creation
            const upgradeTx = request.transaction;
            store = upgradeTx.objectStore(storeDef.name);
          }
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

  // Validate data if storeDef.validate() exists
  _validateSchema(storeName, record) {
    const storeDef = this.schema.find((s) => s.name === storeName);
    if (!storeDef) {
      throw new Error(`No schema for store: ${storeName}`);
    }
    if (storeDef.validate) {
      storeDef.validate(record);
    }
  }

  async create(storeName, record) {
    this._validateSchema(storeName, record);
    const db = await this._getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.add(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async read(storeName, key) {
    const db = await this._getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async update(storeName, record) {
    this._validateSchema(storeName, record);
    const db = await this._getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.put(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async delete(storeName, key) {
    const db = await this._getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // For demonstration, we’ll fetch all and do naive filtering in the worker.
  // Real usage might do index-based queries or store.getAll().
  async readAllAndFilter(storeName, queryObject) {
    const db = await this._getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll(); // IDB getAll() in read-only
      req.onsuccess = () => {
        const allRecords = req.result || [];
        if (!queryObject || Object.keys(queryObject).length === 0) {
          return resolve(allRecords);
        }
        const [qKey, qVal] = Object.entries(queryObject)[0] || [];
        const filtered = allRecords.filter((r) => r[qKey] === qVal);
        resolve(filtered);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async close() {
    const db = await this._dbPromise;
    db.close();
    this._dbPromise = null;
  }
}

// 2) Define schema for your stores (no findChildren).
const schema = [
  {
    name: "Users",
    keyPath: "id",
    autoIncrement: true,
    indexes: [
      { name: "NameIndex", keyPath: "Name" },
      { name: "EmailIndex", keyPath: "Email", options: { unique: true } },
    ],
    validate: (data) => {
      if (!data.Name) throw new Error("User must have a Name.");
      if (!data.Email) throw new Error("User must have an Email.");
    },
  },
  {
    name: "Orders",
    keyPath: "id",
    autoIncrement: true,
    indexes: [
      { name: "OrderNameIndex", keyPath: "OrderName" },
    ],
    validate: (data) => {
      if (!data.OrderName) throw new Error("Order must have an OrderName.");
    },
  },
];

// 3) Instantiate and manage the engine within the worker ONLY
const engine = new AdvancedDBEngine("MyComplexDB", schema, 1);
let isInitialized = false;

async function ensureInit() {
  if (!isInitialized) {
    await engine.init();
    isInitialized = true;
  }
}

// 4) onmessage: receive JSON from main thread
self.onmessage = async (e) => {
  const msg = e.data;
  const { requestId } = msg || {};
  try {
    await ensureInit();

    // The messages follow this pattern:
    // - For create/update/delete:  { type: <storeName>, action: <"create"|"update"|"delete">, record?, key? }
    // - For read:                  { type: "read", storeName: <string>, query: {...} or { key: 123 } }

    let result;

    if (msg.type === "read") {
      // READ operation:  { type: "read", storeName, query: {...} }
      const { storeName, query } = msg;
      if (!storeName) throw new Error("read requires 'storeName'");
      if (query && query.key !== undefined) {
        // If query.key is present, read by primary key
        result = await engine.read(storeName, query.key);
      } else {
        // Otherwise, do a naive filter on all records
        result = await engine.readAllAndFilter(storeName, query);
      }
      self.postMessage({ requestId, type: "readResult", result });
      return;
    }

    // Otherwise, the `type` is the storeName
    const storeName = msg.type; // e.g. "Users" or "Orders"
    const { action } = msg;

    switch (action) {
      case "create":
        // { type: "Users", action: "create", record: {...} }
        result = await engine.create(storeName, msg.record);
        self.postMessage({ requestId, type: "createResult", result });
        break;

      case "update":
        // { type: "Users", action: "update", record: {...} }
        result = await engine.update(storeName, msg.record);
        self.postMessage({ requestId, type: "updateResult", result });
        break;

      case "delete":
        // { type: "Users", action: "delete", key: <someKey> }
        await engine.delete(storeName, msg.key);
        self.postMessage({ requestId, type: "deleteResult", success: true });
        break;

      case "close":
        await engine.close();
        self.postMessage({ requestId, type: "closeResult", success: true });
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  } catch (err) {
    self.postMessage({
      requestId,
      type: "error",
      error: err.message || String(err),
    });
  }
};