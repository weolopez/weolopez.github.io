// wc-social-feed.js — Live social prediction feed with Shadow DOM comment threads

// ── Team color palette (deterministic avatar theming) ─────────────────────
const TEAM_PALETTE = [
  { bg: '#002395', fg: '#FFFFFF' }, // France navy
  { bg: '#AA151B', fg: '#FFDF00' }, // Spain crimson/gold
  { bg: '#000000', fg: '#FFD700' }, // Germany black/gold
  { bg: '#009C3B', fg: '#FFDF00' }, // Brazil green/yellow
  { bg: '#002868', fg: '#BF0A30' }, // USA navy/red
  { bg: '#CF142B', fg: '#FFFFFF' }, // England red
  { bg: '#006600', fg: '#FFFFFF' }, // Mexico green
  { bg: '#75AADB', fg: '#FFFFFF' }, // Argentina sky blue
  { bg: '#003087', fg: '#FF7900' }, // Netherlands blue/orange
  { bg: '#D21034', fg: '#FFFFFF' }, // Portugal red
  { bg: '#B22222', fg: '#FFD700' }, // Morocco crimson/gold
  { bg: '#006233', fg: '#FFFFFF' }, // Saudi Arabia green
  { bg: '#00247D', fg: '#FFFFFF' }, // Japan dark blue
  { bg: '#C8102E', fg: '#FFFFFF' }, // South Korea red
  { bg: '#012169', fg: '#FCD116' }, // Uruguay navy/gold
  { bg: '#007A4D', fg: '#FFCB00' }, // Senegal green/gold
];

// ── Quick-reaction emojis ─────────────────────────────────────────────────
const REACTIONS = ['🔥', '💯', '😮', '👏', '🎯'];


function _userColor(userId) {
  const idx = userId
    ? userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % TEAM_PALETTE.length
    : 0;
  return TEAM_PALETTE[idx];
}

function _escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── wc-comment-thread: Shadow DOM encapsulated comment list ───────────────
class WcCommentThread extends HTMLElement {
  static get observedAttributes() { return ['matchid', 'open']; }

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._messages = [];
    this._loading = false;
    this._user = null;
  }

  set user(u) { this._user = u; this._render(); }
  set messages(msgs) { this._messages = msgs || []; this._render(); }
  set leaderboard(lb) { this._lb = lb || []; this._render(); }

  _rank(userId) {
    const idx = (this._lb || []).findIndex(u => u.id === userId);
    return idx >= 0 ? idx + 1 : null;
  }

  connectedCallback() { this._render(); }

  attributeChangedCallback() { this._render(); }

  _render() {
    const u = this._user;
    const msgs = this._messages;

    this._shadow.innerHTML = `
      <style>
        :host { display: block; }

        .thread {
          border-top: 1px solid #F3F4F6;
          padding-top: 10px;
          margin-top: 6px;
        }

        .msg {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
          padding-left: 8px;
          border-left: 2px solid #E5E7EB;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; } }

        .avatar {
          width: 26px; height: 26px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem; font-weight: 800;
          flex-shrink: 0;
          overflow: hidden;
        }

        .avatar img { width: 100%; height: 100%; object-fit: cover; }

        .body { flex: 1; min-width: 0; }

        .name-row {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }

        .name {
          font-size: 0.74rem;
          font-weight: 700;
          color: #111827;
        }

        .rank-chip {
          font-size: 0.58rem;
          font-weight: 700;
          padding: 1px 5px;
          background: #0a1f44;
          color: #BFA260;
          border-radius: 8px;
        }

        .streak-chip {
          font-size: 0.65rem;
          color: #ff6b2b;
          font-weight: 700;
        }

        .text {
          font-size: 0.78rem;
          color: #374151;
          margin-top: 2px;
          line-height: 1.45;
          word-break: break-word;
        }

        .time {
          font-size: 0.62rem;
          color: #9CA3AF;
          margin-top: 2px;
        }

        .empty {
          font-size: 0.75rem;
          color: #9CA3AF;
          padding: 4px 0 8px;
          padding-left: 8px;
        }

        .form {
          display: flex;
          gap: 6px;
          margin-top: 8px;
          padding-left: 8px;
        }

        .input {
          flex: 1;
          padding: 7px 12px;
          border: 1.5px solid #E5E7EB;
          border-radius: 20px;
          font-size: 0.78rem;
          outline: none;
          font-family: inherit;
          background: #F9FAFB;
          min-width: 0;
          transition: border-color 0.15s;
        }

        .input:focus { border-color: #0a1f44; background: white; }

        .send-btn {
          padding: 7px 14px;
          background: #0a1f44;
          color: white;
          border: none;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: background 0.15s;
        }

        .send-btn:hover { background: #1a3a6b; }
        .send-btn:disabled { opacity: 0.5; cursor: default; }

        .sign-in-note {
          font-size: 0.72rem;
          color: #9CA3AF;
          padding: 6px 8px;
          margin-top: 4px;
        }
      </style>

      <div class="thread">
        ${msgs.length === 0
          ? '<div class="empty">Be the first to comment…</div>'
          : msgs.slice(-15).map(m => this._msgHtml(m)).join('')}
        ${u
          ? `<div class="form">
               <input class="input" id="reply-input" placeholder="Comment…" maxlength="200" autocomplete="off">
               <button class="send-btn" id="send-btn">Send</button>
             </div>`
          : '<div class="sign-in-note">Sign in to comment</div>'}
      </div>
    `;

    const sendBtn = this._shadow.getElementById('send-btn');
    const input   = this._shadow.getElementById('reply-input');
    if (sendBtn && input) {
      const submit = async () => {
        const text = input.value.trim();
        if (!text) return;
        sendBtn.disabled = true;
        input.value = '';
        this.dispatchEvent(new CustomEvent('wc-reply', { bubbles: true, composed: true, detail: { text } }));
        sendBtn.disabled = false;
      };
      sendBtn.addEventListener('click', submit);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    }
  }

  _msgHtml(m) {
    const color = _userColor(m.userId || 'x');
    const rank = this._rank(m.userId);
    const lbUser = (this._lb || []).find(u => u.id === m.userId);
    const streak = lbUser?.streak ?? 0;
    const avatarHtml = m.avatar
      ? `<div class="avatar"><img src="${_escHtml(m.avatar)}" alt=""></div>`
      : `<div class="avatar" style="background:${color.bg};color:${color.fg}">${_escHtml((m.name || '?')[0]).toUpperCase()}</div>`;
    return `<div class="msg">
      ${avatarHtml}
      <div class="body">
        <div class="name-row">
          <span class="name">${_escHtml(m.name || 'Fan')}</span>
          ${rank ? `<span class="rank-chip">#${rank}</span>` : ''}
          ${streak >= 3 ? `<span class="streak-chip">🔥${streak}</span>` : ''}
        </div>
        <div class="text">${_escHtml(m.text || '')}</div>
        <div class="time">${_timeAgo(m.ts || m.timestamp || Date.now())}</div>
      </div>
    </div>`;
  }
}

customElements.define('wc-comment-thread', WcCommentThread);

// ── wc-social-feed: main feed component ──────────────────────────────────
class WcSocialFeed extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._matches = [];
    this._predictions = {};
    this._leaderboard = [];
    this._user = null;
    this._reactions = JSON.parse(localStorage.getItem('wc26-feed-reactions') || '{}');
    this._expanded = new Set();
    this._threads = {};
    this._liveEvents = [];
    this._chatMessages = []; // recent chat messages from SSE
    this._rendering = false;
  }

  // ── Property setters ────────────────────────────────────────────────────
  set matches(v)     { this._matches = v || [];     this._scheduleRender(); }
  set predictions(v) { this._predictions = v || {}; this._scheduleRender(); }
  set leaderboard(v) { this._leaderboard = v || []; this._scheduleRender(); }
  set user(v)        { this._user = v;               this._scheduleRender(); }

  connectedCallback() {
    this._scheduleRender();
    this._listenForLiveEvents();
  }

  disconnectedCallback() {
    this._cleanup?.();
  }

  // ── Debounced render to batch rapid property updates ─────────────────
  _scheduleRender() {
    if (this._renderTimer) clearTimeout(this._renderTimer);
    this._renderTimer = setTimeout(() => this._render(), 50);
  }

  // ── Listen for SSE events forwarded from main page ────────────────────
  _listenForLiveEvents() {
    const onMatchEvent = e => {
      const { match, type } = e.detail;
      if (!match) return;
      const icon = type === 'goal' ? '⚽' : type === 'full_time' ? '🏁' : '🔔';
      const badge = match.status === 'live' ? 'LIVE' : match.status === 'finished' ? 'FT' : null;
      const title = match.status === 'live'
        ? `${match.home?.flag || ''} ${match.homeScore ?? 0}–${match.awayScore ?? 0} ${match.away?.flag || ''}`
        : match.status === 'finished'
        ? `FT: ${match.home?.flag || ''} ${match.homeScore}–${match.awayScore} ${match.away?.flag || ''}`
        : `${match.home?.name} vs ${match.away?.name} update`;
      const sub = `${match.home?.name} vs ${match.away?.name} · Group ${match.group}`;

      this._liveEvents.unshift({ id: Date.now(), icon, title, sub, badge, match });
      if (this._liveEvents.length > 3) this._liveEvents.pop();
      this._scheduleRender();
    };

    const onChatMsg = e => {
      const { matchId, msg } = e.detail;
      if (!msg) return;
      this._chatMessages.unshift({ ...msg, matchId, _feedEntry: true });
      if (this._chatMessages.length > 20) this._chatMessages.pop();
      if (this._threads[matchId]) {
        this._threads[matchId] = [...this._threads[matchId], msg];
      }
      this._scheduleRender();
    };

    window.addEventListener('wc-feed-match-event', onMatchEvent);
    window.addEventListener('wc-feed-chat-event', onChatMsg);
    this._cleanup = () => {
      window.removeEventListener('wc-feed-match-event', onMatchEvent);
      window.removeEventListener('wc-feed-chat-event', onChatMsg);
    };
  }

  // ── Build ordered feed items ─────────────────────────────────────────
  _feedItems() {
    const items = [];

    // 1. Live match event blocks at top
    for (const ev of this._liveEvents) {
      items.push({ type: 'live_event', ...ev });
    }

    // 2. Recent chat activity (from SSE feed, not from user's own messages)
    for (const m of this._chatMessages.slice(0, 3)) {
      const match = this._matches.find(mx => mx.id === m.matchId);
      if (match) items.push({ type: 'chat_activity', msg: m, match });
    }

    // 3. User's own prediction cards, newest first
    const predCards = Object.entries(this._predictions)
      .map(([matchId, pred]) => {
        const match = this._matches.find(mx => mx.id === +matchId || String(mx.id) === matchId);
        return match ? { type: 'prediction', match, pred } : null;
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.match.date) - new Date(a.match.date));

    items.push(...predCards);

    // 4. If nothing to show, promote upcoming matches as preview cards
    if (predCards.length === 0 && this._liveEvents.length === 0) {
      const upcoming = this._matches
        .filter(m => m.status === 'scheduled')
        .slice(0, 4)
        .map(match => ({ type: 'match_preview', match }));
      items.push(...upcoming);
    }

    return items;
  }

  _userRank(userId) {
    const idx = this._leaderboard.findIndex(u => u.id === userId);
    return idx >= 0 ? idx + 1 : null;
  }

  _calcResult(pred, match) {
    if (!pred || match.status !== 'finished' || match.homeScore == null) {
      return match.status === 'finished' ? { cls: 'chip-wrong', label: '❌ No pick' } : null;
    }
    const exact = pred.homeScore === match.homeScore && pred.awayScore === match.awayScore;
    const aWinner = match.homeScore > match.awayScore ? 'h' : match.awayScore > match.homeScore ? 'a' : 'd';
    const pWinner = pred.homeScore  > pred.awayScore  ? 'h' : pred.awayScore  > pred.homeScore  ? 'a' : 'd';
    const correct = aWinner === pWinner;
    const sameGD  = Math.abs(pred.homeScore - pred.awayScore) === Math.abs(match.homeScore - match.awayScore);
    if (exact)                   return { cls: 'chip-exact',     label: '🎯 Exact +5' };
    if (correct && sameGD)       return { cls: 'chip-gdcorrect', label: '📐 Margin +3' };
    if (correct)                 return { cls: 'chip-correct',   label: '✅ Correct +1' };
    return                              { cls: 'chip-wrong',     label: '❌ Wrong' };
  }

  // ── Thread loading ───────────────────────────────────────────────────
  async _loadThread(matchId) {
    try {
      const res = await fetch(`/worldcup/api/chat/${matchId}`, { credentials: 'include' });
      if (res.ok) {
        const msgs = await res.json();
        this._threads[matchId] = msgs;
        this._scheduleRender();
      }
    } catch (_) {}
  }

  async _postReply(matchId, text) {
    try {
      await fetch(`/worldcup/api/chat/${matchId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      delete this._threads[matchId];
      await this._loadThread(matchId);
    } catch (_) {}
  }

  // ── Reactions ────────────────────────────────────────────────────────
  _toggleReaction(cardId, emoji) {
    if (!this._reactions[cardId]) this._reactions[cardId] = {};
    const already = this._reactions[cardId][emoji];
    this._reactions[cardId] = already ? {} : { [emoji]: 1 };
    localStorage.setItem('wc26-feed-reactions', JSON.stringify(this._reactions));
    this._scheduleRender();
  }

  _reactionCount(cardId, emoji) {
    return this._reactions[cardId]?.[emoji] ? 1 : 0;
  }

  // ── Avatar HTML ──────────────────────────────────────────────────────
  _avatarHtml(user, size = 32, lbUser) {
    const color = _userColor(user?.id || 'x');
    const streak = lbUser?.streak ?? user?.streak ?? 0;
    const borderColor = streak >= 5 ? '#ff6b2b' : streak >= 3 ? '#FFD700' : color.bg;
    const border = `2px solid ${borderColor}`;
    if (user?.avatar) {
      return `<div class="avatar" style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;border:${border};flex-shrink:0"><img src="${_escHtml(user.avatar)}" alt="" style="width:100%;height:100%;object-fit:cover"></div>`;
    }
    return `<div class="avatar" style="width:${size}px;height:${size}px;border-radius:50%;background:${color.bg};color:${color.fg};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${Math.round(size * 0.35)}px;border:${border};flex-shrink:0">${_escHtml((user?.name || '?')[0]).toUpperCase()}</div>`;
  }

  // ── CSS ──────────────────────────────────────────────────────────────
  _css() {
    return `
      :host { display: block; font-family: 'Segoe UI', system-ui, sans-serif; }

      .feed-header {
        background: #0a1f44;
        color: white;
        padding: 10px 14px;
        font-weight: 700;
        font-size: 0.85rem;
        border-radius: 10px 10px 0 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .live-dot {
        width: 7px; height: 7px;
        border-radius: 50%;
        background: #00DF89;
        animation: blink 1.4s infinite;
        flex-shrink: 0;
      }

      @keyframes blink { 50% { opacity: 0.3; } }

      .user-rank-chip {
        margin-left: auto;
        font-size: 0.72rem;
        color: #BFA260;
        font-weight: 600;
      }

      .feed-body {
        background: white;
        border: 1px solid #E5E7EB;
        border-top: none;
        border-radius: 0 0 10px 10px;
        overflow: hidden;
      }

      .feed-scroll {
        max-height: 72vh;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: #E5E7EB transparent;
      }

      .feed-scroll::-webkit-scrollbar { width: 4px; }
      .feed-scroll::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 4px; }

      .feed-item {
        border-bottom: 1px solid #F3F4F6;
        padding: 12px 14px;
        animation: slideIn 0.18s ease;
      }

      @keyframes slideIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; } }

      .feed-item:last-child { border-bottom: none; }

      /* ── user row ── */
      .user-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .user-meta { flex: 1; min-width: 0; }

      .user-name-row {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
        font-size: 0.82rem;
        font-weight: 700;
        color: #111827;
      }

      .rank-badge {
        font-size: 0.62rem;
        font-weight: 700;
        padding: 1px 5px;
        border-radius: 8px;
        background: #0a1f44;
        color: #BFA260;
      }

      .streak-badge {
        font-size: 0.68rem;
        font-weight: 700;
        color: #ff6b2b;
      }

      .time-ago {
        font-size: 0.66rem;
        color: #9CA3AF;
        margin-top: 1px;
      }

      /* ── prediction card ── */
      .pred-card {
        background: #F9FAFB;
        border: 1px solid #E5E7EB;
        border-radius: 10px;
        padding: 10px 12px;
        margin-bottom: 8px;
      }

      .pred-card-label {
        font-size: 0.62rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #9CA3AF;
        margin-bottom: 7px;
        display: flex;
        justify-content: space-between;
      }

      .live-label { color: #ef4444; animation: blink 1.4s infinite; }
      .ft-label   { color: #15803D; }

      .score-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .team-block {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        flex: 1;
      }

      .team-flag  { font-size: 1.6rem; line-height: 1; }
      .team-name  { font-size: 0.66rem; font-weight: 700; text-align: center; color: #374151; }

      .score-block {
        text-align: center;
        min-width: 52px;
      }

      .pred-score {
        font-size: 1.5rem;
        font-weight: 900;
        color: #0a1f44;
        line-height: 1;
      }

      .actual-score {
        font-size: 0.66rem;
        color: #6B7280;
        margin-top: 3px;
      }

      .result-chip {
        display: inline-block;
        font-size: 0.62rem;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 8px;
        margin-top: 4px;
      }

      .chip-exact     { background: #D1FAE5; color: #065F46; }
      .chip-gdcorrect { background: #DBEAFE; color: #1E40AF; }
      .chip-correct   { background: #FEF3C7; color: #92400E; }
      .chip-wrong     { background: #FEE2E2; color: #991B1B; }

      /* ── reactions ── */
      .reactions-row {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
        align-items: center;
        margin-top: 6px;
      }

      .rxn-btn {
        border: 1.5px solid #E5E7EB;
        background: white;
        border-radius: 20px;
        padding: 3px 8px 3px 6px;
        font-size: 0.78rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 3px;
        transition: all 0.1s;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      .rxn-btn:hover  { border-color: #0a1f44; transform: scale(1.06); }
      .rxn-btn.active { background: #EFF6FF; border-color: #0a1f44; }

      .reply-toggle {
        margin-left: auto;
        font-size: 0.72rem;
        color: #0a1f44;
        font-weight: 600;
        background: none;
        border: none;
        cursor: pointer;
        padding: 3px 6px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 3px;
        transition: background 0.1s;
      }

      .reply-toggle:hover { background: #F3F4F6; }

      /* ── live event block ── */
      .event-block {
        background: linear-gradient(135deg, #0a1f44 0%, #1a3a6b 100%);
        color: white;
        border-radius: 10px;
        padding: 11px 13px;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .event-icon { font-size: 1.4rem; flex-shrink: 0; }

      .event-body { flex: 1; min-width: 0; }

      .event-title {
        font-size: 0.85rem;
        font-weight: 800;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .event-sub {
        font-size: 0.7rem;
        color: rgba(255,255,255,0.7);
        margin-top: 2px;
      }

      .event-badge {
        background: #00DF89;
        color: #0a1f44;
        font-size: 0.6rem;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 10px;
        flex-shrink: 0;
      }

      /* ── chat activity card ── */
      .chat-card {
        background: #F0F7FF;
        border: 1px solid #DBEAFE;
        border-radius: 10px;
        padding: 9px 12px;
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }

      .chat-card-body { flex: 1; min-width: 0; }

      .chat-card-header {
        font-size: 0.68rem;
        color: #1E40AF;
        font-weight: 600;
        margin-bottom: 3px;
      }

      .chat-card-text {
        font-size: 0.78rem;
        color: #1E3A5F;
        line-height: 1.4;
        word-break: break-word;
      }

      /* ── match preview card ── */
      .preview-block {
        background: #F9FAFB;
        border: 1px dashed #D1D5DB;
        border-radius: 10px;
        padding: 10px 12px;
        text-align: center;
      }

      .preview-flags { font-size: 1.4rem; margin-bottom: 4px; }

      .preview-names {
        font-size: 0.78rem;
        font-weight: 700;
        color: #374151;
        margin-bottom: 2px;
      }

      .preview-meta { font-size: 0.68rem; color: #9CA3AF; }

      .preview-cta {
        font-size: 0.72rem;
        color: #0a1f44;
        font-weight: 700;
        margin-top: 5px;
      }

      /* ── empty state ── */
      .empty-state {
        padding: 28px 16px;
        text-align: center;
        color: #9CA3AF;
        font-size: 0.82rem;
        line-height: 1.55;
      }

      .empty-icon { font-size: 2rem; margin-bottom: 8px; }
    `;
  }

  // ── Render ────────────────────────────────────────────────────────────
  _render() {
    const items   = this._feedItems();
    const u       = this._user;
    const rank    = u ? this._userRank(u.id) : null;
    const streak  = u?.streak ?? 0;
    const lbUser  = u ? this._leaderboard.find(x => x.id === u.id) : null;

    let rankChip = '';
    if (rank) {
      const icon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
      rankChip = `<span class="user-rank-chip">${icon}${streak >= 3 ? ` · 🔥${streak}` : ''}</span>`;
    }

    this._shadow.innerHTML = `
      <style>${this._css()}</style>
      <div class="feed-header">
        <div class="live-dot"></div>
        ⚽ Fan Feed
        ${rankChip}
      </div>
      <div class="feed-body">
        <div class="feed-scroll" id="scroll">
          ${items.length === 0
            ? `<div class="empty-state"><div class="empty-icon">⚽</div>Sign in &amp; predict matches — your picks will appear here.</div>`
            : items.map((item, i) => this._renderItem(item, i)).join('')}
        </div>
      </div>
    `;

    this._attachEvents();
    this._mountThreadComponents();
  }

  _renderItem(item, idx) {
    if (item.type === 'live_event')    return `<div class="feed-item" data-idx="${idx}">${this._renderEventBlock(item)}</div>`;
    if (item.type === 'chat_activity') return `<div class="feed-item" data-idx="${idx}">${this._renderChatCard(item)}</div>`;
    if (item.type === 'match_preview') return `<div class="feed-item" data-idx="${idx}">${this._renderPreviewCard(item)}</div>`;
    return `<div class="feed-item" data-card="pred-${item.match.id}">${this._renderPredCard(item)}</div>`;
  }

  _renderEventBlock(item) {
    return `<div class="event-block">
      <div class="event-icon">${item.icon || '⚡'}</div>
      <div class="event-body">
        <div class="event-title">${_escHtml(item.title || '')}</div>
        <div class="event-sub">${_escHtml(item.sub || '')}</div>
      </div>
      ${item.badge ? `<div class="event-badge">${_escHtml(item.badge)}</div>` : ''}
    </div>`;
  }

  _renderChatCard(item) {
    const { msg, match } = item;
    const color = _userColor(msg.userId);
    const avatarHtml = msg.avatar
      ? `<div style="width:26px;height:26px;border-radius:50%;overflow:hidden;flex-shrink:0;border:1.5px solid ${color.bg}"><img src="${_escHtml(msg.avatar)}" style="width:100%;height:100%;object-fit:cover"></div>`
      : `<div style="width:26px;height:26px;border-radius:50%;background:${color.bg};color:${color.fg};display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:800;flex-shrink:0">${_escHtml((msg.name || '?')[0]).toUpperCase()}</div>`;
    return `<div class="chat-card">
      ${avatarHtml}
      <div class="chat-card-body">
        <div class="chat-card-header">${_escHtml(msg.name || 'Fan')} · ${match.home?.flag || ''} vs ${match.away?.flag || ''} chat</div>
        <div class="chat-card-text">${_escHtml(msg.text || '')}</div>
      </div>
    </div>`;
  }

  _renderPreviewCard(item) {
    const { match: m } = item;
    const dt = new Date(m.date);
    const time = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    return `<div class="preview-block">
      <div class="preview-flags">${m.home?.flag || '🏳'} vs ${m.away?.flag || '🏳'}</div>
      <div class="preview-names">${_escHtml(m.home?.name || '?')} vs ${_escHtml(m.away?.name || '?')}</div>
      <div class="preview-meta">Group ${m.group} · ${time}</div>
      <div class="preview-cta">→ Predict this match</div>
    </div>`;
  }

  _renderPredCard(item) {
    const { match: m, pred } = item;
    const u        = this._user;
    const lbUser   = u ? this._leaderboard.find(x => x.id === u.id) : null;
    const rank     = u ? this._userRank(u.id) : null;
    const streak   = lbUser?.streak ?? u?.streak ?? 0;
    const cardId   = `pred-${m.id}`;
    const result   = this._calcResult(pred, m);
    const dt       = new Date(m.date);
    const timeAgo  = _timeAgo(dt);
    const expanded = this._expanded.has(cardId);
    const msgs     = this._threads[m.id] || [];

    const avatarHtml = this._avatarHtml(u, 32, lbUser);

    const statusLabel = m.status === 'live'
      ? `<span class="live-label">🔴 LIVE</span>`
      : m.status === 'finished'
      ? `<span class="ft-label">FT</span>`
      : '';

    const actualScore = (m.status === 'finished' || m.status === 'live') && m.homeScore != null
      ? `<div class="actual-score">Act: ${m.homeScore}–${m.awayScore}</div>`
      : '';

    const reactionsHtml = REACTIONS.map(emoji => {
      const isActive = !!this._reactions[cardId]?.[emoji];
      return `<button class="rxn-btn ${isActive ? 'active' : ''}" data-card="${cardId}" data-emoji="${emoji}" title="${emoji}">
        ${emoji}
      </button>`;
    }).join('');

    return `
      <div class="user-row">
        ${avatarHtml}
        <div class="user-meta">
          <div class="user-name-row">
            ${_escHtml(u?.name?.split(' ')[0] || 'Fan')}
            ${rank ? `<span class="rank-badge">#${rank}</span>` : ''}
            ${streak >= 3 ? `<span class="streak-badge">🔥${streak}</span>` : ''}
          </div>
          <div class="time-ago">${timeAgo}</div>
        </div>
      </div>

      <div class="pred-card">
        <div class="pred-card-label">
          <span>Group ${m.group} · ${_escHtml(m.venue?.split(',')[0] || '')}</span>
          ${statusLabel}
        </div>
        <div class="score-row">
          <div class="team-block">
            <div class="team-flag">${m.home?.flag || '🏳'}</div>
            <div class="team-name">${_escHtml(m.home?.name || '?')}</div>
          </div>
          <div class="score-block">
            <div class="pred-score">${pred.homeScore}–${pred.awayScore}</div>
            ${actualScore}
            ${result ? `<div><span class="result-chip ${result.cls}">${result.label}</span></div>` : ''}
          </div>
          <div class="team-block">
            <div class="team-flag">${m.away?.flag || '🏳'}</div>
            <div class="team-name">${_escHtml(m.away?.name || '?')}</div>
          </div>
        </div>
      </div>

      <div class="reactions-row">
        ${reactionsHtml}
        <button class="reply-toggle" data-card="${cardId}" data-match="${m.id}">
          💬 ${msgs.length > 0 ? msgs.length : ''} ${expanded ? '▲' : '▼'}
        </button>
      </div>

      ${expanded ? `<wc-comment-thread data-matchid="${m.id}" data-cardid="${cardId}"></wc-comment-thread>` : ''}
    `;
  }

  // ── Mount sub-components after shadow render ─────────────────────────
  _mountThreadComponents() {
    this._shadow.querySelectorAll('wc-comment-thread').forEach(el => {
      const matchId = +el.dataset.matchid;
      el.user        = this._user;
      el.leaderboard = this._leaderboard;
      el.messages    = this._threads[matchId] || [];

      el.addEventListener('wc-reply', async e => {
        const { text } = e.detail;
        await this._postReply(matchId, text);
      });
    });
  }

  // ── Attach events after shadow render ────────────────────────────────
  _attachEvents() {
    // Reactions
    this._shadow.querySelectorAll('.rxn-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        this._toggleReaction(btn.dataset.card, btn.dataset.emoji);
      });
    });

    // Thread toggle
    this._shadow.querySelectorAll('.reply-toggle').forEach(btn => {
      btn.addEventListener('click', async () => {
        const { card, match: matchId } = btn.dataset;
        if (this._expanded.has(card)) {
          this._expanded.delete(card);
          this._scheduleRender();
        } else {
          this._expanded.add(card);
          if (!this._threads[matchId]) await this._loadThread(matchId);
          else this._scheduleRender();
        }
      });
    });
  }
}

customElements.define('wc-social-feed', WcSocialFeed);
