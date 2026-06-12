/// <reference lib="deno.unstable" />

const kv = await Deno.openKv("./tier/tier.db");

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

function getCookie(req: Request, name: string): string | null {
  const m = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : null;
}

// Resolve session via worldcup KV (shared session store)
async function getUser(req: Request) {
  const sid = getCookie(req, "session") || getCookie(req, "weo_session");
  if (!sid) return null;
  const wcKv = await Deno.openKv("./worldcup/worldcup.db");
  const r = await wcKv.get<{ id: string; name: string; email: string; avatar: string }>(["sessions", sid]);
  if (!r.value) { wcKv.close(); return null; }
  const userR = await wcKv.get<{ id: string; name: string; email: string; avatar: string }>(["users", r.value.id]);
  wcKv.close();
  return userR.value ?? r.value;
}

export async function handleTierApi(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/tier/, "");

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  // GET /tier/api/tiers — load saved tier state for current user
  if (path === "/api/tiers" && req.method === "GET") {
    const user = await getUser(req);
    if (!user) return json({ tiers: null, saved: false });
    const r = await kv.get<Record<string, string>>(["tiers", user.id]);
    return json({ tiers: r.value ?? null, saved: !!r.value, user: { id: user.id, name: user.name, avatar: user.avatar } });
  }

  // POST /tier/api/tiers — save tier state
  if (path === "/api/tiers" && req.method === "POST") {
    const user = await getUser(req);
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { tiers } = await req.json();
    if (!tiers || typeof tiers !== "object") return json({ error: "Invalid" }, 400);
    await kv.set(["tiers", user.id], tiers);
    return json({ ok: true, user: { id: user.id, name: user.name, avatar: user.avatar } });
  }

  return json({ error: "Not found" }, 404);
}
