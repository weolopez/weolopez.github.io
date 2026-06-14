// wc-lobby.js — Site-wide live fan chat ("The Terraces") for the World Cup social hub.
// A single global room (matchId 0) styled as an immersive, full-bleed messenger.
// Maximises engagement: realtime bubbles, rank/streak badges, double-tap hearts,
// quick-emoji composer, presence count, and a "new messages" jump pill.

const ROOM = 'lobby'; // global lobby room id (server room model: /api/chat/lobby)
const API = '/worldcup';

// Deterministic avatar theming so each fan keeps a stable colour.
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

class WcLobby extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._msgs = [];
    this._user = null;
    this._lb = [];
    this._sending = false;
    this._cooldown = 0;
    this._atBottom = true;
    this._unseen = 0;
    this._hearts = JSON.parse(localStorage.getItem('wc-lobby-hearts') || '{}');
  }

  set user(u) { this._user = u; this._renderComposer(); this._renderList(); }
  set leaderboard(lb) { this._lb = lb || []; this._renderList(); }

  connectedCallback() {
    this._renderShell();
    this._loadHistory();
    // SSE chat events for the global room are forwarded by the page.
    this._onChat = (e) => {
      // Lobby SSE carries { room: 'lobby', msg }; match rooms carry a numeric
      // room/matchId, which won't equal ROOM and are correctly ignored here.
      if ((e.detail?.room ?? e.detail?.matchId) !== ROOM || !e.detail?.msg) return;
      this._ingest(e.detail.msg);
    };
    window.addEventListener('wc-feed-chat-event', this._onChat);
  }

  disconnectedCallback() {
    window.removeEventListener('wc-feed-chat-event', this._onChat);
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
      const r = await fetch(`${API}/api/chat/${ROOM}`, { credentials: 'include' });
      if (r.ok) {
        this._msgs = (await r.json()).map((m) => ({ ...m }));
        this._renderList(true);
        this._renderPresence();
      }
    } catch { /* offline — show empty state */ }
  }

  // Merge an incoming message, de-duping our own optimistic echoes.
  _ingest(msg) {
    const mine = this._user && msg.userId === this._user.id;
    if (mine) {
      const pending = this._msgs.find(
        (m) => m._pending && m.text === msg.text && m.userId === msg.userId,
      );
      if (pending) {
        pending._pending = false;
        pending.ts = msg.ts;
        this._renderList();
        return;
      }
    }
    if (this._msgs.some((m) => m.ts === msg.ts && m.userId === msg.userId)) return;
    this._msgs.push(msg);
    if (this._msgs.length > 200) this._msgs = this._msgs.slice(-200);
    if (!this._atBottom && !mine) { this._unseen++; this._renderJump(); }
    this._renderList(this._atBottom || mine);
    this._renderPresence();
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
      const r = await fetch(`${API}/api/chat/${ROOM}`, {
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
      if (left > 0) {
        btn.disabled = true;
        btn.textContent = left + 's';
        setTimeout(tick, 250);
      } else {
        btn.disabled = false;
        btn.textContent = 'Send';
      }
    };
    tick();
  }

  _toggleHeart(ts) {
    const key = String(ts);
    this._hearts[key] = this._hearts[key] ? 0 : 1;
    if (!this._hearts[key]) delete this._hearts[key];
    localStorage.setItem('wc-lobby-hearts', JSON.stringify(this._hearts));
    this._renderList();
  }

  _toast(msg) {
    this.dispatchEvent(new CustomEvent('wc-lobby-toast', {
      bubbles: true, composed: true, detail: { msg },
    }));
  }

  _renderPresence() {
    const ids = new Set(this._msgs.map((m) => m.userId));
    this.dispatchEvent(new CustomEvent('wc-lobby-presence', {
      bubbles: true, composed: true, detail: { count: ids.size, messages: this._msgs.length },
    }));
  }

  _renderShell() {
    this._shadow.innerHTML = `
      <style>${this._css()}</style>
      <div class="wrap">
        <div class="scroll" id="scroll">
          <div class="welcome">
            <div class="welcome-emoji">⚽</div>
            <div class="welcome-title">Welcome to The Terraces</div>
            <div class="welcome-sub">The site-wide fan room. Talk goals, picks &amp; trash. Be nice-ish.</div>
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
      this._unseen = 0;
      this._renderJump();
      this._scrollToBottom(true);
    });

    this._renderComposer();
  }

  _renderJump() {
    const j = this._shadow.getElementById('jump');
    if (!j) return;
    if (this._unseen > 0) {
      j.hidden = false;
      j.textContent = `${this._unseen} new message${this._unseen > 1 ? 's' : ''} ↓`;
    } else {
      j.hidden = true;
    }
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
    if (!this._user) {
      c.innerHTML = `<div class="signin-note">🔒 Sign in to join the conversation</div>`;
      return;
    }
    c.innerHTML = `
      <div class="quick" id="quick">
        ${QUICK_EMOJI.map((e) => `<button class="qbtn" data-e="${e}">${e}</button>`).join('')}
      </div>
      <div class="row">
        <input id="input" class="input" maxlength="200" autocomplete="off"
               placeholder="Say something to the room…" enterkeyhint="send">
        <button id="send" class="send">Send</button>
      </div>
    `;
    const input = this._shadow.getElementById('input');
    const send = this._shadow.getElementById('send');
    const submit = () => this._send(input.value);
    send.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    this._shadow.querySelectorAll('.qbtn').forEach((b) => {
      b.addEventListener('click', () => {
        input.value = (input.value + b.dataset.e).slice(0, 200);
        input.focus();
      });
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
      if (day !== lastDay) {
        html += `<div class="day-sep"><span>${day}</span></div>`;
        lastDay = day;
      }
      html += this._bubble(m, m.userId === me);
    }
    list.innerHTML = html;

    list.querySelectorAll('.bubble').forEach((el) => {
      let last = 0;
      const heart = () => this._toggleHeart(el.dataset.ts);
      el.addEventListener('dblclick', heart);
      el.addEventListener('touchend', () => {
        const t = Date.now();
        if (t - last < 320) heart();
        last = t;
      });
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
            ${esc(m.text)}
            ${hearted}
          </div>
          <div class="tm">${m._pending ? 'sending…' : timeAgo(m.ts)}</div>
        </div>
      </div>`;
  }

  _css() {
    return `
      :host { display: flex; flex-direction: column; min-height: 0; flex: 1; }
      * { box-sizing: border-box; }
      .wrap { display: flex; flex-direction: column; flex: 1; min-height: 0; position: relative; }

      .scroll {
        flex: 1; min-height: 0; overflow-y: auto;
        padding: 14px 12px 8px;
        display: flex; flex-direction: column;
        scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) transparent;
        overscroll-behavior: contain;
      }
      .scroll::-webkit-scrollbar { width: 4px; }
      .scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }

      .welcome {
        margin: auto; text-align: center; padding: 30px 16px;
        display: flex; flex-direction: column; align-items: center; gap: 6px;
      }
      .welcome-emoji { font-size: 2.6rem; }
      .welcome-title { font-size: 1.05rem; font-weight: 900; color: #fff; }
      .welcome-sub { font-size: 0.82rem; color: rgba(255,255,255,0.5); max-width: 260px; line-height: 1.5; }

      .day-sep { text-align: center; margin: 12px 0 8px; }
      .day-sep span {
        font-size: 0.62rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
        color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.05);
        padding: 3px 12px; border-radius: 20px;
      }

      .msg { display: flex; gap: 8px; margin-bottom: 12px; align-items: flex-end; animation: pop 0.22s ease; }
      .msg.mine { flex-direction: row-reverse; }
      @keyframes pop { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; } }

      .av {
        width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        font-size: 0.78rem; font-weight: 800; object-fit: cover; overflow: hidden;
      }
      img.av { display: block; }

      .col { display: flex; flex-direction: column; min-width: 0; max-width: 78%; }
      .msg.mine .col { align-items: flex-end; }

      .meta { display: flex; align-items: center; gap: 5px; margin: 0 0 3px 4px; }
      .nm { font-size: 0.72rem; font-weight: 800; color: rgba(255,255,255,0.85); }
      .rk { font-size: 0.58rem; font-weight: 800; color: #BFA260; background: rgba(191,162,96,0.14); padding: 1px 5px; border-radius: 7px; }
      .st { font-size: 0.62rem; font-weight: 800; color: #ff8a4c; }

      .bubble {
        position: relative;
        background: rgba(255,255,255,0.08);
        color: #f3f4f6;
        padding: 9px 13px; border-radius: 16px 16px 16px 4px;
        font-size: 0.9rem; line-height: 1.4; word-break: break-word;
        border: 1px solid rgba(255,255,255,0.06);
        cursor: default; -webkit-user-select: none; user-select: none;
      }
      .b-mine {
        background: linear-gradient(135deg, #BFA260, #d8bd7e);
        color: #08152e; font-weight: 600;
        border-radius: 16px 16px 4px 16px; border-color: transparent;
      }
      .bubble.pending { opacity: 0.55; }
      .heart {
        position: absolute; bottom: -8px; right: -4px; font-size: 0.78rem;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4)); animation: pop 0.25s ease;
      }
      .msg.mine .heart { right: auto; left: -4px; }

      .tm { font-size: 0.6rem; color: rgba(255,255,255,0.32); margin: 3px 4px 0; }

      .jump {
        position: absolute; left: 50%; bottom: 92px; transform: translateX(-50%);
        background: #BFA260; color: #08152e; border: none;
        font-size: 0.78rem; font-weight: 800; padding: 8px 16px; border-radius: 20px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.4); cursor: pointer; z-index: 5;
        animation: pop 0.2s ease;
      }

      .composer {
        flex-shrink: 0; padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
        background: #0a1730; border-top: 1px solid rgba(255,255,255,0.08);
      }
      .signin-note {
        text-align: center; font-size: 0.82rem; color: rgba(255,255,255,0.5);
        padding: 10px;
      }
      .quick { display: flex; gap: 4px; overflow-x: auto; padding-bottom: 7px; scrollbar-width: none; }
      .quick::-webkit-scrollbar { display: none; }
      .qbtn {
        flex-shrink: 0; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.08);
        border-radius: 18px; font-size: 1.15rem; padding: 3px 9px; cursor: pointer; line-height: 1.4;
        transition: transform 0.1s, background 0.15s;
      }
      .qbtn:active { transform: scale(0.88); background: rgba(191,162,96,0.25); }

      .row { display: flex; gap: 8px; align-items: center; }
      .input {
        flex: 1; min-width: 0; background: rgba(255,255,255,0.08);
        border: 1.5px solid rgba(255,255,255,0.12); border-radius: 22px;
        padding: 11px 16px; font-size: 0.92rem; color: #fff; outline: none;
        font-family: inherit; transition: border-color 0.15s;
      }
      .input::placeholder { color: rgba(255,255,255,0.35); }
      .input:focus { border-color: #BFA260; background: rgba(255,255,255,0.12); }
      .send {
        flex-shrink: 0; background: #BFA260; color: #08152e; border: none;
        border-radius: 22px; padding: 11px 20px; font-size: 0.88rem; font-weight: 900;
        cursor: pointer; min-width: 64px; transition: opacity 0.15s, transform 0.1s;
      }
      .send:active { transform: scale(0.95); }
      .send:disabled { opacity: 0.5; cursor: default; }
    `;
  }
}

customElements.define('wc-lobby', WcLobby);
