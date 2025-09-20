// indexeddb-sync.js - Client-side IndexedDB synchronization library

export class IndexedDBSync {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || 'ws://localhost:8081/sync';
    this.dbName = options.dbName || 'sync-db';
    this.dbVersion = options.dbVersion || 1;
    this.tables = new Map(); // tableName -> { store, version, subscribed }
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.db = null;
    this.operationQueue = [];
    this.isOnline = false;
    this.clientId = null;
    
    // BroadcastChannel for same-device sync optimization
    this.broadcastChannel = new BroadcastChannel('indexeddb-sync');
    this.broadcastChannel.onmessage = (event) => this.handleBroadcastMessage(event);
    
    // Initialize IndexedDB
    this.initDatabase();
  }

  // Initialize IndexedDB database
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

  // Open IndexedDB database
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
        
        // Create any additional table stores that were requested
        for (const [tableName, tableConfig] of this.pendingStores || new Map()) {
          if (!db.objectStoreNames.contains(tableName)) {
            db.createObjectStore(tableName, tableConfig);
            console.log(`Created object store: ${tableName}`);
          }
        }
        this.pendingStores = new Map();
      };
    });
  }

  // Connect to sync server
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
        this.processQueuedOperations();
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

  // Schedule reconnection attempt
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

  // Subscribe to a table
  async subscribeToTable(tableName, storeConfig = {}) {
    // Create object store if it doesn't exist
    await this.ensureObjectStore(tableName, storeConfig);
    
    this.tables.set(tableName, {
      store: tableName,
      version: 0,
      subscribed: true,
      ...storeConfig
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

  // Unsubscribe from a table
  async unsubscribeFromTable(tableName) {
    this.tables.delete(tableName);

    // Send unsubscription message to server
    if (this.isOnline) {
      this.sendToServer({
        type: 'unsubscribe',
        table: tableName
      });
    }

    console.log(`Unsubscribed from table: ${tableName}`);
  }

  // Set data in a table (with sync)
  async set(tableName, key, value) {
    const opId = this.generateOperationId();
    const operation = {
      operation: 'set',
      key,
      value
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
        opId
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
        opId
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

  // Get data from a table
  async get(tableName, key) {
    const transaction = this.db.transaction([tableName], 'readonly');
    const store = transaction.objectStore(tableName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all data from a table
  async getAll(tableName) {
    const transaction = this.db.transaction([tableName], 'readonly');
    const store = transaction.objectStore(tableName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Handle messages from the server
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
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  // Handle snapshot from server
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
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    // Update table version
    const tableInfo = this.tables.get(table);
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

  // Handle update from server
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
    const tableInfo = this.tables.get(table);
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

  // Apply operation locally to IndexedDB
  async applyOperationLocally(tableName, operation) {
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

  // Clear a table
  async clearTable(tableName) {
    const transaction = this.db.transaction([tableName], 'readwrite');
    const store = transaction.objectStore(tableName);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Ensure object store exists
  async ensureObjectStore(tableName, config = {}) {
    if (!this.db || !this.db.objectStoreNames.contains(tableName)) {
      // If we need to create a new object store, we have to close and reopen the database
      if (this.db && !this.db.objectStoreNames.contains(tableName)) {
        this.db.close();
        this.dbVersion++;
        
        // Store the pending store creation
        this.pendingStores = this.pendingStores || new Map();
        this.pendingStores.set(tableName, config);
        
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(this.dbName, this.dbVersion);
          
          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Recreate all existing stores
            // (This is a simple approach - in production you'd want to be more careful)
            
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

  // Send message to server
  sendToServer(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  // Generate unique operation ID
  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Queue operation for later sync
  async queueOperation(operation) {
    const transaction = this.db.transaction(['_sync_queue'], 'readwrite');
    const store = transaction.objectStore('_sync_queue');
    
    return new Promise((resolve, reject) => {
      const request = store.add(operation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Load queued operations from storage
  async loadQueuedOperations() {
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

  // Process queued operations when coming back online
  async processQueuedOperations() {
    if (this.operationQueue.length === 0) return;

    console.log(`Processing ${this.operationQueue.length} queued operations`);

    for (const operation of this.operationQueue) {
      if (operation.type === 'operation') {
        this.sendToServer({
          type: operation.type,
          table: operation.table,
          payload: operation.payload,
          opId: operation.opId
        });
      }
    }

    // Clear the queue after sending
    await this.clearOperationQueue();
  }

  // Clear operation queue
  async clearOperationQueue() {
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

  // Handle broadcast messages from other tabs
  handleBroadcastMessage(event) {
    const { type, table, operation, origin } = event.data;
    
    if (origin === 'local') {
      // Another tab made a local change, emit event but don't apply
      this.emitSyncEvent(table, operation, 'local-tab');
    } else if (origin === 'server') {
      // Another tab received a server update, emit event but don't apply
      this.emitSyncEvent(table, operation, 'server-tab');
    }
  }

  // Broadcast message to other tabs
  broadcastToOtherTabs(message) {
    this.broadcastChannel.postMessage(message);
  }

  // Emit custom event for application to listen to
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

  // Disconnect and cleanup
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

// Export for use in modules or scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { IndexedDBSync };
}