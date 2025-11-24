import './wc-leaderboard.js';

export class LeaguesWidget extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.leagues = [];
        this.activeLeague = null; // If set, show details
        this.view = 'list'; // 'list', 'create', 'join', 'detail'
    }

    connectedCallback() {
        this.fetchLeagues();
        this.render();
    }

    async fetchLeagues() {
        try {
            const res = await fetch('/world_cup/api/leagues');
            if (res.ok) {
                this.leagues = await res.json();
                this.render();
            }
        } catch (e) {
            console.error("Failed to fetch leagues", e);
        }
    }

    async createLeague(name) {
        try {
            const res = await fetch('/world_cup/api/leagues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                await this.fetchLeagues();
                this.view = 'list';
                this.render();
            } else {
                alert("Failed to create league");
            }
        } catch (e) {
            console.error(e);
        }
    }

    async joinLeague(code) {
        try {
            const res = await fetch('/world_cup/api/leagues/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            if (res.ok) {
                await this.fetchLeagues();
                this.view = 'list';
                this.render();
            } else {
                const msg = await res.text();
                alert("Failed to join league: " + msg);
            }
        } catch (e) {
            console.error(e);
        }
    }

    async showLeagueDetail(id) {
        try {
            const res = await fetch(`/world_cup/api/leagues/${id}`);
            if (res.ok) {
                this.activeLeague = await res.json();
                this.view = 'detail';
                this.render();
            }
        } catch (e) {
            console.error(e);
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
      <link href="/world_cup/static/styles.css?v=5" rel="stylesheet">
      <style>
        :host { display: block; font-family: 'Inter', sans-serif; }
        .btn-primary { @apply bg-blue-600 text-white px-4 py-2 rounded; }
      </style>

      <div class="card p-6 bg-white min-h-[400px]">
        ${this.renderContent()}
      </div>
    `;

        this.setupEventListeners();
    }

    renderContent() {
        if (this.view === 'list') {
            return `
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-bold text-primary">My Leagues</h2>
                    <div class="flex gap-2">
                        <button id="btn-create-view" class="btn-gold text-xs px-3 py-2 rounded font-bold">Create</button>
                        <button id="btn-join-view" class="bg-gray-200 text-gray-700 text-xs px-3 py-2 rounded font-bold hover:bg-gray-300">Join</button>
                    </div>
                </div>

                <div class="flex flex-col gap-3">
                    ${this.leagues.length === 0 ? `<p class="text-gray-500 text-center py-8">You haven't joined any leagues yet.</p>` : ''}
                    ${this.leagues.map(l => `
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors league-item" data-id="${l.id}">
                            <div>
                                <div class="font-bold text-primary">${l.name}</div>
                                <div class="text-xs text-gray-500">Code: <span class="font-mono bg-gray-200 px-1 rounded">${l.code}</span></div>
                            </div>
                            <div class="text-xs font-bold text-blue-600">View ></div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        if (this.view === 'create') {
            return `
                <div class="mb-6">
                    <button id="btn-back" class="text-xs text-gray-500 hover:text-primary mb-4">← Back</button>
                    <h2 class="text-xl font-bold text-primary mb-4">Create a League</h2>
                    <div class="flex flex-col gap-4">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">League Name</label>
                            <input type="text" id="input-league-name" class="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none" placeholder="e.g. Office Pool">
                        </div>
                        <button id="btn-create-submit" class="submit-btn bg-primary text-white">Create League</button>
                    </div>
                </div>
            `;
        }

        if (this.view === 'join') {
            return `
                <div class="mb-6">
                    <button id="btn-back" class="text-xs text-gray-500 hover:text-primary mb-4">← Back</button>
                    <h2 class="text-xl font-bold text-primary mb-4">Join a League</h2>
                    <div class="flex flex-col gap-4">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">League Code</label>
                            <input type="text" id="input-league-code" class="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none uppercase" placeholder="e.g. X7Y2Z1">
                        </div>
                        <button id="btn-join-submit" class="submit-btn bg-primary text-white">Join League</button>
                    </div>
                </div>
            `;
        }

        if (this.view === 'detail' && this.activeLeague) {
            return `
                <div class="mb-6">
                    <button id="btn-back" class="text-xs text-gray-500 hover:text-primary mb-4">← Back</button>
                    <div class="flex justify-between items-start mb-6">
                        <div>
                            <h2 class="text-xl font-bold text-primary">${this.activeLeague.name}</h2>
                            <div class="text-xs text-gray-500 mt-1">Invite Code: <span class="font-mono bg-gray-100 px-2 py-1 rounded select-all">${this.activeLeague.code}</span></div>
                        </div>
                    </div>
                    
                    <!-- Reusing the leaderboard widget logic but rendering manually for custom data -->
                    <div class="flex flex-col gap-2">
                        ${this.activeLeague.leaderboard.map((user, idx) => {
                let rankClass = 'rank-other';
                if (idx === 0) rankClass = 'rank-1';
                else if (idx === 1) rankClass = 'rank-2';
                else if (idx === 2) rankClass = 'rank-3';

                const avatar = user.avatar
                    ? `<img src="${user.avatar}" class="w-full h-full object-cover" />`
                    : `<div class="w-full h-full bg-primary text-white flex items-center justify-center text-xs">ME</div>`;

                return `
                                <div class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div class="flex items-center gap-3">
                                        <div class="rank-circle ${rankClass}">${idx + 1}</div>
                                        <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100 shadow-sm">${avatar}</div>
                                        <span class="font-bold text-sm text-gray-900">${user.name}</span>
                                    </div>
                                    <div class="font-black text-primary text-lg">${user.points}</div>
                                </div>`;
            }).join('')}
                    </div>
                </div>
            `;
        }
    }

    setupEventListeners() {
        const shadow = this.shadowRoot;

        if (this.view === 'list') {
            shadow.getElementById('btn-create-view')?.addEventListener('click', () => { this.view = 'create'; this.render(); });
            shadow.getElementById('btn-join-view')?.addEventListener('click', () => { this.view = 'join'; this.render(); });
            shadow.querySelectorAll('.league-item').forEach(el => {
                el.addEventListener('click', () => this.showLeagueDetail(el.dataset.id));
            });
        }

        if (this.view === 'create') {
            shadow.getElementById('btn-back')?.addEventListener('click', () => { this.view = 'list'; this.render(); });
            shadow.getElementById('btn-create-submit')?.addEventListener('click', () => {
                const name = shadow.getElementById('input-league-name').value;
                if (name) this.createLeague(name);
            });
        }

        if (this.view === 'join') {
            shadow.getElementById('btn-back')?.addEventListener('click', () => { this.view = 'list'; this.render(); });
            shadow.getElementById('btn-join-submit')?.addEventListener('click', () => {
                const code = shadow.getElementById('input-league-code').value;
                if (code) this.joinLeague(code);
            });
        }

        if (this.view === 'detail') {
            shadow.getElementById('btn-back')?.addEventListener('click', () => { this.view = 'list'; this.render(); });
        }
    }
}

customElements.define('wc-leagues', LeaguesWidget);
