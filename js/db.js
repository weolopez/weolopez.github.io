// db.js

export class DB {
    constructor(workerPath) {
      this._worker = new Worker(workerPath);
      this._requestIdCounter = 0;
      this._pendingMap = new Map(); // Map<requestId, {resolve, reject}>
  
      // Listen for messages from the worker
      this._worker.onmessage = (e) => {
        const { requestId, type, error, ...rest } = e.data;
        const pending = this._pendingMap.get(requestId);
        if (!pending) {
          console.warn("No matching request for response:", e.data);
          return;
        }
        this._pendingMap.delete(requestId);
  
        if (type === "error") {
          pending.reject(new Error(error));
        } else {
          pending.resolve(rest);
        }
      };
    }
  
    /**
     * Sends a JSON message, returns a Promise for the worker’s response.
     */
    _postMessage(msg) {
      return new Promise((resolve, reject) => {
        const requestId = ++this._requestIdCounter;
        this._pendingMap.set(requestId, { resolve, reject });
        this._worker.postMessage({ ...msg, requestId });
      });
    }
  
    /**
     * Initialize the engine in the worker:
     *   - Must be called first with { dbName, schema, version? }
     */
    async init(dbName, schema, version = 1) {
      const resp = await this._postMessage({
        action: "init",
        dbName,
        schema,
        version,
      });
      if (!resp.success) {
        throw new Error("Failed to initialize DB engine in worker.");
      }
      return true;
    }
  
    /**
     * Create a new record in a given store.
     *  usage: db.create("Users", { Name: "JohnDoe" })
     */
    async create(storeName, record) {
      const resp = await this._postMessage({
        type: storeName,
        action: "create",
        record,
      });
      return resp.result; // new ID
    }
  
    /**
     * Read operation:
     *  - By key => db.read("Users", 123)
     *  - By field => db.read("Users", { Name: "JohnDoe" }) => array
     */
    async read(storeName, arg) {
      if (typeof arg === "object") {
        // e.g. { Name: "JohnDoe" }
        const resp = await this._postMessage({
          action: "read",
          storeName,
          query: arg,
        });
        return resp.result;
      } else {
        // e.g. a numeric or string key
        const resp = await this._postMessage({
          action: "read",
          storeName,
          query: { key: arg },
        });
        return resp.result;
      }
    }
  
    /**
     * Update a record (must include the primary key).
     */
    async update(storeName, record) {
      const resp = await this._postMessage({
        type: storeName,
        action: "update",
        record,
      });
      return resp.result; // returns the key
    }
  
    /**
     * Delete a record by key
     */
    async delete(storeName, key) {
      await this._postMessage({
        type: storeName,
        action: "delete",
        key,
      });
      return true;
    }
  
    /**
     * Close the DB and terminate the worker
     */
    async close() {
      await this._postMessage({ action: "close" });
      this._worker.terminate();
    }
  }