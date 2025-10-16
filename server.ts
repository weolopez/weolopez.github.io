import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { DB } from "https://deno.land/x/sqlite@v3.9.1/mod.ts";

// Path to your SQLite file (creates it if it doesn't exist)
const dbPath = "./hocuspocus.db";

// Initialize DB connection
const db = new DB(dbPath);

// Create table if it doesn't exist
db.execute(`
  CREATE TABLE IF NOT EXISTS documents (
    name TEXT PRIMARY KEY,
    data BLOB
  )
`);

// Closure to expose db to the extension functions
const createServer = () => {
  const server = new Server({
    port: 8888, // Changed port to avoid conflict
    extensions: [
      new Database({
        // Fetch: Return Uint8Array or null
        fetch: async ({ documentName }) => {
          try {
            const query = db.prepareQuery("SELECT data FROM documents WHERE name = ? ORDER BY rowid DESC");
            const result = query.one([documentName]);
            query.finalize();
            return result ? result[0] : null;
          } catch (error) {
            return null;
          }
        },
        // Store: Persist the updated Uint8Array (promisified)
        store: async ({ documentName, state }) => { // state is Uint8Array
          try {
            const query = db.prepareQuery("INSERT INTO documents (name, data) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET data = ?");
            query.execute([documentName, state, state]);
            query.finalize();
          } catch (error) {
            console.error(`Store error for "${documentName}":`, error);
          }
        },
      }),
    ],
  });

  // No additional middleware needed for static files

  return server;
};

const server = createServer();

server.listen();

console.log("Hocuspocus server listening on http://localhost:1235");
