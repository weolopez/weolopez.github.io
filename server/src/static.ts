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
        "Access-Control-Allow-Headers": "Content-Type, Range",
        "Access-Control-Expose-Headers": "Accept-Ranges, Content-Range, Content-Length, Content-Type",
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
    
    // Get all existing headers
    const existingHeaders = Object.fromEntries(response.headers.entries());
    
    // Add CORS headers while preserving important headers like Accept-Ranges, Content-Range, etc.
    const corsHeaders = {
      ...existingHeaders,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS, DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Range",
      "Access-Control-Expose-Headers": "Accept-Ranges, Content-Range, Content-Length, Content-Type",
    };
    
    // For audio files, ensure proper range support and correct Content-Type
    if (filePath.endsWith('.webm')) {
      corsHeaders["Accept-Ranges"] = "bytes";
      // Explicitly set Content-Type for WebM audio if not already set or incorrect
      if (!corsHeaders["content-type"] || !corsHeaders["content-type"].startsWith("audio/webm")) {
        corsHeaders["content-type"] = "audio/webm; codecs=opus"; // Assuming opus, can be more dynamic if needed
        console.log(`DEBUG: Explicitly setting Content-Type for ${filePath} to ${corsHeaders["content-type"]}`);
      }
    } else if (filePath.endsWith('.mp3')) {
      corsHeaders["Accept-Ranges"] = "bytes";
      if (!corsHeaders["content-type"] || !corsHeaders["content-type"].startsWith("audio/mpeg")) {
        corsHeaders["content-type"] = "audio/mpeg";
        console.log(`DEBUG: Explicitly setting Content-Type for ${filePath} to ${corsHeaders["content-type"]}`);
      }
    } else if (filePath.endsWith('.wav')) {
      corsHeaders["Accept-Ranges"] = "bytes";
      if (!corsHeaders["content-type"] || !corsHeaders["content-type"].startsWith("audio/wav")) {
        corsHeaders["content-type"] = "audio/wav";
        console.log(`DEBUG: Explicitly setting Content-Type for ${filePath} to ${corsHeaders["content-type"]}`);
      }
    }
    
    // Clone the response to modify headers
    const corsResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: corsHeaders,
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
