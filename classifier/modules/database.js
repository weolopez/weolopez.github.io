/**
 * IndexedDB Vector Database Module
 * Provides a modern async/await interface for storing and retrieving embeddings
 */

const DB_NAME = 'VectorDB';
const STORE_NAME = 'embeddings';
const DB_VERSION = 1;

class VectorDatabase {
  constructor() {
    this.db = null;
  }

  /**
   * Open database connection
   * @returns {Promise<IDBDatabase>}
   */
  async open() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        };
        
        request.onsuccess = () => {
          this.db = request.result;
          resolve(this.db);
        };
        
        request.onerror = () => {
          reject(request.error || new Error('Failed to open IndexedDB'));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Store multiple entries
   * @param {Array} entries - Array of {key, value, embedding} objects
   * @returns {Promise<void>}
   */
  async putMany(entries) {
    const db = await this.open();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        for (const entry of entries) {
          store.put(entry);
        }
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error('Transaction failed'));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get all stored entries
   * @returns {Promise<Array>}
   */
  async getAll() {
    const db = await this.open();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error || new Error('Failed to get all entries'));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Clear all stored data
   * @returns {Promise<void>}
   */
  async clear() {
    const db = await this.open();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error('Failed to clear database'));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get count of stored entries
   * @returns {Promise<number>}
   */
  async count() {
    const db = await this.open();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.count();
        
        request.onsuccess = () => resolve(request.result || 0);
        request.onerror = () => reject(request.error || new Error('Failed to count entries'));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get single entry by key
   * @param {string} key
   * @returns {Promise<object|null>}
   */
  async get(key) {
    const db = await this.open();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error || new Error('Failed to get entry'));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const vectorDB = new VectorDatabase();
export default vectorDB;
