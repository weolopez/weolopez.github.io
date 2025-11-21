import "https://deno.land/std@0.208.0/dotenv/load.ts";
import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { DB } from "https://deno.land/x/sqlite@v3.9.1/mod.ts";
import { jwtVerify, createRemoteJWKSet } from "https://deno.land/x/jose@v4.14.4/index.ts";

// Path to your SQLite file (creates it if it doesn't exist)
const dbPath = Deno.env.get("DB_PATH") || "./hocuspocus.db";

// Initialize DB connection
const db = new DB(dbPath);

// Create table if it doesn't exist
db.execute(`
  CREATE TABLE IF NOT EXISTS documents (
    name TEXT PRIMARY KEY,
    data BLOB
  )
`);

// Google OAuth2 JWKS
const googleJWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

// Get Google Client ID from env or use default (with warning)
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "671385367166-4118tll0ntluovkdm5agd85arvl1ml9h.apps.googleusercontent.com";
if (!Deno.env.get("GOOGLE_CLIENT_ID")) {
  console.warn("⚠️  No GOOGLE_CLIENT_ID env var found. Using hardcoded default.");
}

// Verify Google JWT
async function verifyGoogleJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, googleJWKS, {
      issuer: "https://accounts.google.com",
      audience: GOOGLE_CLIENT_ID,
    });
    return payload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    throw new Error("Invalid token");
  }
}

// Closure to expose db to the extension functions
const createServer = () => {
  const server = new Server({
    port: parseInt(Deno.env.get("PORT") || "8888"),
    async onAuthenticate({ token }) {
      if (!token) {
        throw new Error("Authentication required");
      }
      const payload = await verifyGoogleJWT(token);
      return {
        user: {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
        },
      };
    },
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
