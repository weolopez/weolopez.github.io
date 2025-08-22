import { serveFile } from "https://deno.land/std@0.224.0/http/file_server.ts";

export async function handleStaticFiles(request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  // Handle preflight OPTIONS requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // or specify your domain
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400", // 24 hours
      },
    });
  }

  try {
    let filePath = `${url.pathname}`;
    const lastSegment = url.pathname.split("/").pop() || "";
    
    if (!lastSegment.includes(".")) {
      if (!filePath.endsWith("/")) filePath += "/";
      const headers = new Headers({
        "Location": filePath + "index.html",
        "Access-Control-Allow-Origin": "*", // Add CORS to redirects too
      });
      return new Response(null, {
        status: 302,
        headers: headers,
      });
    }
    
    // Serve the file and add CORS headers
    const response = await serveFile(request, '.' + filePath);
    
    // Clone the response to modify headers
    const corsResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        "Access-Control-Allow-Origin": "*", // or specify your domain
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
    
    return corsResponse;
  } catch (error) {
    return new Response(`Not Found: ${(error instanceof Error) ? error.message : String(error)}`, {
      status: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
      }
    });
  }
}
