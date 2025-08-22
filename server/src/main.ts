import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleProxyRequest } from "./proxy.ts";
import { handleResponses } from "./responses.ts";
import { handleStaticFiles } from "./static.ts";
import { handleGetKey } from "./getKey.ts";
import { handleKvRequest } from "./kv.ts";
import { handleCorsProxyRequest } from "./cors-proxy.ts";
import { GameManager } from "./game_manager.ts"; // Import the new GameManager
import { handleAudioStreamWebSocket } from "./audio-stream.ts"; // Import audio streaming handler

const PORT = 8081;
const REQUIRED_TOKEN = Deno.env.get("TOKEN");

if (!REQUIRED_TOKEN) {
  console.error("Error: Environment variable TOKEN is not set.");
  Deno.exit(1);
}

// Create a single GameManager instance
const gameManager = new GameManager();

export async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // Handle WebSocket upgrade for audio streaming
  // Expected format: /stream/audio
  if (url.pathname === "/stream/audio" && request.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(request);
    
    // Handle the WebSocket connection via AudioStreamHandler
    await handleAudioStreamWebSocket(socket);
    
    return response;
  }

  // Handle WebSocket upgrade for game connections
  // Expected format: /game/{gameType}/{roomId?}
  if (url.pathname.startsWith("/game/") && request.headers.get("upgrade") === "websocket") {
    const pathParts = url.pathname.split('/'); // ['', 'game', 'gameType', 'roomId']
    const gameType = pathParts[2];
    const roomId = pathParts[3]; // Optional room ID

    if (!gameType) {
      return new Response("Game type not specified in URL path (e.g., /game/asteroids)", { status: 400 });
    }

    const { socket, response } = Deno.upgradeWebSocket(request);
    
    // Generate a unique player ID
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Handle the WebSocket connection via GameManager
    gameManager.handleWebSocketConnection(socket, gameType, playerId, roomId);
    
    return response;
  }

  // Serve proxy endpoint
  if (url.pathname === "/proxy") {
    return handleProxyRequest(request);
  }
  
  // Serve CORS proxy for isomorphic-git
  if (url.pathname === "/cors-proxy" || url.pathname.startsWith("/cors-proxy/")) {
    return await handleCorsProxyRequest(request);
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
  
  // Route /api/audio-files to list recorded audio files
  if (url.pathname === "/api/audio-files") {
    if (request.method === "DELETE") {
      return await handleDeleteAllAudioFiles(request);
    }
    return await handleAudioFilesList(request);
  }
  
  // Route for deleting individual audio files
  if (url.pathname.startsWith("/audio-recordings/") && request.method === "DELETE") {
    return await handleDeleteAudioFile(request, url.pathname);
  }
  
  // Delegate static file serving to the new handler
  return await handleStaticFiles(request);
}

console.log(`Server running on http://localhost:${PORT}`);
await serve(handler, { port: PORT });

/**
 * Handle requests to list audio files in the audio-recordings directory
 */
async function handleAudioFilesList(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const audioDir = "./audio-recordings";
    const files: Array<{name: string, size: number, modified: string}> = [];
    
    // Check if directory exists
    try {
      const dirInfo = await Deno.stat(audioDir);
      if (!dirInfo.isDirectory) {
        throw new Error("Not a directory");
      }
    } catch {
      // Directory doesn't exist, return empty list
      return new Response(JSON.stringify([]), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Read directory contents
    for await (const dirEntry of Deno.readDir(audioDir)) {
      if (dirEntry.isFile && dirEntry.name.endsWith('.webm')) {
        try {
          const filePath = `${audioDir}/${dirEntry.name}`;
          const fileInfo = await Deno.stat(filePath);
          files.push({
            name: dirEntry.name,
            size: fileInfo.size,
            modified: fileInfo.mtime?.toISOString() || new Date().toISOString()
          });
        } catch (error) {
          console.warn(`Error reading file info for ${dirEntry.name}:`, error);
        }
      }
    }

    // Sort files by modification time (newest first)
    files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    return new Response(JSON.stringify(files), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error listing audio files:", error);
    return new Response(JSON.stringify({ error: "Failed to list audio files" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

/**
 * Handle requests to delete a specific audio file
 */
async function handleDeleteAudioFile(request: Request, pathname: string): Promise<Response> {
  try {
    const filename = pathname.replace("/audio-recordings/", "");
    
    // Validate filename (security check)
    if (!filename || filename.includes("..") || filename.includes("/") || !filename.endsWith('.webm')) {
      return new Response(JSON.stringify({ error: "Invalid filename" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    
    const filePath = `./audio-recordings/${filename}`;
    
    try {
      await Deno.remove(filePath);
      console.log(`Deleted audio file: ${filename}`);
      
      return new Response(JSON.stringify({ success: true, message: `File ${filename} deleted` }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return new Response(JSON.stringify({ error: "File not found" }), {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error deleting audio file:", error);
    return new Response(JSON.stringify({ error: "Failed to delete file" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

/**
 * Handle requests to delete all audio files
 */
async function handleDeleteAllAudioFiles(request: Request): Promise<Response> {
  console.log("DEBUG: handleDeleteAllAudioFiles called.");
  try {
    const audioDir = "./audio-recordings";
    let deletedCount = 0;
    
    try {
      // Check if directory exists
      const dirInfo = await Deno.stat(audioDir);
      if (!dirInfo.isDirectory) {
        console.log(`DEBUG: Audio directory ${audioDir} is not a directory.`);
        throw new Error("Not a directory");
      }
      
      // Delete all .webm files in the directory
      for await (const dirEntry of Deno.readDir(audioDir)) {
        if (dirEntry.isFile && dirEntry.name.endsWith('.webm')) {
          try {
            const filePath = `${audioDir}/${dirEntry.name}`;
            await Deno.remove(filePath);
            deletedCount++;
            console.log(`DEBUG: Successfully deleted audio file: ${dirEntry.name}`);
          } catch (error) {
            console.warn(`WARNING: Failed to delete ${dirEntry.name}:`, error);
          }
        }
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.log(`DEBUG: Audio directory ${audioDir} not found. No files to delete.`);
        // Directory doesn't exist, nothing to delete
        return new Response(JSON.stringify({ success: true, deletedCount: 0, message: "No files to delete" }), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
      console.error(`ERROR: Error accessing audio directory ${audioDir}:`, error);
      throw error;
    }
    
    console.log(`DEBUG: Completed handleDeleteAllAudioFiles. Deleted ${deletedCount} files.`);
    return new Response(JSON.stringify({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} audio files`
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("ERROR: Unhandled error in handleDeleteAllAudioFiles:", error);
    return new Response(JSON.stringify({ error: "Failed to delete files" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}