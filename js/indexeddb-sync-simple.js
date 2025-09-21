// Simple IndexedDB sync client
export class IndexedDBSync {
  constructor(options = {}) {
    // Use relative URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.serverUrl = options.serverUrl || `${protocol}//${host}/sync`;
    this.dbName = options.dbName || 'sync-db';
    this.dbVersion = 1;
    this.socket = null;
    this.db = null;
    this.isOnline = false;
    this.clientId = null;
    
    // BroadcastChannel for same-device sync
    this.broadcastChannel = new BroadcastChannel('indexeddb-sync');
    this.broadcastChannel.onmessage = (event) => this.handleBroadcastMessage(event);
    
    console.log(`[IndexedDBSync] Constructor called for ${this.dbName} at ${new Date().toISOString()}, db initially: ${this.db}`);
    // Note: initDatabase is now called via async init() method
  }

  // Async initialization method to await database setup
  async init() {
    console.log(`[IndexedDBSync] init() called at ${new Date().toISOString()}`);
    await this.initDatabase();
    console.log(`[IndexedDBSync] init() completed at ${new Date().toISOString()}`);
  }

  // Initialize IndexedDB with all needed stores
  async initDatabase() {
    console.log(`[IndexedDBSync] Starting initDatabase for ${this.dbName} at ${new Date().toISOString()}`);
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('[IndexedDBSync] initDatabase onerror:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log(`[IndexedDBSync] initDatabase onsuccess: db set to ${this.db ? 'valid' : 'null'}, version ${this.dbVersion} at ${new Date().toISOString()}`);
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        console.log(`[IndexedDBSync] onupgradeneeded for ${this.dbName} at ${new Date().toISOString()}`);
        const db = event.target.result;
        
        // Create metadata store
        if (!db.objectStoreNames.contains('_sync_metadata')) {
          db.createObjectStore('_sync_metadata', { keyPath: 'id' });
        }
        
        // Create operation queue store
        if (!db.objectStoreNames.contains('_sync_queue')) {
          db.createObjectStore('_sync_queue', { keyPath: 'id', autoIncrement: true });
        }
        
        // Create game scores table
        if (!db.objectStoreNames.contains('game_scores')) {
          db.createObjectStore('game_scores', { keyPath: 'name' });
        }
        
        // Create prediction weeks table for the prediction component
        if (!db.objectStoreNames.contains('prediction_weeks')) {
          db.createObjectStore('prediction_weeks', { keyPath: 'week' });
        }
      };
    });
  }

  // Connect to server
  async connect() {
    console.log(`Connecting to sync server: ${this.serverUrl}`);
    this.socket = new WebSocket(this.serverUrl);
    
    this.socket.onopen = () => {
      console.log('Connected to sync server');
      this.isOnline = true;
      this.subscribeToTable('game_scores');
      this.subscribeToTable('prediction_weeks');
    };
    
    this.socket.onmessage = (event) => {
      this.handleServerMessage(JSON.parse(event.data));
    };
    
    this.socket.onclose = () => {
      console.log('Disconnected from sync server');
      this.isOnline = false;
    };
    
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  // Subscribe to a table
  subscribeToTable(tableName) {
    if (this.isOnline) {
      this.sendToServer({
        type: 'subscribe',
        table: tableName
      });
    }
  }

  // Set data in table
  async set(tableName, key, value) {
    const opId = this.generateOperationId();
    
    // Apply locally first
    await this.setLocal(tableName, key, value);
    
    // Send to server
    if (this.isOnline) {
      this.sendToServer({
        type: 'operation',
        table: tableName,
        payload: {
          operation: 'set',
          key,
          value
        },
        opId
      });
    }
    
    // Emit event
    this.emitSyncEvent(tableName, { operation: 'set', key, value }, 'local');
    
    // Broadcast to other tabs
    this.broadcastChannel.postMessage({
      type: 'local-update',
      table: tableName,
      operation: { operation: 'set', key, value },
      origin: 'local'
    });
  }

  // Delete data from table
  async delete(tableName, key) {
    const opId = this.generateOperationId();
    
    // Apply locally first
    await this.deleteLocal(tableName, key);
    
    // Send to server
    if (this.isOnline) {
      this.sendToServer({
        type: 'operation',
        table: tableName,
        payload: {
          operation: 'delete',
          key
        },
        opId
      });
    }
    
    // Emit event
    this.emitSyncEvent(tableName, { operation: 'delete', key }, 'local');
    
    // Broadcast to other tabs
    this.broadcastChannel.postMessage({
      type: 'local-update',
      table: tableName,
      operation: { operation: 'delete', key },
      origin: 'local'
    });
  }

  // Get data from table
  async get(tableName, key) {
    const transaction = this.db.transaction([tableName], 'readonly');
    const store = transaction.objectStore(tableName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all data from table
  async getAll(tableName) {
    console.log(`[IndexedDBSync] getAll called for table ${tableName} at ${new Date().toISOString()}, db state: ${this.db ? 'initialized' : 'null'}`);
    if (!this.db) {
      console.error(`[IndexedDBSync] getAll failed: db is null for ${tableName}`);
      throw new Error(`Database not initialized for ${tableName}`);
    }
    const transaction = this.db.transaction([tableName], 'readonly');
    const store = transaction.objectStore(tableName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Set data locally
  async setLocal(tableName, key, value) {
    const transaction = this.db.transaction([tableName], 'readwrite');
    const store = transaction.objectStore(tableName);
    
    return new Promise((resolve, reject) => {
      const request = store.put(value);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Delete data locally
  async deleteLocal(tableName, key) {
    const transaction = this.db.transaction([tableName], 'readwrite');
    const store = transaction.objectStore(tableName);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Handle server messages
  handleServerMessage(message) {
    console.log('Received server message:', message);
    
    switch (message.type) {
      case 'snapshot':
        this.handleSnapshot(message);
        break;
      case 'update':
        this.handleUpdate(message);
        break;
      case 'error':
        console.error('Server error:', message.error);
        break;
    }
  }

  // Handle snapshot from server
  async handleSnapshot(message) {
    const { table, payload } = message;
    console.log(`Received snapshot for table ${table}, payload keys: ${Object.keys(payload).length}`);
    
    if (Object.keys(payload).length === 0) {
      console.log(`[IndexedDBSync] Empty snapshot for ${table}, skipping apply`);
      return;
    }
    
    // Clear table first
    await this.clearTable(table);
    
    // Apply all data
    for (const [key, value] of Object.entries(payload)) {
      await this.setLocal(table, key, value);
    }
    
    this.emitSyncEvent(table, { operation: 'snapshot', data: payload }, 'server');
  }

  // Handle update from server
  async handleUpdate(message) {
    const { table, payload, originId } = message;
    
    // Don't apply our own updates
    if (originId === this.clientId) {
      return;
    }
    
    console.log(`Received update for table ${table}:`, payload);
    
    // Apply operation
    switch (payload.operation) {
      case 'set':
        await this.setLocal(table, payload.key, payload.value);
        break;
      case 'delete':
        await this.deleteLocal(table, payload.key);
        break;
    }
    
    this.emitSyncEvent(table, payload, 'server');
    
    // Broadcast to other tabs
    this.broadcastChannel.postMessage({
      type: 'server-update',
      table,
      operation: payload,
      origin: 'server'
    });
  }

  // Clear table
  async clearTable(tableName) {
    const transaction = this.db.transaction([tableName], 'readwrite');
    const store = transaction.objectStore(tableName);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Send message to server
  sendToServer(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  // Generate operation ID
  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Handle broadcast messages from other tabs
  handleBroadcastMessage(event) {
    const { type, table, operation, origin } = event.data;
    
    if (origin === 'local') {
      this.emitSyncEvent(table, operation, 'local-tab');
    } else if (origin === 'server') {
      this.emitSyncEvent(table, operation, 'server-tab');
    }
  }

  // Emit custom event
  emitSyncEvent(table, operation, origin, meta = {}) {
    const event = new CustomEvent('idb-sync-update', {
      detail: {
        table,
        op: operation,
        origin,
        meta
      }
    });
    
    window.dispatchEvent(event);
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
    this.broadcastChannel.close();
    if (this.db) {
      this.db.close();
    }
    this.isOnline = false;
  }
}