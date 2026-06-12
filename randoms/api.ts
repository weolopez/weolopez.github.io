/// <reference lib="deno.unstable" />

import { getSharedSession, createSharedSession, deleteSharedSession } from "../shared_auth.ts";

const kv = await Deno.openKv("./randoms/randoms.db");
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "671385367166-4118tll0ntluovkdm5agd85arvl1ml9h.apps.googleusercontent.com";
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") || "randoms2026";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface RUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

async function verifyGoogleToken(credential: string): Promise<RUser | null> {
  try {
    const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.aud !== GOOGLE_CLIENT_ID) return null;
    if (data.email_verified !== "true" && data.email_verified !== true) return null;
    return { id: data.sub, email: data.email, name: data.name || data.email, avatar: data.picture || "" };
  } catch { return null; }
}

async function getSessionUser(req: Request): Promise<RUser | null> {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/randoms_session=([^;]+)/);
  if (m) {
    const r = await kv.get<{ userId: string; expires: number }>(["sessions", m[1]]);
    if (r.value && r.value.expires >= Date.now()) {
      const u = await kv.get<RUser>(["users", r.value.userId]);
      if (u.value) return u.value;
    }
  }
  const sso = await getSharedSession(req);
  if (sso) {
    const u = await kv.get<RUser>(["users", sso.id]);
    return u.value ?? sso;
  }
  return null;
}

async function getAdminSession(req: Request): Promise<boolean> {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/randoms_admin=([^;]+)/);
  if (!m) return false;
  const r = await kv.get<{ expires: number }>(["admin_sessions", m[1]]);
  return !!(r.value && r.value.expires >= Date.now());
}

const JSON_H = { "Content-Type": "application/json" };
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Credentials": "true",
};

function json(data: unknown, status = 200, extra?: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_H, ...CORS, ...extra } });
}

export async function handleRandomsApi(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const p = url.pathname;

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  // ── Config ──────────────────────────────────────────────
  if (p === "/randoms/api/config") {
    return json({ googleClientId: GOOGLE_CLIENT_ID });
  }

  // ── Auth ──────────────────────────────────────────────
  if (p === "/randoms/auth/verify" && req.method === "POST") {
    const body = await req.json().catch(() => ({})) as Record<string, string>;
    if (!body.credential) return json({ error: "No credential" }, 400);
    const user = await verifyGoogleToken(body.credential);
    if (!user) return json({ error: "Invalid token" }, 401);
    await kv.set(["users", user.id], user);
    const sid = crypto.randomUUID();
    await kv.set(["sessions", sid], { userId: user.id, expires: Date.now() + SESSION_TTL_MS });
    const sharedSid = await createSharedSession(user);
    const cookieOpts = "Path=/; HttpOnly; SameSite=Lax; Max-Age=604800";
    const domainCookieOpts = "Path=/; HttpOnly; SameSite=Lax; Max-Age=604800; Domain=.weolopez.com";
    return json({ user }, 200, {
      "Set-Cookie": `randoms_session=${sid}; ${cookieOpts}`,
      "X-Set-Cookie-2": `weo_session=${sharedSid}; ${domainCookieOpts}`,
    });
  }

  if (p === "/randoms/auth/logout" && req.method === "POST") {
    const cookie = req.headers.get("cookie") || "";
    const m = cookie.match(/randoms_session=([^;]+)/);
    if (m) await kv.delete(["sessions", m[1]]);
    await deleteSharedSession(req);
    return json({ ok: true }, 200, {
      "Set-Cookie": "randoms_session=; Path=/; Max-Age=0",
    });
  }

  if (p === "/randoms/admin/login" && req.method === "POST") {
    const body = await req.json().catch(() => ({})) as Record<string, string>;
    if (body.password !== ADMIN_PASSWORD) return json({ error: "Wrong password" }, 401);
    const sid = crypto.randomUUID();
    await kv.set(["admin_sessions", sid], { expires: Date.now() + SESSION_TTL_MS });
    return json({ ok: true }, 200, {
      "Set-Cookie": `randoms_admin=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
    });
  }

  if (p === "/randoms/api/me") {
    const user = await getSessionUser(req);
    const isAdmin = await getAdminSession(req);
    if (!user) return json({ user: null, isAdmin });
    return json({ user, isAdmin });
  }

  // ── Games ──────────────────────────────────────────────
  if (p === "/randoms/api/games" && req.method === "GET") {
    const games: unknown[] = [];
    const iter = kv.list({ prefix: ["games"] });
    for await (const r of iter) games.push(r.value);
    games.sort((a: unknown, b: unknown) => {
      const ga = a as { date: string }; const gb = b as { date: string };
      return new Date(ga.date).getTime() - new Date(gb.date).getTime();
    });
    return json(games);
  }

  if (p === "/randoms/api/games" && req.method === "POST") {
    const isAdmin = await getAdminSession(req);
    if (!isAdmin) return json({ error: "Unauthorized" }, 401);
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const id = crypto.randomUUID();
    const game = {
      id,
      date: body.date || new Date().toISOString(),
      field: body.field || "",
      fieldName: body.fieldName || "",
      fieldUrl: body.fieldUrl || "",
      maxPlayers: Number(body.maxPlayers) || 18,
      notes: body.notes || "",
      status: "upcoming",
      createdAt: new Date().toISOString(),
    };
    await kv.set(["games", id], game);
    return json(game, 201);
  }

  const gameEditMatch = p.match(/^\/randoms\/api\/games\/([^/]+)$/);
  if (gameEditMatch && req.method === "PUT") {
    const isAdmin = await getAdminSession(req);
    if (!isAdmin) return json({ error: "Unauthorized" }, 401);
    const id = gameEditMatch[1];
    const existing = await kv.get<Record<string, unknown>>(["games", id]);
    if (!existing.value) return json({ error: "Not found" }, 404);
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const updated = { ...existing.value, ...body, id };
    await kv.set(["games", id], updated);
    return json(updated);
  }

  if (gameEditMatch && req.method === "DELETE") {
    const isAdmin = await getAdminSession(req);
    if (!isAdmin) return json({ error: "Unauthorized" }, 401);
    const id = gameEditMatch[1];
    await kv.delete(["games", id]);
    // also delete all rsvps for this game
    const iter = kv.list({ prefix: ["rsvps", id] });
    for await (const r of iter) await kv.delete(r.key);
    return json({ ok: true });
  }

  // ── RSVPs ──────────────────────────────────────────────
  const rsvpMatch = p.match(/^\/randoms\/api\/games\/([^/]+)\/rsvps$/);
  if (rsvpMatch && req.method === "GET") {
    const gameId = rsvpMatch[1];
    const rsvps: unknown[] = [];
    const iter = kv.list({ prefix: ["rsvps", gameId] });
    for await (const r of iter) rsvps.push(r.value);
    rsvps.sort((a: unknown, b: unknown) => {
      const ra = a as { timestamp: string }; const rb = b as { timestamp: string };
      return new Date(ra.timestamp).getTime() - new Date(rb.timestamp).getTime();
    });
    return json(rsvps);
  }

  const rsvpPostMatch = p.match(/^\/randoms\/api\/games\/([^/]+)\/rsvp$/);
  if (rsvpPostMatch && req.method === "POST") {
    const user = await getSessionUser(req);
    if (!user) return json({ error: "Not signed in" }, 401);
    const gameId = rsvpPostMatch[1];
    const game = await kv.get(["games", gameId]);
    if (!game.value) return json({ error: "Game not found" }, 404);
    const body = await req.json().catch(() => ({})) as Record<string, string>;
    const status = body.status === "out" ? "out" : "in";
    const rsvp = {
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      status,
      timestamp: new Date().toISOString(),
    };
    await kv.set(["rsvps", gameId, user.id], rsvp);
    return json(rsvp);
  }

  return json({ error: "Not found" }, 404);
}
