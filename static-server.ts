import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.177.0/http/file_server.ts";

const PORT = 8081;

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // Handle root path - serve index.html
  if (url.pathname === "/" || url.pathname === "/index.html") {
    try {
      return await serveFile(request, "./index.html");
    } catch {
      return new Response("Index not found", { status: 404 });
    }
  }

  // Serve any other static files
  try {
    return await serveFile(request, "." + url.pathname);
  } catch {
    return new Response("File not found", { status: 404 });
  }
}

console.log(`Static server running on http://localhost:${PORT}`);

serve(handleRequest, { port: PORT });