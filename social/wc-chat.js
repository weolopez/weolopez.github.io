// wc-chat.js — Reusable room chat for the World Cup hub. Drop into any surface:
//
//   <script type="module" src="/social/wc-chat.js"></script>
//   <wc-chat room="lobby"></wc-chat>            // global lobby ("The Terraces")
//   <wc-chat room="team:USA" theme="light" height="480px"></wc-chat>
//   <wc-chat room="league:42" fill></wc-chat>
//
// Attributes:
//   room="…"      required — server room id (lobby | <matchId> | league:<id> | …)
//   theme="dark"  dark (default, immersive) | light (fits white pages)
//   height="…"    CSS height when standalone (default 70vh); ignored with `fill`
//   fill          grow to fill a flex parent (height:auto, min-height:0)
//   manual        host supplies .user / .leaderboard; skip self-fetch
//
// Self-bootstrapping by default: loads history, fetches /api/me + /api/leaderboard,
// and subscribes to the shared SSE bus — so it works with zero host JS. A host can
// instead set `manual` and drive `.user` / `.leaderboard` (e.g. the social page).
//
// Emits (bubbling, composed): `wc-chat-toast` {msg}, `wc-chat-presence` {messages, chatters}.

import { wcEvents } from '/social/wc-events.js';

const PALETTE = [
  { bg: '#002395', fg: '#fff' }, { bg: '#AA151B', fg: '#FFDF00' },
  { bg: '#111', fg: '#FFD700' }, { bg: '#009C3B', fg: '#FFDF00' },
  { bg: '#002868', fg: '#fff' }, { bg: '#CF142B', fg: '#fff' },
  { bg: '#006600', fg: '#fff' }, { bg: '#75AADB', fg: '#06122b' },
  { bg: '#003087', fg: '#FF7900' }, { bg: '#D21034', fg: '#fff' },
  { bg: '#B22222', fg: '#FFD700' }, { bg: '#007A4D', fg: '#FFCB00' },
  { bg: '#00247D', fg: '#fff' }, { bg: '#C8102E', fg: '#fff' },
  { bg: '#012169', fg: '#FCD116' }, { bg: '#7C3AED', fg: '#fff' },
];

const QUICK_EMOJI = ['⚽', '🔥', '💯', '😮', '👏', '🐐', '😭', '🙌'];

const colorFor = (id) => PALETTE[
  (id ? [...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) : 0) % PALETTE.length
];

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function timeAgo(ts) {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 45000) return 'now';
  if (d < 3600000) return Math.floor(d / 60000) + 'm';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

class WcChat extends HTMLElement {
  static get observedAttributes() { return ['room', 'theme', 'height', 'fill']; }

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._msgs = [];
    this._user = null;
    this._lb = [];
    this._userSet = false;
    this._lbSet = false;
    this._sending = false;
    this._cooldown = 0;
    this._atBottom = true;
    this._unseen = 0;
    this._hearts = JSON.parse(localStorage.getItem('wc-chat-hearts') || '{}');
  }

  get _api() { return this.getAttribute('api') || '/worldcup'; }
  get _room() { return this.getAttribute('room') || 'lobby'; }

  set user(u) { this._user = u; this._userSet = true; this._renderComposer(); this._renderList(); }
  set leaderboard(lb) { this._lb = lb || []; this._lbSet = true; this._renderList(); }

  connectedCallback() {
    this._renderShell();
    this._onChat = (e) => {
      const room = e.detail?.room ?? e.detail?.matchId;
      // numeric server rooms broadcast room as a number; compare loosely.
      if (String(room) !== String(this._room) || !e.detail?.msg) return;
      this._ingest(e.detail.msg);
    };
    wcEvents().addEventListener('chat_message', this._onChat);
    queueMicrotask(() => this._boot());
  }

  disconnectedCallback() {
    wcEvents().removeEventListener('chat_message', this._onChat);
  }

  attributeChangedCallback(name) {
    if (name === 'room' && this.isConnected) { this._msgs = []; this._boot(); }
    if ((name === 'theme' || name === 'height' || name === 'fill') && this._shadow.firstChild) this._applyHostStyle();
  }

  async _boot() {
    this._loadHistory();
    const manual = this.hasAttribute('manual');
    if (!manual && !this._userSet) {
      try { const r = await fetch(`${this._api}/api/me`, { credentials: 'include' }); if (r.ok) this._user = await r.json(); } catch {}
    }
    if (!manual && !this._lbSet) {
      try { const r = await fetch(`${this._api}/api/leaderboard`, { credentials: 'include' }); if (r.ok) this._lb = await r.json(); } catch {}
    }
    this._renderComposer();
    this._renderList();
  }

  _rank(userId) {
    const i = this._lb.findIndex((u) => u.id === userId);
    return i >= 0 ? i + 1 : null;
  }
  _streak(userId) {
    return this._lb.find((u) => u.id === userId)?.streak ?? 0;
  }

  async _loadHistory() {
    try {
      const r = await fetch(`${this._api}/api/chat/${this._room}`, { credentials: 'include' });
      if (r.ok) {
        this._msgs = (await r.json()).map((m) => ({ ...m }));
        this._renderList(true);
        this._emitPresence();
      }
    } catch { /* offline — empty state */ }
  }

  _ingest(msg) {
    const mine = this._user && msg.userId === this._user.id;
    if (mine) {
      const pending = this._msgs.find((m) => m._pending && m.text === msg.text && m.userId === msg.userId);
      if (pending) { pending._pending = false; pending.ts = msg.ts; this._renderList(); return; }
    }
    if (this._msgs.some((m) => m.ts === msg.ts && m.userId === msg.userId)) return;
    this._msgs.push(msg);
    if (this._msgs.length > 200) this._msgs = this._msgs.slice(-200);
    if (!this._atBottom && !mine) { this._unseen++; this._renderJump(); }
    this._renderList(this._atBottom || mine);
    this._emitPresence();
  }

  async _send(text) {
    text = text.trim();
    if (!text || this._sending || this._cooldown > Date.now()) return;
    if (!this._user) { this._toast('Sign in to chat'); return; }
    this._sending = true;

    const optimistic = {
      userId: this._user.id, name: this._user.name,
      avatar: this._user.avatar, text, ts: Date.now(), _pending: true,
    };
    this._msgs.push(optimistic);
    this._renderList(true);
    const input = this._shadow.getElementById('input');
    if (input) input.value = '';

    try {
      const r = await fetch(`${this._api}/api/chat/${this._room}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        this._msgs = this._msgs.filter((m) => m !== optimistic);
        this._toast(e.error || 'Could not send');
        if (input) input.value = text;
      } else {
        const saved = await r.json();
        optimistic._pending = false;
        optimistic.ts = saved.ts || optimistic.ts;
        this._startCooldown(5000);
      }
    } catch {
      this._msgs = this._msgs.filter((m) => m !== optimistic);
      this._toast('Network error — try again');
      if (input) input.value = text;
    }
    this._sending = false;
    this._renderList();
  }

  _startCooldown(ms) {
    this._cooldown = Date.now() + ms;
    const tick = () => {
      const left = Math.ceil((this._cooldown - Date.now()) / 1000);
      const btn = this._shadow.getElementById('send');
      if (!btn) return;
      if (left > 0) { btn.disabled = true; btn.textContent = left + 's'; setTimeout(tick, 250); }
      else { btn.disabled = false; btn.textContent = 'Send'; }
    };
    tick();
  }

  _toggleHeart(ts) {
    const key = String(ts);
    if (this._hearts[key]) delete this._hearts[key]; else this._hearts[key] = 1;
    localStorage.setItem('wc-chat-hearts', JSON.stringify(this._hearts));
    this._renderList();
  }

  _toast(msg) {
    this.dispatchEvent(new CustomEvent('wc-chat-toast', { bubbles: true, composed: true, detail: { msg } }));
  }

  _emitPresence() {
    const chatters = new Set(this._msgs.map((m) => m.userId)).size;
    this.dispatchEvent(new CustomEvent('wc-chat-presence', {
      bubbles: true, composed: true, detail: { chatters, messages: this._msgs.length },
    }));
  }

  _applyHostStyle() {
    const fill = this.hasAttribute('fill');
    const h = this.getAttribute('height') || '70vh';
    this.style.setProperty('--wc-h', fill ? 'auto' : h);
  }

  _renderShell() {
    this._applyHostStyle();
    this._shadow.innerHTML = `
      <style>${this._css()}</style>
      <div class="wrap">
        <div class="scroll" id="scroll">
          <div class="welcome">
            <div class="welcome-emoji">💬</div>
            <div class="welcome-title">Start the conversation</div>
            <div class="welcome-sub">Be the first to post in this room.</div>
          </div>
          <div id="list"></div>
        </div>
        <button class="jump" id="jump" hidden></button>
        <div class="composer" id="composer"></div>
      </div>
    `;
    const scroll = this._shadow.getElementById('scroll');
    scroll.addEventListener('scroll', () => {
      this._atBottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 60;
      if (this._atBottom && this._unseen) { this._unseen = 0; this._renderJump(); }
    }, { passive: true });
    this._shadow.getElementById('jump').addEventListener('click', () => {
      this._unseen = 0; this._renderJump(); this._scrollToBottom(true);
    });
    this._renderComposer();
  }

  _renderJump() {
    const j = this._shadow.getElementById('jump');
    if (!j) return;
    if (this._unseen > 0) { j.hidden = false; j.textContent = `${this._unseen} new message${this._unseen > 1 ? 's' : ''} ↓`; }
    else j.hidden = true;
  }

  _scrollToBottom(smooth) {
    const s = this._shadow.getElementById('scroll');
    if (!s) return;
    s.scrollTo({ top: s.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    this._atBottom = true;
  }

  _renderComposer() {
    const c = this._shadow.getElementById('composer');
    if (!c) return;
    if (!this._user) { c.innerHTML = `<div class="signin-note">🔒 Sign in to join the conversation</div>`; return; }
    c.innerHTML = `
      <div class="quick" id="quick">${QUICK_EMOJI.map((e) => `<button class="qbtn" data-e="${e}">${e}</button>`).join('')}</div>
      <div class="row">
        <input id="input" class="input" maxlength="200" autocomplete="off" placeholder="Say something…" enterkeyhint="send">
        <button id="send" class="send">Send</button>
      </div>`;
    const input = this._shadow.getElementById('input');
    const send = this._shadow.getElementById('send');
    const submit = () => this._send(input.value);
    send.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    this._shadow.querySelectorAll('.qbtn').forEach((b) => {
      b.addEventListener('click', () => { input.value = (input.value + b.dataset.e).slice(0, 200); input.focus(); });
    });
  }

  _renderList(scroll) {
    const list = this._shadow.getElementById('list');
    if (!list) return;
    const me = this._user?.id;
    const welcome = this._shadow.querySelector('.welcome');
    if (welcome) welcome.style.display = this._msgs.length ? 'none' : 'flex';

    let lastDay = '';
    let html = '';
    for (const m of this._msgs) {
      const day = new Date(m.ts).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      if (day !== lastDay) { html += `<div class="day-sep"><span>${day}</span></div>`; lastDay = day; }
      html += this._bubble(m, m.userId === me);
    }
    list.innerHTML = html;

    list.querySelectorAll('.bubble').forEach((el) => {
      let last = 0;
      const heart = () => this._toggleHeart(el.dataset.ts);
      el.addEventListener('dblclick', heart);
      el.addEventListener('touchend', () => { const t = Date.now(); if (t - last < 320) heart(); last = t; });
    });
    if (scroll) requestAnimationFrame(() => this._scrollToBottom(false));
  }

  _bubble(m, mine) {
    const c = colorFor(m.userId);
    const rank = this._rank(m.userId);
    const streak = this._streak(m.userId);
    const avatar = m.avatar
      ? `<img class="av" src="${esc(m.avatar)}" alt="">`
      : `<div class="av" style="background:${c.bg};color:${c.fg}">${esc((m.name || '?')[0]).toUpperCase()}</div>`;
    const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank ? `#${rank}` : '';
    const hearted = this._hearts[String(m.ts)] ? `<span class="heart">❤️</span>` : '';
    return `
      <div class="msg ${mine ? 'mine' : ''}">
        ${mine ? '' : avatar}
        <div class="col">
          ${mine ? '' : `<div class="meta">
            <span class="nm">${esc((m.name || 'Fan').split(' ')[0])}</span>
            ${rankIcon ? `<span class="rk">${rankIcon}</span>` : ''}
            ${streak >= 3 ? `<span class="st">🔥${streak}</span>` : ''}
          </div>`}
          <div class="bubble ${mine ? 'b-mine' : ''} ${m._pending ? 'pending' : ''}" data-ts="${m.ts}">
            ${esc(m.text)}${hearted}
          </div>
          <div class="tm">${m._pending ? 'sending…' : timeAgo(m.ts)}</div>
        </div>
      </div>`;
  }

  _css() {
    return `
      :host {
        display: flex; flex-direction: column; min-height: 0;
        height: var(--wc-h, 70vh);
        --c-bg: #06122b; --c-panel: #0a1730; --c-bubble: rgba(255,255,255,0.08);
        --c-bubble-bd: rgba(255,255,255,0.06); --c-text: #f3f4f6;
        --c-name: rgba(255,255,255,0.85); --c-meta: rgba(255,255,255,0.45);
        --c-day-bg: rgba(255,255,255,0.05); --c-input-bg: rgba(255,255,255,0.08);
        --c-input-bd: rgba(255,255,255,0.12); --c-border: rgba(255,255,255,0.08);
        --gold: #BFA260;
        font-family: 'Segoe UI', system-ui, sans-serif;
      }
      :host([fill]) { flex: 1; }
      :host([theme="light"]) {
        --c-bg: #ffffff; --c-panel: #f9fafb; --c-bubble: #f1f3f6;
        --c-bubble-bd: #e5e7eb; --c-text: #111827; --c-name: #111827;
        --c-meta: #9ca3af; --c-day-bg: #f3f4f6; --c-input-bg: #f3f4f6;
        --c-input-bd: #e5e7eb; --c-border: #e5e7eb;
      }
      * { box-sizing: border-box; }
      .wrap { display: flex; flex-direction: column; flex: 1; min-height: 0; position: relative; background: var(--c-bg); }

      .scroll {
        flex: 1; min-height: 0; overflow-y: auto; padding: 14px 12px 8px;
        display: flex; flex-direction: column;
        scrollbar-width: thin; scrollbar-color: var(--c-input-bd) transparent; overscroll-behavior: contain;
      }
      .scroll::-webkit-scrollbar { width: 4px; }
      .scroll::-webkit-scrollbar-thumb { background: var(--c-input-bd); border-radius: 4px; }

      .welcome { margin: auto; text-align: center; padding: 30px 16px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
      .welcome-emoji { font-size: 2.6rem; }
      .welcome-title { font-size: 1.05rem; font-weight: 900; color: var(--c-text); }
      .welcome-sub { font-size: 0.82rem; color: var(--c-meta); max-width: 260px; line-height: 1.5; }

      .day-sep { text-align: center; margin: 12px 0 8px; }
      .day-sep span { font-size: 0.62rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--c-meta); background: var(--c-day-bg); padding: 3px 12px; border-radius: 20px; }

      .msg { display: flex; gap: 8px; margin-bottom: 12px; align-items: flex-end; animation: pop 0.22s ease; }
      .msg.mine { flex-direction: row-reverse; }
      @keyframes pop { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; } }

      .av { width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 800; object-fit: cover; overflow: hidden; }
      img.av { display: block; }

      .col { display: flex; flex-direction: column; min-width: 0; max-width: 78%; }
      .msg.mine .col { align-items: flex-end; }

      .meta { display: flex; align-items: center; gap: 5px; margin: 0 0 3px 4px; }
      .nm { font-size: 0.72rem; font-weight: 800; color: var(--c-name); }
      .rk { font-size: 0.58rem; font-weight: 800; color: var(--gold); background: rgba(191,162,96,0.16); padding: 1px 5px; border-radius: 7px; }
      .st { font-size: 0.62rem; font-weight: 800; color: #ff8a4c; }

      .bubble { position: relative; background: var(--c-bubble); color: var(--c-text); padding: 9px 13px; border-radius: 16px 16px 16px 4px; font-size: 0.9rem; line-height: 1.4; word-break: break-word; border: 1px solid var(--c-bubble-bd); -webkit-user-select: none; user-select: none; }
      .b-mine { background: linear-gradient(135deg, #BFA260, #d8bd7e); color: #08152e; font-weight: 600; border-radius: 16px 16px 4px 16px; border-color: transparent; }
      .bubble.pending { opacity: 0.55; }
      .heart { position: absolute; bottom: -8px; right: -4px; font-size: 0.78rem; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4)); animation: pop 0.25s ease; }
      .msg.mine .heart { right: auto; left: -4px; }

      .tm { font-size: 0.6rem; color: var(--c-meta); margin: 3px 4px 0; }

      .jump { position: absolute; left: 50%; bottom: 92px; transform: translateX(-50%); background: var(--gold); color: #08152e; border: none; font-size: 0.78rem; font-weight: 800; padding: 8px 16px; border-radius: 20px; box-shadow: 0 6px 20px rgba(0,0,0,0.4); cursor: pointer; z-index: 5; animation: pop 0.2s ease; }

      .composer { flex-shrink: 0; padding: 8px 10px calc(8px + env(safe-area-inset-bottom)); background: var(--c-panel); border-top: 1px solid var(--c-border); }
      .signin-note { text-align: center; font-size: 0.82rem; color: var(--c-meta); padding: 10px; }
      .quick { display: flex; gap: 4px; overflow-x: auto; padding-bottom: 7px; scrollbar-width: none; }
      .quick::-webkit-scrollbar { display: none; }
      .qbtn { flex-shrink: 0; background: var(--c-input-bg); border: 1px solid var(--c-input-bd); border-radius: 18px; font-size: 1.15rem; padding: 3px 9px; cursor: pointer; line-height: 1.4; transition: transform 0.1s, background 0.15s; }
      .qbtn:active { transform: scale(0.88); background: rgba(191,162,96,0.25); }

      .row { display: flex; gap: 8px; align-items: center; }
      .input { flex: 1; min-width: 0; background: var(--c-input-bg); border: 1.5px solid var(--c-input-bd); border-radius: 22px; padding: 11px 16px; font-size: 0.92rem; color: var(--c-text); outline: none; font-family: inherit; transition: border-color 0.15s; }
      .input::placeholder { color: var(--c-meta); }
      .input:focus { border-color: var(--gold); }
      .send { flex-shrink: 0; background: var(--gold); color: #08152e; border: none; border-radius: 22px; padding: 11px 20px; font-size: 0.88rem; font-weight: 900; cursor: pointer; min-width: 64px; transition: opacity 0.15s, transform 0.1s; }
      .send:active { transform: scale(0.95); }
      .send:disabled { opacity: 0.5; cursor: default; }
    `;
  }
}

customElements.define('wc-chat', WcChat);
