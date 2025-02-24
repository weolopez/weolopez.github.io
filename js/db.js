/**
 * Database Worker Module
 *
 * This module provides a simplified interface to interact with a database
 * via a Web Worker. It includes:
 *   - A helper function to delete an IndexedDB database.
 *   - The DB class to manage worker communication and database initialization.
 *   - The Collection class to perform CRUD operations on a specific collection.
 *   - A record proxy helper to attach convenience methods to returned records.
 */

const WORKER_PATH = "../js/db-worker.js";
import { DB_ACTIONS } from "../js/db-worker.js"; // DB_ACTIONS should include actions like CLOSE, DROP, etc.

/**
 * Deletes an IndexedDB database with the specified name.
 * Also terminates a worker associated with the database.
 *
 * @param {string} name - The name of the database to delete.
 */
export function drop(name) {
  // Create a temporary worker instance and immediately terminate it.
  // (This may be used to ensure that any lingering worker operations are stopped.)
  const worker = new Worker(WORKER_PATH, { type: 'module' });
  worker.terminate();

  // Delete the IndexedDB database.
  const deleteRequest = indexedDB.deleteDatabase(name);

  deleteRequest.onerror = function (event) {
    console.error("Error deleting database:", event.target.error);
  };

  deleteRequest.onsuccess = function (event) {
    console.log("Database deleted successfully");
  };
}

/**
 * Class representing the Database connection via a SharedWorker.
 */
export class DB {
  /**
   * Create a new DB instance.
   *
   * @param {boolean} [debug=false] - Enable debug logging.
   */
  constructor(debug = false) {
    this.DEBUG = debug;
    this.start();
  }

  /**
   * Initializes the SharedWorker and sets up message handling.
   */
  start() {
    this._worker = new SharedWorker(WORKER_PATH, { name: 'DB_WORKER', type: 'module' });
    this._requestIdCounter = 0;
    this._pendingMap = new Map(); // Maps requestId to {resolve, reject}

    // Listen for messages from the worker.
    this._worker.port.onmessage = (e) => {
      const data = e.data;
      if (this.DEBUG) console.log("Worker response:", data);

      const { requestId, action, error, ...rest } = data;

      // If the worker signals that it has closed, clear our reference.
      if (action === DB_ACTIONS.CLOSE && data.success) {
        this._worker = undefined;
      }

      const pending = this._pendingMap.get(requestId);
      if (!pending) {
        console.warn("No matching request for response:", data);
        return;
      }
      this._pendingMap.delete(requestId);

      if (action === "error") {
        pending.reject(new Error(error));
      } else {
        pending.resolve(rest);
      }
    };

    this._worker.port.onmessageerror = (e) => {
      console.error("Worker message error:", e);
    };

    this._worker.onerror = (e) => {
      console.error("Worker error:", e);
    };
  }

  /**
   * Sends a message to the worker and returns a Promise that resolves
   * when the worker responds.
   *
   * @param {Object} msg - The message to send.
   * @returns {Promise<Object>} - A promise that resolves with the worker's response.
   * @private
   */
  _postMessage(msg) {
    return new Promise((resolve, reject) => {
      if (!this._worker || !this._worker.port) {
        return reject(new Error('Worker port is closed. Unable to send message.'));
      }
      const requestId = ++this._requestIdCounter;
      this._pendingMap.set(requestId, { resolve, reject });

      try {
        this._worker.port.postMessage({ ...msg, requestId });
      } catch (error) {
        this._pendingMap.delete(requestId);
        console.error("Failed to post message to worker:", error);
        reject(error);
      }
    });
  }

  /**
   * Initializes the database engine in the worker.
   * Must be called before performing other operations.
   *
   * @param {string} [dbName='default'] - The name of the database.
   * @param {string[]} [types=['default']] - Collection types to initialize.
   * @param {number} [version=1] - Database version.
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful.
   */
  async init(dbName = 'default', types = ['default'], version = 1) {
    this.name = dbName;
    this.types = types;

    // Create a Collection instance for each type and attach it to this DB instance.
    this.types.forEach((type) => {
      this[type] = new Collection(type, this);
    });

    const response = await this._postMessage({
      action: "init",
      dbName,
      types,
      version,
    });

    if (!response.success) {
      throw new Error("Failed to initialize DB engine in worker.");
    }
    return true;
  }

  /**
   * Checks whether the worker is currently running.
   *
   * @returns {boolean} - True if the worker is active.
   */
  isWorkerRunning() {
    return !!this._worker;
  }

  /**
   * Closes the connection to the worker.
   *
   * @returns {Promise<Object>} - The response from the worker.
   */
  async close() {
    return await this._postMessage({
      action: DB_ACTIONS.CLOSE,
    });
  }

  /**
   * Drops (deletes) the database.
   *
   * @returns {Promise<Object>} - The response from the worker.
   */
  async drop() {
    return await this._postMessage({
      action: DB_ACTIONS.DROP,
    });
  }
}

/**
 * Class representing a collection (or table) in the database.
 */
class Collection {
  /**
   * Creates a new Collection.
   *
   * @param {string} name - The name/type of the collection.
   * @param {DB} dbInstance - The DB instance this collection belongs to.
   */
  constructor(name, dbInstance) {
    this.name = name;
    this.DB = dbInstance;
  }
  forEach(callback) {
    return this.DB._postMessage({
      action: DB_ACTIONS.READ_ALL,
      storeName: this.name,
    }).then((response) => {
      response.result.forEach((record) => {
        callback(createRecordProxy(this, record));
      });
    });
  }

  /**
   * Adds a new record to the collection.
   *
   * @param {Object} fields - The fields of the new record.
   * @returns {Promise<Object>} - A proxy of the newly created record.
   */
  async add(fields) {
    // Ensure the record includes a type. Default to the collection's name if not provided.
    if (!fields.type) {
      fields.type = this.name;
    }
    const response = await this.DB._postMessage({
      action: DB_ACTIONS.CREATE,
      record: fields,
    });
    fields.id = response.result; // Assign the newly generated ID
    return createRecordProxy(this, fields);
  }

  /**
   * Updates an existing record in the collection.
   *
   * @param {Object} record - The record to update.
   * @returns {Promise<any>} - The key of the updated record.
   */
  async update(record) {
    const response = await this.DB._postMessage({
      action: DB_ACTIONS.UPDATE,
      record,
    });
    return response.result;
  }

  /**
   * Removes a record from the collection.
   *
   * @param {any} key - The key or identifier of the record to remove.
   * @returns {Promise<Object>} - The worker's response.
   */
  async remove(key) {
    return await this.DB._postMessage({
      action: DB_ACTIONS.DELETE,
      key,
    });
  }

  /**
   * Finds a record in the collection.
   *
   * @param {Object|string|number} query - The query object or key to search for.
   * @param {string} [storeName=this.name] - The store name to search within.
   * @returns {Promise<Object|null>} - A proxy of the found record or null if not found.
   */
  async find(query, storeName = this.name) {
    let response;
    if (typeof query === "object") {
      // Query by fields, e.g. { name: "JohnDoe" }
      response = await this.DB._postMessage({
        action: DB_ACTIONS.READ,
        storeName,
        query,
      });
    } else {
      // Query by key (numeric or string)
      response = await this.DB._postMessage({
        action: DB_ACTIONS.READ,
        storeName,
        query: { key: query },
      });
    }

    const record = Array.isArray(response.result) ? response.result[0] : response.result;
    if (!record) return null;
    return createRecordProxy(this, record);
  }
}

/**
 * Creates a proxy for a record to attach convenient helper methods.
 *
 * The proxy provides:
 *   - remove: An async function to delete the record.
 *   - add: An async function to add a child record (requires a 'type' property).
 *   - update: An async function to update the record.
 *   - toString: A function returning a formatted JSON string of the record.
 *   - getFields: A function returning the original record object.
 *
 * @param {Collection} collection - The collection instance.
 * @param {Object} record - The record object.
 * @returns {Proxy} - A proxy wrapping the record.
 */
function createRecordProxy(collection, record) {
  if (!record) return record;

  return new Proxy(record, {
    get(target, prop, receiver) {
      // Remove the record.
      if (prop === "remove") {
        return async () => {
          return await collection.remove(target.id);
        };
      }

      // Add a child record.
      if (prop === "add") {
        return async (childData) => {
          if (!childData.type) {
            throw new Error("childData must include a 'type' property.");
          }
          const childCollection = collection.DB[childData.type];
          if (!childCollection) {
            throw new Error(`No collection found for type '${childData.type}'.`);
          }
          // Attach parent relationship.
          childData.parentID = target.id;
          childData.parentType = collection.name;
          return await childCollection.add(childData);
        };
      }

      // Update the record.
      if (prop === "update") {
        return async () => {
          return await collection.update(target);
        };
      }

      // Return a pretty-printed JSON string.
      if (prop === "toString") {
        return (padding = 2) => JSON.stringify(target, null, padding);
      }

      // If the property is an array, assume it represents related keys and fetch them.
      if (Array.isArray(target[prop])) {
        return collection.DB._postMessage({
          type: prop,
          action: DB_ACTIONS.READ_ALL,
          keys: target[prop],
        });
      }

      // Return the original fields.
      if (prop === "getFields") {
        return () => target;
      }

      // Default behavior.
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      return Reflect.set(target, prop, value, receiver);
    },
  });
}

window.db = new DB(true);