import { TEAM_DATA } from './team-data.js';

const API = '/worldcup';

const POS_ORDER = { GK: 0, DEF: 1, MID: 2, FWD: 3, FW: 3, MF: 2, DF: 1 };
const POS_GROUP = { GK: 'Goalkeepers', DEF: 'Defenders', DF: 'Defenders', MID: 'Midfielders', MF: 'Midfielders', FWD: 'Forwards', FW: 'Forwards' };
const POS_GROUP_ORDER = ['Goalkeepers', 'Defenders', 'Midfielders', 'Forwards'];

function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Stable pseudo-random integer in [min,max] seeded by a string — for mock social-proof numbers.
function seeded(str, min, max) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return min + (h % (max - min + 1));
}

const STYLES = `
    :host {
        display: block;
        --primary: var(--team-primary, #0a1f44);
        --primary-2: var(--team-secondary, #1a3a6b);
        --gold: #BFA260;
        --dark: #111827; --mid: #374151; --muted: #6B7280;
        --border: #E5E7EB; --bg: #f3f4f6; --card: #ffffff;
        --green: #15803D; --red: #ef4444;
        font-family: 'Segoe UI', system-ui, sans-serif; color: var(--dark);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── HERO ── */
    .hero { background: linear-gradient(140deg, var(--primary) 0%, var(--primary-2) 100%);
        color: #fff; padding: 26px 20px 20px; text-align: center; position: relative; }
    .hero .flag { font-size: 4.2rem; line-height: 1; filter: drop-shadow(0 4px 10px rgba(0,0,0,.3)); }
    .hero .name { font-size: 1.7rem; font-weight: 900; margin-top: 6px; }
    .hero .nick { font-size: 0.9rem; font-weight: 600; opacity: 0.85; font-style: italic; margin-top: 2px; }
    .hero .chips { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-top: 10px; }
    .hero .chip { background: rgba(255,255,255,0.16); border-radius: 20px; padding: 4px 11px;
        font-size: 0.68rem; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; }
    .quick { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-top: 16px; }
    .quick .tile { background: rgba(255,255,255,0.12); border-radius: 12px; padding: 10px 6px; }
    .quick .tile .v { font-size: 1.25rem; font-weight: 900; }
    .quick .tile .v .trend { font-size: 0.7rem; vertical-align: super; }
    .quick .tile .l { font-size: 0.58rem; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.5px; opacity: 0.8; margin-top: 2px; }
    .trend.up { color: #4ade80; } .trend.down { color: #fca5a5; }
    .follow-row { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }
    .follow-btn { display: inline-flex; align-items: center; gap: 7px; border: 2px solid #fff;
        background: #fff; color: var(--primary); font-weight: 800; font-size: 0.85rem;
        padding: 9px 18px; border-radius: 24px; cursor: pointer; transition: all 0.15s; }
    .follow-btn.following { background: transparent; color: #fff; }
    .follow-btn:active { transform: scale(0.96); }
    .follow-count { font-size: 0.78rem; opacity: 0.9; font-weight: 600; }

    /* ── STICKY PILL NAV ── */
    .nav { position: sticky; top: var(--nav-top, 0); z-index: 50; background: var(--card);
        border-bottom: 1px solid var(--border); display: flex; gap: 4px; overflow-x: auto;
        scrollbar-width: none; padding: 6px 10px; }
    .nav::-webkit-scrollbar { display: none; }
    .nav button { flex-shrink: 0; border: none; background: none; font-family: inherit;
        font-size: 0.8rem; font-weight: 700; color: var(--muted); padding: 8px 13px;
        border-radius: 20px; cursor: pointer; white-space: nowrap; transition: all 0.15s; }
    .nav button.active { background: var(--primary); color: #fff; }

    /* ── SECTIONS ── */
    section { padding: 18px 16px; max-width: 640px; margin: 0 auto; scroll-margin-top: calc(var(--nav-top, 0px) + 52px); }
    .sec-title { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;
        color: var(--muted); margin: 4px 0 12px; }

    .card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 14px; margin-bottom: 12px; }

    /* win prob */
    .prob-bar { height: 10px; border-radius: 6px; background: var(--border); overflow: hidden; margin: 8px 0 4px; }
    .prob-bar > span { display: block; height: 100%; background: linear-gradient(90deg, var(--primary), var(--primary-2)); }
    .prob-row { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--muted); font-weight: 600; }

    /* fun-fact carousel */
    .facts { display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; padding-bottom: 4px; }
    .facts::-webkit-scrollbar { display: none; }
    .fact { scroll-snap-align: start; flex: 0 0 86%; background: linear-gradient(135deg, var(--primary), var(--primary-2));
        color: #fff; border-radius: 14px; padding: 16px; }
    .fact .l { font-size: 0.6rem; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: var(--gold); margin-bottom: 6px; }
    .fact p { font-size: 0.85rem; line-height: 1.55; opacity: 0.95; }

    .chips2 { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip2 { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 7px 12px; font-size: 0.78rem; }
    .chip2 strong { display: block; color: var(--primary); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1px; }

    .honor { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; padding: 7px 0; border-bottom: 1px dashed var(--border); }
    .honor:last-child { border-bottom: none; }
    .honor .ico { font-size: 1.1rem; }

    /* next match */
    .next { display: flex; align-items: center; gap: 12px; }
    .next .t { flex: 1; text-align: center; }
    .next .t .fl { font-size: 2rem; } .next .t .nm { font-size: 0.72rem; font-weight: 700; margin-top: 2px; }
    .next .mid { text-align: center; }
    .next .mid .d { font-size: 0.7rem; color: var(--muted); font-weight: 600; }
    .next .mid .vs { font-size: 1.1rem; font-weight: 800; color: var(--primary); }

    /* squad */
    .pitch { background: linear-gradient(180deg,#1f7a44,#15803D); border-radius: 14px; padding: 10px;
        text-align: center; color: #fff; font-weight: 800; font-size: 0.75rem; margin-bottom: 12px; letter-spacing: 1px; }
    .squad-grp + .squad-grp { margin-top: 14px; }
    .grp-l { font-size: 0.66rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-bottom: 8px; }
    .players { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px,1fr)); gap: 9px; }
    .pl { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 11px; position: relative; }
    .pl.star { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold) inset; }
    .pl .num { position: absolute; top: 9px; right: 11px; font-size: 0.95rem; font-weight: 900; color: var(--border); }
    .pl .pn { font-size: 0.85rem; font-weight: 800; color: var(--primary); padding-right: 22px; }
    .pl .badge { display: inline-block; font-size: 0.56rem; font-weight: 800; padding: 1px 6px; border-radius: 4px; margin: 4px 6px 4px 0; }
    .pl .badge.cap { background: var(--primary); color: #fff; }
    .pl .badge.star { background: var(--gold); color: var(--primary); }
    .pl .meta { font-size: 0.72rem; color: var(--muted); line-height: 1.5; }
    .pl .stats { display: flex; gap: 10px; margin-top: 5px; font-size: 0.68rem; color: var(--mid); font-weight: 700; }

    /* form + fixtures */
    .form { display: flex; gap: 6px; align-items: center; margin-bottom: 12px; }
    .form .l { font-size: 0.66rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-right: 4px; }
    .pip { width: 24px; height: 24px; border-radius: 7px; display: inline-flex; align-items: center;
        justify-content: center; font-size: 0.72rem; font-weight: 900; color: #fff; }
    .pip.W { background: var(--green); } .pip.D { background: #9ca3af; } .pip.L { background: var(--red); }
    .fix { display: flex; align-items: center; gap: 10px; padding: 11px 0; border-bottom: 1px solid var(--border); text-decoration: none; color: inherit; }
    .fix:last-child { border-bottom: none; }
    .fix .when { width: 52px; font-size: 0.68rem; color: var(--muted); font-weight: 700; text-align: center; flex-shrink: 0; }
    .fix .opp { flex: 1; font-size: 0.84rem; font-weight: 700; }
    .fix .opp .ven { font-size: 0.66rem; color: var(--muted); font-weight: 500; }
    .fix .res { font-weight: 900; font-size: 0.9rem; }
    .fix .res.live { color: var(--red); }
    .fix .cta { font-size: 0.7rem; font-weight: 800; color: var(--primary); border: 1.5px solid var(--primary); border-radius: 16px; padding: 4px 10px; }

    /* standings table */
    table { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
    th, td { padding: 8px 5px; text-align: center; }
    th { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); border-bottom: 1px solid var(--border); }
    td.team { text-align: left; font-weight: 700; }
    tr.me td { background: color-mix(in srgb, var(--primary) 10%, transparent); }
    tr.me td.team { color: var(--primary); }
    .flag-link { text-decoration: none; cursor: pointer; }
    .qual { width: 3px; display: inline-block; }

    /* fan zone */
    .fz-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .fz { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 14px; text-align: center; text-decoration: none; color: inherit; display: block; }
    .fz .ico { font-size: 1.6rem; } .fz .t { font-size: 0.82rem; font-weight: 800; color: var(--primary); margin-top: 6px; }
    .fz .s { font-size: 0.68rem; color: var(--muted); margin-top: 2px; }
    .toggle { display: flex; align-items: center; justify-content: space-between; }
    .switch { width: 44px; height: 26px; border-radius: 14px; background: var(--border); position: relative; transition: background 0.15s; flex-shrink: 0; }
    .switch.on { background: var(--green); }
    .switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: left 0.15s; }
    .switch.on::after { left: 21px; }

    .loading { text-align: center; padding: 40px; color: var(--muted); }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spinner { display: inline-block; width: 26px; height: 26px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.7s linear infinite; }
    .empty { text-align: center; padding: 24px; color: var(--muted); font-size: 0.85rem; }
`;

export class WcTeamPage extends HTMLElement {
    static get observedAttributes() { return ['team-id']; }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._team = null;        // { id, name, flag }
        this._matches = [];       // this team's matches, chronological
        this._allMatches = [];    // full list (for standings)
        this._io = null;
    }

    connectedCallback() {
        const id = this.getAttribute('team-id');
        if (id) this._load(id);
    }
    attributeChangedCallback(n, o, v) { if (n === 'team-id' && v && v !== o && this.shadowRoot) this._load(v); }

    async _load(teamId) {
        this._renderLoading();
        let allMatches = [], meta = null;
        try {
            const [mr, tr] = await Promise.all([
                fetch(`${API}/api/matches`, { credentials: 'include' }),
                fetch(`${API}/api/teams/${encodeURIComponent(teamId)}`, { credentials: 'include' }),
            ]);
            if (mr.ok) allMatches = await mr.json();
            if (tr.ok) meta = await tr.json();
        } catch (_) {}
        this._meta = meta; // { winProbability, followers, isFollowing, accuracy, tier } | null

        // Resolve identity from matches (name/flag); fall back to attributes/id.
        let team = { id: teamId, name: this.getAttribute('team-name') || teamId, flag: this.getAttribute('team-flag') || '⚽' };
        for (const m of allMatches) {
            if (m.home?.id === teamId) { team = { id: teamId, name: m.home.name, flag: m.home.flag }; break; }
            if (m.away?.id === teamId) { team = { id: teamId, name: m.away.name, flag: m.away.flag }; break; }
        }
        this._team = team;
        this._allMatches = allMatches;
        this._matches = allMatches
            .filter(m => m.home?.id === teamId || m.away?.id === teamId)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // Apply team-color theme.
        const data = TEAM_DATA[teamId] || {};
        if (data.colors?.primary) this.style.setProperty('--team-primary', data.colors.primary);
        if (data.colors?.secondary) this.style.setProperty('--team-secondary', data.colors.secondary);

        this.render();
        this.dispatchEvent(new CustomEvent('team-loaded', { detail: team, bubbles: true }));
    }

    _renderLoading() {
        this.shadowRoot.innerHTML = `<style>${STYLES}</style><div class="loading"><div class="spinner"></div></div>`;
    }

    // ── derived data ──
    _form() {
        return this._matches
            .filter(m => m.status === 'finished' && m.homeScore != null && m.awayScore != null)
            .map(m => {
                const home = m.home.id === this._team.id;
                const gf = home ? m.homeScore : m.awayScore;
                const ga = home ? m.awayScore : m.homeScore;
                return gf > ga ? 'W' : gf < ga ? 'L' : 'D';
            });
    }
    _group() { return this._matches.find(m => m.group)?.group || null; }
    _standings(g) {
        const tbl = {};
        for (const m of this._allMatches.filter(x => x.group === g)) {
            for (const t of [m.home, m.away]) if (!tbl[t.id]) tbl[t.id] = { team: t, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
            if (m.status === 'finished' && m.homeScore != null && m.awayScore != null) {
                const h = tbl[m.home.id], a = tbl[m.away.id];
                h.mp++; a.mp++; h.gf += m.homeScore; h.ga += m.awayScore; a.gf += m.awayScore; a.ga += m.homeScore;
                if (m.homeScore > m.awayScore) { h.w++; h.pts += 3; a.l++; }
                else if (m.homeScore < m.awayScore) { a.w++; a.pts += 3; h.l++; }
                else { h.d++; a.d++; h.pts++; a.pts++; }
            }
        }
        return Object.values(tbl).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
    }
    _nextMatch() { return this._matches.find(m => m.status !== 'finished'); }

    get _followKey() { return `wc26-follow-${this._team.id}`; }
    get _notifyKey() { return `wc26-notify-${this._team.id}`; }
    _isFollowing() { return localStorage.getItem(this._followKey) === '1'; }

    render() {
        const team = this._team;
        const d = TEAM_DATA[team.id] || {};
        const rank = d.fifaRanking;
        const trend = rank && d.fifaRankingPrev ? d.fifaRankingPrev - rank : 0; // +ve = improved
        const group = this._group();
        // Prefer real values from /api/teams/:id; fall back to local/seeded when offline or logged out.
        const following = this._meta?.isFollowing ?? this._isFollowing();
        const followers = this._meta?.followers ?? (seeded(team.id, 1800, 9200) + (following ? 1 : 0));
        const winProb = this._meta?.winProbability ?? seeded(team.id + 'wp', 3, 28);

        this.shadowRoot.innerHTML = `
            <style>${STYLES}</style>
            ${this._hero(team, d, rank, trend, group, following, followers)}
            <nav class="nav" id="nav"></nav>
            ${this._overview(team, d, group, winProb)}
            ${this._squad(d)}
            ${this._matchesSec(team)}
            ${this._standingsSec(group)}
            ${this._fanZone(team, followers)}
        `;

        this._buildNav();
        this._wireFollow();
        this._wireNotify();
        this._wireScrollSpy();
    }

    _hero(team, d, rank, trend, group, following, followers) {
        const trendHtml = trend > 0 ? `<span class="trend up">▲${trend}</span>` : trend < 0 ? `<span class="trend down">▼${-trend}</span>` : '';
        const titles = d.titles?.length ?? 0;
        return `<div class="hero">
            <div class="flag">${esc(team.flag)}</div>
            <div class="name">${esc(team.name)}</div>
            ${d.nickname ? `<div class="nick">"${esc(d.nickname)}"</div>` : ''}
            <div class="chips">
                ${d.confederation ? `<span class="chip">${esc(d.confederation)}</span>` : ''}
                ${group ? `<span class="chip">Group ${esc(group)}</span>` : ''}
            </div>
            <div class="quick">
                <div class="tile"><div class="v">${rank ? '#' + rank : '—'} ${trendHtml}</div><div class="l">World Rank</div></div>
                <div class="tile"><div class="v">${titles}</div><div class="l">WC Titles</div></div>
                <div class="tile"><div class="v">${d.wcAppearances ?? '—'}</div><div class="l">WC Apps</div></div>
            </div>
            <div class="follow-row">
                <button class="follow-btn ${following ? 'following' : ''}" id="follow">
                    ${following ? '★ Following' : '☆ Follow'}
                </button>
                <span class="follow-count" id="follow-count">${followers.toLocaleString()} fans</span>
            </div>
        </div>`;
    }

    _overview(team, d, group, winProb) {
        const next = this._nextMatch();
        const facts = d.funFacts?.length ? d.funFacts : (d.funFact ? [d.funFact] : []);
        const chips = [
            { l: 'Manager', v: d.manager?.name },
            { l: 'Captain', v: d.captain },
            { l: 'Formation', v: d.formation },
            { l: 'Qualified', v: d.qualification },
            { l: 'Capital', v: d.capital },
            { l: 'Population', v: d.population },
            { l: 'Confederation', v: d.confederation },
            { l: 'First WC', v: d.firstAppearance },
        ].filter(c => c.v != null && c.v !== '');

        return `<section id="sec-overview">
            <div class="card">
                <div class="sec-title" style="margin-top:0">Title Odds (projected)</div>
                <div class="prob-bar"><span style="width:${winProb}%"></span></div>
                <div class="prob-row"><span>Chance to win it all</span><span><b>${winProb}%</b></span></div>
            </div>
            ${next ? this._nextCard(next) : ''}
            ${facts.length ? `<div class="sec-title">Did you know?</div>
                <div class="facts">${facts.map(f => `<div class="fact"><div class="l">Fun Fact</div><p>${esc(f)}</p></div>`).join('')}</div>` : ''}
            ${chips.length ? `<div class="sec-title">Profile</div><div class="chips2">${chips.map(c => `<div class="chip2"><strong>${esc(c.l)}</strong>${esc(c.v)}</div>`).join('')}</div>` : ''}
            ${d.honors?.length ? `<div class="sec-title">Honours</div><div class="card" style="margin-top:0">${d.honors.map(h => `<div class="honor"><span class="ico">🏆</span>${esc(h)}</div>`).join('')}</div>` : ''}
        </section>`;
    }

    _nextCard(m) {
        const dt = new Date(m.date);
        const when = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        return `<div class="sec-title">Next Match</div>
            <a class="card next" href="/worldcup/match.html?id=${m.id}" style="text-decoration:none;color:inherit">
                <div class="t"><div class="fl">${esc(m.home.flag)}</div><div class="nm">${esc(m.home.name)}</div></div>
                <div class="mid"><div class="vs">vs</div><div class="d">${esc(when)}</div></div>
                <div class="t"><div class="fl">${esc(m.away.flag)}</div><div class="nm">${esc(m.away.name)}</div></div>
            </a>`;
    }

    _squad(d) {
        const players = d.players || [];
        if (!players.length) return `<section id="sec-squad"><div class="sec-title">Squad</div><div class="empty">Squad not available yet.</div></section>`;
        const groups = {};
        for (const p of players) {
            const g = POS_GROUP[p.pos] || 'Forwards';
            (groups[g] ||= []).push(p);
        }
        const grpHtml = POS_GROUP_ORDER.filter(g => groups[g]).map(g => `
            <div class="squad-grp">
                <div class="grp-l">${g}</div>
                <div class="players">${groups[g].map(p => `
                    <div class="pl ${p.isStar ? 'star' : ''}">
                        ${p.number != null ? `<div class="num">${p.number}</div>` : ''}
                        <div class="pn">${esc(p.name)}</div>
                        ${p.isCaptain ? '<span class="badge cap">© CAPTAIN</span>' : ''}
                        ${p.isStar ? '<span class="badge star">★ STAR</span>' : ''}
                        <div class="meta">${esc(p.club)} · Age ${esc(p.age)}</div>
                        ${(p.caps != null || p.goals != null) ? `<div class="stats">${p.caps != null ? `<span>${p.caps} caps</span>` : ''}${p.goals != null ? `<span>${p.goals} goals</span>` : ''}</div>` : ''}
                    </div>`).join('')}</div>
            </div>`).join('');
        return `<section id="sec-squad">
            <div class="sec-title">Squad</div>
            ${d.formation ? `<div class="pitch">⚽ FORMATION · ${esc(d.formation)}</div>` : ''}
            ${grpHtml}
        </section>`;
    }

    _matchesSec(team) {
        if (!this._matches.length) return `<section id="sec-matches"><div class="sec-title">Matches</div><div class="empty">No fixtures found.</div></section>`;
        const form = this._form();
        const rows = this._matches.map(m => {
            const home = m.home.id === team.id;
            const opp = home ? m.away : m.home;
            const dt = new Date(m.date);
            const when = `${dt.toLocaleDateString('en-US', { month: 'short' })}<br>${dt.getDate()}`;
            let right;
            if (m.status === 'finished' && m.homeScore != null) {
                const gf = home ? m.homeScore : m.awayScore, ga = home ? m.awayScore : m.homeScore;
                const mark = gf > ga ? '✓' : gf < ga ? '✗' : '–';
                right = `<div class="res">${gf}–${ga} ${mark}</div>`;
            } else if (m.status === 'live') {
                right = `<div class="res live">🔴 ${m.homeScore ?? 0}–${m.awayScore ?? 0}</div>`;
            } else {
                right = `<div class="cta">Predict</div>`;
            }
            return `<a class="fix" href="/worldcup/match.html?id=${m.id}">
                <div class="when">${when}</div>
                <div class="opp">${home ? 'vs' : '@'} ${esc(opp.flag)} ${esc(opp.name)}<div class="ven">${esc(m.venue || '')}</div></div>
                ${right}
            </a>`;
        }).join('');
        return `<section id="sec-matches">
            <div class="sec-title">Matches</div>
            ${form.length ? `<div class="form"><span class="l">Form</span>${form.slice(-6).map(r => `<span class="pip ${r}">${r}</span>`).join('')}</div>` : ''}
            <div class="card" style="padding:4px 14px">${rows}</div>
        </section>`;
    }

    _standingsSec(g) {
        if (!g) return '';
        const rows = this._standings(g);
        if (!rows.length) return '';
        return `<section id="sec-standings">
            <div class="sec-title">Group ${esc(g)} Standings</div>
            <div class="card" style="padding:8px 12px">
                <table>
                    <thead><tr><th></th><th style="text-align:left">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
                    <tbody>${rows.map((r, i) => `
                        <tr class="${r.team.id === this._team.id ? 'me' : ''}">
                            <td>${i + 1}</td>
                            <td class="team"><a class="flag-link" href="/worldcup/team.html?team=${encodeURIComponent(r.team.id)}">${esc(r.team.flag)}</a> ${esc(r.team.name)}</td>
                            <td>${r.mp}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>
                            <td>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td>
                            <td><b>${r.pts}</b></td>
                        </tr>`).join('')}</tbody>
                </table>
            </div>
        </section>`;
    }

    _fanZone(team, followers) {
        const next = this._nextMatch();
        const acc = this._meta?.accuracy || null; // real { pct, predicted, correct } when signed in & has picks
        const parties = this._meta?.watchParties ?? 0; // real count across the team's matches
        const notify = localStorage.getItem(this._notifyKey) === '1';
        return `<section id="sec-fanzone">
            <div class="sec-title">Fan Zone</div>
            <div class="fz-grid">
                <a class="fz" href="${next ? `/worldcup/match.html?id=${next.id}` : '/worldcup/'}">
                    <div class="ico">🎯</div><div class="t">Predict ${esc(team.name)}</div>
                    <div class="s">${next ? 'Back them in their next match' : 'Make your picks'}</div>
                </a>
                <a class="fz" href="https://meetup.weolopez.com/">
                    <div class="ico">📍</div><div class="t">Watch Parties</div>
                    <div class="s">${parties ? `${parties} ${parties === 1 ? 'party' : 'parties'} so far` : 'Be the first to host'}</div>
                </a>
                <a class="fz" href="${next ? `/worldcup/match.html?id=${next.id}` : '/worldcup/'}">
                    <div class="ico">💬</div><div class="t">Fan Wall</div>
                    <div class="s">Join the conversation</div>
                </a>
                <div class="fz">
                    <div class="ico">📈</div><div class="t">Your Accuracy</div>
                    <div class="s">${acc ? `${acc.pct}% · ${acc.correct}/${acc.predicted} correct` : `Predict ${esc(team.name)} to start a streak`}</div>
                </div>
            </div>
            <div class="card toggle" style="margin-top:12px">
                <div><div style="font-weight:800;font-size:0.86rem;color:var(--primary)">🔔 Match Reminders</div>
                    <div style="font-size:0.72rem;color:var(--muted)">Push alerts before teams you <b>follow</b> play. Follow ${esc(team.name)} above to get theirs.</div></div>
                <div class="switch ${notify ? 'on' : ''}" id="notify-switch" role="switch" aria-checked="${notify}" tabindex="0"></div>
            </div>
            <div style="text-align:center;margin-top:14px;color:var(--muted);font-size:0.78rem">
                ${followers.toLocaleString()} fans are backing ${esc(team.name)} 🙌
            </div>
        </section>`;
    }

    // ── wiring ──
    _buildNav() {
        const nav = this.shadowRoot.getElementById('nav');
        const items = [
            ['sec-overview', 'Overview'], ['sec-squad', 'Squad'], ['sec-matches', 'Matches'],
            ['sec-standings', 'Standings'], ['sec-fanzone', 'Fan Zone'],
        ].filter(([id]) => this.shadowRoot.getElementById(id));
        nav.innerHTML = items.map(([id, label], i) => `<button data-target="${id}" class="${i === 0 ? 'active' : ''}">${label}</button>`).join('');
        nav.addEventListener('click', e => {
            const btn = e.target.closest('button'); if (!btn) return;
            this.shadowRoot.getElementById(btn.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    _wireScrollSpy() {
        if (this._io) this._io.disconnect();
        const nav = this.shadowRoot.getElementById('nav');
        const sections = [...this.shadowRoot.querySelectorAll('section')];
        this._io = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (en.isIntersecting) {
                    nav.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.target === en.target.id));
                    const active = nav.querySelector('button.active');
                    active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
                }
            });
        }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
        sections.forEach(s => this._io.observe(s));
    }

    _wireFollow() {
        const btn = this.shadowRoot.getElementById('follow');
        const countEl = this.shadowRoot.getElementById('follow-count');
        btn?.addEventListener('click', async () => {
            const currently = this._meta?.isFollowing ?? this._isFollowing();
            const now = !currently;
            // Optimistic UI.
            btn.disabled = true;
            btn.classList.toggle('following', now);
            btn.textContent = now ? '★ Following' : '☆ Follow';

            let applied = false;
            try {
                const r = await fetch(`${API}/api/teams/${encodeURIComponent(this._team.id)}/follow`, {
                    method: now ? 'POST' : 'DELETE', credentials: 'include',
                });
                if (r.ok) {
                    const d = await r.json();
                    if (this._meta) this._meta.isFollowing = d.following;
                    if (this._meta) this._meta.followers = d.followers;
                    if (countEl) countEl.textContent = `${d.followers.toLocaleString()} fans`;
                    applied = true;
                }
            } catch (_) {}

            if (!applied) {
                // Not signed in / offline → remember the preference locally and update the count.
                localStorage.setItem(this._followKey, now ? '1' : '0');
                const followers = (this._meta?.followers ?? seeded(this._team.id, 1800, 9200)) + (now ? 1 : -1);
                if (this._meta) this._meta.followers = followers;
                if (countEl) countEl.textContent = `${Math.max(0, followers).toLocaleString()} fans`;
            }
            btn.disabled = false;
        });
    }

    _wireNotify() {
        const sw = this.shadowRoot.getElementById('notify-switch');
        if (!sw) return;
        const setState = (on) => {
            localStorage.setItem(this._notifyKey, on ? '1' : '0');
            sw.classList.toggle('on', on);
            sw.setAttribute('aria-checked', String(on));
        };
        const toggle = async () => {
            if (sw.dataset.busy) return;
            const turningOn = !(localStorage.getItem(this._notifyKey) === '1');
            sw.dataset.busy = '1';
            if (turningOn) {
                const ok = await this._enablePush();
                setState(ok);
            } else {
                await this._disablePush();
                setState(false);
            }
            delete sw.dataset.busy;
        };
        sw.addEventListener('click', toggle);
        sw.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    }

    // Register the service worker + subscribe to web push (reuses the main app's flow).
    async _enablePush() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
        try {
            if (Notification.permission !== 'granted') {
                const perm = await Notification.requestPermission();
                if (perm !== 'granted') return false;
            }
            const reg = await navigator.serviceWorker.register('/worldcup/sw.js');
            const r = await fetch(`${API}/api/push/vapid-key`, { credentials: 'include' });
            if (!r.ok) return false;
            const { publicKey } = await r.json();
            let sub = await reg.pushManager.getSubscription();
            if (!sub) {
                sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: this._urlB64ToU8(publicKey),
                });
            }
            const res = await fetch(`${API}/api/push/subscribe`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub),
            });
            return res.ok;
        } catch (_) { return false; }
    }

    async _disablePush() {
        // Device-level off: drop the subscription so no feature pushes to this device.
        try {
            const reg = await navigator.serviceWorker?.getRegistration('/worldcup/sw.js');
            const sub = await reg?.pushManager.getSubscription();
            if (sub) await sub.unsubscribe();
        } catch (_) {}
        try { await fetch(`${API}/api/push/subscribe`, { method: 'DELETE', credentials: 'include' }); } catch (_) {}
    }

    _urlB64ToU8(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const raw = atob(base64);
        return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
    }
}

if (!customElements.get('wc-team-page')) customElements.define('wc-team-page', WcTeamPage);
