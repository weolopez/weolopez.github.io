# Feature Recipe: Google OAuth Sign-In

Covers the full Google sign-in flow used across weolopez.com sites — both the regular user flow and the admin-only variant.

---

## Why OAuth redirect, not GSI popup

Google's `accounts.google.com` GSI library opens a popup window. iOS Safari in standalone PWA mode (Add to Home Screen) blocks popups entirely, so sign-in silently fails. The fix is a **full-page redirect** using Google's standard OAuth2 implicit flow. The `id_token` comes back in the URL fragment, you parse it on return, then POST it to the server.

The redirect approach works in every context: normal browser, iOS Safari, iOS standalone, Android Chrome.

---

## Prerequisites

1. **Google Cloud Console** — create an OAuth 2.0 Client ID of type _Web application_.
2. Add the site's origin **and** its redirect URI to _Authorized JavaScript origins_ and _Authorized redirect URIs_:
   - Origin: `https://admin.weolopez.com`
   - Redirect URI: `https://admin.weolopez.com/` (trailing slash matters)
3. The server reads no Google API credentials — token verification is done via a public Google endpoint.

---

## KV schema (Deno KV)

```
["users",          userId]   → User          (no TTL — permanent)
["sessions",       uuid]     → User          (TTL: 7 days)
["admin_sessions", uuid]     → { isAdmin: true, email: string | null }  (TTL: 7 days)
```

User shape:
```ts
interface User {
    id: string;        // Google sub (or "email_<b64>" for email-only users)
    email: string;
    name: string;
    avatar: string;    // Google picture URL
    points: number;
    exact: number;
    lastVisit?: number;
}
```

---

## Server — auth utilities (api.ts)

```ts
async function _verifyToken(token: string): Promise<string> {
    const res = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token));
    if (!res.ok) throw new Error("Invalid token");
    const payload = await res.json();
    // payload.sub = Google user ID, payload.email, payload.name, payload.picture
    let user = await _getUser(payload.sub);
    if (!user) {
        user = { id: payload.sub, email: payload.email, name: payload.name, avatar: payload.picture, points: 0, exact: 0 };
        await _createUser(user);
    }
    return _createSession(user);
}

async function _createSession(user: User): Promise<string> {
    const id = crypto.randomUUID();
    user.lastVisit = Date.now();
    await kv.set(["users", user.id], user);
    await kv.set(["sessions", id], user, { expireIn: 60 * 60 * 24 * 7 * 1000 }); // 7 days
    return id;
}

async function _getSession(id: string): Promise<User | null> {
    const r = await kv.get<User>(["sessions", id]);
    if (!r.value) return null;
    // Always return fresh user so points/persona updates are reflected immediately
    const fresh = await _getUser(r.value.id);
    return fresh ?? r.value;
}

async function _createAdminSession(email?: string): Promise<string> {
    const id = crypto.randomUUID();
    await kv.set(["admin_sessions", id], { isAdmin: true, email: email || null }, { expireIn: 60 * 60 * 24 * 7 * 1000 });
    return id;
}

async function _getAdminSession(id: string): Promise<{ isAdmin: boolean; email: string | null } | null> {
    const r = await kv.get<{ isAdmin: boolean; email: string | null }>(["admin_sessions", id]);
    return r.value;
}

function _getCookie(req: Request, name: string): string | null {
    const header = req.headers.get("cookie") || "";
    const match = header.split(";").map(s => s.trim()).find(s => s.startsWith(name + "="));
    return match ? match.slice(name.length + 1) : null;
}
```

---

## Server — regular user login endpoint

Route: `POST /api/login` (or `/world_cup/login`)

```ts
if (path === "/api/login" && req.method === "POST") {
    const { credential } = await req.json();
    if (!credential) return json({ error: "Missing credential" }, 400);
    try {
        const sessionId = await _verifyToken(credential);
        const user = await _getSession(sessionId);
        const headers = new Headers({ "Content-Type": "application/json" });
        headers.append("Set-Cookie", `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
        return new Response(JSON.stringify({ success: true, user }), { headers });
    } catch {
        return json({ error: "Invalid token" }, 401);
    }
}
```

---

## Server — admin login endpoint

Route: `POST /world_cup/admin/login`

- Verifies the `id_token` the same way.
- Checks email against a hardcoded allowlist.
- Sets **two cookies**: a regular `session` cookie (for accessing worldcup APIs) and an `admin_session` cookie (for admin-only routes).

```ts
if (path === "/admin/login" && req.method === "POST") {
    const { credential } = await req.json();
    if (!credential) return json({ error: "Missing credential" }, 400);

    const res = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
    if (!res.ok) return json({ error: "Invalid credential" }, 401);
    const payload = await res.json();
    const email = payload.email?.toLowerCase();

    if (email !== "weolopez@gmail.com") {
        return json({ error: "Access denied." }, 403);
    }

    let user = await _getUser(payload.sub);
    if (!user) {
        user = { id: payload.sub, email: payload.email, name: payload.name, avatar: payload.picture, points: 0, exact: 0 };
        await _createUser(user);
    }

    const sessionId = await _createSession(user);
    const adminSid  = await _createAdminSession(email);

    const headers = new Headers({ "Content-Type": "application/json" });
    headers.append("Set-Cookie", `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
    headers.append("Set-Cookie", `admin_session=${adminSid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
    return new Response(JSON.stringify({ success: true, isOwner: true }), { headers });
}
```

---

## Server — session check endpoint

Route: `GET /world_cup/admin/me`

Called on page load to restore an existing session without requiring a new sign-in.

```ts
if (path === "/admin/me") {
    const sid = _getCookie(req, "admin_session");
    if (!sid) return json({ authenticated: false });
    const s = await _getAdminSession(sid);
    const email = s?.email || null;
    return json({
        authenticated: !!s,
        user: s ? { name: "Admin", email, isOwner: email === "weolopez@gmail.com" } : null,
    });
}
```

---

## Server — protecting admin routes

Every admin-only route checks the `admin_session` cookie before handling the request:

```ts
const sid = _getCookie(req, "admin_session");
if (!sid || !await _getAdminSession(sid)) return json({ error: "Unauthorized" }, 401);
```

---

## Client — full OAuth redirect flow (admin/index.html)

```js
const GOOGLE_CLIENT_ID = '818213215011-...apps.googleusercontent.com';
const REDIRECT_URI     = 'https://admin.weolopez.com/';

// Step 1 — redirect to Google when the sign-in button is clicked
document.getElementById('google-signin-btn').addEventListener('click', () => {
    const nonce = crypto.randomUUID();
    sessionStorage.setItem('admin-oauth-nonce', nonce);
    const params = new URLSearchParams({
        client_id:     GOOGLE_CLIENT_ID,
        redirect_uri:  REDIRECT_URI,
        response_type: 'id_token',
        scope:         'openid email profile',
        nonce,
        prompt:        'select_account',
    });
    location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
});

// Step 2 — on return from Google, parse the id_token from the URL fragment
async function handleOAuthRedirect() {
    if (!location.hash.includes('id_token=')) return false;
    const params     = new URLSearchParams(location.hash.slice(1));
    const credential = params.get('id_token');
    history.replaceState(null, '', location.pathname); // clean the token from the URL
    if (!credential) return false;

    try {
        const r = await fetch('/world_cup/admin/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential }),
        });
        if (r.ok) {
            const d = await r.json();
            _user = d.user || {};
            showApp();
            return true;
        } else if (r.status === 403) {
            showLoginError('Access denied — admin only.');
        } else {
            showLoginError('Sign-in failed. Try again.');
        }
    } catch {
        showLoginError('Network error. Try again.');
    }
    return false;
}

// Step 3 — on every page load, try to restore an existing session before showing login
async function checkSession() {
    try {
        const r = await fetch('/world_cup/admin/me', { credentials: 'include' });
        const d = await r.json();
        if (d.authenticated) {
            _user = d.user || {};
            showApp();
        }
    } catch {}
}

// Entry point — order matters: redirect check first, then session check
(async () => {
    const loggedIn = await handleOAuthRedirect();
    if (!loggedIn) await checkSession();
})();

// Logout — clear cookies client-side and reload to show login screen
document.getElementById('logout-btn').addEventListener('click', () => {
    document.cookie = 'admin_session=; Path=/; Max-Age=0';
    document.cookie = 'session=; Path=/; Max-Age=0';
    location.reload();
});
```

---

## Cookie settings reference

| Cookie | Path | HttpOnly | SameSite | Max-Age |
|---|---|---|---|---|
| `session` | `/` | yes | Lax | 604800 (7 days) |
| `admin_session` | `/` | yes | Lax | 604800 (7 days) |

`HttpOnly` prevents JS from reading the session ID. `SameSite=Lax` allows the cookie to be sent after a top-level redirect (which is exactly what the OAuth redirect flow does).

---

## Gotchas

- **Do not use GSI popup on iOS standalone.** The popup is blocked by the OS. Always use the redirect flow for PWAs.
- **Clean the fragment immediately** (`history.replaceState`) after reading the `id_token` — the token must not be bookmarked or shared in the URL.
- **Token expiry**: `id_token` from the implicit flow is short-lived (~1 hour). The server validates it at login time and then issues its own long-lived session cookie. The client never re-validates the Google token.
- **Redirect URI must match exactly** in Google Cloud Console — including trailing slash.
- **`prompt: 'select_account'`** forces the account picker even when the user is already signed into Google, preventing silent re-use of a previous session after logout.
