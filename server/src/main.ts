import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleProxyRequest } from "./proxy.ts";
import { handleResponses } from "./responses.ts";
import { handleStaticFiles } from "./static.ts";
import { handleGetKey } from "./getKey.ts";
import { handleKvRequest } from "./kv.ts";
import { GameServer } from "./game_server.ts";

const PORT = 8081;
const REQUIRED_TOKEN = Deno.env.get("TOKEN");

if (!REQUIRED_TOKEN) {
  console.error("Error: Environment variable TOKEN is not set.");
  Deno.exit(1);
}

// Create a single game server instance
const gameServer = new GameServer();

export async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // Handle WebSocket upgrade for game connections
  if (url.pathname === "/game" && request.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(request);
    
    // Generate a unique player ID
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Handle the WebSocket connection
    gameServer.handleWebSocketConnection(socket, playerId);
    
    return response;
  }

  // Serve proxy endpoint
  if (url.pathname === "/proxy") {
    return handleProxyRequest(request);
  }
  
  // Route /v1/kv to the KV handler
  if (url.pathname.startsWith("/v1/kv")) {
    return await handleKvRequest(request);
  }
  
  // Route /v1/responses to the new handler
  if (url.pathname === "/v1/responses") {
    return await handleResponses(request);
  }
  
  // Route /getKey endpoint to the new handler
  if (url.pathname === "/getKey") {
    return await handleGetKey(request);
  }
  
  // Delegate static file serving to the new handler
  return await handleStaticFiles(request);
}

console.log(`Server running on http://localhost:${PORT}`);
await serve(handler, { port: PORT });