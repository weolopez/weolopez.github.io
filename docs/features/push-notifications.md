# Feature Recipe: Web Push Notifications

Covers the full push pipeline: VAPID key setup, service worker, subscription API, server-side send, and client-side subscribe toggle.

The subscription store and send endpoints live in the worldcup server (reused by any site on this VPS). The service worker is per-site.

---

## Prerequisites

- VAPID key pair in the server's environment:
  ```
  VAPID_PUBLIC_KEY=<base64url public key>
  VAPID_PRIVATE_KEY=<base64url private key>
  ```
- Generate once with:
  ```
  deno run -A -r npm:web-push generate-vapid-keys
  ```
  Store the output in the `.env` file and never regenerate — changing VAPID keys invalidates all existing subscriptions.
- The site must be served over HTTPS (push requires it).
- iOS requires the site to be installed to the home screen (standalone mode) before push can be subscribed.

---

## Service worker (sw.js)

Place at the **root** of the subdomain (`/sw.js`) so its natural scope covers all pages. Serving it from a subdirectory requires a `Service-Worker-Allowed: /` response header — avoid this complexity.

```js
const CACHE = 'admin-v4'; // bump version to force SW update

self.addEventListener('install', e => {
    self.skipWaiting();
    // No mandatory cache — don't block activation on a failed fetch
    e.waitUntil(Promise.resolve());
});

self.addEventListener('activate', e => {
    e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    if (e.request.url.includes('/admin/api/')) return; // never cache API calls
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});

// Incoming push — show OS notification
self.addEventListener('push', e => {
    if (!e.data) return;
    const d = e.data.json(); // { title, body, url, tag }
    e.waitUntil(
        self.registration.showNotification(d.title || 'Alert', {
            body:  d.body,
            icon:  '/worldcup/icons/admin-icon-192.svg',
            badge: '/worldcup/icons/admin-icon-192.svg',
            tag:   d.tag || 'admin-alert',  // collapses duplicate notifications
            data:  { url: d.url || '/' },
        })
    );
});

// User tapped the notification — open or focus the app
self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(clients.openWindow(e.notification.data?.url || '/'));
});
```

---

## Subscription API endpoints (worldcup server / api.ts)

These three endpoints are shared across all sites on the VPS.

```
GET  /api/push/vapid-key      → { publicKey: string }
POST /api/push/subscribe      → 200 OK   (body: PushSubscription JSON)
DELETE /api/push/subscribe    → 200 OK
```

### Implementation

```ts
// GET /api/push/vapid-key
if (path === "/api/push/vapid-key" && req.method === "GET") {
    return json({ publicKey: Deno.env.get("VAPID_PUBLIC_KEY") ?? "" });
}

// POST /api/push/subscribe
if (path === "/api/push/subscribe" && req.method === "POST") {
    const sid = _getCookie(req, "session");
    const user = sid ? await _getSession(sid) : null;
    if (!user) return json({ error: "Unauthorized" }, 401);
    const sub = await req.json();
    await kv.set(["push", user.id], sub);
    return json({ ok: true });
}

// DELETE /api/push/subscribe
if (path === "/api/push/subscribe" && req.method === "DELETE") {
    const sid = _getCookie(req, "session");
    const user = sid ? await _getSession(sid) : null;
    if (!user) return json({ error: "Unauthorized" }, 401);
    await kv.delete(["push", user.id]);
    return json({ ok: true });
}
```

KV key: `["push", userId]` → `PushSubscription` object (no TTL — lasts until user unsubscribes or browser expires it).

---

## Server-side send utility

Used by monitor.ts (and any other code that needs to push to a specific user):

```ts
async function sendPush(userId: string, title: string, body: string, url = "/"): Promise<void> {
    const vapidPublic  = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!vapidPublic || !vapidPrivate) {
        console.log("[push] No VAPID keys — skipping");
        return;
    }

    const sub = (await kv.get<PushSubscription>(["push", userId])).value;
    if (!sub) {
        console.log(`[push] No subscription for user ${userId}`);
        return;
    }

    const { sendNotification, setVapidDetails } = await import("npm:web-push");
    setVapidDetails("mailto:lopezweolopezweo@gmail.com", vapidPublic, vapidPrivate);
    await sendNotification(sub, JSON.stringify({ title, body, url }), {
        urgency: "high",
        TTL: 86400, // keep in push service queue for up to 24 hours if device is offline
    });
}
```

To broadcast to all subscribers:
```ts
async function _sendPushToAll(title: string, body: string, url: string) {
    const iter = kv.list<PushSubscription>({ prefix: ["push"] });
    for await (const { key } of iter) {
        const userId = String(key[1]);
        _sendPush(userId, title, body, url).catch(() => {}); // fire-and-forget per user
    }
}
```

To send to all users who participated in a specific context (e.g. a chat room), track subscription with a secondary KV key and iterate it:
```ts
// Record participation when user sends a message
await kv.set(["chat_sub", matchId, user.id], true);

// Notify all participants except the sender
async function _sendChatPushNotifications(matchId: number, sender: User, text: string) {
    const iter = kv.list({ prefix: ["chat_sub", matchId] });
    for await (const { key } of iter) {
        const uid = String(key[2]);
        if (uid === sender.id) continue;
        const preview = text.length > 60 ? text.slice(0, 57) + "…" : text;
        _sendPush(uid, `💬 ${sender.name}`, preview, `/worldcup/match.html?id=${matchId}`).catch(() => {});
    }
}
```

To send to a specific admin user (look up by email):
```ts
async function _notifyAdminNewUser(newUser: User): Promise<void> {
    const iter = kv.list<User>({ prefix: ["users"] });
    for await (const { value } of iter) {
        if (value.email === "weolopez@gmail.com") {
            _sendPush(value.id, `👤 New user: ${newUser.name}`, newUser.email ?? "unknown", `https://admin.weolopez.com/`).catch(() => {});
            return;
        }
    }
}
```

Timed reminders with one-fire dedup (e.g. 60 min before kickoff):
```ts
// KV key expires after the event window so it doesn't accumulate
const already = await kv.get(["push_sent_reminder", matchId]);
if (already.value) continue;
await kv.set(["push_sent_reminder", matchId], true, { expireIn: 2 * 60 * 60 * 1000 });
await _sendPushToAll(title, body, url);
```

---

## Client — service worker registration

Register as early as possible (before login) so the SW is active when the subscribe toggle is used:

```js
async function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        console.log('[sw] registered, state:', reg.active?.state ?? 'installing');
    } catch (e) {
        console.error('[sw] registration failed:', e);
    }
}

// Call at page load — do not wait for login
registerSW();
```

---

## Client — push toggle (Settings UI)

```js
function initPush() {
    const toggle = document.getElementById('push-toggle');
    const label  = document.getElementById('push-status-label');

    const isIOS        = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

    // iOS requires standalone mode — push is not available in Safari browser tab
    if (isIOS && !isStandalone) {
        label.textContent = 'Install app to home screen first';
        toggle.disabled = true;
        return;
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        label.textContent = 'Not supported on this browser';
        toggle.disabled = true;
        return;
    }

    // Restore persisted toggle state immediately (no SW wait needed)
    const persisted = !!localStorage.getItem('push-enabled');
    toggle.classList.toggle('on', persisted);
    label.textContent = persisted ? 'Enabled — you will receive alerts' : 'Tap to enable';

    toggle.addEventListener('click', async () => {
        const turningOn = !toggle.classList.contains('on');
        toggle.classList.toggle('on', turningOn);
        toggle.disabled = true;

        try {
            if (!turningOn) {
                // Unsubscribe — no SW needed for this direction
                try {
                    const swReg = await navigator.serviceWorker.getRegistration('/sw.js');
                    const sub   = await swReg?.pushManager?.getSubscription();
                    if (sub) await sub.unsubscribe();
                } catch {}
                await fetch('/world_cup/api/push/subscribe', { method: 'DELETE', credentials: 'include' });
                localStorage.removeItem('push-enabled');
                label.textContent = 'Tap to enable';
            } else {
                // Subscribe — SW must be ready first
                label.textContent = 'Setting up…';
                const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('SW timeout')), 10000));
                const reg = await Promise.race([navigator.serviceWorker.ready, timeout]);

                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    toggle.classList.remove('on');
                    label.textContent = 'Permission denied';
                    return;
                }

                const keyRes   = await fetch('/world_cup/api/push/vapid-key');
                const { publicKey } = await keyRes.json();

                const sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey),
                });
                await fetch('/world_cup/api/push/subscribe', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sub),
                });
                localStorage.setItem('push-enabled', '1');
                label.textContent = 'Enabled — you will receive alerts';
            }
        } catch (e) {
            toggle.classList.toggle('on', !turningOn); // revert on failure
            label.textContent = 'Failed — try again';
            console.error('[push]', e);
        } finally {
            toggle.disabled = false;
        }
    });
}

// Required VAPID key decoder
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw     = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
```

---

## Push message payload shape

```json
{
  "title": "🔴 Critical CPU load",
  "body":  "Load average is 3.1 (threshold: 2.5) on 2-core VPS.",
  "url":   "https://admin.weolopez.com/",
  "tag":   "admin-alert"
}
```

`tag` collapses duplicate notifications in the OS — if the device is offline and two pushes arrive with the same tag, only the latest is shown when the device reconnects.

---

## Multi-domain considerations

A site accessible on two domains (e.g. `worldcup.weolopez.com` and `predict.atlantasoccer.news` pointing at the same server) has these properties:

- **VAPID keys** — same key pair works for both origins. No change needed.
- **Server-side send** — the subscription endpoint URL belongs to the browser, not your domain. Push delivery works regardless of which domain the user subscribed on.
- **Service worker** — each origin registers a separate SW instance even if they serve identical `sw.js` content. A user on `predict.atlantasoccer.news` must register a SW under that origin to receive pushes.
- **Subscription** — scoped to whichever origin called `pushManager.subscribe`. The current `["push", userId]` KV key stores one subscription per user. If a user subscribes on domain A then re-subscribes on domain B, domain B overwrites domain A. This is usually fine if both domains serve the same content — pushes land on the last-used domain's SW.

If you need to support both domains simultaneously (e.g. user has both installed as PWAs), key subscriptions by origin:

```ts
// Store
await kv.set(["push", userId, origin], sub); // origin = "worldcup.weolopez.com"

// Send to all subscriptions for a user across all domains
const iter = kv.list({ prefix: ["push", userId] });
for await (const { value: sub } of iter) {
    // send to each
}
```

For the current weolopez.com setup both domains serve identical content so the single `["push", userId]` key is sufficient.

## Gotchas

- **iOS push requires standalone mode.** If the toggle is shown in a regular Safari tab on iPhone, subscribing will silently fail or return a `NotAllowedError`. Guard with `isIOS && !isStandalone`.
- **Unsubscribe does not need SW ready.** `getRegistration` is non-blocking; only the subscribe direction needs `serviceWorker.ready`.
- **Do not regenerate VAPID keys.** All existing `["push", userId]` subscriptions become invalid and users must re-subscribe.
- **TTL = 86400.** If the device is offline, the push service holds the message for 24 hours. Set lower for time-sensitive alerts.
- **`urgency: "high"`** wakes up the device radio immediately rather than waiting for a batch delivery window.
