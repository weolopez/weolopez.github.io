/// <reference lib="deno.unstable" />

const kv = await Deno.openKv("/root/weolopez.github.io/likes/likes.db");

const JSON_H = { "Content-Type": "application/json" };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_H });
}

export async function handleLikesApi(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const p = url.pathname;

  if (p === "/likes/api/count" && req.method === "GET") {
    const r = await kv.get<number>(["count"]);
    return json({ count: r.value ?? 0 });
  }

  if (p === "/likes/api/like" && req.method === "POST") {
    const r = await kv.get<number>(["count"]);
    const next = (r.value ?? 0) + 1;
    await kv.set(["count"], next);
    return json({ count: next });
  }

  if (p === "/likes/api/reset" && req.method === "POST") {
    await kv.set(["count"], 0);
    return json({ count: 0 });
  }

  return json({ error: "Not found" }, 404);
}
