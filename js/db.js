// db.js

export class DB {
    /**
     * @param {string} workerPath The path to the worker script (e.g. 'advanced-db-engine-worker.js')
     * @param {string[]} storeNames A list of store names (e.g. ['Users', 'Orders'])
     */
    constructor(dbName, storeNames) {
      this._worker = new Worker('../js/advanced-db-engine-worker.js');
      this._requestIdCounter = 0;
      this._pendingRequests = new Map(); // requestId -> {resolve, reject}
  
      // Listen for worker responses
      this._worker.onmessage = (e) => {
        const { requestId, type, error, ...rest } = e.data;
        if (!this._pendingRequests.has(requestId)) {
          // Possibly a stray message or an error
          console.warn("No matching request found for response:", e.data);
          return;
        }
        const { resolve, reject } = this._pendingRequests.get(requestId);
        this._pendingRequests.delete(requestId);
  
        if (type === "error") {
          reject(new Error(error));
        } else {
          // For createResult, readResult, etc., pass back the relevant fields
          resolve(rest);
        }
      };
  
      // Create convenience objects for each storeName
      storeNames.forEach((name) => {
        // e.g. this.Users = { create(...), read(...), update(...), delete(...) }
        this[name] = this._makeStoreAPI(name);
      });
    }
  
    /**
     * Creates a mini-API object for each store name:
     *   db.Users.create(record)
     *   db.Users.update(record)
     *   db.Users.delete(key)
     *   db.Users.read(query or key)
     */
    _makeStoreAPI(storeName) {
      return {
        create: (record) => {
          return this._postMessage({
            type: storeName,
            action: "create",
            record,
          }).then((res) => res.result); // createResult => { result: newId }
        },
        update: (record) => {
          return this._postMessage({
            type: storeName,
            action: "update",
            record,
          }).then((res) => res.result); // updateResult => { result: key }
        },
        delete: (key) => {
          return this._postMessage({
            type: storeName,
            action: "delete",
            key,
          }).then(() => true);
        },
        read: (arg) => {
          // If user calls read(keyNumber), do read by key
          // If user calls read({ Name: "JohnDoe" }), do a query filter
          if (typeof arg === "object") {
            // e.g. { Name: "JohnDoe" }
            return this._postMessage({
              type: "read",
              storeName,
              query: arg,
            }).then((res) => res.result);
          } else {
            // e.g. read(123) => read by key
            return this._postMessage({
              type: "read",
              storeName,
              query: { key: arg },
            }).then((res) => res.result);
          }
        },
      };
    }
  
    /**
     * Sends a JSON message to the worker and returns a Promise for the response.
     */
    _postMessage(msg) {
      return new Promise((resolve, reject) => {
        const requestId = ++this._requestIdCounter;
        this._pendingRequests.set(requestId, { resolve, reject });
        this._worker.postMessage({ ...msg, requestId });
      });
    }
  
    /**
     * Closes the underlying DB and terminates the worker.
     */
    async close() {
      // 1) Close the DB in the worker
      await this._postMessage({ type: "close", action: "close" });
      // 2) Terminate the worker
      this._worker.terminate();
    }
  }