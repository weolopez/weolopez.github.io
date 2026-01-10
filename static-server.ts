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