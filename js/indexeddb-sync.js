// indexeddb-sync.js - Client-side IndexedDB synchronization library (combined simple + full-featured)

export class IndexedDBSync {
  constructor(options = {}) {
    // Relative URL based on current location (from simple)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.serverUrl = options.serverUrl || `${protocol}//${host}/sync`;
    this.dbName = options.dbName || 'sync-db';
    this.dbVersion = options.dbVersion || 1;
    this.tables = options.tables || []; // Array of initial table names for auto-creation and subscription
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.tablesMap = new Map(); // tableName -> { store, version, subscribed, config }
    this.socket = null;
    this.reconnectAttempts = 0;
    this.db = null;
    this.operationQueue = [];
    this.isOnline = false;
    this.clientId = null;
    this.pendingStores = new Map();
    
    // Pre-set pending stores for initial tables
    this.tables.forEach(tableName => {
      this.pendingStores.set(tableName, { keyPath: 'id' }); // Default config; can be overridden in options
    });
    
    // BroadcastChannel for same-device sync
    this.broadcastChannel = new BroadcastChannel('indexeddb-sync');
    this.broadcastChannel.onmessage = (event) => this.handleBroadcastMessage(event);
    
    console.log(`[IndexedDBSync] Constructor called for ${this.dbName}`);
    // Note: Database initialization is async via init()
  }

  // Async initialization method (from simple)
  async init() {
    console.log(`[IndexedDBSync] init() called`);
    await this.initDatabase();
    console.log(`[IndexedDBSync] init() completed`);
  }

  // Initialize IndexedDB database (merged)
  async initDatabase() {
    try {
      this.db = await this.openDatabase();
      console.log('IndexedDB initialized');
      
      // Load queued operations from storage
      await this.loadQueuedOperations();
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      throw error;
    }
  }

  // Open IndexedDB database (enhanced from full)
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create sync metadata store
        if (!db.objectStoreNames.contains('_sync_metadata')) {
          const metaStore = db.createObjectStore('_sync_metadata', { keyPath: 'id' });
          metaStore.createIndex('table', 'table', { unique: false });
        }
        
        // Create operation queue store
        if (!db.objectStoreNames.contains('_sync_queue')) {
          const queueStore = db.createObjectStore('_sync_queue', { keyPath: 'id', autoIncrement: true });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Create initial tables if provided (from simple/full merge)
        if (this.tables && this.tables.length > 0) {
          this.tables.forEach(tableName => {
            if (!db.objectStoreNames.contains(tableName)) {
              const config = this.pendingStores.get(tableName) || { keyPath: 'id' };
              db.createObjectStore(tableName, config);
              console.log(`Created initial object store: ${tableName}`);
            }
          });
        }
        
        // Handle any additional pending stores (dynamic schema from full)
        for (const [tableName, config] of this.pendingStores) {
          if (!db.objectStoreNames.contains(tableName)) {
            db.createObjectStore(tableName, config);
            console.log(`Created dynamic object store: ${tableName}`);
          }
        }
        this.pendingStores.clear();
      };
    });
  }

  // Connect to sync server (merged with auto-subscribe)
  async connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      console.log(`Connecting to sync server: ${this.serverUrl}`);
      this.socket = new WebSocket(this.serverUrl);
      
      this.socket.onopen = () => {
        console.log('Connected to sync server');
        this.isOnline = true;
        this.reconnectAttempts = 0;
        this.clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; // Generate clientId
        this.processQueuedOperations();
        
        // Register database with server
        this.sendToServer({
          type: 'register',
          dbName: this.dbName
        });
        
        // Auto-subscribe to initial tables if provided (from simple)
        if (this.tables && this.tables.length > 0) {
          this.tables.forEach(tableName => {
            this.subscribeToTable(tableName);
          });
        }
      };
      
      this.socket.onmessage = (event) => {
        this.handleServerMessage(JSON.parse(event.data));
      };
      
      this.socket.onclose = () => {
        console.log('Disconnected from sync server');
        this.isOnline = false;
        this.scheduleReconnect();
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isOnline = false;
      };
      
    } catch (error) {
      console.error('Failed to connect to sync server:', error);
      this.scheduleReconnect();
    }
  }

  // Schedule reconnection attempt (from full)
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    setTimeout(() => this.connect(), delay);
  }

  // Subscribe to a table (from full, with config support)
  async subscribeToTable(tableName, storeConfig = { keyPath: 'id' }) {
    // Create object store if it doesn't exist
    await this.ensureObjectStore(tableName, storeConfig);
    
    this.tablesMap.set(tableName, {
      store: tableName,
      version: 0,
      subscribed: true,
      config: storeConfig
    });

    // Send subscription message to server
    if (this.isOnline) {
      this.sendToServer({
        type: 'subscribe',
        table: tableName
      });
    }

    console.log(`Subscribed to table: ${tableName}`);
  }

  // Unsubscribe from a table (from full)
  async unsubscribeFromTable(tableName) {
    this.tablesMap.delete(tableName);

    // Send unsubscription message to server
    if (this.isOnline) {
      this.sendToServer({
        type: 'unsubscribe',
        table: tableName
      });
    }

    console.log(`Unsubscribed from table: ${tableName}`);
  }

  // Set data in a table (with sync, merged explicit key)
  async set(tableName, key, value) {
    const opId = this.generateOperationId();
    const operation = {
      operation: 'set',
      key,
      value: { ...value, [key]: value[key] || key } // Ensure key in value for keyPath compatibility
    };

    // Apply locally first (optimistic update)
    await this.applyOperationLocally(tableName, operation);

    // Queue for server sync
    await this.queueOperation({
      type: 'operation',
      table: tableName,
      payload: operation,
      opId,
      timestamp: Date.now()
    });

    // Send to server if online
    if (this.isOnline) {
      this.sendToServer({
        type: 'operation',
        table: tableName,
        payload: operation,
        opId,
        clientId: this.clientId // Include for server tracking
      });
    }

    // Broadcast to other tabs
    this.broadcastToOtherTabs({
      type: 'local-update',
      table: tableName,
      operation,
      origin: 'local'
    });

    // Emit custom event
    this.emitSyncEvent(tableName, operation, 'local');
  }

  // Delete data from a table (with sync)
  async delete(tableName, key) {
    const opId = this.generateOperationId();
    const operation = {
      operation: 'delete',
      key
    };

    // Apply locally first
    await this.applyOperationLocally(tableName, operation);

    // Queue for server sync
    await this.queueOperation({
      type: 'operation',
      table: tableName,
      payload: operation,
      opId,
      timestamp: Date.now()
    });

    // Send to server if online
    if (this.isOnline) {
      this.sendToServer({
        type: 'operation',
        table: tableName,
        payload: operation,
        opId,
        clientId: this.clientId
      });
    }

    // Broadcast to other tabs
    this.broadcastToOtherTabs({
      type: 'local-update',
      table: tableName,
      operation,
      origin: 'local'
    });

    // Emit custom event
    this.emitSyncEvent(tableName, operation, 'local');
  }

  // Get data from a table (from full/simple, similar)
  async get(tableName, key) {
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction([tableName], 'readonly');
    const store = transaction.objectStore(tableName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all data from a table (merged with check)
  async getAll(tableName) {
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

  // Handle messages from the server (from full, async)
  async handleServerMessage(message) {
    console.log('Received server message:', message);

    switch (message.type) {
      case 'snapshot':
        await this.handleSnapshot(message);
        break;
      case 'update':
        await this.handleUpdate(message);
        break;
      case 'error':
        console.error('Server error:', message.error);
        break;
      case 'databases-list':
        // Handle database list response
        if (this._pendingDatabaseList) {
          this._pendingDatabaseList.resolve(message.databases);
          this._pendingDatabaseList = null;
        }
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  // Handle snapshot from server (from full, with clear and apply)
  async handleSnapshot(message) {
    const { table, payload, tableVersion } = message;
    
    console.log(`Received snapshot for table ${table}, version ${tableVersion}`);

    // Clear the table first
    await this.clearTable(table);

    // Apply all snapshot data
    const transaction = this.db.transaction([table], 'readwrite');
    const store = transaction.objectStore(table);

    for (const [key, value] of Object.entries(payload)) {
      await new Promise((resolve, reject) => {
        const request = store.put(value, key); // Explicit key
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    // Update table version
    const tableInfo = this.tablesMap.get(table);
    if (tableInfo) {
      tableInfo.version = tableVersion;
    }

    // Broadcast to other tabs
    this.broadcastToOtherTabs({
      type: 'snapshot-received',
      table,
      origin: 'server'
    });

    // Emit custom event
    this.emitSyncEvent(table, { operation: 'snapshot', data: payload }, 'server');
  }

  // Handle update from server (merged with clientId check)
  async handleUpdate(message) {
    const { table, payload, originId, tableVersion } = message;
    
    // Don't apply updates that originated from this client
    if (originId === this.clientId) {
      return;
    }

    console.log(`Received update for table ${table}:`, payload);

    // Apply the operation
    await this.applyOperationLocally(table, payload);

    // Update table version
    const tableInfo = this.tablesMap.get(table);
    if (tableInfo) {
      tableInfo.version = tableVersion;
    }

    // Broadcast to other tabs
    this.broadcastToOtherTabs({
      type: 'server-update',
      table,
      operation: payload,
      origin: 'server'
    });

    // Emit custom event
    this.emitSyncEvent(table, payload, 'server', { tableVersion });
  }

  // Apply operation locally to IndexedDB (from full, explicit key)
  async applyOperationLocally(tableName, operation) {
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction([tableName], 'readwrite');
    const store = transaction.objectStore(tableName);

    switch (operation.operation) {
      case 'set':
        await new Promise((resolve, reject) => {
          const request = store.put(operation.value, operation.key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        break;
      case 'delete':
        await new Promise((resolve, reject) => {
          const request = store.delete(operation.key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        break;
    }
  }

  // Clear a table (merged)
  async clearTable(tableName) {
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction([tableName], 'readwrite');
    const store = transaction.objectStore(tableName);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Ensure object store exists (from full, dynamic)
  async ensureObjectStore(tableName, config = { keyPath: 'id' }) {
    if (!this.db || !this.db.objectStoreNames.contains(tableName)) {
      if (this.db && !this.db.objectStoreNames.contains(tableName)) {
        this.db.close();
        this.dbVersion++;
        
        // Store the pending store creation
        this.pendingStores.set(tableName, config);
        
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(this.dbName, this.dbVersion);
          
          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create the new table store
            if (!db.objectStoreNames.contains(tableName)) {
              db.createObjectStore(tableName, config);
              console.log(`Created object store: ${tableName}`);
            }
          };
          
          request.onsuccess = () => {
            this.db = request.result;
            resolve();
          };
          
          request.onerror = () => reject(request.error);
        });
      }
    }
  }

  // Send message to server (merged)
  sendToServer(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  // Generate unique operation ID (merged)
  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Queue operation for later sync (from full)
  async queueOperation(operation) {
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction(['_sync_queue'], 'readwrite');
    const store = transaction.objectStore('_sync_queue');
    
    return new Promise((resolve, reject) => {
      const request = store.add(operation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Load queued operations from storage (from full)
  async loadQueuedOperations() {
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction(['_sync_queue'], 'readonly');
    const store = transaction.objectStore('_sync_queue');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        this.operationQueue = request.result || [];
        console.log(`Loaded ${this.operationQueue.length} queued operations`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Process queued operations when coming back online (from full)
  async processQueuedOperations() {
    if (this.operationQueue.length === 0) return;

    console.log(`Processing ${this.operationQueue.length} queued operations`);

    for (const operation of this.operationQueue) {
      if (operation.type === 'operation') {
        this.sendToServer({
          type: operation.type,
          table: operation.table,
          payload: operation.payload,
          opId: operation.opId,
          clientId: this.clientId
        });
      }
    }

    // Clear the queue after sending
    await this.clearOperationQueue();
  }

  // Clear operation queue (from full)
  async clearOperationQueue() {
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction(['_sync_queue'], 'readwrite');
    const store = transaction.objectStore('_sync_queue');
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => {
        this.operationQueue = [];
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Handle broadcast messages from other tabs (merged)
  handleBroadcastMessage(event) {
    const { type, table, operation, origin } = event.data;
    
    if (origin === 'local') {
      this.emitSyncEvent(table, operation, 'local-tab');
    } else if (origin === 'server') {
      this.emitSyncEvent(table, operation, 'server-tab');
    }
  }

  // Broadcast message to other tabs (from full)
  broadcastToOtherTabs(message) {
    this.broadcastChannel.postMessage(message);
  }

  // Emit custom event for application to listen to (merged)
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

  // Get list of synced databases from server
  async getSyncedDatabases() {
    if (!this.isOnline) {
      throw new Error('Not connected to server');
    }

    return new Promise((resolve, reject) => {
      this._pendingDatabaseList = { resolve, reject };

      this.sendToServer({
        type: 'list-databases'
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this._pendingDatabaseList) {
          this._pendingDatabaseList.reject(new Error('Timeout getting database list'));
          this._pendingDatabaseList = null;
        }
      }, 5000);
    });
  }

  // Get list of synced tables for a database
  async getSyncedTables(dbName) {
    if (!this.isOnline) {
      throw new Error('Not connected to server');
    }

    return new Promise((resolve, reject) => {
      this._pendingTablesList = { resolve, reject, dbName };

      this.sendToServer({
        type: 'list-tables',
        dbName
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this._pendingTablesList) {
          this._pendingTablesList.reject(new Error('Timeout getting tables list'));
          this._pendingTablesList = null;
        }
      }, 5000);
    });
  }

  // Disconnect and cleanup (merged)
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    
    if (this.db) {
      this.db.close();
    }
    
    this.isOnline = false;
    console.log('IndexedDB sync disconnected');
  }
}

// Export for use in modules or scripts (from full)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { IndexedDBSync };
}