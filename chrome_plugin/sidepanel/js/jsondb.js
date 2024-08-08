class JSONDB {
    constructor(types) {
        this.types = types;
        this.db = new Dexie('JSONDB');
        let stores = {}
        this.types.forEach(type => stores[type] = '++id, parent.id');
        this.db.version(1).stores(stores)
        // for (let i = 0; i < this.types.length; i++) {
            // this.load(this.types[i])
            // this.load('groups')
        // }
    }
    load(type) {
        return this.db[type].toArray().then(arr => {
            // this.db.on('changes', () => this.render());            
            this[type] = arr
        })
    }
    async add(entity) {
        try {
            const type = entity.type;
            let ret = await this.db[type].add(entity);
            entity.id = ret
            if (entity.parent) {
                const parent = this[entity.parent.type].find(e => e.id === entity.parent.id)
                if (parent[type] === undefined) parent[type] = []
                parent[type].push(entity.id)
                this.update(parent)
            }
            if (this[type] === undefined) this[type] = []
            this[type].push(entity)
            return ret
        } catch (error) {
            console.error(`Error performing add operation:`, error);
            throw error;
        }
    }
    
    async update(entity) {
        try {
            const type = entity.type;
            this[type] = this[type].map(e => e.id === entity.id ? entity : e);
            await this.db[type].update(entity.id, entity);
            //create an event 'DB_UPDATED' and dispatch it
            document.dispatchEvent(new CustomEvent('DB_UPDATED', {detail: {type: type, entity: entity}}));
            return true
        } catch (error) {
            console.error(`Error performing update operation:`, error);
            throw error;
        }
    }
    
    async delete(entity) {
        try {
            const type = entity.type;
            for (const key in entity) {
                if (Array.isArray(entity[key])) {
                    for (const id of entity[key]) {
                        const o = await this.fetch(key, id);
                        await this.delete(o);
                    }
                }
            }
            if (this[type]) {
                this[type] = this[type].filter(e => e.id !== entity.id);
            }
            return await this.db[type].delete(entity.id);
        } catch (error) {
            console.error(`Error performing delete operation:`, error);
            throw error;
        }
    }
    

    async fetch(type, Id) {
        try {
            return await this.db[type].get(Id);
        } catch (error) {
            console.error(`Error fetching entity with id ${Id} from ${type}:`, error);
            throw error;
        }
    }
}


DB = new JSONDB(['groups', 'chats']);
// DB.db.delete()