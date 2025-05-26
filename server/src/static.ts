import { serveFile } from "https://deno.land/std@0.224.0/http/file_server.ts";

export async function handleStaticFiles(request: Request): Promise<Response> {
  const url = new URL(request.url);
  try {
    let filePath = `${url.pathname}`;
    // If the last segment has no '.', redirect to index.html
    const lastSegment = url.pathname.split("/").pop() || "";
    if (!lastSegment.includes(".")) {
      if (!filePath.endsWith("/")) filePath += "/";
      const headers = new Headers({
        "Location": filePath + "index.html" // target URL if needed
      });
      return new Response(null, {
        status: 302,
        headers: headers,
      });
    }
    // Serve the file directly
    return await serveFile(request, '.' + filePath);
  } catch (error) {
    return new Response(`Not Found: ${(error instanceof Error) ? error.message : String(error)}`, { status: 404 });
  }
}
