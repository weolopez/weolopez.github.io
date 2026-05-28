/// <reference lib="deno.unstable" />

// Shared SSO session store for *.weolopez.com subdomains.
// Sets a `weo_session` cookie on Domain=.weolopez.com so any subdomain
// can read it, enabling silent sign-in without asking users to log in again.

const kv = await Deno.openKv("/root/weolopez.github.io/shared.db");
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SsoUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

export async function getSharedSession(req: Request): Promise<SsoUser | null> {
  const m = (req.headers.get("cookie") || "").match(/weo_session=([^;]+)/);
  if (!m) return null;
  const r = await kv.get<{ user: SsoUser; expires: number }>(["s", m[1]]);
  if (!r.value || r.value.expires < Date.now()) return null;
  return r.value.user;
}

export async function createSharedSession(user: SsoUser): Promise<{ sessionId: string; cookieHeader: string }> {
  const sessionId = crypto.randomUUID();
  await kv.set(["s", sessionId], { user, expires: Date.now() + TTL_MS });
  return {
    sessionId,
    cookieHeader: `weo_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Domain=.weolopez.com; Max-Age=${TTL_MS / 1000}`,
  };
}

export async function deleteSharedSession(req: Request): Promise<void> {
  const m = (req.headers.get("cookie") || "").match(/weo_session=([^;]+)/);
  if (m) await kv.delete(["s", m[1]]);
}

export const clearSharedCookieHeader =
  "weo_session=; Path=/; HttpOnly; SameSite=Lax; Domain=.weolopez.com; Max-Age=0";
