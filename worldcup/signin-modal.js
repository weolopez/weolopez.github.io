// Shared sign-in modal for worldcup pages.
// Injects the modal HTML + CSS on import, dispatches 'wc:signin' event on success.

const API = '/world_cup';

const SIGNIN_CSS = `
#wc-signin-modal {
    display: none; position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,0.55); align-items: center; justify-content: center;
}
#wc-signin-modal.open { display: flex; }
#wc-signin-box {
    background: white; border-radius: 14px; padding: 32px 28px; width: 340px;
    max-width: calc(100vw - 32px); box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative;
}
#wc-signin-box h2 { font-size: 1.2rem; font-weight: 800; color: #0a1f44; margin-bottom: 4px; }
#wc-signin-box > p { font-size: 0.82rem; color: #6B7280; margin-bottom: 20px; }
.wc-signin-input {
    width: 100%; padding: 10px 12px; border: 1.5px solid #E5E7EB;
    border-radius: 8px; font-size: 0.9rem; margin-bottom: 10px; outline: none;
    box-sizing: border-box; font-family: inherit; color: #111827;
}
.wc-signin-input:focus { border-color: #0a1f44; }
#wc-signin-submit {
    width: 100%; padding: 11px; background: #0a1f44; color: white;
    border: none; border-radius: 8px; font-weight: 700; font-size: 0.95rem;
    cursor: pointer; margin-top: 4px; font-family: inherit;
}
#wc-signin-submit:hover { background: #1a3a6b; }
#wc-signin-close {
    position: absolute; top: 12px; right: 16px; background: none; border: none;
    font-size: 1.4rem; cursor: pointer; color: #6B7280; line-height: 1;
}
#wc-signin-error { font-size: 0.8rem; color: #ef4444; margin-top: 6px; display: none; }
#wc-signin-google-area { margin-bottom: 16px; }
.wc-signin-divider {
    display: flex; align-items: center; gap: 10px; margin: 14px 0;
    font-size: 0.78rem; color: #6B7280;
}
.wc-signin-divider::before, .wc-signin-divider::after {
    content: ''; flex: 1; height: 1px; background: #E5E7EB;
}
`;

function injectModal() {
    if (document.getElementById('wc-signin-modal')) return;

    const style = document.createElement('style');
    style.textContent = SIGNIN_CSS;
    document.head.appendChild(style);

    const div = document.createElement('div');
    div.id = 'wc-signin-modal';
    div.setAttribute('role', 'dialog');
    div.setAttribute('aria-modal', 'true');
    div.innerHTML = `
        <div id="wc-signin-box">
            <button id="wc-signin-close" aria-label="Close">×</button>
            <h2>⚽ Join the Predictor</h2>
            <p>Sign in to save your predictions and compete on the leaderboard.</p>
            <div id="wc-signin-google-area"></div>
            <input class="wc-signin-input" id="wc-signin-name" type="text" placeholder="Your name" autocomplete="name">
            <input class="wc-signin-input" id="wc-signin-email" type="email" placeholder="Email address" autocomplete="email" inputmode="email">
            <button id="wc-signin-submit">Sign In / Create Account</button>
            <div id="wc-signin-error"></div>
        </div>`;
    document.body.appendChild(div);

    div.addEventListener('click', e => { if (e.target === div) closeSignInModal(); });
    document.getElementById('wc-signin-close').addEventListener('click', closeSignInModal);
    document.getElementById('wc-signin-submit').addEventListener('click', handleSubmit);
    document.getElementById('wc-signin-email').addEventListener('keydown', e => {
        if (e.key === 'Enter') handleSubmit();
    });

    initGoogleSignIn();
}

async function handleSubmit() {
    const name = document.getElementById('wc-signin-name').value.trim();
    const email = document.getElementById('wc-signin-email').value.trim();
    const errEl = document.getElementById('wc-signin-error');
    errEl.style.display = 'none';
    if (!email || !email.includes('@')) {
        errEl.textContent = 'Enter a valid email address.';
        errEl.style.display = 'block';
        return;
    }
    const btn = document.getElementById('wc-signin-submit');
    btn.disabled = true; btn.textContent = 'Signing in…';
    try {
        const res = await fetch(`${API}/auth/email-login`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name: name || email.split('@')[0] }),
        });
        if (res.ok) {
            const { user } = await res.json();
            closeSignInModal();
            document.dispatchEvent(new CustomEvent('wc:signin', { detail: user }));
        } else {
            const { error } = await res.json().catch(() => ({ error: 'Login failed' }));
            errEl.textContent = error || 'Login failed';
            errEl.style.display = 'block';
        }
    } catch (_) {
        errEl.textContent = 'Network error — try again.';
        errEl.style.display = 'block';
    } finally {
        btn.disabled = false; btn.textContent = 'Sign In / Create Account';
    }
}

async function initGoogleSignIn() {
    try {
        const cfg = await fetch(`${API}/api/config`, { credentials: 'include' }).then(r => r.json());
        if (!cfg.googleClientId) return;
        const area = document.getElementById('wc-signin-google-area');
        if (!area) return;
        area.innerHTML = `<div id="wc-g-btn"></div><div class="wc-signin-divider">or sign in with email</div>`;
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true;
        s.onload = () => {
            google.accounts.id.initialize({
                client_id: cfg.googleClientId,
                callback: async ({ credential }) => {
                    try {
                        const r = await fetch(`${API}/auth/verify`, {
                            method: 'POST', credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token: credential }),
                        });
                        if (r.ok) {
                            const meRes = await fetch(`${API}/api/me`, { credentials: 'include' });
                            if (meRes.ok) {
                                const user = await meRes.json();
                                closeSignInModal();
                                document.dispatchEvent(new CustomEvent('wc:signin', { detail: user }));
                            }
                        }
                    } catch (_) {}
                },
            });
            google.accounts.id.renderButton(document.getElementById('wc-g-btn'), {
                theme: 'outline', size: 'large', text: 'signin_with', width: 284,
            });
        };
        document.head.appendChild(s);
    } catch (_) {}
}

injectModal();

export function openSignInModal() {
    document.getElementById('wc-signin-modal')?.classList.add('open');
}

export function closeSignInModal() {
    document.getElementById('wc-signin-modal')?.classList.remove('open');
}
