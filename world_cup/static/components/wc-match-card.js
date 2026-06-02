export class MatchCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    static get observedAttributes() {
        return ['match-data', 'prediction', 'is-admin'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) this.render();
    }

    get match() { return JSON.parse(this.getAttribute('match-data') || '{}'); }
    set match(val) { this.setAttribute('match-data', JSON.stringify(val)); }

    get prediction() { return JSON.parse(this.getAttribute('prediction') || 'null'); }
    set prediction(val) { this.setAttribute('prediction', JSON.stringify(val)); }

    get isAdmin() { return this.getAttribute('is-admin') === 'true'; }
    set isAdmin(val) { this.setAttribute('is-admin', String(val)); }

    _calcResult(pred, match) {
        if (match.homeScore == null || match.awayScore == null || !pred) return null;
        const isExact = pred.homeScore === match.homeScore && pred.awayScore === match.awayScore;
        const aw = match.homeScore > match.awayScore ? 'h' : match.awayScore > match.homeScore ? 'a' : 'd';
        const pw = pred.homeScore  > pred.awayScore  ? 'h' : pred.awayScore  > pred.homeScore  ? 'a' : 'd';
        const isCorrect = aw === pw;
        if (isExact)    return { label: 'Exact  +3 pts', color: '#BFA260', bg: 'rgba(191,162,96,0.15)' };
        if (isCorrect)  return { label: 'Result +1 pt',  color: '#10b981', bg: 'rgba(16,185,129,0.12)' };
        return               { label: 'Wrong  +0 pts', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
    }

    render() {
        const match = this.match;
        if (!match.id) return;

        const pred    = this.prediction;
        const lockMs  = new Date(match.date).getTime() - 3_600_000;
        const locked  = (!this.isAdmin && Date.now() >= lockMs) ||
                        match.status === 'live' || match.status === 'finished';
        const finished = match.status === 'finished' && match.homeScore != null;
        const result   = finished ? this._calcResult(pred, match) : null;

        const dateStr = new Date(match.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        const timeStr = new Date(match.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

        let centerHtml;
        if (!locked) {
            // Open — score inputs
            centerHtml = `
                <div class="inputs">
                    <input type="number" value="${pred?.homeScore ?? ''}" data-team="home" class="score-input" placeholder="–" min="0" max="20">
                    <span class="sep">–</span>
                    <input type="number" value="${pred?.awayScore ?? ''}" data-team="away" class="score-input" placeholder="–" min="0" max="20">
                </div>
                <button id="submit-btn" class="submit-btn">
                    ${pred ? 'Update Prediction' : 'Submit Prediction'}
                </button>`;
        } else if (finished) {
            // Finished — show actual score + result
            const pickHtml = pred
                ? `<div class="pick-row">
                     Your pick: <strong>${pred.homeScore}–${pred.awayScore}</strong>
                     ${result ? `<span class="result-pip" style="color:${result.color};background:${result.bg}">${result.label}</span>` : ''}
                   </div>`
                : `<div class="pick-row muted">No pick made</div>`;
            centerHtml = `
                <div class="final-score">${match.homeScore} – ${match.awayScore}</div>
                <div class="final-label">Full time</div>
                ${pickHtml}`;
        } else {
            // Locked, not yet finished
            const lockTime = new Date(lockMs).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            const pickHtml = pred
                ? `<div class="pick-row">Your pick: <strong>${pred.homeScore}–${pred.awayScore}</strong></div>`
                : `<div class="pick-row muted">No pick made</div>`;
            centerHtml = `
                <div class="lock-icon">🔒</div>
                <div class="lock-msg">Predictions closed at ${lockTime}</div>
                ${pickHtml}`;
        }

        this.shadowRoot.innerHTML = `
            <link href="/world_cup/static/styles.css?v=5" rel="stylesheet">
            <style>
                :host { display: block; font-family: 'Inter', sans-serif; min-width: 500px; }
                .card { display: flex; flex-direction: column; height: 100%; }
                .teams-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 0 16px; }
                .team { display: flex; flex-direction: column; align-items: center; gap: 8px; }
                .flag-circle { font-size: 2rem; }
                .team-name { font-size: 0.85rem; font-weight: 700; text-align: center; }
                .center { display: flex; flex-direction: column; align-items: center; gap: 10px; padding-top: 16px; }

                /* Open state */
                .inputs { display: flex; align-items: center; gap: 10px; }
                .score-input { width: 52px; height: 52px; border: 2px solid #e5e7eb; border-radius: 10px; text-align: center; font-size: 1.2rem; font-weight: 700; outline: none; font-family: inherit; -webkit-appearance: none; -moz-appearance: textfield; transition: border-color 0.15s; }
                .score-input::-webkit-inner-spin-button, .score-input::-webkit-outer-spin-button { -webkit-appearance: none; }
                .score-input:focus { border-color: #10284B; }
                .sep { font-size: 1.4rem; font-weight: 700; color: #9ca3af; }
                .submit-btn { width: 100%; padding: 12px; background: #10284B; color: white; border: none; border-radius: 10px; font-weight: 700; font-size: 0.9rem; cursor: pointer; font-family: inherit; transition: opacity 0.15s; }
                .submit-btn:hover { opacity: 0.85; }

                /* Locked state */
                .lock-icon { font-size: 1.8rem; }
                .lock-msg { font-size: 0.78rem; color: #6b7280; font-weight: 600; }

                /* Finished state */
                .final-score { font-size: 2rem; font-weight: 900; color: #10284B; letter-spacing: -1px; }
                .final-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7280; }

                /* Shared */
                .pick-row { font-size: 0.8rem; color: #374151; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: center; }
                .pick-row.muted { color: #9ca3af; font-style: italic; }
                .result-pip { font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 10px; white-space: nowrap; }
            </style>

            <div class="card flex flex-col h-full">
                <div class="match-header">
                    <span class="group-badge">Group ${match.group}</span>
                    <div class="match-info">
                        <span>${dateStr} · ${timeStr}</span>
                        <span style="color:#EF4444">📍</span>
                        <span>${match.venue.split(',')[0]}</span>
                    </div>
                </div>

                <div class="p-6 flex flex-col gap-6 flex-grow justify-center">
                    <div class="teams-row">
                        <div class="team">
                            <div class="flag-circle">${match.home.flag}</div>
                            <span class="team-name">${match.home.name}</span>
                        </div>
                        <div class="center">${centerHtml}</div>
                        <div class="team">
                            <div class="flag-circle">${match.away.flag}</div>
                            <span class="team-name">${match.away.name}</span>
                        </div>
                    </div>
                </div>
            </div>`;

        if (!locked) {
            this.shadowRoot.getElementById('submit-btn').addEventListener('click', () => {
                const home = this.shadowRoot.querySelector('input[data-team="home"]').value;
                const away = this.shadowRoot.querySelector('input[data-team="away"]').value;
                this.dispatchEvent(new CustomEvent('predict', {
                    detail: { matchId: match.id, homeScore: parseInt(home), awayScore: parseInt(away) },
                    bubbles: true,
                    composed: true,
                }));
            });
        }
    }
}

customElements.define('wc-match-card', MatchCard);
