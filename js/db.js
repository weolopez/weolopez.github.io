import { AdvancedDBEngine } from '../js/db-ww.js';

export class DB {
    constructor(name, collections) {
      this.name = name;
      this.collections = collections;
      this.schema = this._createSchema(collections);
      this.db = new AdvancedDBEngine(name, this.schema);
    }
  
    async init() {
      await this.db.init();
      this.collections.forEach((collName) => {
        this[collName] = new Collection(collName, this.db);
      });
    }
  
    _createSchema(collections) {
      return collections.map((collection) => ({
        name: collection,
        keyPath: "id",
        autoIncrement: true,
        indexes: [
            { name: "name", keyPath: "name", options: { unique: false } },
        ],
        validate: (data) => {
          if (!data.name) throw new Error(`${collection} must have a Name.`);
        },
      }));
    }
  }

class Collection {
    constructor(name, db) {
        this.name = name;
        this.db = db;
        this.data = [];
        this.autoId = 1;
    }

    async add(fields, parent) {
        const isTopLevel = !parent;

        const record = {
            type: this.name,
            parentID: isTopLevel ? "" : String(parent.id),
            parentType: isTopLevel ? "" : this.name,
            ...fields,
        };

        // this.data.push(record);
        const newId = await this.db.create(this.name, record);
        record.id=newId;

        if (!isTopLevel) {
            const childType = record.type;
            if (!Array.isArray(parent[childType])) {
                parent[childType] = [];
            }
            parent[childType].push({ id: newId });
        }

        return createRecordProxy(this, record);
    }

    async find(query) {
        const key = Object.keys(query)[0];
        const value = Object.values(query)[0];

        const matches = await this.db.query(this.name, {
            index: key,
            range: IDBKeyRange.only(value),
          });
        
        // const matches = this.data.filter((item) => {
        //     return Object.entries(query).every(([k, v]) => {
        //         return JSON.stringify(item[k]) === JSON.stringify(v);
        //     });
        // });

        if (matches.length === 0) return null;
        if (matches.length === 1) {
            return createRecordProxy(this, matches[0]);
        }
        return matches.map((m) => createRecordProxy(this, m));
    }

    _removeById(id) {
        const idx = this.data.findIndex((r) => r.id === id);
        if (idx < 0) return;

        const [removed] = this.data.splice(idx, 1);

        if (removed.parentID && removed.parentType) {
            const parentCollection = this.db[removed.parentType];
            if (parentCollection) {
                const parentRecord = parentCollection.data.find(
                    (pr) => String(pr.id) === removed.parentID,
                );
                if (parentRecord) {
                    const childArrayName = removed.type;
                    if (Array.isArray(parentRecord[childArrayName])) {
                        parentRecord[childArrayName] =
                            parentRecord[childArrayName].filter(
                                (item) => item.id !== removed.id,
                            );
                    }
                }
            }
        }
    }
}

function createRecordProxy(collection, record) {
    const proxy = new Proxy(record, {
        get(target, prop, receiver) {
            if (prop === "remove") {
                return () => {
                    collection._removeById(target.id);
                };
            }

            if (prop === "add") {
                return async (childData) => {
                    if (!childData.type) {
                        throw new Error("childData must include a 'type' property.");
                    }
                    const childCollection = collection.db[childData.type];
                    if (!childCollection) {
                        throw new Error(`No collection found for type='${childData.type}'.`);
                    }
                    // const id = await collection.add(childData, target);
                    
                    childCollection.add(childData, target);
                };
            }

            return Reflect.get(target, prop, receiver);
        },
        set(target, prop, value, receiver) {
            return Reflect.set(target, prop, value, receiver);
        },
    });

    proxy.toString = function (padding = "  ") {
        return "{}"
        let str = `{\n`;
        if (Object.keys(proxy).length === 0) {
            return `Empty record`;
        } else {
            Object.keys(proxy).forEach((key) => {
                if (typeof proxy[key] === "function") {
                    return;
                } else str += `${padding}  "${key}":`;
                if (key.startsWith("_")) {
                    str += `"DB OBJECT",\n`;
                } else if (Array.isArray(proxy[key])) {
                    str += `\n[`;
                    proxy[key].forEach((obj) => {
                        const id = obj.id;
                        let value = db[key];
                        value = value.find({ id: id });
                        str += padding + `    ${value},\n`;
                    });
                    str = str.substring(0, str.length - 2);
                    str += padding + `  ],\n`;
                } else if (!Array.isArray(proxy[key])) {
                    if (typeof proxy[key] === "string") {
                        str += `"${proxy[key]}",\n`;
                    } else str += `${proxy[key]},\n`;
                } else {
                    str += `UNKNOWN\n`;
                }
            });
        }
        str = str.substring(0, str.length - 2);
        return str + padding + "}";
    };
    return proxy;
}