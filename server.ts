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

// Get Gemini API key from env
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_API_KEY) {
  console.warn("⚠️  No GEMINI_API_KEY env var found. Gemini proxy endpoint will not work.");
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
    port: parseInt(Deno.env.get("PORT") || "1235"),
    onRequest: async (request: Request): Promise<Response | undefined> => {
      const url = new URL(request.url);
      console.log('[onRequest] path=', url.pathname);
      if (url.pathname === '/api/gemini') {
        if (!GEMINI_API_KEY) {
          console.error('[gemini] missing GEMINI_API_KEY');
          return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), { status: 500 });
        }
        try {
          const body = await request.json();
          console.log('[gemini] forwarding payload keys=', Object.keys(body));
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          const text = await response.text();
          console.log('[gemini] upstream status=', response.status);
          return new Response(text, {
            status: response.status,
            headers: {
              'Content-Type': response.headers.get('Content-Type') || 'application/json'
            }
          });
        } catch (error) {
          console.error('[gemini] error=', error && (error as Error).message);
          return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
        }
      }
      return undefined;
    },
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

// Run Hocuspocus on 1235 to avoid conflict with the HTTP proxy
server.listen();

// Simple HTTP server for Gemini proxy on 8888
Deno.serve({ port: 8888 }, async (request: Request) => {
  const url = new URL(request.url);
  if (url.pathname === "/api/gemini" && request.method === "POST") {
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    try {
      const body = await request.json();
      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("Content-Type") || "application/json",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: (error as Error).message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
  return new Response("Welcome to Hocuspocus!", { status: 200 });
});

console.log("Hocuspocus server listening on http://localhost:1235");
console.log("Gemini proxy listening on http://localhost:8888/api/gemini");
