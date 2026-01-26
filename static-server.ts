import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.177.0/http/file_server.ts";
import { handleCorsProxyRequest } from "./cors-proxy.ts";

const PORT = 8081;

/**
 * Clawd Bridge: Simple messaging endpoint.
 * This will eventually connect to the agent session.
 */
async function handleClawdBridgeRequest(request: Request): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    console.log("[Clawd Bridge] Forwarding message to Bridge Server:", body.message);

    const bridgeServerUrl = "http://localhost:8082/message";
    
    const response = await fetch(bridgeServerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: body.message,
        sessionId: "agent:main:main" // Default session for now
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Clawd Bridge] Bridge Server error:", errorText);
      return new Response(JSON.stringify({ error: "Bridge Server unreachable" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const result = await response.json();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  console.log(`[static] request: ${request.method} ${url.pathname}`);

  // Handle Clawd Bridge
  if (url.pathname === "/clawd-bridge") {
    return await handleClawdBridgeRequest(request);
  }

  // Handle CORS proxy requests
  if (url.pathname.startsWith('/cors-proxy')) {
    return await handleCorsProxyRequest(request);
  }

  // Check if the path has a file extension (e.g., .js, .css, .png, .xxx)
  const hasExtension = /\.[a-z0-9]+$/i.test(url.pathname);

  // If it's the root path or any path without an extension, serve index.html (SPA routing)
  if (url.pathname === "/" || url.pathname === "/index.html" || !hasExtension) {
    try {
      return await serveFile(request, "./index.html");
    } catch {
      return new Response("Index not found", { status: 404 });
    }
  }

  // Serve static files with extensions
  try {
    return await serveFile(request, "." + url.pathname);
  } catch {
    return new Response("File not found", { status: 404 });
  }
}

console.log(`Static server running on http://localhost:${PORT}`);

serve(handleRequest, { port: PORT });