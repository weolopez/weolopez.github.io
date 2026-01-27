import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.177.0/http/file_server.ts";
import { handleCorsProxyRequest } from "./cors-proxy.ts";
import { jwtVerify, createRemoteJWKSet } from "https://deno.land/x/jose@v4.14.4/index.ts";

const PORT = 8081;

// Google OAuth2 JWKS
const googleJWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "671385367166-4118tll0ntluovkdm5agd85arvl1ml9h.apps.googleusercontent.com";

/**
 * Verifies Google JWT and returns user info
 */
async function verifyGoogleJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, googleJWKS, {
      issuer: "https://accounts.google.com",
      audience: GOOGLE_CLIENT_ID,
    });
    return payload;
  } catch (error) {
    console.error("JWT verification failed:", error);
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

  // --- SECURITY CHECK ---
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized: Missing token" }), { status: 401, headers: corsHeaders });
  }

  const token = authHeader.split(" ")[1];
  const user = await verifyGoogleJWT(token);

  if (!user || user.email !== "weolopez@gmail.com") {
    console.warn(`[Bridge Auth] Denied access to: ${user?.email || "unknown"}`);
    return new Response(JSON.stringify({ error: "Forbidden: Access denied" }), { status: 403, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    console.log(`[Clawd Bridge] Verified user ${user.email} forwarding message:`, body.message);

    const bridgeServerUrl = "http://localhost:8083/message";
    
    const response = await fetch(bridgeServerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: body.message,
        sessionId: "agent:main:main"
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

  // --- Clawd Bridge Routing ---
  if (url.pathname === "/clawd-bridge" || url.pathname === "/clawd-bridge/message") {
    return await handleClawdBridgeRequest(request);
  }

  // Real-time Push Events Proxy (SSE)
  if (url.pathname === "/clawd-bridge/events") {
    const token = url.searchParams.get("token");
    console.log(`[static] Proxying SSE connection to Bridge Server (8083)... Auth: ${token ? "Yes" : "No"}`);
    return await fetch(`http://localhost:8083/events?token=${token}`);
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
