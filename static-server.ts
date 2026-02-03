import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.177.0/http/file_server.ts";
import { handleCorsProxyRequest } from "./cors-proxy.ts";

// --- Configuration ---
const PORT = 8081;
const CLAWDBOT_URL = "http://127.0.0.1:18789/tools/invoke";
const CLAWDBOT_CHAT_URL = "http://127.0.0.1:18789/v1/chat/completions";
const CLAWDBOT_TOKEN = Deno.env.get("CLAWDBOT_TOKEN") || "b888b285b8e6f2781e39fce4397bb6b5b25c00f389b28edc";
const VARGO_TOKEN = Deno.env.get("VARGO_TELEGRAM_TOKEN");
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "671385367166-4118tll0ntluovkdm5agd85arvl1ml9h.apps.googleusercontent.com";
const GROUP_CHAT_ID = "-1003897324317";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Clawd-Token",
};

// --- State ---
const clients = new Map<string, (msg: string) => void>();

// --- Helpers ---

/**
 * Validates Google Access Token by calling userinfo endpoint
 */
async function verifyGoogleAccessToken(token: string) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return null;
    const user = await response.json();
    if (user.email.toLowerCase() !== "weolopez@gmail.com") return null;
    return user;
  } catch (error) {
    console.error("[Bridge Auth] Token verification failed:", error);
    return null;
  }
}

const checkAuth = async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  let token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token) {
    token = new URL(req.url).searchParams.get("token");
  }
  if (!token) return null;
  return await verifyGoogleAccessToken(token);
};

// --- Request Handlers ---

/**
 * Handle Server-Sent Events (SSE) for real-time updates
 */
async function handleEventsRequest(request: Request): Promise<Response> {
  const user = await checkAuth(request);
  if (!user) {
    return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS });
  }

  const clientId = crypto.randomUUID();
  const body = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (msg: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
        } catch (e) {
          console.error("[Bridge] SSE send error", e);
        }
      };
      clients.set(clientId, send);
      console.log(`[Bridge] ${user.email} connected (Total: ${clients.size})`);
      
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 15000);
    },
    cancel() {
      clients.delete(clientId);
      console.log(`[Bridge] Client disconnected`);
    },
  });

  return new Response(body, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

/**
 * Unified Bridge messaging handler
 */
async function handleClawdBridgeRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const user = await checkAuth(request);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS_HEADERS });
  }

  try {
    const body = await request.json();
    const { message, useCompletions, systemPrompt } = body;

    // 1. Direct Chat Completion Proxy
    if (useCompletions) {
      console.log(`[Bridge] Proxying Chat Completion for ${user.email}`);
      const response = await fetch(CLAWDBOT_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${CLAWDBOT_TOKEN}`
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          model: "default"
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Bridge] Gemini Proxy error: ${errorText}`);
        return new Response(JSON.stringify({ error: "Gemini Proxy error" }), { status: 500, headers: CORS_HEADERS });
      }

      const result = await response.json();
      return new Response(JSON.stringify({
        status: "success",
        reply: result.choices[0].message.content
      }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // 2. Default: Forward to the agent turn
    console.log(`[Bridge] Forwarding message from ${user.email}: ${message}`);
    const response = await fetch(CLAWDBOT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CLAWDBOT_TOKEN}`
      },
      body: JSON.stringify({ 
        tool: "sessions_send",
        args: {
          sessionKey: "agent:main:main",
          message: message
        }
      })
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Archie is busy" }), { status: 500, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ status: "success" }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: CORS_HEADERS });
  }
}

/**
 * Vargo Telegram Relay
 */
async function handleVargoRelay(request: Request): Promise<Response> {
  if (!VARGO_TOKEN) {
    return new Response(JSON.stringify({ error: "Vargo identity not configured" }), { status: 500, headers: CORS_HEADERS });
  }

  try {
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return new Response(JSON.stringify({ error: "No message provided" }), { status: 400, headers: CORS_HEADERS });
    }

    console.log(`[Relay] Vargo speaking: ${message}`);

    const telegramUrl = `https://api.telegram.org/bot${VARGO_TOKEN}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: GROUP_CHAT_ID,
        text: message
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Relay] Telegram error: ${errorText}`);
      return new Response(JSON.stringify({ error: "Telegram delivery failed" }), { status: 500, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ status: "success" }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid relay request" }), { status: 400, headers: CORS_HEADERS });
  }
}

/**
 * Internal Push (Broadcast to SSE clients)
 */
async function handlePushRequest(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { message } = body;
    const payload = JSON.stringify({ message, timestamp: new Date().toISOString() });
    for (const send of clients.values()) {
      send(payload);
    }
    return new Response(JSON.stringify({ ok: true }), { headers: CORS_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Push failed" }), { status: 400, headers: CORS_HEADERS });
  }
}

// --- Main Router ---

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  console.log(`[server] ${request.method} ${url.pathname}`);

  // 1. API Endpoints (Bridge & Relay)
  if (url.pathname === "/clawd-bridge" || url.pathname === "/message" || url.pathname === "/clawd-bridge/message") {
    return await handleClawdBridgeRequest(request);
  }
  if (url.pathname === "/events" || url.pathname === "/clawd-bridge/events") {
    return await handleEventsRequest(request);
  }
  if (url.pathname === "/relay/vargo") {
    const user = await checkAuth(request);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS_HEADERS });
    }
    return await handleVargoRelay(request);
  }
  if (url.pathname === "/push") {
    return await handlePushRequest(request);
  }

  // 2. Utilities
  if (url.pathname.startsWith('/cors-proxy')) {
    return await handleCorsProxyRequest(request);
  }

  // 3. Static File Server
  const hasExtension = /\.[a-z0-9]+$/i.test(url.pathname);

  if (hasExtension) {
    try {
      const filePath = "." + url.pathname;
      const fileExtension = url.pathname.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'bjs' || fileExtension === 'js') {
        const fileContent = await Deno.readFile(filePath);
        return new Response(fileContent, {
          headers: { "Content-Type": "application/javascript" },
        });
      }

      return await serveFile(request, filePath);
    } catch {
      return new Response("File not found", { status: 404 });
    }
  }

  // SPA routing: Serve index.html for root or extensionless paths
  try {
    return await serveFile(request, "./index.html");
  } catch {
    return new Response("Index not found", { status: 404 });
  }
}

console.log(`Unified Static & Bridge Server running on http://localhost:${PORT}`);
serve(handleRequest, { port: PORT });
