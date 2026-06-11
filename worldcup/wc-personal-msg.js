// Personal one-time message from the admin — shown once on next visit.
// Include on any page: <script type="module" src="/worldcup/wc-personal-msg.js"></script>
// Fetches /worldcup/api/message (session cookie); if an unseen message exists,
// shows a modal and marks it seen when dismissed.

const API = '/worldcup';

async function init() {
    let msg;
    try {
        const r = await fetch(`${API}/api/message`, { credentials: 'include' });
        if (!r.ok) return;
        msg = await r.json();
    } catch (_) { return; }
    if (!msg || !msg.title) return;

    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
    <style>
        :host { all: initial; }
        #overlay {
            position: fixed; inset: 0; z-index: 9999;
            background: rgba(0,0,0,0.6);
            display: flex; align-items: center; justify-content: center;
            font-family: 'Segoe UI', system-ui, sans-serif;
            animation: fadein 0.25s ease;
        }
        @keyframes fadein { from { opacity: 0; } }
        #box {
            background: linear-gradient(135deg, #0a1f44 0%, #1a3a6b 100%);
            color: white; border-radius: 18px; padding: 30px 26px 24px;
            width: calc(100% - 48px); max-width: 400px; text-align: center;
            box-shadow: 0 24px 80px rgba(0,0,0,0.45);
            border: 1px solid rgba(191,162,96,0.4);
            animation: pop 0.35s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes pop { from { transform: scale(0.85); opacity: 0; } }
        .icon { font-size: 2.4rem; margin-bottom: 10px; }
        .from { font-size: 0.62rem; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; color: #BFA260; margin-bottom: 10px; }
        h2 { margin: 0 0 10px; font-size: 1.25rem; font-weight: 900; }
        p { margin: 0 0 22px; font-size: 0.92rem; line-height: 1.6; color: rgba(255,255,255,0.85); white-space: pre-wrap; }
        button {
            background: #BFA260; color: #0a1f44; border: none; border-radius: 10px;
            padding: 12px 34px; font-size: 0.95rem; font-weight: 800; cursor: pointer;
            font-family: inherit;
        }
        button:hover { opacity: 0.9; }
    </style>
    <div id="overlay">
        <div id="box">
            <div class="icon">💌</div>
            <div class="from">A message for you</div>
            <h2></h2>
            <p></p>
            <button id="ok">Got it 👍</button>
        </div>
    </div>`;
    shadow.querySelector('h2').textContent = msg.title;
    shadow.querySelector('p').textContent = msg.body;

    const dismiss = async () => {
        host.remove();
        try {
            await fetch(`${API}/api/message/seen`, { method: 'POST', credentials: 'include' });
        } catch (_) {}
    };
    shadow.getElementById('ok').addEventListener('click', dismiss);

    document.body.appendChild(host);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
