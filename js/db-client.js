import { AdvancedDBEngine } from './db-server.js';

//function to check if an array of strings is defined and is not empty string
function isDefined(arrayOfStrings) {
    return arrayOfStrings.every((str) => str !== undefined && str !== "");
}
export class DB {
    constructor(name, collections) {
      this.name = name;
      this.collections = collections;
      this.schema = this._createSchema(collections);
      this.db = new AdvancedDBEngine(name, this.schema);
    }
  
    async init() {
      const db = await this.db.init();

      this.collections.forEach((collName) => {
        this[collName] = new Collection(collName, this);
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
          if (!data.name) {
            console.error(data, "missing name");
            throw new Error(`${collection} must have a Name.`);
          }
        },
      }));
    }
  }

class Collection {
    constructor(name, DB) {
        this.name = name;
        this.DB = DB
        this.db = DB.db;
    }

    async add(fields) {
        try {
            fields.id = await this.db.create(this.name, fields);
        } catch (e) {
            console.error(e);
            return null;
        }

        if (isDefined([fields.parentID, fields.parentType])) {
            const parentRecord = await this.db.read(fields.parentType, fields.parentID);
            if (parentRecord) {
                const childArrayName = fields.type;
                if (Array.isArray(parentRecord[childArrayName])) {
                    parentRecord[childArrayName].push(fields.id);
                } else {
                    parentRecord[childArrayName] = [fields.id];
                }
                await this.db.update(fields.parentType, parentRecord);

            }
        }

        return createRecordProxy(this, fields);
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

    async _remove(removed) {
        await db.delete(this.name, removed.id);
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
                    collection._remove(target);
                };
            }

            if (prop === "add") {
                return async (childData) => {
                    if (!childData.type) {
                        throw new Error("childData must include a 'type' property.");
                    }
                    const childCollection = collection.DB[childData.type];
                    if (!childCollection) {
                        throw new Error(`No collection found for type='${childData.type}'.`);
                    }
                    // const id = await collection.add(childData, target);
                    childData.parentID = target.id;
                    childData.parentType = collection.name;
                    childCollection.add(childData);
                };
            }
            if (prop === "toString") {
                return async (padding = "  ") => {
                    return JSON.stringify(target, null, 2);
                }
            }
            if (Array.isArray(target[prop]) ) {
                 let allCs =  collection.db.readAll(prop, target[prop]);
                 return allCs
            }
            return Reflect.get(target, prop, receiver);
        },
        set(target, prop, value, receiver) {
            return Reflect.set(target, prop, value, receiver);
        }
    });

    return proxy;
}


// proxy.toString = function (padding = "  ") {
//     let str = `{\n`;
//     if (Object.keys(proxy).length === 0) {
//         return `Empty record`;
//     } else {
//         Object.keys(proxy).forEach((key) => {
//             if (typeof proxy[key] === "function") {
//                 return;
//             } else str += `${padding}  "${key}":`;
//             if (key.startsWith("_")) {
//                 str += `"DB OBJECT",\n`;
//             } else if (Array.isArray(proxy[key])) {
//                 str += `\n[`;
//                 proxy[key].forEach((obj) => {
//                     const id = obj.id;
//                     let value = db[key];
//                     value = value.find({ id: id });
//                     str += padding + `    ${value},\n`;
//                 });
//                 str = str.substring(0, str.length - 2);
//                 str += padding + `  ],\n`;
//             } else if (!Array.isArray(proxy[key])) {
//                 if (typeof proxy[key] === "string") {
//                     str += `"${proxy[key]}",\n`;
//                 } else str += `${proxy[key]},\n`;
//             } else {
//                 str += `UNKNOWN\n`;
//             }
//         });
//     }
//     str = str.substring(0, str.length - 2);
//     return str + padding + "}";
// };