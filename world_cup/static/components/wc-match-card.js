export class MatchCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    static get observedAttributes() {
        return ['match-data', 'prediction'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    get match() {
        return JSON.parse(this.getAttribute('match-data') || '{}');
    }

    set match(val) {
        this.setAttribute('match-data', JSON.stringify(val));
    }

    get prediction() {
        return JSON.parse(this.getAttribute('prediction') || '{}');
    }

    render() {
        const match = this.match;
        if (!match.id) return;

        const pred = this.prediction;
        const homeScore = pred.homeScore !== undefined ? pred.homeScore : '';
        const awayScore = pred.awayScore !== undefined ? pred.awayScore : '';

        // We'll use the same Tailwind classes but injected via style tag or link
        // For simplicity in this demo, I'll use a link to the CDN in shadow DOM
        // Note: In production, you'd want to bundle CSS or use constructable stylesheets.

        this.shadowRoot.innerHTML = `
      <link href="/world_cup/static/styles.css?v=5" rel="stylesheet">
      <style>
        :host { display: block; font-family: 'Inter', sans-serif; min-width: 500px; }
      </style>
      
      <div class="card flex flex-col h-full">
          <!-- Header -->
          <div class="match-header">
              <span class="group-badge">Group ${match.group}</span>
              <div class="match-info">
                  <span>${new Date(match.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} • ${new Date(match.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                  <span style="color: #EF4444">📍</span>
                  <span>${match.venue.split(',')[0]}</span>
              </div>
          </div>

          <!-- Content -->
          <div class="p-6 flex flex-col gap-8 flex-grow justify-center">
              <div class="flex justify-between items-start px-4">
                  <!-- Home Team -->
                  <div class="flex flex-col items-center gap-2">
                      <div class="flag-circle">
                          ${match.home.flag}
                      </div>
                      <span class="team-name">${match.home.name}</span>
                  </div>

                  <!-- Inputs -->
                  <div class="flex items-center gap-3 pt-4">
                      <input type="number" value="${homeScore}" data-team="home" class="score-input" placeholder="-">
                      <span class="font-bold text-2xl text-gray-900">-</span>
                      <input type="number" value="${awayScore}" data-team="away" class="score-input" placeholder="-">
                  </div>

                  <!-- Away Team -->
                  <div class="flex flex-col items-center gap-2">
                      <div class="flag-circle">
                          ${match.away.flag}
                      </div>
                      <span class="team-name">${match.away.name}</span>
                  </div>
              </div>

              <!-- Button -->
              <button id="submit-btn" class="submit-btn">
                  Submit Prediction
              </button>
          </div>
      </div>
    `;

        this.shadowRoot.querySelectorAll('.score-input').forEach(input => {
            input.addEventListener('input', (e) => {
                // Local state update logic if needed
            });
        });

        this.shadowRoot.getElementById('submit-btn').addEventListener('click', () => {
            const home = this.shadowRoot.querySelector('input[data-team="home"]').value;
            const away = this.shadowRoot.querySelector('input[data-team="away"]').value;

            this.dispatchEvent(new CustomEvent('predict', {
                detail: {
                    matchId: match.id,
                    homeScore: parseInt(home),
                    awayScore: parseInt(away)
                },
                bubbles: true,
                composed: true
            }));
        });
    }
}

customElements.define('wc-match-card', MatchCard);
