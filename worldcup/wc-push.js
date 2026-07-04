// Reusable push opt-in — drop on any page: <script type="module" src="/worldcup/wc-push.js"></script>
//
// Two jobs:
//   1. On load, if the user already granted notifications, silently (re)subscribe so a
//      subscription that expired or was made on another page is restored. No UI.
//   2. Expose a CONTEXTUAL opt-in at peak-intent moments. A page asks for the prompt by
//      dispatching a DOM event after a meaningful action (prediction saved, bracket pick):
//          document.dispatchEvent(new CustomEvent('wc-push-moment', {
//              detail: { reason: 'prediction', title: '…', body: '…' }
//          }));
//      or call window.wcPush.prompt({ reason, title, body }) directly.
//
// iOS Safari only exposes Push inside an installed PWA. When we detect iOS-not-installed we
// show an "Add to Home Screen" hint instead of a permission request that can never succeed.

const API = '/worldcup';

// localStorage keys — shared with the legacy index.html banner so the two never double-prompt.
const K_ALLOWED   = 'wc26-push-allowed';     // user tapped Allow at least once
const K_DISMISSED = 'wc26-push-dismissed';   // legacy hard-dismiss (index banner)
const K_SNOOZE    = 'wc26-push-snooze';       // timestamp of last contextual dismissal
const SNOOZE_MS   = 3 * 24 * 60 * 60 * 1000;  // re-ask at most every 3 days

let swReg = null;
let shownThisSession = false;

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
    window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window;

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function registerSW() {
    if (swReg) return swReg;
    try { swReg = await navigator.serviceWorker.register('/worldcup/sw.js'); } catch (_) {}
    return swReg;
}

// Subscribe with the server's VAPID key and persist the subscription. Assumes permission granted.
async function ensureSubscribed() {
    const reg = await registerSW();
    if (!reg) return false;
    try {
        const r = await fetch(`${API}/api/push/vapid-key`, { credentials: 'include' });
        if (!r.ok) return false;
        const { publicKey } = await r.json();
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
            });
        }
        const res = await fetch(`${API}/api/push/subscribe`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub),
        });
        return res.ok;
    } catch (_) { return false; }
}

// Should we bother showing a contextual prompt right now?
function canPrompt() {
    if (shownThisSession) return false;
    if (localStorage.getItem(K_ALLOWED)) return false;            // already opted in
    if (pushSupported() && Notification.permission === 'granted') return false;
    if (pushSupported() && Notification.permission === 'denied') return false; // browser-blocked
    if (isIOS() && !isStandalone()) return true;                  // show A2HS hint
    if (!pushSupported()) return false;
    const snooze = +localStorage.getItem(K_SNOOZE) || 0;
    if (Date.now() - snooze < SNOOZE_MS) return false;
    return true;
}

// ── Contextual bottom sheet (Shadow DOM, navy/gold theme) ────────────────────
function buildSheet({ title, body, iosHint }) {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const primaryLabel = iosHint ? 'Got it' : '🔔 Yes, notify me';
    shadow.innerHTML = `
    <style>
        :host { all: initial; }
        #ov { position: fixed; inset: 0; z-index: 10000; display: flex;
              align-items: flex-end; justify-content: center;
              background: rgba(0,0,0,0.55); animation: f 0.2s ease;
              font-family: 'Segoe UI', system-ui, sans-serif; }
        @keyframes f { from { opacity: 0; } }
        #box { background: linear-gradient(135deg,#0a1f44 0%,#1a3a6b 100%); color: #fff;
               width: 100%; max-width: 460px; border-radius: 20px 20px 0 0;
               padding: 26px 24px calc(24px + env(safe-area-inset-bottom)); text-align: center;
               box-shadow: 0 -10px 50px rgba(0,0,0,0.5); border-top: 2px solid rgba(191,162,96,0.5);
               animation: s 0.32s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes s { from { transform: translateY(100%); } }
        .ic { font-size: 2.3rem; margin-bottom: 8px; }
        h3 { margin: 0 0 8px; font-size: 1.18rem; font-weight: 900; }
        p { margin: 0 0 20px; font-size: 0.9rem; line-height: 1.55; color: rgba(255,255,255,0.82); }
        .row { display: flex; flex-direction: column; gap: 10px; }
        #yes { background: #BFA260; color: #0a1f44; border: none; border-radius: 12px;
               padding: 14px; font-size: 0.98rem; font-weight: 800; cursor: pointer; font-family: inherit; }
        #yes:hover { opacity: 0.92; }
        #no { background: transparent; color: rgba(255,255,255,0.55); border: none;
              font-size: 0.85rem; cursor: pointer; padding: 6px; font-family: inherit; }
        .steps { text-align: left; font-size: 0.82rem; line-height: 1.7; color: rgba(255,255,255,0.85);
                 margin: 0 0 20px; padding-left: 4px; }
    </style>
    <div id="ov">
      <div id="box">
        <div class="ic">${iosHint ? '📲' : '🔔'}</div>
        <h3></h3>
        ${iosHint
            ? `<div class="steps">1. Tap the <b>Share</b> icon below<br>2. Choose <b>Add to Home Screen</b><br>3. Open the app from your home screen, then turn on alerts</div>`
            : `<p></p>`}
        <div class="row">
          <button id="yes">${primaryLabel}</button>
          <button id="no">Not now</button>
        </div>
      </div>
    </div>`;
    shadow.querySelector('h3').textContent = title;
    if (!iosHint) shadow.querySelector('p').textContent = body;
    return { host, shadow };
}

async function prompt({ reason = 'generic', title, body } = {}) {
    if (!canPrompt()) return;
    shownThisSession = true;

    const iosHint = isIOS() && !isStandalone();
    title = title || (iosHint ? 'Get live match alerts' : 'Never miss a moment');
    body  = body  || 'Get a buzz the second the match kicks off, when a goal goes in, and at full time.';

    const { host, shadow } = buildSheet({ title, body, iosHint });
    document.body.appendChild(host);

    const close = (snooze) => {
        host.remove();
        if (snooze) localStorage.setItem(K_SNOOZE, String(Date.now()));
    };
    shadow.getElementById('no').addEventListener('click', () => close(true));
    shadow.getElementById('ov').addEventListener('click', (e) => {
        if (e.target.id === 'ov') close(true);
    });
    shadow.getElementById('yes').addEventListener('click', async () => {
        if (iosHint) { close(true); return; }   // hint only — nothing to request in-browser
        const btn = shadow.getElementById('yes');
        btn.disabled = true; btn.textContent = 'Enabling…';
        let perm = 'denied';
        try { perm = await Notification.requestPermission(); } catch (_) {}
        if (perm === 'granted') {
            localStorage.setItem(K_ALLOWED, '1');
            await ensureSubscribed();
        } else {
            localStorage.setItem(K_SNOOZE, String(Date.now()));
        }
        close(false);
    });
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
async function init() {
    if (!pushSupported()) return;
    await registerSW();
    // Silent restore: a user who already granted gets (re)subscribed on every page.
    if (Notification.permission === 'granted') {
        localStorage.setItem(K_ALLOWED, '1');
        await ensureSubscribed();
    }
}

window.wcPush = { prompt, ensureSubscribed };
document.addEventListener('wc-push-moment', (e) => prompt(e.detail || {}));

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
