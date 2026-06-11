/**
 * Fan Token Web Components — reusable across worldcup/ and friendlies
 *
 * Components:
 *   <wc-token-wallet>      — hero balance + recent transaction list
 *   <wc-wallet-pill>       — compact balance pill with +N toast on increase
 *   <wc-offer-card>        — single sponsor offer with redeem button
 *   <wc-voucher-display>   — QR + voucher code for unredeemed coupons
 *   <wc-sponsor-banner>    — match card banner with RSVP / check-in CTA
 *
 * All components accept an `api-base` attribute (default "/worldcup").
 * Events bubble + composed so they cross shadow DOM boundaries:
 *   wc-tokens-updated   detail: { balance }    — after any balance change
 *   wc-rsvp-done        detail: { matchId }    — after RSVP confirmed
 *   wc-checkin-done     detail: { matchId, tokensEarned }
 *   wc-redeem-done      detail: { coupon, balance }
 */

const _css = (strings, ...vals) => strings.reduce((a, s, i) => a + s + (vals[i] ?? ''), '');

// ── Shared helpers ─────────────────────────────────────────────────────────────

function _apiBase(el) { return el.getAttribute('api-base') || '/worldcup'; }

async function _api(el, path, opts = {}) {
    return fetch(_apiBase(el) + path, {
        credentials: 'include',
        ...opts,
        headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
}

function _emit(el, name, detail) {
    el.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
}

function _qrUrl(data, size = 140) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

const TX_LABELS = {
    earn_exact:        { icon: '🎯', label: 'Exact score' },
    earn_margin:       { icon: '✅', label: 'Correct margin' },
    earn_result:       { icon: '👍', label: 'Correct result' },
    earn_rsvp_checkin: { icon: '📍', label: 'Watch party check-in' },
    earn_trivia:       { icon: '🧠', label: 'Daily trivia' },
    earn_oracle:       { icon: '🔮', label: 'Group Oracle' },
    signup_grant:      { icon: '🎁', label: 'Welcome bonus' },
    bet_stake:         { icon: '🎰', label: 'Bet placed' },
    bet_win:           { icon: '💸', label: 'Bet won' },
    bet_refund:        { icon: '↩️', label: 'Bet refunded' },
    expire_burn:       { icon: '⌛', label: 'Tokens expired' },
    prize_payout:      { icon: '🏆', label: 'Prize pool winner' },
    coupon_burn:       { icon: '🎟️', label: 'Offer redeemed' },
};

// ── <wc-token-wallet> ──────────────────────────────────────────────────────────

class WcTokenWallet extends HTMLElement {
    connectedCallback() { this._render(); this._load(); }

    _render() {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `<style>
            :host { display: block; font-family: 'Segoe UI', system-ui, sans-serif; }
            .hero { background: linear-gradient(135deg, #0a1f44, #1a3a6b); color: white; border-radius: 14px; padding: 22px 20px 18px; margin-bottom: 16px; }
            .hero-lbl { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6; margin-bottom: 4px; }
            .hero-bal { font-size: 2.6rem; font-weight: 900; color: #BFA260; line-height: 1; }
            .hero-unit { font-size: 1rem; color: white; font-weight: 400; margin-left: 4px; }
            .hero-sub { font-size: 0.72rem; opacity: 0.55; margin-top: 6px; }
            .tx-list { display: flex; flex-direction: column; gap: 8px; }
            .tx-row { display: flex; align-items: center; gap: 10px; background: white; border: 1px solid #E5E7EB; border-radius: 10px; padding: 10px 12px; }
            .tx-icon { font-size: 1.2rem; flex-shrink: 0; width: 28px; text-align: center; }
            .tx-label { flex: 1; font-size: 0.82rem; font-weight: 700; color: #111827; }
            .tx-date { font-size: 0.66rem; color: #6B7280; margin-top: 1px; }
            .tx-amt { font-size: 0.9rem; font-weight: 900; flex-shrink: 0; }
            .tx-amt.pos { color: #16a34a; }
            .tx-amt.neg { color: #ef4444; }
            .empty { text-align: center; padding: 28px 0; color: #6B7280; font-size: 0.82rem; }
            .section-lbl { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #6B7280; margin-bottom: 10px; }
        </style>
        <div class="hero">
            <div class="hero-lbl">My Fan Token Balance</div>
            <div class="hero-bal" id="balance">–<span class="hero-unit">Tokens</span></div>
            <div class="hero-sub">Earn by predicting scores · Redeem at sponsor venues</div>
        </div>
        <div class="section-lbl">Recent Activity</div>
        <div class="tx-list" id="txs"><div class="empty">Loading…</div></div>`;
    }

    async _load() {
        const r = await _api(this, '/api/tokens/wallet');
        if (!r.ok) { this.shadowRoot.getElementById('txs').innerHTML = '<div class="empty">Sign in to view your wallet.</div>'; return; }
        const { wallet, txs } = await r.json();
        this.shadowRoot.getElementById('balance').innerHTML = `${wallet.balance}<span class="hero-unit"> Tokens</span>`;
        if (!txs.length) {
            this.shadowRoot.getElementById('txs').innerHTML = '<div class="empty">No activity yet — make picks to earn tokens!</div>';
            return;
        }
        this.shadowRoot.getElementById('txs').innerHTML = txs.map(tx => {
            const meta = TX_LABELS[tx.type] || { icon: '💰', label: tx.type };
            const pos = tx.amount > 0;
            const d = new Date(tx.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            return `<div class="tx-row">
                <div class="tx-icon">${meta.icon}</div>
                <div style="flex:1"><div class="tx-label">${meta.label}</div><div class="tx-date">${d}</div></div>
                <div class="tx-amt ${pos ? 'pos' : 'neg'}">${pos ? '+' : ''}${tx.amount}</div>
            </div>`;
        }).join('');
    }

    refresh() { this._load(); }
}

customElements.define('wc-token-wallet', WcTokenWallet);

// ── <wc-wallet-pill> ───────────────────────────────────────────────────────────
// Compact gold balance pill for page headers. Shows "Sign in" when logged out,
// animates a "+N" chip whenever the balance increases (settlements, wins),
// and refreshes itself on the global `wc-tokens-updated` event.
// Tapping it opens the My Tokens page (override with the `href` attribute).

class WcWalletPill extends HTMLElement {
    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        const href = this.getAttribute('href') || '/worldcup/tokens.html';
        this.shadowRoot.innerHTML = `<style>
            :host { display: inline-block; font-family: 'Segoe UI', system-ui, sans-serif; }
            .pill { position: relative; display: inline-flex; align-items: center; gap: 6px;
                    background: rgba(191,162,96,0.12); border: 1px solid rgba(191,162,96,0.35);
                    color: #BFA260; border-radius: 20px; padding: 5px 12px;
                    font-size: 0.8rem; font-weight: 800; white-space: nowrap;
                    text-decoration: none; cursor: pointer; }
            .pill:active { transform: scale(0.96); }
            .gain { position: absolute; right: 4px; top: -16px; color: #16a34a; font-weight: 900;
                    font-size: 0.78rem; opacity: 0; pointer-events: none; }
            .gain.show { animation: rise 1.6s ease-out; }
            @keyframes rise { 0% { opacity: 0; transform: translateY(6px); }
                              20% { opacity: 1; } 100% { opacity: 0; transform: translateY(-14px); } }
        </style>
        <a class="pill" href="${href}" title="My Tokens">🪙 <span id="bal">—</span><span class="gain" id="gain"></span></a>`;
        this._balance = null;
        this._onUpdate = (e) => {
            if (e.detail && typeof e.detail.balance === 'number') this._set(e.detail.balance);
            else this.refresh();
        };
        document.addEventListener('wc-tokens-updated', this._onUpdate);
        this.refresh();
    }

    disconnectedCallback() { document.removeEventListener('wc-tokens-updated', this._onUpdate); }

    _set(balance) {
        const el = this.shadowRoot.getElementById('bal');
        if (this._balance !== null && balance > this._balance) {
            const gain = this.shadowRoot.getElementById('gain');
            gain.textContent = `+${balance - this._balance}`;
            gain.classList.remove('show');
            void gain.offsetWidth; // restart the animation
            gain.classList.add('show');
        }
        this._balance = balance;
        el.textContent = balance.toLocaleString();
    }

    async refresh() {
        const r = await _api(this, '/api/tokens/wallet').catch(() => null);
        if (!r || !r.ok) {
            this.shadowRoot.getElementById('bal').textContent = 'Sign in';
            this._balance = null;
            return;
        }
        const { wallet } = await r.json();
        this._set(wallet.balance);
    }
}

customElements.define('wc-wallet-pill', WcWalletPill);

// ── <wc-offer-card> ───────────────────────────────────────────────────────────

class WcOfferCard extends HTMLElement {
    static get observedAttributes() { return ['offer-id', 'title', 'description', 'token-cost', 'remaining', 'balance']; }
    attributeChangedCallback() { if (this.shadowRoot) this._update(); }

    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `<style>
            :host { display: block; font-family: 'Segoe UI', system-ui, sans-serif; }
            .card { background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 12px; }
            .info { flex: 1; min-width: 0; }
            .title { font-size: 0.9rem; font-weight: 800; color: #0a1f44; margin-bottom: 2px; }
            .desc { font-size: 0.76rem; color: #374151; margin-bottom: 4px; }
            .remaining { font-size: 0.68rem; color: #6B7280; }
            button { background: #BFA260; color: #0a1f44; border: none; border-radius: 8px; padding: 9px 14px; font-weight: 800; font-size: 0.82rem; cursor: pointer; white-space: nowrap; font-family: inherit; flex-shrink: 0; transition: opacity 0.15s; }
            button:disabled { opacity: 0.4; cursor: not-allowed; }
        </style>
        <div class="card">
            <div class="info">
                <div class="title" id="title"></div>
                <div class="desc" id="desc"></div>
                <div class="remaining" id="remaining"></div>
            </div>
            <button id="btn"></button>
        </div>`;
        this._update();
        this.shadowRoot.getElementById('btn').addEventListener('click', () => this._redeem());
    }

    _update() {
        const sr = this.shadowRoot;
        const cost = Number(this.getAttribute('token-cost') || 0);
        const bal = Number(this.getAttribute('balance') || 0);
        const rem = this.getAttribute('remaining');
        if (sr.getElementById('title')) sr.getElementById('title').textContent = this.getAttribute('title') || '';
        if (sr.getElementById('desc')) sr.getElementById('desc').textContent = this.getAttribute('description') || '';
        if (sr.getElementById('remaining')) sr.getElementById('remaining').textContent = rem !== null && Number(rem) >= 0 ? `${rem} remaining` : 'Unlimited';
        if (sr.getElementById('btn')) {
            sr.getElementById('btn').textContent = `${cost} Tokens`;
            sr.getElementById('btn').disabled = bal < cost || (rem !== null && Number(rem) === 0);
        }
    }

    async _redeem() {
        const offerId = this.getAttribute('offer-id');
        const cost = Number(this.getAttribute('token-cost') || 0);
        const bal = Number(this.getAttribute('balance') || 0);
        if (bal < cost) { alert('Not enough tokens.'); return; }
        const btn = this.shadowRoot.getElementById('btn');
        btn.disabled = true; btn.textContent = 'Redeeming…';
        const r = await _api(this, '/api/tokens/redeem', { method: 'POST', body: JSON.stringify({ offerId }) });
        if (r.ok) {
            const { newBalance, coupon } = await r.json();
            _emit(this, 'wc-redeem-done', { coupon, balance: newBalance });
        } else {
            const d = await r.json().catch(() => ({}));
            alert(d.error || 'Redemption failed.');
            btn.disabled = false; btn.textContent = `${cost} Tokens`;
        }
    }
}

customElements.define('wc-offer-card', WcOfferCard);

// ── <wc-voucher-display> ───────────────────────────────────────────────────────

class WcVoucherDisplay extends HTMLElement {
    static get observedAttributes() { return ['voucher-code', 'offer-title', 'created-at']; }
    attributeChangedCallback() { if (this.shadowRoot) this._update(); }

    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `<style>
            :host { display: block; font-family: 'Segoe UI', system-ui, sans-serif; }
            .card { background: white; border: 2px dashed #BFA260; border-radius: 14px; padding: 20px 16px; text-align: center; }
            .title { font-size: 0.9rem; font-weight: 800; color: #0a1f44; margin-bottom: 12px; }
            .qr { margin: 0 auto 12px; display: block; width: 140px; height: 140px; }
            .code { font-family: monospace; font-size: 0.95rem; font-weight: 800; background: #f3f4f6; padding: 6px 10px; border-radius: 6px; display: inline-block; letter-spacing: 2px; }
            .hint { font-size: 0.65rem; color: #6B7280; margin-top: 8px; line-height: 1.4; }
        </style>
        <div class="card">
            <div class="title" id="title"></div>
            <img class="qr" id="qr" src="" alt="QR Code">
            <div class="code" id="code"></div>
            <div class="hint">Show this screen to your server to redeem</div>
        </div>`;
        this._update();
    }

    _update() {
        const code = this.getAttribute('voucher-code') || '';
        const title = this.getAttribute('offer-title') || '';
        if (this.shadowRoot.getElementById('title')) this.shadowRoot.getElementById('title').textContent = title;
        if (this.shadowRoot.getElementById('code')) this.shadowRoot.getElementById('code').textContent = code;
        if (this.shadowRoot.getElementById('qr')) this.shadowRoot.getElementById('qr').src = code ? _qrUrl(code) : '';
    }
}

customElements.define('wc-voucher-display', WcVoucherDisplay);

// ── <wc-sponsor-banner> ───────────────────────────────────────────────────────

class WcSponsorBanner extends HTMLElement {
    static get observedAttributes() { return ['match-id', 'sponsor-name', 'sponsor-logo', 'prize-pool', 'rsvp-bonus', 'checkin-status', 'signed-in']; }
    attributeChangedCallback() { if (this.shadowRoot) this._update(); }

    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `<style>
            :host { display: block; font-family: 'Segoe UI', system-ui, sans-serif; }
            .banner { background: linear-gradient(135deg, #1a3a6b, #1e293b); border-left: 4px solid #BFA260; padding: 10px 14px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 0.78rem; }
            .left { display: flex; align-items: center; gap: 8px; }
            .logo { width: 26px; height: 26px; border-radius: 50%; object-fit: cover; background: rgba(255,255,255,0.1); flex-shrink: 0; }
            .sponsor-name { font-weight: 800; color: white; font-size: 0.82rem; }
            .prize { font-size: 0.64rem; color: #BFA260; margin-top: 1px; }
            button { border: none; border-radius: 20px; padding: 5px 12px; font-size: 0.72rem; font-weight: 800; cursor: pointer; font-family: inherit; white-space: nowrap; transition: opacity 0.15s; }
            button:disabled { opacity: 0.5; cursor: default; }
            .btn-rsvp { background: #0052B4; color: white; }
            .btn-checkin { background: #BFA260; color: #0a1f44; }
            .badge { background: rgba(191,162,96,0.2); color: #BFA260; padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; border: 1px solid rgba(191,162,96,0.3); }
            .badge.green { background: rgba(22,163,74,0.15); color: #16a34a; border-color: rgba(22,163,74,0.3); }
        </style>
        <div class="banner">
            <div class="left">
                <img class="logo" id="logo" src="" alt="">
                <div>
                    <div class="sponsor-name" id="name"></div>
                    <div class="prize" id="prize"></div>
                </div>
            </div>
            <div id="cta"></div>
        </div>`;
        this._update();
    }

    _update() {
        const sr = this.shadowRoot;
        if (!sr.getElementById('name')) return;
        const name = this.getAttribute('sponsor-name') || '';
        const logo = this.getAttribute('sponsor-logo') || '';
        const prize = Number(this.getAttribute('prize-pool') || 0);
        const bonus = Number(this.getAttribute('rsvp-bonus') || 25);
        const status = this.getAttribute('checkin-status') || '';
        const signedIn = this.getAttribute('signed-in') === 'true';

        sr.getElementById('name').textContent = name + ' Watch Party';
        sr.getElementById('logo').src = logo;
        sr.getElementById('prize').textContent = prize ? `Prize pool: ${prize} tokens · +${bonus} for check-in` : `+${bonus} tokens for checking in`;

        let ctaHtml = '';
        if (!signedIn) {
            ctaHtml = `<button class="btn-rsvp" id="cta-btn">Sign in to RSVP</button>`;
        } else if (!status) {
            ctaHtml = `<button class="btn-rsvp" id="cta-btn">RSVP (+${bonus} Tkn)</button>`;
        } else if (status === 'rsvp') {
            ctaHtml = `<span class="badge">✓ RSVP'd — scan QR at venue</span>`;
        } else if (status === 'checked_in') {
            ctaHtml = `<span class="badge green">✓ Checked In +${bonus} Tkn</span>`;
        }
        sr.getElementById('cta').innerHTML = ctaHtml;

        const btn = sr.getElementById('cta-btn');
        if (btn) btn.addEventListener('click', () => this._handleCta(signedIn, status));
    }

    _handleCta(signedIn, status) {
        if (!signedIn) { _emit(this, 'wc-need-signin', {}); return; }
        if (!status) this._rsvp();
    }

    async _rsvp() {
        const matchId = this.getAttribute('match-id');
        const sponsorId = this.getAttribute('sponsor-id') || '';
        const btn = this.shadowRoot.getElementById('cta-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'RSVPing…'; }
        const r = await _api(this, '/api/matches/rsvp', { method: 'POST', body: JSON.stringify({ matchId, sponsorId }) });
        if (r.ok) {
            this.setAttribute('checkin-status', 'rsvp');
            _emit(this, 'wc-rsvp-done', { matchId });
        } else {
            if (btn) { btn.disabled = false; btn.textContent = 'RSVP'; }
        }
    }

    // Called externally to trigger check-in (e.g. from QR deep link)
    async checkin(passCode = '') {
        const matchId = this.getAttribute('match-id');
        const sponsorId = this.getAttribute('sponsor-id') || '';
        const r = await _api(this, '/api/matches/checkin', { method: 'POST', body: JSON.stringify({ matchId, sponsorId, passCode }) });
        if (r.ok) {
            const { tokensEarned, newBalance } = await r.json();
            this.setAttribute('checkin-status', 'checked_in');
            _emit(this, 'wc-checkin-done', { matchId, tokensEarned, newBalance });
            _emit(this, 'wc-tokens-updated', { balance: newBalance });
        }
    }
}

customElements.define('wc-sponsor-banner', WcSponsorBanner);
