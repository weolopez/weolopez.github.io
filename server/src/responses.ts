import { getResponse } from "./response.ts";
const REQUIRED_TOKEN = Deno.env.get("TOKEN");

export async function handleResponses(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  
  // Validate Authorization header
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
  
  let answer = "";
  if (payload.input && payload.input.length === 1 && typeof payload.input[0].content === "string") {
    answer = await getResponse(payload.input[0].content);
  }
  
  const responseBody = answer;
  return new Response(JSON.stringify(responseBody), {
    headers: { "Content-Type": "application/json" },
  });
}
