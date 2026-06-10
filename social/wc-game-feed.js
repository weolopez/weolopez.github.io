const COLORS = [
  '#2563EB','#DC2626','#059669','#D97706','#7C3AED',
  '#DB2777','#0891B2','#65A30D','#EA580C','#4F46E5',
];

function colorFor(userId = '') {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function relTime(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5)  return 'just now';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const API = '/worldcup';
const apiFetch = (path, opts = {}) => fetch(`${API}${path}`, { credentials: 'include', ...opts });

class WcGameFeed extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._matchIds   = [];
    this._matches    = [];
    this._user       = null;
    this._chats      = new Map();
    this._selectedId = null;
    this._sending    = false;
    this._expanded   = false;
    this._onChatEvent = this._onChatEvent.bind(this);
  }

  set matchIds(v) {
    this._matchIds = Array.isArray(v) ? v : [];
    this._selectedId = this._matchIds[0] ?? null;
    this._loadChats();
  }
  get matchIds() { return this._matchIds; }

  set matches(v) { this._matches = v || []; this._render(); }
  get matches()  { return this._matches; }

  set user(v)    { this._user = v; this._render(); }
  get user()     { return this._user; }

  connectedCallback() {
    window.addEventListener('wc-feed-chat-event', this._onChatEvent);
    this._render();
  }

  disconnectedCallback() {
    window.removeEventListener('wc-feed-chat-event', this._onChatEvent);
    clearInterval(this._timeTick);
  }

  _onChatEvent(e) {
    const { matchId, msg } = e.detail ?? {};
    if (!matchId || !msg) return;
    if (!this._matchIds.includes(+matchId)) return;
    const existing = this._chats.get(+matchId) ?? [];
    this._chats.set(+matchId, [...existing, msg]);
    this._render();
    if (this._expanded) this._scrollBottom();
  }

  async _loadChats() {
    if (!this._matchIds.length) return;
    await Promise.all(
      this._matchIds.map(async id => {
        try {
          const r = await apiFetch(`/api/chat/${id}`);
          if (r.ok) this._chats.set(+id, await r.json());
        } catch (_) {}
      })
    );
    this._render();
    if (this._expanded) this._scrollBottom();
  }

  _matchFor(id) {
    return this._matches.find(m => +m.id === +id) ?? null;
  }

  _allMessages() {
    const out = [];
    for (const [matchId, msgs] of this._chats) {
      for (const msg of msgs) out.push({ ...msg, matchId: +matchId });
    }
    return out.sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
  }

  _render() {
    const root = this.shadowRoot;
    root.innerHTML = `<style>${this._css()}</style>${this._html()}`;
    this._wire();
    if (this._expanded) this._scrollBottom();
    this._startTimeTick();
  }

  _html() {
    const msgs = this._allMessages();
    const count = msgs.length;
    const latest = msgs[msgs.length - 1];
    const multiMatch = this._matchIds.length > 1;

    // Bar preview text
    let preview = '';
    if (count === 0) {
      preview = 'No messages yet — be the first!';
    } else {
      const who = latest.name?.split(' ')[0] || 'Fan';
      const txt = latest.text?.length > 40 ? latest.text.slice(0, 40) + '…' : latest.text;
      preview = `${count} message${count !== 1 ? 's' : ''} · <em>${esc(who)}: ${esc(txt)}</em>`;
    }

    const chevron = this._expanded ? '▲' : '▼';

    // Expanded content
    let expandedHTML = '';
    if (this._expanded) {
      const hasMultiple = multiMatch;
      const user = this._user;

      // Select options
      const selectOpts = this._matchIds.map(id => {
        const m = this._matchFor(id);
        const label = m
          ? `${m.home.flag} ${m.home.name} vs ${m.away.name} ${m.away.flag}`
          : `Match #${id}`;
        return `<option value="${id}" ${+id === +this._selectedId ? 'selected' : ''}>${label}</option>`;
      }).join('');

      // Messages
      let msgsHTML = '';
      if (!msgs.length) {
        msgsHTML = `<div class="empty">No messages yet — say something!</div>`;
      } else {
        let lastMatchId = null;
        for (const msg of msgs) {
          if (multiMatch && msg.matchId !== lastMatchId) {
            const m = this._matchFor(msg.matchId);
            const sep = m ? `${m.home.flag} ${m.home.name} vs ${m.away.name} ${m.away.flag}` : `Match #${msg.matchId}`;
            msgsHTML += `<div class="match-sep">${sep}</div>`;
            lastMatchId = msg.matchId;
          }
          const color = colorFor(msg.userId ?? '');
          const initial = (msg.name || '?')[0].toUpperCase();
          msgsHTML += `
            <div class="msg">
              <div class="av" style="background:${color}">${initial}</div>
              <div class="body">
                <span class="nm">${esc(msg.name || 'Fan')}</span>
                <span class="txt">${esc(msg.text)}</span>
                <span class="ts" data-ts="${msg.ts}">${relTime(msg.ts)}</span>
              </div>
            </div>`;
        }
      }

      expandedHTML = `
        <div class="msg-list">${msgsHTML}</div>
        <div class="input-bar">
          ${hasMultiple ? `<select class="match-pick">${selectOpts}</select>` : ''}
          <div class="input-row">
            <input class="chat-input" type="text" maxlength="200"
              placeholder="${user ? 'Say something…' : 'Sign in to chat'}">
            <button class="send-btn" ${!user ? 'disabled' : ''}>Send</button>
          </div>
        </div>`;
    }

    return `
      <div class="shell ${this._expanded ? 'open' : ''}">
        <div class="bar">
          <span class="bar-icon">💬</span>
          <span class="bar-label">Fan Chat</span>
          <span class="bar-preview">${preview}</span>
          <span class="bar-chevron">${chevron}</span>
        </div>
        ${expandedHTML}
      </div>`;
  }

  _wire() {
    const root = this.shadowRoot;

    root.querySelector('.bar')?.addEventListener('click', () => {
      this._expanded = !this._expanded;
      this._render();
      if (this._expanded) this._scrollBottom();
    });

    const pick = root.querySelector('.match-pick');
    pick?.addEventListener('change', () => { this._selectedId = +pick.value; });

    const send = async () => {
      if (!this._user || this._sending) return;
      const input = root.querySelector('.chat-input');
      const text  = input?.value.trim();
      if (!text) return;
      const matchId = this._selectedId ?? this._matchIds[0];
      if (!matchId) return;

      this._sending = true;
      const btn = root.querySelector('.send-btn');
      if (btn) { btn.disabled = true; btn.textContent = '…'; }
      input.value = '';

      try {
        const r = await apiFetch(`/api/chat/${matchId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (r.ok) {
          const msg = await r.json();
          const existing = this._chats.get(+matchId) ?? [];
          this._chats.set(+matchId, [...existing, msg]);
          this._render();
          this._scrollBottom();
        } else {
          const err = await r.json().catch(() => ({}));
          input.value = text;
          this._showErr(err.error || 'Failed to send');
        }
      } catch (_) {
        input.value = text;
        this._showErr('Network error');
      } finally {
        this._sending = false;
        const b = root.querySelector('.send-btn');
        if (b) { b.disabled = !this._user; b.textContent = 'Send'; }
      }
    };

    root.querySelector('.send-btn')?.addEventListener('click', send);
    root.querySelector('.chat-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
  }

  _showErr(msg) {
    const bar = this.shadowRoot?.querySelector('.input-bar');
    if (!bar) return;
    const el = document.createElement('div');
    el.className = 'err-msg';
    el.textContent = msg;
    bar.prepend(el);
    setTimeout(() => el.remove(), 3000);
  }

  _scrollBottom() {
    requestAnimationFrame(() => {
      const list = this.shadowRoot?.querySelector('.msg-list');
      if (list) list.scrollTop = list.scrollHeight;
    });
  }

  _startTimeTick() {
    clearInterval(this._timeTick);
    this._timeTick = setInterval(() => {
      this.shadowRoot?.querySelectorAll('.ts[data-ts]').forEach(el => {
        el.textContent = relTime(+el.dataset.ts);
      });
    }, 30_000);
  }

  _css() {
    return `
      :host { display: block; font-family: 'Segoe UI', system-ui, sans-serif; }

      .shell {
        background: #fff;
        overflow: hidden;
      }

      /* ── COLLAPSED BAR ── */
      .bar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        cursor: pointer;
        user-select: none;
        background: #F9FAFB;
        transition: background 0.15s;
      }
      .bar:hover { background: #F3F4F6; }
      .shell.open .bar {
        background: #0a1f44;
        color: white;
      }
      .bar-icon { font-size: 0.9rem; flex-shrink: 0; }
      .bar-label {
        font-size: 0.78rem;
        font-weight: 800;
        color: inherit;
        flex-shrink: 0;
        color: #111827;
      }
      .shell.open .bar-label { color: white; }
      .bar-preview {
        flex: 1;
        font-size: 0.72rem;
        color: #6B7280;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
      }
      .shell.open .bar-preview { color: rgba(255,255,255,0.65); }
      .bar-preview em { font-style: normal; }
      .bar-chevron {
        font-size: 0.6rem;
        color: #9CA3AF;
        flex-shrink: 0;
      }
      .shell.open .bar-chevron { color: rgba(255,255,255,0.6); }

      /* ── MESSAGE LIST ── */
      .msg-list {
        overflow-y: auto;
        max-height: var(--feed-height, 260px);
        padding: 8px 12px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        border-top: 1px solid #E5E7EB;
        scroll-behavior: smooth;
      }
      .msg-list::-webkit-scrollbar { width: 4px; }
      .msg-list::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 2px; }

      .match-sep {
        font-size: 0.63rem;
        font-weight: 700;
        color: #6B7280;
        text-align: center;
        padding: 6px 0 2px;
      }

      .msg {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 3px 0;
      }
      .av {
        width: 26px; height: 26px;
        border-radius: 50%;
        color: white;
        font-size: 0.68rem;
        font-weight: 800;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .body { flex: 1; font-size: 0.8rem; line-height: 1.4; word-break: break-word; }
      .nm   { font-weight: 700; color: #111827; margin-right: 4px; }
      .txt  { color: #374151; }
      .ts   { font-size: 0.6rem; color: #9CA3AF; margin-left: 4px; white-space: nowrap; }

      .empty {
        font-size: 0.78rem;
        color: #9CA3AF;
        text-align: center;
        padding: 10px;
      }

      /* ── INPUT ── */
      .input-bar {
        border-top: 1px solid #E5E7EB;
        padding: 7px 10px;
        background: #F9FAFB;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .match-pick {
        width: 100%; font-size: 0.7rem; padding: 4px 7px;
        border: 1px solid #E5E7EB; border-radius: 6px;
        background: white; color: #374151; outline: none;
      }
      .input-row { display: flex; gap: 6px; }
      .chat-input {
        flex: 1; font-size: 0.8rem; padding: 7px 10px;
        border: 1px solid #E5E7EB; border-radius: 7px;
        outline: none; background: white; color: #111827;
      }
      .chat-input:focus { border-color: #0a1f44; }
      .send-btn {
        background: #0a1f44; color: white; border: none;
        border-radius: 7px; padding: 7px 12px;
        font-size: 0.78rem; font-weight: 700; cursor: pointer; white-space: nowrap;
      }
      .send-btn:disabled { background: #E5E7EB; color: #9CA3AF; cursor: default; }
      .send-btn:hover:not(:disabled) { background: #1a3a6b; }
      .err-msg { font-size: 0.7rem; color: #ef4444; font-weight: 600; text-align: center; padding: 2px 0; }
    `;
  }
}

customElements.define('wc-game-feed', WcGameFeed);
