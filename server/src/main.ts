import { serve } from "https://deno.land/std@0.172.0/http/server.ts";
import { getResponse } from "./response.ts";


const PORT = 8080;
const REQUIRED_TOKEN = Deno.env.get("TOKEN");

if (!REQUIRED_TOKEN) {
  console.error("Error: Environment variable TOKEN is not set.");
  Deno.exit(1);
}
export async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== "/v1/responses") {
    return new Response("Not Found", { status: 404 });
  }
  
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

console.log(`Server running on http://localhost:${PORT}`);
await serve(handler, { port: PORT });