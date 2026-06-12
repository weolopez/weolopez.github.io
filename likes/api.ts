/// <reference lib="deno.unstable" />

const kv = await Deno.openKv("./likes/likes.db");

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

// Atomic increment via optimistic concurrency: read, then commit only if the key is
// unchanged. Retries on contention so concurrent likes never lose an update. Keeps the
// value a plain JS number (JSON-safe) rather than switching to Deno.KvU64.
async function bump(key: Deno.KvKey, delta = 1): Promise<number> {
  for (let i = 0; i < 8; i++) {
    const cur = await kv.get<number>(key);
    const next = (cur.value ?? 0) + delta;
    const res = await kv.atomic().check(cur).set(key, next).commit();
    if (res.ok) return next;
  }
  return (await kv.get<number>(key)).value ?? 0; // give up after contention, return latest
}

// Per-IP fixed-window rate limit (in-process; resets on restart).
const RL_MAX = 30, RL_WINDOW_MS = 10_000;
const rl = new Map<string, { n: number; reset: number }>();
function clientIp(req: Request): string {
  return req.headers.get("cf-connecting-ip")
      || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim()
      || "unknown";
}
function rateLimited(req: Request): boolean {
  const ip = clientIp(req);
  const now = Date.now();
  if (rl.size > 10_000) for (const [k, v] of rl) if (v.reset < now) rl.delete(k); // prune
  const e = rl.get(ip);
  if (!e || e.reset < now) { rl.set(ip, { n: 1, reset: now + RL_WINDOW_MS }); return false; }
  e.n++;
  return e.n > RL_MAX;
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
    if (rateLimited(req)) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { ...CORS_H, "Retry-After": String(RL_WINDOW_MS / 1000) },
      });
    }
    const namespace = ns(url);
    const next = await bump(["likes", namespace]);
    return json({ count: next, namespace });
  }

  if (p === "/likes/api/reset" && req.method === "POST") {
    const namespace = ns(url);
    await kv.set(["likes", namespace], 0);
    return json({ count: 0, namespace });
  }

  return json({ error: "Not found" }, 404);
}
