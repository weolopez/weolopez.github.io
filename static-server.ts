import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.177.0/http/file_server.ts";
import { handleCorsProxyRequest } from "./cors-proxy.ts";

const PORT = 8081;

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  console.log(`[static] request: ${request.method} ${url.pathname}`);

  // Handle CORS proxy requests
  if (url.pathname.startsWith('/cors-proxy')) {
    return await handleCorsProxyRequest(request);
  }

  // Proxy /world_cup/api requests to the backend server
  if (url.pathname.startsWith('/world_cup/api') || url.pathname.startsWith('/world_cup/auth')) {
    const backendUrl = new URL(request.url);
    backendUrl.port = "8000";
    // backendUrl.pathname is already correct (e.g. /world_cup/api/matches)
    // The backend expects requests at /api/... so we might need to strip /world_cup if the backend doesn't handle it.
    // Looking at main.ts: const pathname = url.pathname.replace(/^\/world_cup/, "");
    // So the backend DOES strip /world_cup. We can just forward the full path.
    
    console.log(`[static] proxying ${url.pathname} -> ${backendUrl.toString()}`);
    
    try {
        console.log(`[static] attempting fetch to ${backendUrl.toString()}`);
        const backendResponse = await fetch(backendUrl, {
            method: request.method,
            headers: request.headers,
            body: request.body,
            redirect: "manual"
        });

        console.log(`[static] backend response status: ${backendResponse.status} for ${backendUrl.pathname}`);

        // We need to return a new Response because the one from fetch is immutable/stream-locked sometimes?
        // Actually, just returning it should work, but let's be safe with headers.
        return new Response(backendResponse.body, {
            status: backendResponse.status,
            statusText: backendResponse.statusText,
            headers: backendResponse.headers
        });
    } catch (e) {
        console.error(`[static] proxy fetch failed for ${backendUrl.pathname}:`, e);
        return new Response("Backend unavailable", { status: 502 });
    }
  }

  // Handle root path - serve index.html
  if (url.pathname === "/" || url.pathname === "/index.html") {
    try {
      return await serveFile(request, "./index.html");
    } catch {
      return new Response("Index not found", { status: 404 });
    }
  }

  // Serve any other static files, with directory index fallback (e.g., /privacy -> /privacy/index.html)
  try {
    const exactResp = await serveFile(request, "." + url.pathname);
    if (exactResp.status !== 404) {
      return exactResp;
    }
    // If not found, attempt directory index
    const normalized = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
    console.log(`[static] fallback to index: ${normalized}index.html`);
    return await serveFile(request, "." + normalized + "index.html");
  } catch {
    // If serveFile threw (e.g., trying to open a directory), try directory index
    try {
      const normalized = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
      console.log(`[static] catch fallback to index: ${normalized}index.html`);
      return await serveFile(request, "." + normalized + "index.html");
    } catch {
      return new Response("File not found", { status: 404 });
    }
  }
}

console.log(`Static server running on http://localhost:${PORT}`);

serve(handleRequest, { port: PORT });