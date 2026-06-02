# Feature Recipe: Alerts Inbox

A server-monitored alerts system: a background cron job checks system thresholds, writes structured alerts to Deno KV, sends push notifications, and exposes a REST API consumed by a mobile-style PWA inbox.

---

## KV schema (admin.db — separate from the worldcup KV)

```
["admin_alerts",   timestamp_ms]  → Alert           (no TTL — permanent until deleted)
["admin_cooldown", alert_type]    → timestamp_ms     (no TTL — reset on each alert fire)
```

Using `Date.now()` as the key suffix gives free chronological ordering — listing with `{ prefix: ["admin_alerts"] }` and then sorting descending by key gives newest-first without an index.

### Alert shape

```ts
interface Alert {
    id:        string;                          // crypto.randomUUID()
    type:      "high_load" | "low_memory";      // maps to cooldown key
    title:     string;
    body:      string;
    severity:  "warn" | "critical";
    createdAt: string;                          // ISO 8601
    read:      boolean;
}
```

---

## REST API (admin/api.ts)

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/api/alerts` | All alerts, newest first |
| `POST` | `/admin/api/alerts/read-all` | Mark every alert `read: true` |
| `POST` | `/admin/api/alerts/:key/read` | Mark one alert read (`key` = timestamp_ms) |
| `DELETE` | `/admin/api/alerts/:key` | Delete one alert |
| `GET` | `/admin/api/stats` | Live system stats (load, RAM, uptime, user count) |
| `GET` | `/admin/api/unread-count` | `{ count: number }` — lightweight poll |

### Implementation skeleton

```ts
export async function handleAdminApiRequest(req: Request): Promise<Response | null> {
    const url  = new URL(req.url);
    const path = url.pathname;

    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    if (req.method === "GET" && path === "/admin/api/alerts") {
        const alerts: unknown[] = [];
        for await (const entry of db.list({ prefix: ["admin_alerts"] })) {
            alerts.push({ _key: entry.key[1], ...entry.value as object });
        }
        alerts.sort((a: any, b: any) => b._key - a._key);
        return json(alerts);
    }

    if (req.method === "POST" && path === "/admin/api/alerts/read-all") {
        const ops: Promise<unknown>[] = [];
        for await (const entry of db.list({ prefix: ["admin_alerts"] })) {
            const val = entry.value as Record<string, unknown>;
            ops.push(db.set(entry.key, { ...val, read: true }));
        }
        await Promise.all(ops);
        return json({ ok: true });
    }

    const readMatch = path.match(/^\/admin\/api\/alerts\/(\d+)\/read$/);
    if (req.method === "POST" && readMatch) {
        const key   = parseInt(readMatch[1]);
        const entry = await db.get<Record<string, unknown>>(["admin_alerts", key]);
        if (!entry.value) return json({ error: "Not found" }, 404);
        await db.set(["admin_alerts", key], { ...entry.value, read: true });
        return json({ ok: true });
    }

    const delMatch = path.match(/^\/admin\/api\/alerts\/(\d+)$/);
    if (req.method === "DELETE" && delMatch) {
        await db.delete(["admin_alerts", parseInt(delMatch[1])]);
        return json({ ok: true });
    }

    return null; // not handled — caller should try next handler
}
```

---

## Monitor cron (admin/monitor.ts)

Run via system cron every 5 minutes:
```
*/5 * * * * deno run --allow-all /path/to/monitor.ts >> /var/log/monitor.log 2>&1
```

### Cooldown pattern

Each alert type has a cooldown (default 30 min) stored in KV. The monitor skips sending if the cooldown hasn't elapsed, preventing notification spam during extended incidents.

```ts
const COOLDOWN_MS = 30 * 60 * 1000;

async function maybeAlert(
    kv: Deno.Kv,
    type: Alert["type"],
    title: string,
    body: string,
    severity: Alert["severity"],
): Promise<void> {
    const cooldownKey = ["admin_cooldown", type];
    const last = (await kv.get<number>(cooldownKey)).value ?? 0;
    const now  = Date.now();

    if (now - last < COOLDOWN_MS) {
        console.log(`[monitor] Skipping ${type} — cooldown (${Math.round((COOLDOWN_MS - (now - last)) / 60000)} min left)`);
        return;
    }

    const alert: Alert = {
        id: crypto.randomUUID(),
        type, title, body, severity,
        createdAt: new Date().toISOString(),
        read: false,
    };

    // Write KV alert and cooldown together, then push
    await kv.set(["admin_alerts", now], alert);
    await kv.set(cooldownKey, now);

    await sendPush(`${severity === "critical" ? "🔴" : "🟡"} ${title}`, body);
}
```

### Threshold checks

```ts
async function main() {
    const kv       = await Deno.openKv(KV_PATH);
    const loadAvg  = await getLoadAvg();   // parseFloat(/proc/loadavg split[0])
    const freeRamMb = getFreeRamMb();      // Deno.systemMemoryInfo().available / 1024 / 1024

    if (loadAvg > 2.5) {
        await maybeAlert(kv, "high_load", "Critical CPU load",
            `Load average is ${loadAvg.toFixed(2)} (threshold: 2.5) on 2-core VPS.`, "critical");
    } else if (loadAvg > 1.8) {
        await maybeAlert(kv, "high_load", "High CPU load",
            `Load average is ${loadAvg.toFixed(2)} (threshold: 1.8) on 2-core VPS.`, "warn");
    }

    if (freeRamMb < 150) {
        await maybeAlert(kv, "low_memory", "Critical low memory",
            `Only ${freeRamMb} MB free of ${totalRamMb} MB total. Risk of OOM.`, "critical");
    } else if (freeRamMb < 300) {
        await maybeAlert(kv, "low_memory", "Low memory",
            `Only ${freeRamMb} MB free of ${totalRamMb} MB total.`, "warn");
    }

    kv.close();
}
```

---

## Frontend — alerts inbox (index.html)

### State

```js
let _alerts = []; // local copy — mutated optimistically, re-fetched on visibility
```

### Load and render

```js
async function loadAlerts() {
    try {
        const r = await fetch('/admin/api/alerts');
        _alerts = await r.json();
        renderAlerts();
    } catch {
        document.getElementById('alerts-list').innerHTML =
            '<div class="empty"><div class="e-icon">⚠️</div><p>Failed to load alerts</p></div>';
    }
}

function renderAlerts() {
    const unread = _alerts.filter(a => !a.read).length;

    // Unread badge in top bar
    const badge = document.getElementById('unread-badge');
    badge.textContent = unread;
    badge.classList.toggle('show', unread > 0);

    // Red dot on nav button
    document.getElementById('alerts-dot').classList.toggle('show', unread > 0);

    document.getElementById('alerts-count').textContent =
        unread > 0 ? `${unread} unread` : `${_alerts.length} alert${_alerts.length !== 1 ? 's' : ''}`;

    const list = document.getElementById('alerts-list');
    if (!_alerts.length) {
        list.innerHTML = `<div class="empty"><div class="e-icon">✅</div><p>No alerts — everything looks fine.</p></div>`;
        return;
    }

    list.innerHTML = _alerts.map(a => {
        const icon   = a.severity === 'critical' ? '🔴' : '🟡';
        const cls    = a.read ? 'read' : `unread ${a.severity === 'critical' ? 'critical' : ''}`;
        const sevCls = a.severity === 'critical' ? 'sev-critical' : 'sev-warn';
        return `<div class="alert-item ${cls}" data-key="${a._key}">
          <div class="alert-icon">${icon}</div>
          <div class="alert-body">
            <div class="alert-title">${a.title}</div>
            <div class="alert-msg">${a.body}</div>
            <div class="alert-meta">
              <span class="sev-badge ${sevCls}">${a.severity}</span>
              <span>${timeAgo(a.createdAt)}</span>
            </div>
            <div class="alert-actions">
              ${!a.read ? `<button class="btn-sm mark-read-btn" data-key="${a._key}">Mark read</button>` : ''}
              <button class="btn-sm danger dismiss-btn" data-key="${a._key}">Delete</button>
            </div>
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('.mark-read-btn').forEach(btn =>
        btn.addEventListener('click', () => markRead(parseInt(btn.dataset.key))));
    list.querySelectorAll('.dismiss-btn').forEach(btn =>
        btn.addEventListener('click', () => dismissAlert(parseInt(btn.dataset.key))));
}
```

### Per-item actions (optimistic update)

```js
async function markRead(key) {
    await fetch(`/admin/api/alerts/${key}/read`, { method: 'POST' });
    const a = _alerts.find(x => x._key === key);
    if (a) a.read = true;
    renderAlerts();
}

async function dismissAlert(key) {
    await fetch(`/admin/api/alerts/${key}`, { method: 'DELETE' });
    _alerts = _alerts.filter(x => x._key !== key);
    renderAlerts();
    toast('Alert dismissed');
}
```

### Bulk actions

```js
// Mark all read
document.getElementById('mark-all-btn').addEventListener('click', async () => {
    await fetch('/admin/api/alerts/read-all', { method: 'POST' });
    _alerts.forEach(a => a.read = true);
    renderAlerts();
    toast('All marked as read');
});

// Delete all read
document.getElementById('delete-read-btn').addEventListener('click', async () => {
    const readAlerts = _alerts.filter(a => a.read);
    await Promise.all(readAlerts.map(a => fetch(`/admin/api/alerts/${a._key}`, { method: 'DELETE' })));
    _alerts = _alerts.filter(a => !a.read);
    renderAlerts();
    toast(`Deleted ${readAlerts.length} read alert${readAlerts.length !== 1 ? 's' : ''}`);
});
```

### Auto-refresh on foreground

After the user taps a push notification and the app reopens, reload the alerts list:

```js
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isLoggedIn()) {
        loadAlerts();
    }
});
```

### Time formatter

```js
function timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000)    return 'just now';
    if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
```

---

## CSS — alert item styles

```css
.alert-item {
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 4px solid var(--border);
    border-radius: 12px;
    padding: 14px;
    margin-bottom: 10px;
    display: flex;
    gap: 12px;
    align-items: flex-start;
    transition: opacity 0.2s;
}
.alert-item.unread           { border-left-color: var(--warn); }
.alert-item.unread.critical  { border-left-color: var(--critical); }
.alert-item.read             { opacity: 0.5; }

.sev-badge   { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; }
.sev-warn    { background: rgba(245,158,11,0.15); color: var(--warn); }
.sev-critical{ background: rgba(239,68,68,0.15);  color: var(--critical); }

/* Unread badge on top bar */
#unread-badge {
    background: var(--critical); color: #fff;
    font-size: 11px; font-weight: 700;
    min-width: 18px; height: 18px;
    border-radius: 9px; padding: 0 5px;
    display: none; align-items: center; justify-content: center;
    margin-left: 8px;
}
#unread-badge.show { display: flex; }

/* Red dot on nav button */
.nav-dot {
    position: absolute; top: 8px; right: calc(50% - 18px);
    width: 8px; height: 8px;
    background: var(--critical); border-radius: 50%;
    display: none;
}
.nav-dot.show { display: block; }
```

---

## Extending to new alert types

1. Add the type to `Alert["type"]` union.
2. Add a cooldown key and threshold check in `monitor.ts`.
3. No frontend changes needed — the inbox renders any alert generically.
