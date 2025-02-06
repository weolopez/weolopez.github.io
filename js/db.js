const WORKERPATH = "../js/advanced-db-engine-worker.js";
import { AdvancedDBEngine, DB_ACTIONS } from "../js/advanced-db-engine-worker.js";

//function to check if an array of strings is defined and is not empty string
function isDefined(arrayOfStrings) {
  return arrayOfStrings.every((str) => str !== undefined && str !== "");
}

export function drop(name) {
  const worker = new Worker(WORKERPATH, { type: 'module' });
  worker.terminate();
  const deleteRequest = indexedDB.deleteDatabase(name);

  deleteRequest.onerror = function (event) {
    console.error("Error deleting database:", event.target.error);
  };

  deleteRequest.onsuccess = function (event) {
    console.log("Database deleted successfully");
  };
}

export class DB {
  constructor( debug = false) {
    this.DEBUG = debug;
    this.start()
  }

  /**
   * Sends a JSON message, returns a Promise for the worker’s response.
   */
  _postMessage(msg) {
    return new Promise((resolve, reject) => {
      if (!this._worker.port) {
        console.error('SharedWorker port is closed. Unable to send message.');
      }
      const requestId = ++this._requestIdCounter;

      this._pendingMap.set(requestId, { resolve, reject });
      try {
        this._worker.port.postMessage({ ...msg, requestId });
      } catch (error) {
        this._pendingMap.delete(requestId);
        console.error("Failed to post message to worker:", error);
        // reject(error);
      }
    });
  }
  start() {
    this._worker = new SharedWorker(WORKERPATH, { name: 'DB_WORKER', type: 'module' });

    this._requestIdCounter = 0;
    this._pendingMap = new Map(); // Map<requestId, {resolve, reject}>

    // Listen for messages from the worker
    this._worker.port.onmessage = (e) => {
      if (this.DEGUG) console.log("Worker response:", e.data);

      const { requestId, action, error, ...rest } = e.data;

      if (action === DB_ACTIONS.CLOSE && e.data.success) {
        this._worker = undefined;
      }

      const pending = this._pendingMap.get(requestId);
      if (!pending) {
        console.warn("No matching request for response:", e.data);
        return;
      }
      this._pendingMap.delete(requestId);

      if (action === "error") {
        pending.reject(new Error(error));
      } else {
        pending.resolve(rest);
      }
    }
    this._worker.port.onmessageerror = (e) => {
      console.error("Message error:", e);
    }
    this._worker.onerror = (e) => {
      console.error("Worker error:", e);
    }
  }

  /**
   * Initialize the engine in the worker:
   *   - Must be called first with { dbName, schema, version? }
   */
  async init(dbName, schema, version = 1) {
    this.name = dbName;
    this.collections = schema.map((collection) => collection.name);

    this.collections.forEach((collName) => {
      this[collName] = new Collection(collName, this);
    });

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
  isWorkerRunning() {
    return this._worker !== undefined;
  }
  async close() {
    return await this._postMessage({
      action: DB_ACTIONS.CLOSE,
    });
  }
  async drop() {
    return await this._postMessage({
      action: DB_ACTIONS.DROP,
    });
  }
}

class Collection {
  constructor(name, DB) {
    this.name = name;
    this.DB = DB;
    this.db = DB.db;
  }

  async add(fields) {
    try {
      if (!fields.type) {
        fields.type = this.name;
      }
      const resp = await this.DB._postMessage({
        action: "create",
        record: fields,
      });
      fields.id = resp.result; // new ID
    } catch (e) {
      console.error(e);
      throw(e);
    }

    if (isDefined([fields.parentID, fields.parentType])) {
      let parentRecord = await this.find(
        { id: fields.parentID },
        fields.parentType,
      );
      if (parentRecord) {

        const childArrayName = fields.type;
        parentRecord = parentRecord.getFields;
        if (Array.isArray(parentRecord[childArrayName])) {
          parentRecord[childArrayName].push(fields.id);
        } else {
          parentRecord[childArrayName] = [fields.id];
        }
        await this.update(parentRecord);
      }
    }
    return createRecordProxy(this, fields);
  }

  async update(record) {

    if (record.getFields) {
      record = record.getFields;
    }

    const resp = await this.DB._postMessage({
      type: record.type,
      action: "update",
      record: record,
    });
    return resp.result; // returns the key
  }
  async remove(record) {
    return await this.DB._postMessage({
      action: "delete",
      key: record,
    });
  }

  async find(query, storeName = this.name) {
    let resp;

    if (typeof query === "object") {
      // e.g. { Name: "JohnDoe" }
      resp = await this.DB._postMessage({
        action: "read",
        storeName: storeName,
        query: query,
      });
      resp.result;
    } else {
      // e.g. a numeric or string key
      resp = await this.DB._postMessage({
        action: "read",
        storeName: storeName,
        query: { key: query },
      });
    }
    let retVal = (Array.isArray(resp.result)) ? resp.result[0] : resp.result;
    retVal = createRecordProxy(this, retVal);
    return retVal;
  }
}

function createRecordProxy(collection, record) {
  const proxy = new Proxy(record, {
    getFields() {
      return record;
    },
    get(target, prop, receiver) {
      if (prop === "remove") {
        return () => {
          collection.remove(target);
        };
      }

      if (prop === "add") {
        return async (childData) => {
          if (!childData.type) {
            throw new Error(
              "childData must include a 'type' property.",
            );
          }
          const childCollection = collection.DB[childData.type];
          if (!childCollection) {
            throw new Error(
              `No collection found for type='${childData.type}'.`,
            );
          }
          // const id = await collection.add(childData, target);
          childData.parentID = target.id;
          childData.parentType = collection.name;
          childCollection.add(childData);
        };
      }
      if (prop === "update") {
        return collection.update(target);
      }
      if (prop === "toString") {
        return async (padding = "  ") => {
          return JSON.stringify(target, null, 2);
        };
      }
      if (Array.isArray(target[prop])) {
        return collection.DB._postMessage({
          type: prop,
          action: "readAll",
          keys: target[prop],
        });
      }
      if (prop === "getFields") {
        return target;
      }
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      return Reflect.set(target, prop, value, receiver);
    },
  });

  return proxy;
}
