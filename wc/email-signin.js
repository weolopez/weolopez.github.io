/**
 * <wc-email-signin> — Magic link email sign-in component
 *
 * Attributes:
 *   theme      "light" (default) | "dark"
 *   api-base   API prefix, default "/world_cup"
 *
 * Events dispatched (bubble + composed so they cross shadow DOM):
 *   wc-signed-in   detail: { user }   — successful sign-in (via ?magic= on load)
 *   wc-link-sent   detail: { email }  — link was sent, waiting step shown
 */
class WcEmailSignin extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() { return ['theme', 'prefill-email']; }
  attributeChangedCallback(name, _old, val) {
    if (name === 'theme' && this.shadowRoot.innerHTML) this._applyTheme();
    if (name === 'prefill-email' && val) this.setEmail(val);
  }

  get apiBase() { return this.getAttribute('api-base') || '/world_cup'; }
  get theme()   { return this.getAttribute('theme') || 'light'; }

  connectedCallback() {
    this._render();
    this._wire();
  }

  // ── Public API ────────────────────────────────────────────────────────────
  reset() { this._step(1); }

  setEmail(val) {
    const input = this.shadowRoot.getElementById('email');
    if (input) input.value = val;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: 'Segoe UI', system-ui, sans-serif; }

        :host([theme="dark"]) {
          --input-bg: #151515; --input-border: #333; --text: #fff;
          --muted: #888; --btn-bg: #0052B4; --btn-color: #fff;
          --change-color: #BFA260; --error: #ef4444; --focus: #BFA260;
        }
        :host, :host([theme="light"]) {
          --input-bg: #fff; --input-border: #d1d5db; --text: #111827;
          --muted: #6b7280; --btn-bg: #0052B4; --btn-color: #fff;
          --change-color: #BFA260; --error: #ef4444; --focus: #0052B4;
        }

        input[type="text"], input[type="email"] {
          display: block; width: 100%; box-sizing: border-box;
          padding: 11px 12px; margin-bottom: 10px;
          border: 1.5px solid var(--input-border); border-radius: 8px;
          background: var(--input-bg); color: var(--text);
          font-size: 0.95rem; font-family: inherit; outline: none;
          -webkit-appearance: none; transition: border-color 0.15s;
        }
        input:focus { border-color: var(--focus); }

        button.primary {
          display: block; width: 100%; padding: 12px;
          background: var(--btn-bg); color: var(--btn-color);
          border: none; border-radius: 8px; font-size: 0.95rem;
          font-weight: 700; font-family: inherit; cursor: pointer;
          transition: opacity 0.15s;
        }
        button.primary:disabled { opacity: 0.55; cursor: default; }

        #step-2 { display: none; text-align: center; padding: 8px 0; }

        .sent-icon { font-size: 2.5rem; margin-bottom: 8px; }
        .sent-title { font-size: 1rem; font-weight: 800; color: var(--text); margin: 0 0 6px; }
        .sent-sub { font-size: 0.82rem; color: var(--muted); margin: 0 0 16px; line-height: 1.4; }
        .sent-sub strong { color: var(--text); }

        button.ghost {
          background: none; border: none; cursor: pointer;
          font-family: inherit; font-size: 0.8rem; padding: 0;
          color: var(--change-color); text-decoration: underline;
        }

        #error {
          font-size: 0.78rem; color: var(--error);
          min-height: 16px; margin-top: 8px; text-align: center;
        }
      </style>

      <!-- Step 1: collect email -->
      <div id="step-1">
        <input type="text"  id="name"  placeholder="Your name (optional)" autocomplete="name">
        <input type="email" id="email" placeholder="Email address" autocomplete="email" inputmode="email">
        <button class="primary" id="send-btn">Send Sign-In Link</button>
      </div>

      <!-- Step 2: check email -->
      <div id="step-2">
        <div class="sent-icon">📬</div>
        <p class="sent-title">Check your email</p>
        <p class="sent-sub">We sent a sign-in link to<br><strong id="email-display"></strong><br>Click it to sign in instantly.</p>
        <button class="ghost" id="change-btn">← Use a different email</button>
      </div>

      <div id="error"></div>
    `;
    this._applyTheme();
  }

  _applyTheme() {
    if (this.theme === 'dark') this.setAttribute('theme', 'dark');
  }

  // ── Wire buttons ──────────────────────────────────────────────────────────
  _wire() {
    const sr = this.shadowRoot;
    sr.getElementById('send-btn').addEventListener('click', () => this._sendLink());
    sr.getElementById('email').addEventListener('keydown', e => { if (e.key === 'Enter') this._sendLink(); });
    sr.getElementById('change-btn').addEventListener('click', () => this._step(1));
  }

  // ── UI helpers ────────────────────────────────────────────────────────────
  _step(n) {
    const sr = this.shadowRoot;
    sr.getElementById('step-1').style.display = n === 1 ? '' : 'none';
    sr.getElementById('step-2').style.display = n === 2 ? '' : 'none';
    sr.getElementById('error').textContent = '';
    if (n === 1) sr.getElementById('email').focus();
  }

  _showError(msg) { this.shadowRoot.getElementById('error').textContent = msg; }
  _clearError()   { this.shadowRoot.getElementById('error').textContent = ''; }

  // ── API call ──────────────────────────────────────────────────────────────
  async _sendLink() {
    const sr    = this.shadowRoot;
    const email = sr.getElementById('email').value.trim();
    const name  = sr.getElementById('name').value.trim();
    this._clearError();
    if (!email || !email.includes('@')) { this._showError('Enter a valid email address.'); return; }

    const btn = sr.getElementById('send-btn');
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const res = await fetch(`${this.apiBase}/auth/magic-link/request`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name || email.split('@')[0] }),
      });
      if (res.ok) {
        sr.getElementById('email-display').textContent = email;
        this._step(2);
        this.dispatchEvent(new CustomEvent('wc-link-sent', { detail: { email }, bubbles: true, composed: true }));
      } else {
        const d = await res.json().catch(() => ({}));
        this._showError(d.error || 'Failed to send link — try again.');
      }
    } catch (_) { this._showError('Network error — check your connection.'); }
    btn.disabled = false; btn.textContent = 'Send Sign-In Link';
  }
}

customElements.define('wc-email-signin', WcEmailSignin);
