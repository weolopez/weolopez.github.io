# Feature Recipe: PWA Shell

Reusable chrome for any weolopez.com subdomain that should work as a mobile app: manifest, iOS meta tags, bottom-nav tab routing, toast feedback, and Add-to-Home-Screen banner.

---

## manifest.json

```json
{
  "name": "Admin — weolopez.com",
  "short_name": "Admin",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0f1e",
  "theme_color": "#0a0f1e",
  "icons": [
    { "src": "/worldcup/icons/admin-icon-192.svg", "sizes": "192x192", "type": "image/svg+xml" },
    { "src": "/worldcup/icons/admin-icon-512.svg", "sizes": "512x512", "type": "image/svg+xml" }
  ]
}
```

Link it in `<head>`:
```html
<link rel="manifest" href="/admin/manifest.json" />
```

---

## iOS PWA meta tags

These must be in `<head>`. Without them the app looks like a plain web page when added to the home screen.

```html
<meta name="theme-color" content="#0a0f1e" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Admin" />
<link rel="apple-touch-icon" href="/worldcup/icons/admin-icon-192.svg" />
```

`black-translucent` makes the status bar overlay the app instead of pushing it down — pair it with `padding-top: env(safe-area-inset-top)` on your top bar if the status bar would otherwise overlap content.

Safe area insets for iOS notch/home indicator:
```css
:root {
  --safe: env(safe-area-inset-bottom, 0px);
}
/* Apply to bottom nav and any fixed bottom UI */
#nav { padding-bottom: var(--safe); }
```

---

## Design tokens (dark theme)

Consistent across all admin-style pages:

```css
:root {
  --primary:  #0052B4;
  --secondary:#00DF89;   /* accent / active state */
  --bg:       #0a0f1e;   /* page background */
  --surface:  #111827;   /* cards, nav bar */
  --surface2: #1a2235;   /* hover/pressed state */
  --border:   #1f2d45;
  --text:     #e2e8f0;
  --muted:    #64748b;
  --warn:     #f59e0b;
  --critical: #ef4444;
  --ok:       #00DF89;
  --safe:     env(safe-area-inset-bottom, 0px);
}

* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
html, body { height: 100%; overflow: hidden; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--text);
  display: flex;
  flex-direction: column;
}
```

---

## App shell layout

Three layers stacked vertically: top bar → scrollable views → bottom nav.

```html
<div id="app" style="display:none;flex-direction:column;flex:1;overflow:hidden">
  <div id="topbar"><!-- logo, badge, avatar --></div>

  <div id="views" style="flex:1;overflow:hidden;position:relative">
    <div class="view active" id="view-alerts">...</div>
    <div class="view"        id="view-stats">...</div>
    <div class="view"        id="view-settings">...</div>
  </div>

  <nav id="nav">
    <button class="nav-btn active" data-view="alerts">
      <span class="icon">📨</span><span>Alerts</span>
    </button>
    <button class="nav-btn" data-view="stats">
      <span class="icon">📊</span><span>Stats</span>
    </button>
    <button class="nav-btn" data-view="settings">
      <span class="icon">⚙️</span><span>Settings</span>
    </button>
  </nav>
</div>
```

```css
.view {
  position: absolute; inset: 0;
  overflow-y: auto; -webkit-overflow-scrolling: touch;
  padding: 16px 16px calc(16px + var(--safe));
  display: none;
}
.view.active { display: block; }

#nav {
  background: var(--surface);
  border-top: 1px solid var(--border);
  display: flex; flex-shrink: 0;
  padding-bottom: var(--safe);
}
.nav-btn {
  flex: 1; padding: 10px 0 8px;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  cursor: pointer; border: none; background: none;
  color: var(--muted); font-size: 11px; font-weight: 600;
  position: relative;
}
.nav-btn .icon { font-size: 22px; }
.nav-btn.active { color: var(--secondary); }
```

Tab navigation:
```js
document.getElementById('nav').addEventListener('click', e => {
    const btn = e.target.closest('.nav-btn');
    if (!btn) return;
    const view = btn.dataset.view;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`view-${view}`).classList.add('active');
    // Reload data for the newly visible tab if needed
    if (view === 'stats')  loadStats();
    if (view === 'alerts') loadAlerts();
});
```

---

## Toast feedback

Lightweight non-blocking feedback for actions (mark read, delete, etc.).

```html
<div id="toast"></div>
```

```css
#toast {
  position: fixed;
  bottom: calc(72px + var(--safe));
  left: 50%; transform: translateX(-50%) translateY(20px);
  background: var(--surface); border: 1px solid var(--border);
  color: var(--text);
  padding: 10px 18px; border-radius: 20px;
  font-size: 13px; font-weight: 600;
  opacity: 0; transition: opacity 0.25s, transform 0.25s;
  pointer-events: none; white-space: nowrap; z-index: 999;
}
#toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
```

```js
function toast(msg, dur = 2500) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), dur);
}
```

---

## Add to Home Screen (A2HS) banner

Shows install instructions automatically. Handles two cases:
- **Android Chrome** — intercept `beforeinstallprompt` and show a native Install button.
- **iOS Safari** — show a manual "tap Share then Add to Home Screen" instruction.

```html
<div id="a2hs">
  <div class="a2hs-icon">🛡️</div>
  <div class="a2hs-body">
    <strong id="a2hs-title">Add to Home Screen</strong>
    <p id="a2hs-desc">
      Tap <span class="a2hs-share"><!-- share SVG --></span>
      then <em>"Add to Home Screen"</em>
    </p>
  </div>
  <button class="a2hs-install" id="a2hs-install" style="display:none">Install</button>
  <button class="a2hs-close"   id="a2hs-close">✕</button>
</div>
```

```css
#a2hs {
  position: fixed;
  bottom: calc(-140px - var(--safe));
  left: 50%; transform: translateX(-50%);
  width: calc(100% - 32px); max-width: 420px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 18px; padding: 14px 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  display: flex; align-items: center; gap: 12px;
  transition: bottom 0.4s cubic-bezier(0.34,1.56,0.64,1);
  z-index: 100;
}
#a2hs.show { bottom: calc(24px + var(--safe)); }
.a2hs-install {
  padding: 8px 16px; background: var(--secondary); color: #000;
  border: none; border-radius: 8px; font-size: 13px; font-weight: 700;
}
```

```js
let _deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _deferredPrompt = e; // save for Install button
});

function initA2HS() {
    const banner      = document.getElementById('a2hs');
    const closeBtn    = document.getElementById('a2hs-close');
    const installBtn  = document.getElementById('a2hs-install');
    const dismissed   = localStorage.getItem('a2hs-dismissed-v1');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

    if (dismissed || isStandalone) return;

    if (_deferredPrompt) {
        // Android — show Install button
        document.getElementById('a2hs-title').textContent = 'Install Admin App';
        document.getElementById('a2hs-desc').textContent  = 'Install for quick access and push notifications.';
        installBtn.style.display = 'block';
        installBtn.addEventListener('click', async () => {
            _deferredPrompt.prompt();
            const { outcome } = await _deferredPrompt.userChoice;
            _deferredPrompt = null;
            banner.classList.remove('show');
            if (outcome === 'accepted') toast('App installed!');
        });
        setTimeout(() => banner.classList.add('show'), 2500);
    } else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
        // iOS — show manual instructions
        setTimeout(() => banner.classList.add('show'), 2500);
    }

    closeBtn.addEventListener('click', () => {
        banner.classList.remove('show');
        localStorage.setItem('a2hs-dismissed-v1', '1');
    });
}
```

**Show A2HS on iOS before login** so the user knows to install before trying to enable push:
```js
if (/iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !window.matchMedia('(display-mode: standalone)').matches &&
    navigator.standalone !== true) {
    initA2HS();
}
```

---

## Settings row pattern

Reusable grouped list used for toggles, account info, and version labels:

```html
<div class="settings-group">
  <div class="settings-row">
    <div class="settings-icon">🔔</div>
    <div class="settings-label">
      <strong>Push notifications</strong>
      <span id="push-status-label">Not enabled</span>
    </div>
    <button class="toggle" id="push-toggle"></button>
  </div>
</div>
```

```css
.settings-group { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; margin-bottom: 20px; }
.settings-row   { display: flex; align-items: center; padding: 14px 16px; border-bottom: 1px solid var(--border); gap: 12px; }
.settings-row:last-child { border-bottom: none; }
.settings-label strong { display: block; font-size: 14px; font-weight: 600; }
.settings-label span   { font-size: 12px; color: var(--muted); }

/* Toggle switch */
.toggle { width: 44px; height: 26px; background: var(--border); border-radius: 13px; border: none; cursor: pointer; position: relative; transition: background 0.2s; }
.toggle::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: transform 0.2s; }
.toggle.on { background: var(--secondary); }
.toggle.on::after { transform: translateX(18px); }
```

---

## Stat cards

Used on the Stats view to show system metrics with color-coded severity:

```html
<div class="cards">
  <div class="card ok">
    <div class="card-label">Free RAM</div>
    <div class="card-value" id="s-ram">—</div>
    <div class="card-sub">of 4 GB total</div>
  </div>
</div>
```

```css
.cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
.card  { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
.card-label { font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
.card-value { font-size: 22px; font-weight: 800; }
.card-sub   { font-size: 12px; color: var(--muted); margin-top: 3px; }
.card.warn.card-value     { color: var(--warn); }
.card.critical .card-value{ color: var(--critical); }
.card.ok .card-value      { color: var(--ok); }
```

---

## Spinner / loading state

```html
<div class="loading"><div class="spinner"></div></div>
```

```css
@keyframes spin { to { transform: rotate(360deg); } }
.spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--secondary); border-radius: 50%; animation: spin 0.7s linear infinite; }
.loading { text-align: center; padding: 32px; color: var(--muted); }
.empty   { text-align: center; padding: 48px 16px; color: var(--muted); }
.empty .e-icon { font-size: 48px; margin-bottom: 12px; }
.empty p { font-size: 14px; }
```
