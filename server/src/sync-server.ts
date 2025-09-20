// sync-server.ts - IndexedDB Sync Server using WebSockets and Deno KV
/// <reference lib="deno.ns" />

export interface SyncMessage {
  type: 'subscribe' | 'unsubscribe' | 'operation' | 'snapshot' | 'update' | 'error';
  table: string;
  payload?: any; // Opaque JSON data
  opId?: string; // Client-supplied operation ID for idempotency
  originId?: string; // Client that originated the operation
  timestamp?: number; // Server-assigned timestamp
  tableVersion?: number; // Server-assigned monotonic version
  subscriptions?: string[]; // For subscribe messages
  error?: string; // For error messages
}

export interface SyncClient {
  id: string;
  socket: WebSocket;
  subscriptions: Set<string>; // Table names client is subscribed to
  lastSeen: number;
}

export interface TableState {
  version: number; // Monotonic version counter
  data: Map<string, any>; // Key-value pairs for the table
  lastModified: number;
}

export class SyncServer {
  private clients = new Map<string, SyncClient>();
  private tableStates = new Map<string, TableState>();
  private kvInstance: Deno.Kv | null = null;
  private processedOps = new Set<string>(); // For idempotency tracking
  
  constructor() {
    // Initialize KV instance
    this.initKv();
  }

  private async initKv(): Promise<void> {
    if (!this.kvInstance) {
      this.kvInstance = await Deno.openKv();
      console.log("Sync server KV instance initialized");
    }
  }

  private async getKv(): Promise<Deno.Kv> {
    if (!this.kvInstance) {
      await this.initKv();
    }
    return this.kvInstance!;
  }

  // Generate unique client ID
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Handle new WebSocket connection
  async handleConnection(socket: WebSocket): Promise<void> {
    const clientId = this.generateClientId();
    const client: SyncClient = {
      id: clientId,
      socket,
      subscriptions: new Set(),
      lastSeen: Date.now(),
    };

    this.clients.set(clientId, client);
    console.log(`Sync client connected: ${clientId}`);

    socket.onmessage = async (event: MessageEvent) => {
      try {
        const message: SyncMessage = JSON.parse(event.data);
        await this.handleMessage(clientId, message);
      } catch (error) {
        console.error(`Error handling message from ${clientId}:`, error);
        this.sendError(clientId, 'Invalid message format');
      }
    };

    socket.onclose = () => {
      this.handleDisconnection(clientId);
    };

    socket.onerror = (error: Event | ErrorEvent) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.handleDisconnection(clientId);
    };
  }

  // Handle client disconnection
  private handleDisconnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      console.log(`Sync client disconnected: ${clientId}`);
      this.clients.delete(clientId);
    }
  }

  // Handle incoming messages
  private async handleMessage(clientId: string, message: SyncMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastSeen = Date.now();

    switch (message.type) {
      case 'subscribe':
        await this.handleSubscribe(clientId, message);
        break;
      case 'unsubscribe':
        await this.handleUnsubscribe(clientId, message);
        break;
      case 'operation':
        await this.handleOperation(clientId, message);
        break;
      case 'snapshot':
        await this.handleSnapshotRequest(clientId, message);
        break;
      default:
        this.sendError(clientId, `Unknown message type: ${message.type}`);
    }
  }

  // Handle table subscription
  private async handleSubscribe(clientId: string, message: SyncMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    const tables = message.subscriptions || (message.table ? [message.table] : []);
    
    for (const table of tables) {
      client.subscriptions.add(table);
      console.log(`Client ${clientId} subscribed to table: ${table}`);
      
      // Send current snapshot
      await this.sendSnapshot(clientId, table);
    }
  }

  // Handle table unsubscription
  private async handleUnsubscribe(clientId: string, message: SyncMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !message.table) return;

    client.subscriptions.delete(message.table);
    console.log(`Client ${clientId} unsubscribed from table: ${message.table}`);
  }

  // Handle data operation
  private async handleOperation(clientId: string, message: SyncMessage): Promise<void> {
    if (!message.table || !message.payload) {
      this.sendError(clientId, 'Operation requires table and payload');
      return;
    }

    // Check for duplicate operation (idempotency)
    if (message.opId && this.processedOps.has(message.opId)) {
      console.log(`Ignoring duplicate operation: ${message.opId}`);
      return;
    }

    try {
      // Apply operation to table
      const tableState = await this.getOrCreateTableState(message.table);
      const newVersion = tableState.version + 1;
      const timestamp = Date.now();

      // Apply the operation (this is a simple set operation, but could be extended)
      const { key, value, operation } = message.payload;
      
      switch (operation) {
        case 'set':
          tableState.data.set(key, value);
          break;
        case 'delete':
          tableState.data.delete(key);
          break;
        default:
          // For backward compatibility, treat as set
          if (key && value !== undefined) {
            tableState.data.set(key, value);
          }
      }

      // Update table metadata
      tableState.version = newVersion;
      tableState.lastModified = timestamp;

      // Persist to KV
      await this.persistTableState(message.table, tableState);

      // Mark operation as processed
      if (message.opId) {
        this.processedOps.add(message.opId);
        // Clean up old processed ops (simple LRU)
        if (this.processedOps.size > 10000) {
          const oldOps = Array.from(this.processedOps).slice(0, 5000);
          oldOps.forEach(op => this.processedOps.delete(op));
        }
      }

      // Broadcast update to subscribed clients
      const updateMessage: SyncMessage = {
        type: 'update',
        table: message.table,
        payload: message.payload,
        opId: message.opId,
        originId: clientId,
        timestamp,
        tableVersion: newVersion,
      };

      await this.broadcastToSubscribers(message.table, updateMessage, clientId);

    } catch (error) {
      console.error(`Error processing operation:`, error);
      this.sendError(clientId, 'Failed to process operation');
    }
  }

  // Handle snapshot request
  private async handleSnapshotRequest(clientId: string, message: SyncMessage): Promise<void> {
    if (!message.table) {
      this.sendError(clientId, 'Snapshot request requires table name');
      return;
    }

    await this.sendSnapshot(clientId, message.table);
  }

  // Send table snapshot to client
  private async sendSnapshot(clientId: string, tableName: string): Promise<void> {
    try {
      const tableState = await this.getOrCreateTableState(tableName);
      
      const snapshotData = Object.fromEntries(tableState.data);
      
      const snapshotMessage: SyncMessage = {
        type: 'snapshot',
        table: tableName,
        payload: snapshotData,
        tableVersion: tableState.version,
        timestamp: tableState.lastModified,
      };

      this.sendToClient(clientId, snapshotMessage);
    } catch (error) {
      console.error(`Error sending snapshot for table ${tableName}:`, error);
      this.sendError(clientId, 'Failed to load table snapshot');
    }
  }

  // Get or create table state
  private async getOrCreateTableState(tableName: string): Promise<TableState> {
    let tableState = this.tableStates.get(tableName);
    
    if (!tableState) {
      // Try to load from KV storage
      const kv = await this.getKv();
      const stored = await kv.get(['sync_table', tableName]);
      
      if (stored.value) {
        const storedData = stored.value as any;
        tableState = {
          version: storedData.version || 0,
          data: new Map(Object.entries(storedData.data || {})),
          lastModified: storedData.lastModified || Date.now(),
        };
      } else {
        // Create new table state
        tableState = {
          version: 0,
          data: new Map(),
          lastModified: Date.now(),
        };
      }
      
      this.tableStates.set(tableName, tableState);
    }
    
    return tableState;
  }

  // Persist table state to KV
  private async persistTableState(tableName: string, tableState: TableState): Promise<void> {
    const kv = await this.getKv();
    const serializable = {
      version: tableState.version,
      data: Object.fromEntries(tableState.data),
      lastModified: tableState.lastModified,
    };
    
    await kv.set(['sync_table', tableName], serializable);
  }

  // Broadcast message to all clients subscribed to a table
  private async broadcastToSubscribers(tableName: string, message: SyncMessage, excludeClientId?: string): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (const [clientId, client] of this.clients) {
      if (clientId !== excludeClientId && client.subscriptions.has(tableName)) {
        if (client.socket.readyState === WebSocket.OPEN) {
          promises.push(this.sendToClient(clientId, message));
        }
      }
    }
    
    await Promise.allSettled(promises);
  }

  // Send message to specific client
  private async sendToClient(clientId: string, message: SyncMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || client.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Failed to send message to client ${clientId}:`, error);
      this.handleDisconnection(clientId);
    }
  }

  // Send error message to client
  private sendError(clientId: string, error: string): void {
    const errorMessage: SyncMessage = {
      type: 'error',
      table: '',
      error,
    };
    
    this.sendToClient(clientId, errorMessage);
  }

  // Clean up inactive clients
  startCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();
      const timeout = 5 * 60 * 1000; // 5 minutes
      
      for (const [clientId, client] of this.clients) {
        if (now - client.lastSeen > timeout) {
          console.log(`Cleaning up inactive client: ${clientId}`);
          this.handleDisconnection(clientId);
        }
      }
    }, 60 * 1000); // Check every minute
  }

  // Get server stats
  getStats() {
    return {
      connectedClients: this.clients.size,
      tables: this.tableStates.size,
      processedOps: this.processedOps.size,
    };
  }
}