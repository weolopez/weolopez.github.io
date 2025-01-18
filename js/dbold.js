class Database {
    constructor(dbName, storeNames) {
        const request = indexedDB.open(dbName, 1);
        request.onerror = event => this.showMessage("Error opening database", "error");
        request.onsuccess = event => {
            this.db = event.target.result;
            this.showHome();
        };
        request.onupgradeneeded = event => {
            const db = event.target.result;
            storeNames.forEach(storeName => {
                const store = db.createObjectStore(storeName, { keyPath: 'title' });
                store.createIndex('title', 'title', { unique: true });
            });
        };
    }

    getAll(storeName) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return store.getAll();
    }

    getStore(storeName) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return store.get(title);
    }

    get(storeName, title) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return store.get(title);
    }

    save(storeName, title, content) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return store.put({ title, content });
    }

    showMessage(message, type) {
        // Implement this method to show messages
    }

    showHome() {
        // Implement this method to show the home screen
    }
}