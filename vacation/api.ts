/// <reference lib="deno.unstable" />

import { getSharedSession, createSharedSession, deleteSharedSession, clearSharedCookieHeader } from "../shared_auth.ts";

const kv = await Deno.openKv("/root/weolopez.github.io/vacation/vacation.db");

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "671385367166-4118tll0ntluovkdm5agd85arvl1ml9h.apps.googleusercontent.com";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const sseClients = new Map<string, (msg: string) => void>();

interface VacUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

async function verifyGoogleToken(credential: string): Promise<VacUser | null> {
  try {
    const resp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.aud !== GOOGLE_CLIENT_ID) return null;
    if (data.email_verified !== "true" && data.email_verified !== true) return null;
    return {
      id: data.sub,
      email: data.email,
      name: data.name || data.email,
      avatar: data.picture || "",
    };
  } catch {
    return null;
  }
}

async function getSessionUser(req: Request): Promise<VacUser | null> {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/vac_session=([^;]+)/);
  if (m) {
    const r = await kv.get<{ userId: string; expires: number }>(["vac_sessions", m[1]]);
    if (r.value && r.value.expires >= Date.now()) {
      const u = await kv.get<VacUser>(["vac_users", r.value.userId]);
      if (u.value) return u.value;
    }
  }
  // SSO fallback: check shared parent-domain session
  const sso = await getSharedSession(req);
  if (sso) {
    const u = await kv.get<VacUser>(["vac_users", sso.id]);
    return u.value ?? sso;
  }
  return null;
}

async function getAllVoteCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const iter = kv.list({ prefix: ["vac_votes"] });
  for await (const r of iter) {
    const key = r.key[1] as string;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

async function getVotersByActivity(): Promise<Record<string, string[]>> {
  const byActivity: Record<string, string[]> = {};
  const iter = kv.list({ prefix: ["vac_votes"] });
  for await (const r of iter) {
    const actKey = r.key[1] as string;
    const userId = r.key[2] as string;
    if (!byActivity[actKey]) byActivity[actKey] = [];
    const user = await kv.get<VacUser>(["vac_users", userId]);
    if (user.value) byActivity[actKey].push(user.value.name);
  }
  return byActivity;
}

function broadcast(payload: Record<string, unknown>) {
  const msg = JSON.stringify(payload);
  for (const send of sseClients.values()) send(msg);
}

const JSON_H = { "Content-Type": "application/json" };

export async function handleVacationApi(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const p = url.pathname;

  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  // ── Auth ──────────────────────────────────────────────

  if (p === "/vacation/auth/verify" && req.method === "POST") {
    const body = await req.json().catch(() => ({})) as Record<string, string>;
    if (!body.credential) {
      return new Response(JSON.stringify({ error: "No credential" }), { status: 400, headers: JSON_H });
    }
    const user = await verifyGoogleToken(body.credential);
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: JSON_H });
    }
    await kv.set(["vac_users", user.id], user);
    const sessionId = crypto.randomUUID();
    await kv.set(["vac_sessions", sessionId], {
      userId: user.id,
      expires: Date.now() + SESSION_TTL_MS,
    });
    const sso = await createSharedSession(user);
    const headers = new Headers(JSON_H);
    headers.append("Set-Cookie", `vac_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`);
    headers.append("Set-Cookie", sso.cookieHeader);
    return new Response(JSON.stringify({ user }), { headers });
  }

  if (p === "/vacation/auth/logout" && req.method === "POST") {
    const cookie = req.headers.get("cookie") || "";
    const m = cookie.match(/vac_session=([^;]+)/);
    if (m) await kv.delete(["vac_sessions", m[1]]);
    await deleteSharedSession(req);
    const headers = new Headers(JSON_H);
    headers.append("Set-Cookie", "vac_session=; Path=/; HttpOnly; Max-Age=0");
    headers.append("Set-Cookie", clearSharedCookieHeader);
    return new Response(JSON.stringify({ ok: true }), { headers });
  }

  // ── Data API ──────────────────────────────────────────

  if (p === "/vacation/api/config") {
    return new Response(JSON.stringify({ googleClientId: GOOGLE_CLIENT_ID }), { headers: JSON_H });
  }

  if (p === "/vacation/api/me") {
    const user = await getSessionUser(req);
    return new Response(JSON.stringify({ user: user ?? null }), { headers: JSON_H });
  }

  if (p === "/vacation/api/votes") {
    const [counts, voters] = await Promise.all([getAllVoteCounts(), getVotersByActivity()]);
    return new Response(JSON.stringify({ counts, voters }), { headers: JSON_H });
  }

  if (p === "/vacation/api/my-votes") {
    const user = await getSessionUser(req);
    if (!user) return new Response(JSON.stringify([]), { headers: JSON_H });
    const mine: string[] = [];
    const iter = kv.list({ prefix: ["vac_votes"] });
    for await (const r of iter) {
      if (r.key[2] === user.id) mine.push(r.key[1] as string);
    }
    return new Response(JSON.stringify(mine), { headers: JSON_H });
  }

  if (p === "/vacation/api/vote" && req.method === "POST") {
    const user = await getSessionUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Login required" }), { status: 401, headers: JSON_H });
    }
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const activityKey = body.activityKey as string | undefined;
    const voted = body.voted as boolean | undefined;
    if (!activityKey) {
      return new Response(JSON.stringify({ error: "activityKey required" }), { status: 400, headers: JSON_H });
    }
    if (voted) {
      await kv.set(["vac_votes", activityKey, user.id], true);
    } else {
      await kv.delete(["vac_votes", activityKey, user.id]);
    }
    const [counts, voters] = await Promise.all([getAllVoteCounts(), getVotersByActivity()]);
    broadcast({ type: "vote_update", counts, voters });
    return new Response(JSON.stringify({ counts, voters }), { headers: JSON_H });
  }

  // ── SSE ───────────────────────────────────────────────

  if (p === "/vacation/api/events") {
    const clientId = crypto.randomUUID();
    const body = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const send = (msg: string) => {
          try { controller.enqueue(enc.encode(`data: ${msg}\n\n`)); } catch { /* closed */ }
        };
        sseClients.set(clientId, send);
        const [counts, voters] = await Promise.all([getAllVoteCounts(), getVotersByActivity()]);
        send(JSON.stringify({ type: "vote_update", counts, voters }));
        const ka = setInterval(() => {
          try { controller.enqueue(enc.encode(": keepalive\n\n")); } catch { clearInterval(ka); }
        }, 15000);
      },
      cancel() {
        sseClients.delete(clientId);
      },
    });
    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }

  return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: JSON_H });
}
