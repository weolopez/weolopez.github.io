/// <reference lib="deno.unstable" />

const kv = await Deno.openKv("/root/weolopez.github.io/likes/likes.db");

const JSON_H = { "Content-Type": "application/json" };
const CORS_H = {
  ...JSON_H,
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_H });
}

function ns(url: URL): string {
  const raw = url.searchParams.get("ns") || "default";
  // sanitize: only allow alphanumeric, dash, dot, slash
  return raw.replace(/[^a-zA-Z0-9\-._/]/g, "").slice(0, 128) || "default";
}

export async function handleLikesApi(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const p = url.pathname;

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_H });
  }

  // Namespace-aware endpoints
  if (p === "/likes/api/count" && req.method === "GET") {
    const namespace = ns(url);
    const r = await kv.get<number>(["likes", namespace]);
    // legacy fallback: if namespace=default, also check old key
    const legacy = namespace === "default" ? await kv.get<number>(["count"]) : null;
    return json({ count: r.value ?? legacy?.value ?? 0, namespace });
  }

  if (p === "/likes/api/like" && req.method === "POST") {
    const namespace = ns(url);
    const r = await kv.get<number>(["likes", namespace]);
    const next = (r.value ?? 0) + 1;
    await kv.set(["likes", namespace], next);
    return json({ count: next, namespace });
  }

  if (p === "/likes/api/reset" && req.method === "POST") {
    const namespace = ns(url);
    await kv.set(["likes", namespace], 0);
    return json({ count: 0, namespace });
  }

  return json({ error: "Not found" }, 404);
}
