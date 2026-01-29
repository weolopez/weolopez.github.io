import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.177.0/http/file_server.ts";
import { handleCorsProxyRequest } from "./cors-proxy.ts";

const PORT = 8081;

/**
 * Validates Google Access Token by calling userinfo endpoint
 */
async function verifyGoogleAccessToken(token: string) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

/**
 * Clawd Bridge: Secure messaging endpoint.
 */
async function handleClawdBridgeRequest(request: Request): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized: Missing token" }), { status: 401, headers: corsHeaders });
  }

  const token = authHeader.split(" ")[1];
  const user = await verifyGoogleAccessToken(token);

  if (!user || user.email.toLowerCase() !== "weolopez@gmail.com") {
    console.warn(`[Bridge Auth] Denied access to: ${user?.email || "unknown"} (User found: ${!!user})`);
    return new Response(JSON.stringify({ error: `Forbidden: Access denied for ${user?.email || 'unauthorized account'}` }), { status: 403, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    console.log(`[Clawd Bridge] Verified user ${user.email} forwarding message:`, body.message);

    const bridgeServerUrl = "http://localhost:8083/message";
    
    const response = await fetch(bridgeServerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        message: body.message
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
    console.error("[Clawd Bridge] Request processing error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  console.log(`[static] request: ${request.method} ${url.pathname}`);

  if (url.pathname === "/clawd-bridge" || url.pathname === "/clawd-bridge/message") {
    return await handleClawdBridgeRequest(request);
  }

  if (url.pathname === "/clawd-bridge/events") {
    const token = url.searchParams.get("token");
    console.log(`[static] Proxying SSE connection...`);
    return await fetch(`http://localhost:8083/events?token=${token}`);
  }

  if (url.pathname.startsWith('/cors-proxy')) {
    return await handleCorsProxyRequest(request);
  }

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

  try {
    return await serveFile(request, "./index.html");
  } catch {
    return new Response("Index not found", { status: 404 });
  }
}

console.log(`Static server running on http://localhost:${PORT}`);
serve(handleRequest, { port: PORT });
