import { TEAM_DATA } from './team-data.js';

const API = '/worldcup';

// Cache the id -> {id,name,flag} map across instances so we only fetch matches once.
let _teamIndexPromise = null;
async function getTeamIndex() {
    if (!_teamIndexPromise) {
        _teamIndexPromise = (async () => {
            const index = {};
            try {
                const r = await fetch(`${API}/api/matches`, { credentials: 'include' });
                if (r.ok) {
                    const matches = await r.json();
                    for (const m of matches) {
                        if (m.home?.id) index[m.home.id] = { id: m.home.id, name: m.home.name, flag: m.home.flag };
                        if (m.away?.id) index[m.away.id] = { id: m.away.id, name: m.away.name, flag: m.away.flag };
                    }
                }
            } catch (_) { /* offline / network — fall back to bare id */ }
            return index;
        })();
    }
    return _teamIndexPromise;
}

const STYLES = `
    :host { display: block; --primary: #0a1f44; --primary-light: #1a3a6b; --gold: #BFA260;
        --dark: #111827; --muted: #6B7280; --border: #E5E7EB; --card: #ffffff;
        font-family: 'Segoe UI', system-ui, sans-serif; color: var(--dark); }
    * { box-sizing: border-box; }

    .team-header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
    .team-header .flag { font-size: 3rem; line-height: 1; }
    .team-header h2 { font-size: 1.4rem; font-weight: 900; color: var(--primary); }
    .team-header .ranking { font-size: 0.8rem; color: var(--muted); margin-top: 2px; }

    .fact-box { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
        color: white; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    .fact-box p { font-size: 0.85rem; line-height: 1.6; color: rgba(255,255,255,0.9); }
    .fact-box .label { font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
        letter-spacing: 1px; color: var(--gold); margin-bottom: 6px; }

    .section-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
        letter-spacing: 1.5px; color: var(--muted); margin: 20px 0 10px; }

    .info-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .info-chip { background: var(--card); border: 1px solid var(--border); border-radius: 20px;
        padding: 6px 12px; font-size: 0.78rem; }
    .info-chip strong { color: var(--primary); display: block; font-size: 0.65rem;
        text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1px; }

    .players-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
    .player-card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
    .player-card .player-name { font-size: 0.85rem; font-weight: 700; color: var(--primary); }
    .player-card .player-pos { display: inline-block; background: var(--gold); color: var(--primary);
        font-size: 0.62rem; font-weight: 800; padding: 1px 7px; border-radius: 4px; margin: 4px 0; }
    .player-card .player-meta { font-size: 0.72rem; color: var(--muted); line-height: 1.4; }

    .loading { text-align: center; padding: 24px; color: var(--muted); }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spinner { display: inline-block; width: 22px; height: 22px; border: 3px solid var(--border);
        border-top-color: var(--primary); border-radius: 50%; animation: spin 0.7s linear infinite; }
    .empty { text-align: center; padding: 32px 16px; color: var(--muted); font-size: 0.9rem; }
`;

function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * <wc-team-panel> — renders a national team's profile (header, fun fact, info chips, key players).
 *
 * Usage:
 *   el.team = { id: 'ARG', name: 'Argentina', flag: '🇦🇷' };   // render immediately
 *   <wc-team-panel team-id="ARG"></wc-team-panel>               // resolves name/flag from matches API
 */
export class WcTeamPanel extends HTMLElement {
    static get observedAttributes() { return ['team-id']; }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._team = null;
    }

    connectedCallback() {
        if (!this._team && this.getAttribute('team-id')) {
            this._resolveById(this.getAttribute('team-id'));
        } else {
            this.render();
        }
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (name === 'team-id' && newVal && newVal !== oldVal && this.shadowRoot) {
            this._resolveById(newVal);
        }
    }

    /** Set a full team object { id, name, flag } and render. */
    set team(value) {
        this._team = value;
        if (this.isConnected) this.render();
    }
    get team() { return this._team; }

    async _resolveById(id) {
        this._renderLoading();
        const index = await getTeamIndex();
        this._team = index[id] || { id, name: id, flag: '⚽' };
        this.render();
    }

    _renderLoading() {
        this.shadowRoot.innerHTML = `<style>${STYLES}</style><div class="loading"><div class="spinner"></div></div>`;
    }

    render() {
        const team = this._team;
        if (!team || !team.id) {
            this.shadowRoot.innerHTML = `<style>${STYLES}</style><div class="empty">Team not found.</div>`;
            return;
        }
        const data = TEAM_DATA[team.id] || {};

        const chips = [
            { label: 'Capital', val: data.capital },
            { label: 'Population', val: data.population },
            { label: 'Continent', val: data.continent },
            { label: 'World Ranking', val: data.fifaRanking ? `#${data.fifaRanking}` : null },
            { label: 'WC Appearances', val: data.wcAppearances },
            { label: 'Best Result', val: data.bestResult },
        ].filter(c => c.val != null && c.val !== '');

        const players = (data.players || []).map(p => `
            <div class="player-card">
                <div class="player-name">${esc(p.name)}</div>
                <div><span class="player-pos">${esc(p.pos)}</span></div>
                <div class="player-meta">${esc(p.club)}<br>Age ${esc(p.age)}</div>
            </div>`).join('');

        this.shadowRoot.innerHTML = `
            <style>${STYLES}</style>
            <div class="team-header">
                <div class="flag">${esc(team.flag || '⚽')}</div>
                <div>
                    <h2>${esc(team.name || team.id)}</h2>
                    ${data.fifaRanking ? `<div class="ranking">#${data.fifaRanking} in the world</div>` : ''}
                </div>
            </div>
            ${data.funFact ? `<div class="fact-box"><div class="label">Did you know?</div><p>${esc(data.funFact)}</p></div>` : ''}
            ${chips.length ? `<div class="info-chips">
                ${chips.map(c => `<div class="info-chip"><strong>${esc(c.label)}</strong>${esc(c.val)}</div>`).join('')}
            </div>` : ''}
            ${players ? `<div class="section-title">Key Players</div><div class="players-grid">${players}</div>` : ''}
            ${!data.funFact && !chips.length && !players ? `<div class="empty">No additional info available for this team yet.</div>` : ''}
        `;
    }
}

if (!customElements.get('wc-team-panel')) {
    customElements.define('wc-team-panel', WcTeamPanel);
}
