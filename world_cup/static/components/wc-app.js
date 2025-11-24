import './wc-match-card.js';
import './wc-leaderboard.js';
import './wc-leagues.js';
import './wc-schedule.js';

export class AppShell extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.matches = [];
        this.user = null;
        this.view = 'matches'; // 'matches', 'leagues', 'schedule'
    }

    connectedCallback() {
        this.render();
        this.fetchMatches();
    }

    async fetchMatches() {
        try {
            const res = await fetch('/world_cup/api/matches');
            if (res.ok) {
                this.matches = await res.json();
                this.renderMatches();
            }
        } catch (err) {
            console.error("Failed to fetch matches", err);
        }
    }

    renderMatches() {
        const grid = this.shadowRoot.getElementById('matches-grid');
        if (!grid) return;

        if (this.matches.length === 0) {
            grid.innerHTML = '<div class="text-center py-10 text-gray-500 col-span-full">No matches found</div>';
            return;
        }

        grid.innerHTML = '';
        this.matches.forEach(match => {
            const card = document.createElement('wc-match-card');
            card.match = match;
            // If we have a user, we should pass their prediction if it exists
            // For now, we'll let the card handle its own prediction fetching or pass it if we have it
            // The current backend doesn't return predictions with matches, so we might need to fetch them separately
            // But for now, let's just render the matches
            grid.appendChild(card);
        });
    }

    async handlePrediction(e) {
        if (!this.user) {
            alert("Please login to predict!");
            return;
        }

        const { matchId, homeScore, awayScore } = e.detail;

        try {
            const res = await fetch('/world_cup/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchId, homeScore, awayScore })
            });

            if (res.ok) {
                // Optimistically update UI or show success
                // The match card might handle its own state, but we can show a toast here
                console.log("Prediction saved!");
            } else {
                const msg = await res.text();
                alert(`Prediction failed: ${msg}`);
            }
        } catch (err) {
            console.error("Prediction error", err);
            alert("Failed to save prediction");
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
      <link href="/world_cup/static/styles.css?v=5" rel="stylesheet">
      <style>
        :host { display: block; font-family: 'Inter', sans-serif; }
        #matches-grid { min-width: 1000px; }
      </style>

      <div class="bg-gray-50 min-h-screen pb-20">
        <!-- Navbar -->
        <nav class="navbar">
            <div class="container">
                <div class="flex items-center justify-between h-16">
                    <!-- Logo & Nav -->
                    <div class="flex items-center gap-8">
                        <div class="flex flex-col leading-none">
                            <span class="text-xl font-black tracking-tighter text-white">FIFA</span>
                            <span class="text-[10px] font-medium text-secondary tracking-widest">WORLD CUP 2026</span>
                        </div>
                        
                        <div class="hidden md:flex items-center gap-1">
                            <a href="#" class="nav-link" id="nav-home">Home</a>
                            <a href="#" class="nav-link ${this.view === 'matches' ? 'active' : ''}" id="nav-predict">Predict Matches</a>
                            <a href="#" class="nav-link ${this.view === 'schedule' ? 'active' : ''}" id="nav-schedule">Schedule</a>
                            <a href="#" class="nav-link ${this.view === 'leagues' ? 'active' : ''}" id="nav-leagues">My Leagues</a>
                            <a href="#" class="nav-link" id="nav-leaderboard">Leaderboard</a>
                        </div>
                    </div>
                    
                    <!-- User Profile / Login -->
                    <div class="flex items-center gap-4">
                        ${this.user ? `
                            <div class="flex items-center gap-3 text-right">
                                <div class="flex flex-col">
                                    <span class="text-xs text-secondary font-bold uppercase">My Points</span>
                                    <span class="text-lg font-bold leading-none">${this.user.points || 0}</span>
                                </div>
                                <div class="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary font-bold overflow-hidden border-2 border-white/20">
                                    ${this.user.avatar ? `<img src="${this.user.avatar}" class="w-full h-full object-cover">` : 'JS'}
                                </div>
                            </div>
                        ` : `
                            <google-login id="google-login"></google-login>
                        `}
                    </div>
                </div>
            </div>
        </nav>

        <!-- Hero Section -->
        <div class="hero">
            <div class="container">
                <div class="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div class="max-w-2xl">
                        <h1 class="text-4xl md:text-5xl font-black mb-4 text-white uppercase italic">Predict the<br><span class="text-secondary">Beautiful Game.</span></h1>
                        <p class="text-lg text-blue-100 mb-6 max-w-xl">Compete against friends and the world. Predict correct scores for the 2026 World Cup to climb the global leaderboard and win big.</p>
                        <div class="flex gap-4">
                            <button class="btn btn-gold text-primary">Create a League</button>
                            <button class="btn border border-white/30 text-white hover:bg-white/10">How to Play</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <main class="container py-8">
            <div class="flex flex-col lg:flex-row gap-8">
                <!-- Matches Column -->
                <div class="flex-1">
                    ${this.view === 'matches' ? `
                        <div class="flex items-center justify-between mb-6">
                            <h2 class="text-xl font-bold text-primary flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-secondary"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                Upcoming Matches
                            </h2>
                            <div class="flex bg-white rounded-md shadow-sm p-1">
                                <button class="px-3 py-1 text-xs font-bold bg-primary text-white rounded-sm">MD 1</button>
                                <button class="px-3 py-1 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-sm">MD 2</button>
                                <button class="px-3 py-1 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-sm">MD 3</button>
                            </div>
                        </div>
                        
                        <div id="matches-grid" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- Matches Injected Here -->
                            <div class="text-center py-10 text-gray-500 col-span-full">Loading matches...</div>
                        </div>
                    ` : this.view === 'schedule' ? `
                        <wc-schedule></wc-schedule>
                    ` : `
                        <wc-leagues></wc-leagues>
                    `}
                </div>
                
                <!-- Sidebar -->
                <div class="lg:w-80 space-y-6">
                    <leaderboard-widget></leaderboard-widget>
                    
                    <!-- Private Leagues Promo -->
                    <div class="card p-6 bg-primary text-white border-none">
                        <h3 class="text-lg font-bold mb-2 text-white">Private Leagues</h3>
                        <p class="text-sm text-blue-200 mb-4">Create a league and challenge your friends. Who knows ball best?</p>
                        <button class="w-full btn btn-gold text-primary">Create or Join League</button>
                    </div>
                </div>
            </div>
        </main>
      </div>
    `;

        const loginComponent = this.shadowRoot.getElementById('google-login');
        if (loginComponent) {
            loginComponent.addEventListener('authenticated', (e) => this.handleAuth(e));

            // Check if already authenticated (race condition fix)
            if (loginComponent.isAuthenticated && loginComponent.isAuthenticated()) {
                console.log('[AppShell] google-login already authenticated, syncing session...');
                const token = loginComponent.getToken();
                const user = loginComponent.getUserInfo();
                if (token && user) {
                    this.handleAuth({ detail: { token, user } });
                }
            }
        } else {
            console.log('[AppShell] google-login component not found (user likely logged in)');
        }
        this.shadowRoot.addEventListener('predict', (e) => this.handlePrediction(e));

        this.shadowRoot.getElementById('nav-predict')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.view = 'matches';
            this.render();
            this.renderMatches();
        });

        this.shadowRoot.getElementById('nav-schedule')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.view = 'schedule';
            this.render();
        });

        this.shadowRoot.getElementById('nav-leagues')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.view = 'leagues';
            this.render();
        });
    }

    async handleAuth(e) {
        const { token } = e.detail;
        // Exchange JWT for Session Cookie
        try {
            const res = await fetch('/world_cup/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            if (res.ok) {
                this.user = e.detail.user;
                // We don't need to re-render the whole thing, google-login handles the UI
                // But we might want to refresh data that depends on user
                this.fetchMatches();
            }
        } catch (err) {
            console.error("Auth failed", err);
        }
    }
}

customElements.define('app-shell', AppShell);
