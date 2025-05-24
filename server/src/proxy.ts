import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

export async function handleProxyRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing 'url' query parameter", { status: 400 });
  }

  try {
    const response = await fetch(targetUrl);
    // Clone the response to allow reading the body multiple times if needed
    const clonedResponse = response.clone();

    // Set appropriate CORS headers to allow the client-side script to access the response
    const headers = new Headers(clonedResponse.headers);
    headers.set("Access-Control-Allow-Origin", "*"); // Allow all origins for simplicity in development
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");

    return new Response(clonedResponse.body, {
      status: clonedResponse.status,
      statusText: clonedResponse.statusText,
      headers: headers,
    });
  } catch (error) {
    console.error("Proxy fetch error:", error);
    return new Response(`Proxy error: ${(error as Error).message}`, { status: 500 });
  }
}

if (import.meta.main) {
  console.log("Deno proxy server running on http://localhost:8000/proxy");
  serve(async (req) => {
    const url = new URL(req.url);
    if (url.pathname === "/proxy") {
      return handleProxyRequest(req);
    }
    return new Response("Not Found", { status: 404 });
  }, { port: 8000 });
}