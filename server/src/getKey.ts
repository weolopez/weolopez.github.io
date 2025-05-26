export async function handleGetKey(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const name = url.searchParams.get("name");
  if (!name) {
    return new Response("Missing 'name' parameter", { status: 400 });
  }
  
  const key = Deno.env.get("sk"+name);
  if (!key) {
    return new Response(`No key found for name: ${name}`, { status: 404 });
  }
  
  return new Response(JSON.stringify({ name, key }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
