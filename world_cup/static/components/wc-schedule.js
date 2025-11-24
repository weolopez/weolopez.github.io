import './wc-match-card.js';

export class ScheduleWidget extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.matches = [];
        this.predictions = [];
    }

    async connectedCallback() {
        await this.fetchData();
        this.render();
    }

    async fetchData() {
        try {
            const [matchesRes, predictionsRes] = await Promise.all([
                fetch('/world_cup/api/matches'),
                fetch('/world_cup/api/predictions')
            ]);

            if (matchesRes.ok) {
                this.matches = await matchesRes.json();
            }

            if (predictionsRes.ok) {
                this.predictions = await predictionsRes.json();
            }
        } catch (e) {
            console.error("Failed to fetch schedule data", e);
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <link href="/world_cup/static/styles.css?v=5" rel="stylesheet">
            <style>
                :host { display: block; font-family: 'Inter', sans-serif; overflow-x: auto; }
                .schedule-grid {
                    display: grid;
                    grid-template-columns: 150px repeat(39, 40px); /* Cities + Dates */
                    gap: 1px;
                    background-color: #e5e7eb;
                    border: 1px solid #e5e7eb;
                    min-width: max-content;
                }
                .cell {
                    background-color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    height: 40px;
                }
                .header-cell {
                    background-color: #f3f4f6;
                    font-weight: bold;
                    writing-mode: vertical-rl;
                    transform: rotate(180deg);
                    padding: 4px;
                }
                .city-cell {
                    justify-content: flex-start;
                    padding-left: 8px;
                    font-weight: bold;
                    background-color: #dbeafe;
                    position: sticky;
                    left: 0;
                    z-index: 10;
                }
                .region-header {
                    grid-column: 1 / -1;
                    background-color: #1e3a8a;
                    color: white;
                    font-weight: bold;
                    padding: 8px;
                    text-transform: uppercase;
                }
                .match-cell {
                    background-color: #eff6ff;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                }
                .match-cell:hover {
                    background-color: #bfdbfe;
                    border-color: #2563eb;
                    transform: scale(1.1);
                    z-index: 5;
                }
                .match-cell.predicted {
                    background-color: #dcfce7;
                    border-color: #16a34a;
                }
                
                /* Dialog */
                .dialog-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                }
                .dialog {
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    width: 300px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                }
            </style>

            <div class="p-4">
                <h2 class="text-2xl font-black text-primary mb-6 uppercase italic">Match Schedule</h2>
                
                <div class="schedule-grid" id="grid">
                    <!-- Grid Content Generated via JS -->
                </div>
            </div>
            
            <div id="dialog-container"></div>
        `;

        this.renderGrid();
    }

    renderGrid() {
        const grid = this.shadowRoot.getElementById('grid');
        const dates = [];
        // Generate dates from June 11 to July 19
        const start = new Date('2026-06-11');
        const end = new Date('2026-07-19');
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(new Date(d));
        }

        // Header Row (Dates)
        const headerRow = document.createElement('div');
        headerRow.style.display = 'contents';
        headerRow.innerHTML = `<div class="cell" style="background:none;"></div>` +
            dates.map(d => `<div class="cell header-cell">${d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</div>`).join('');
        grid.appendChild(headerRow);

        // Regions and Cities
        const regions = [
            { name: 'Western Region', cities: ['Vancouver', 'Seattle', 'San Francisco', 'Los Angeles', 'Guadalajara'] },
            { name: 'Central Region', cities: ['Mexico City', 'Monterrey', 'Houston', 'Dallas', 'Kansas City', 'Atlanta'] },
            { name: 'Eastern Region', cities: ['Miami', 'Toronto', 'Boston', 'Philadelphia', 'New York / NJ'] }
        ];

        regions.forEach(region => {
            // Region Header
            const rHeader = document.createElement('div');
            rHeader.className = 'region-header';
            rHeader.textContent = region.name;
            grid.appendChild(rHeader);

            region.cities.forEach(city => {
                const row = document.createElement('div');
                row.style.display = 'contents';

                let rowHtml = `<div class="cell city-cell">${city}</div>`;

                dates.forEach(date => {
                    // Check for match in this city on this date
                    // For demo, we'll randomize or use seeded data if it matches
                    // Since seed data is sparse, we'll add some placeholders based on the image pattern
                    const match = this.checkMatch(city, date);
                    if (match) {
                        const isPredicted = this.predictions.some(p => p.matchId === match.id);
                        const predictedClass = isPredicted ? 'predicted' : '';
                        rowHtml += `<div class="cell match-cell ${predictedClass}" data-city="${city}" data-date="${date.toISOString()}">M</div>`;
                    } else {
                        rowHtml += `<div class="cell"></div>`;
                    }
                });

                row.innerHTML = rowHtml;
                grid.appendChild(row);
            });
        });

        // Event Listeners
        grid.querySelectorAll('.match-cell').forEach(cell => {
            cell.addEventListener('click', () => this.openPredictionDialog(cell.dataset.city, cell.dataset.date));
        });
    }

    checkMatch(city, date) {
        const dateStr = date.toISOString().split('T')[0];
        const match = this.matches.find(m => m.venue.includes(city) && m.date.startsWith(dateStr));
        return match;
    }

    openPredictionDialog(city, date) {
        const container = this.shadowRoot.getElementById('dialog-container');

        // Find match data
        const dateStr = new Date(date).toISOString().split('T')[0];
        let match = this.matches.find(m => m.venue.includes(city) && m.date.startsWith(dateStr));

        // If no match found, do nothing (shouldn't happen if clicked on a valid cell)
        if (!match) return;

        container.innerHTML = `
            <div class="dialog-overlay" id="overlay">
                <div class="dialog" style="background: transparent; padding: 0; box-shadow: none; width: auto; max-width: 90vw;">
                    <div style="position: relative;">
                        <button id="btn-close" style="position: absolute; top: -12px; right: -12px; z-index: 50; background: white; border-radius: 50%; width: 32px; height: 32px; border: 1px solid #e5e7eb; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); display: flex; align-items: center; justify-content: center; color: #374151;">✕</button>
                        <wc-match-card id="dialog-card" style="display: block; width: 500px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); border-radius: 1rem; overflow: hidden;"></wc-match-card>
                    </div>
                </div>
            </div>
        `;

        const card = container.querySelector('#dialog-card');
        card.match = match;

        // Handle prediction event from the card
        // Handle prediction event from the card
        card.addEventListener('predict', async (e) => {
            console.log('Prediction received from dialog:', e.detail);
            const { matchId, homeScore, awayScore } = e.detail;

            try {
                const res = await fetch('/world_cup/api/predict', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ matchId, homeScore, awayScore })
                });

                if (res.ok) {
                    alert('Prediction Submitted!');
                    container.innerHTML = '';
                    // Refresh data to update UI (highlighting)
                    this.fetchData().then(() => this.render());
                } else {
                    const msg = await res.text();
                    alert(`Prediction failed: ${msg}`);
                }
            } catch (err) {
                console.error("Prediction error", err);
                alert("Failed to save prediction");
            }
        });

        // Close handlers
        container.querySelector('#btn-close').addEventListener('click', () => container.innerHTML = '');
        container.querySelector('#overlay').addEventListener('click', (e) => {
            if (e.target.id === 'overlay') container.innerHTML = '';
        });
    }
}

customElements.define('wc-schedule', ScheduleWidget);
