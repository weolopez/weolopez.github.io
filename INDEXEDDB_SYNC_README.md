# IndexedDB Sync Solution

A simple, extensible way to synchronize IndexedDB tables across browsers in real-time. Perfect for multiplayer games, collaborative applications, and any scenario where you need shared data persistence.

## Features

✅ **Real-time synchronization** - Changes sync instantly across all connected browsers  
✅ **Custom events** - Emits `idb-sync-update` events for easy integration  
✅ **Schema-less design** - No predefined database schemas required  
✅ **Offline-first** - Optimistic updates with automatic reconciliation  
✅ **Same-device optimization** - Uses BroadcastChannel to sync across browser tabs  
✅ **Conflict resolution** - Last-Write-Wins with monotonic versioning  
✅ **Idempotency** - Duplicate operations are automatically handled  
✅ **WebSocket-based** - Efficient real-time communication  

## Quick Start

### 1. Start the Server

```bash
TOKEN=your-secret deno run --unstable-kv --allow-read --allow-write --allow-env --allow-net server/src/main.ts
```

The server will start on `http://localhost:8081` with sync endpoint at `ws://localhost:8081/sync`.

### 2. Use in Your Application

```html
<script type="module">
import { IndexedDBSync } from './js/indexeddb-sync-simple.js';

// Initialize sync client
const syncClient = new IndexedDBSync({
    serverUrl: 'ws://localhost:8081/sync',
    dbName: 'my-game-db'
});

// Listen for sync events
window.addEventListener('idb-sync-update', (event) => {
    const { table, op, origin, meta } = event.detail;
    console.log(`Sync event: ${origin} - ${op.operation} on ${table}`);
    
    // Update your UI here
    refreshGameData();
});

// Connect to server
await syncClient.connect();

// Add/update data (syncs automatically)
await syncClient.set('game_scores', 'player1', {
    name: 'player1',
    score: 1500,
    lastUpdated: new Date().toISOString()
});

// Delete data (syncs automatically)
await syncClient.delete('game_scores', 'player1');

// Read data (local IndexedDB)
const player = await syncClient.get('game_scores', 'player1');
const allScores = await syncClient.getAll('game_scores');
</script>
```

## API Reference

### IndexedDBSync Class

#### Constructor
```javascript
new IndexedDBSync(options)
```

**Options:**
- `serverUrl` (string): WebSocket server URL (default: `'ws://localhost:8081/sync'`)
- `dbName` (string): IndexedDB database name (default: `'sync-db'`)

#### Methods

##### `connect()`
Connects to the sync server and subscribes to tables.

##### `disconnect()`
Disconnects from server and closes database connections.

##### `set(tableName, key, value)`
Adds or updates data in a table. Changes sync automatically.

##### `delete(tableName, key)`
Deletes data from a table. Changes sync automatically.

##### `get(tableName, key)`
Retrieves data from local IndexedDB (no network call).

##### `getAll(tableName)`
Retrieves all data from a table (no network call).

### Custom Events

The library emits `idb-sync-update` events on the window object:

```javascript
window.addEventListener('idb-sync-update', (event) => {
    const { table, op, origin, meta } = event.detail;
    
    // table: string - name of the table that changed
    // op: object - the operation that was performed
    // origin: string - source of the change ('local', 'server', 'local-tab', 'server-tab')
    // meta: object - additional metadata
});
```

**Origin types:**
- `'local'` - Change made by this client
- `'server'` - Change received from server (from another client)
- `'local-tab'` - Change made by another tab in the same browser
- `'server-tab'` - Server change received by another tab in the same browser

## Architecture

### Server Components

- **Sync Server** (`server/src/sync-server.ts`) - Handles WebSocket connections and data synchronization
- **Main Server** (`server/src/main.ts`) - HTTP server with sync endpoint integration
- **Storage** - Uses Deno KV for persistent, versioned data storage

### Client Components

- **Sync Client** (`js/indexeddb-sync-simple.js`) - Main client library
- **IndexedDB** - Local browser storage for offline-first operation
- **WebSocket** - Real-time server communication
- **BroadcastChannel** - Same-device tab synchronization

### Data Flow

1. **Local Write**: Client writes to IndexedDB immediately (optimistic update)
2. **Server Sync**: Change sent to server via WebSocket
3. **Server Apply**: Server validates, applies, and assigns version number
4. **Broadcast**: Server broadcasts change to all subscribed clients
5. **Client Apply**: Other clients receive and apply the change
6. **Event Emission**: Custom `idb-sync-update` event fired

### Conflict Resolution

Uses **Last-Write-Wins** with monotonic versioning:
- Server assigns incrementing version numbers to all changes
- Later versions always override earlier ones
- Operations are idempotent using client-supplied operation IDs

## Protocol

### Message Types

#### Client → Server

**Subscribe to table:**
```json
{
  "type": "subscribe",
  "table": "game_scores"
}
```

**Data operation:**
```json
{
  "type": "operation",
  "table": "game_scores",
  "payload": {
    "operation": "set",
    "key": "player1",
    "value": { "name": "player1", "score": 100 }
  },
  "opId": "op_1234567890_abc123"
}
```

#### Server → Client

**Table snapshot:**
```json
{
  "type": "snapshot",
  "table": "game_scores",
  "payload": {
    "player1": { "name": "player1", "score": 100 },
    "player2": { "name": "player2", "score": 200 }
  },
  "tableVersion": 5,
  "timestamp": 1234567890
}
```

**Data update:**
```json
{
  "type": "update",
  "table": "game_scores",
  "payload": {
    "operation": "set",
    "key": "player1",
    "value": { "name": "player1", "score": 150 }
  },
  "originId": "client_xxx",
  "tableVersion": 6,
  "timestamp": 1234567890
}
```

## Demo

Try the working demo:

1. Start the server (see Quick Start)
2. Open `http://localhost:8081/sync-test.html`
3. Click "Connect" to connect to the sync server
4. Add players and see real-time updates
5. Open the same page in multiple tabs to see cross-tab sync

## Files Created

### Server
- [`server/src/sync-server.ts`](server/src/sync-server.ts) - WebSocket sync server implementation
- [`server/src/main.ts`](server/src/main.ts) - Updated to include `/sync` endpoint

### Client
- [`js/indexeddb-sync-simple.js`](js/indexeddb-sync-simple.js) - Main sync client library
- [`js/indexeddb-sync.js`](js/indexeddb-sync.js) - Full-featured version (more complex)

### Demos
- [`sync-test.html`](sync-test.html) - Simple working demo
- [`sync-demo.html`](sync-demo.html) - Full-featured demo with UI

## Use Cases

Perfect for:
- **Multiplayer browser games** - Share game state across players
- **Collaborative applications** - Real-time document editing
- **Social features** - Live comments, reactions, presence
- **Data synchronization** - Keep data in sync across devices
- **Offline-first apps** - Work offline with automatic sync when online

## Advanced Considerations

### Security
For production use, consider adding:
- Authentication tokens
- Rate limiting
- Input validation
- CORS configuration
- WSS (WebSocket over SSL)

### Scaling
For high-scale applications:
- Use Redis for pub/sub across server instances
- Implement table sharding
- Add connection pooling
- Monitor performance and add caching

### Data Modeling
- Design for conflict-free data structures when possible
- Consider using CRDTs for complex conflict resolution
- Plan for schema evolution over time
- Implement data migration strategies

### Testing
- Unit tests for client and server components
- Integration tests with multiple clients
- Performance testing under load
- Network failure simulation

## License

This implementation is provided as a proof-of-concept and starting point for your own IndexedDB synchronization needs.