class ThreadsDatabase {
    types = ['groups', 'chats', 'messages', 'structures'];
    constructor() {
        Dexie.delete('ThreadsDatabase')
        this.db = new Dexie('ThreadsDatabase');
        // {
        //     groups: '++id',
        //     chats: '++id',
        //     messages: '++id',
        //     structures: '++id'
        // }
        let stores = {}
        // for each type in types, add it to the stores object with '++id' as the key
        this.types.forEach(type => stores[type] = '++id');
        this.db.version(1).stores(stores);
        // for each type initialize this[type] from this.db
        this.types.forEach(type => {
            this.db[type].toArray().then(arr => {
                this[type] = arr.map(entity => {
                    entity.type = type;
                    return entity;
                });
            })
        });
        // ,
        // get messages() {
        //     return this.db.chats.where({
        //         groupId: group.id
        //     }).toArray();
        // }

        this.db.groups.toArray().then(arr => {
            this.groups = arr.map(group => {
                group.type = 'groups';
                return group;
            });
        });
    }

    // get groups() {
    //     return this._groups || [];
    // }

    // set groups(value) {
    //     this._groups = value;
    // }
    async performDatabaseOperation(e, operation, func) {
        try {
            const type = e.type;
            let resp;

            switch (operation) {
                case 'add':
                    resp = await this.db[type].add(e);
                    if (e.parent) {
                        parent = this[e.parent.type].find(entity => entity.id === e.parent.id);
                        if (parent[type] === undefined) parent[type] = [];
                        parent[type].push(e.id);
                        this.update(parent);
                    }
                    //add e to this[type]
                    this[type].push(e);
                    break;
                case 'update':
                    resp = await this.db[type].update(e.id, e);
                    this[type] = this[type].map(entity => entity.id === e.id ? e : entity);
                    break;
                case 'delete':
                    //for key in e, if e[key] is an array, delete all elements in the array
                    for (const key in e) {
                        if (Array.isArray(e[key]))
                            e[key].forEach(async id => {
                        let o = this.fetch(key, id)
                                await this.delete( o )
                        }
                            )
                    }

                    resp = await this.delete(e);
                    this[type] = this[type].filter(entity => entity.id !== e.id);
                    break;
                default:
                    throw new Error(`Unsupported operation: ${operation}`);
            }

            if (func) await func(e, resp);

            return operation === 'update' ? (resp === 1) : resp;
        } catch (error) {
            console.error(`Error performing ${operation} operation:`, error);
            throw error;
        }
    }

    async add(entity, func) {
        return await this.performDatabaseOperation(entity, 'add', func);
    }

    async update(entity, func) {
        return await this.performDatabaseOperation(entity, 'update', func);
    }

    async delete(entity, func) {
        return await this.performDatabaseOperation(entity, 'delete', func);
    }

    fetch(type, Id) {
        // const entity = await this.db[type].get(Id);
        // entity.type = type
        return this[type].find(entity => entity.id === Id);
    }



    // const chats = await this.db.chats.where({ groupId }).toArray();
    // for (const chat of chats) {
    //     const messages = await this.db.messages.where({ chatId: chat.id }).toArray();
    //     for (const message of messages) {
    //         await this.db.structures.where({ messageId: message.id }).delete();
    //     }
    //     await this.db.messages.where({ chatId: chat.id }).delete();
    // }
    // await this.db.chats.where({ groupId }).delete();

}

let threadsDatabase = new ThreadsDatabase();
console.log(threadsDatabase);

//for each threadsDatabase.types add, update, delete with logs of the new state of the database
var testgroupid;
async function checkExpectedResults(expected, actual, message) {
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
        console.error(message);
        throw new Error(message);
    } else console.log('Success:' + actual.name);
}




test().then(() => {
    console.log('done')
})

async function test() {

    for (const type of threadsDatabase.types) {
        let id;
        let newObject = {
            type: type,
            name: `${type} 1`
        };
        if (testgroupid !== undefined) newObject.parent = {
            id: testgroupid,
            type: 'groups'
        };

        // Add new object
        id = await threadsDatabase.add(newObject);
        let addedObject = await threadsDatabase[type].find(entity => entity.id === id);
        await checkExpectedResults(newObject, addedObject, `Failed to add new object of type ${type}`);
        // Update object
        let updatedObject = { ...addedObject, name: `${type} ${id} Updated` };
        await threadsDatabase.update(updatedObject);
        let updatedObjectFromDB = await threadsDatabase[type].find(entity => entity.id === id);
        await checkExpectedResults(updatedObject, updatedObjectFromDB, `Failed to update object of type ${type} with id ${id}`);
        if (testgroupid === undefined && type === 'groups') testgroupid = id;
    }
    console.log(threadsDatabase);
    await threadsDatabase.delete(await threadsDatabase.groups.find(entity => entity.id === testgroupid))
    console.log(threadsDatabase);
}

async function add() {
    // type: 'groups',
    // parent: null,
    // image: 'https://via.placeholder.com/150',
    // title: 'Group 1',
    // description: 'Description 1'
    return await groupsSync.add({
        type: 'chats',
        parent: {
            id: 11,
            type: "groups"
        },
        role: 'user', // user || system || assistant
        mode: 'text', // text || image || video || audio
        content: 'Hello'
    }, () =>
        console.log(groupsSync.groups)
    );
}

async function update(num) {
    let g = groupsSync.groups[num];
    g.title = `Group ${num + 1} Updated`;
    return await groupsSync.update(g, () =>
        console.log(groupsSync.groups)
    );
}
async function deleteGroup(num) {
    let g = groupsSync.groups[num];
    return await groupsSync.delete(g, () =>
        console.log(groupsSync.groups)
    );
}
//sample json for group chats messages structures
// let groups = [{
//     id: 1,
//     image: 'group1.png',
//     title: 'Group 1',
//     description: 'Description 1',
//     chats: [{
//         id: 1,
//         name: 'browser history',
//         messages: [{
//             id: 1,
//             model: 'llama3', // llama3 || askatt || history
//             structures: [{
//                 role: 'user', // user || system || assistant
//                 type: 'text', // text || image || video || audio
//                 content: 'Hello'
//             }]
//         }]
//     }]
// }]


// groups[0].chats[0].messages[0].structures[0].content = 'Hello'