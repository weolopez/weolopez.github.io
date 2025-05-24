import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getResponse } from "./response.ts";
import { serveFile } from "https://deno.land/std@0.224.0/http/file_server.ts";
import { handleProxyRequest } from "./proxy.ts";


const PORT = 8081;
const REQUIRED_TOKEN = Deno.env.get("TOKEN");

if (!REQUIRED_TOKEN) {
  console.error("Error: Environment variable TOKEN is not set.");
  Deno.exit(1);
}
export async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // Serve proxy endpoint
  if (url.pathname === "/proxy") {
    return handleProxyRequest(request);
  }

  // Serve API endpoint
  if (url.pathname === "/v1/responses") {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Validate Authorization header/
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }
    const token = authHeader.slice("Bearer ".length);
    if (token !== REQUIRED_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Parse JSON body
    let payload: any;
    try {
      payload = await request.json();
    } catch (error) {
      return new Response("Bad Request: Invalid JSON", { status: 400 });
    }

    let answer = ""
    if (payload.input && payload.input.length === 1 && typeof payload.input[0].content === "string") {
      answer = await getResponse(payload.input[0].content);
    }

    const responseBody = answer ;
    return new Response(JSON.stringify(responseBody), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Serve static files, default to index.html for root or directories
  try {
    let filePath = `${url.pathname}`;
    // If the last item in the path doesn't have a '.', serve index.html
    const lastSegment = url.pathname.split("/").pop() || "";
    if (!lastSegment.includes(".")) {
      if (!filePath.endsWith("/")) filePath += "/";
        const headers = new Headers({
          "Location": filePath + "index.html" // Replace with your target URL if needed
        });
        return new Response(null, {
          status: 302, // 302 Found
          headers: headers,
        });    
    }
      
    // If not a directory, serve the file directly
    return await serveFile(request, '.' + filePath);
  } catch (error) {
    return new Response(`Not Found: ${(error instanceof Error) ? error.message : String(error)}`, { status: 404 });
  }
}

console.log(`Server running on http://localhost:${PORT}`);
await serve(handler, { port: PORT });