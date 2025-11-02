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