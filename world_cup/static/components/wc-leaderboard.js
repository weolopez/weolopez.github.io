export class LeaderboardWidget extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.users = [];
    }

    connectedCallback() {
        this.render();
        this.fetchLeaderboard();
        this.setupRealtime();
    }

    async fetchLeaderboard() {
        try {
            const res = await fetch('/world_cup/api/leaderboard');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();

            this.users = data.map((u, i) => ({
                ...u,
                rank: i + 1,
                isUser: u.name === 'You' // TODO: Real user check
            }));
            this.render();
        } catch (e) {
            console.error("Failed to fetch leaderboard", e);
        }
    }

    setupRealtime() {
        const eventSource = new EventSource('/world_cup/api/events');
        eventSource.addEventListener('leaderboard_update', () => {
            this.fetchLeaderboard();
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
      <link href="/world_cup/static/styles.css?v=5" rel="stylesheet">
      <style>
        :host { display: block; font-family: 'Inter', sans-serif; }
      </style>

      <div class="card p-5 bg-white">
          <div class="flex items-center justify-between mb-6">
              <h3 class="font-bold text-primary flex items-center gap-2 text-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                  Top Predictors
              </h3>
              <button class="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider">View All</button>
          </div>
          
          <div id="leaderboard-container" class="flex flex-col gap-2">
              ${this.users.map((user, idx) => {
            let rankClass = 'rank-other';
            if (idx === 0) rankClass = 'rank-1';
            else if (idx === 1) rankClass = 'rank-2';
            else if (idx === 2) rankClass = 'rank-3';

            const avatar = user.avatar
                ? `<img src="${user.avatar}" alt="${user.name}" class="w-full h-full object-cover" />`
                : `<div class="w-full h-full bg-primary text-white flex items-center justify-center text-xs">ME</div>`;

            return `
                  <div class="flex items-center justify-between p-2 rounded-lg ${user.isUser ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50 transition-colors'}">
                      <div class="flex items-center gap-3">
                          <div class="rank-circle ${rankClass}">${user.rank}</div>
                          <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100 shadow-sm">${avatar}</div>
                          <span class="font-bold text-sm ${user.isUser ? 'text-blue-900' : 'text-gray-900'}">${user.name}</span>
                      </div>
                      <div class="flex items-center gap-6">
                          <div class="text-right hidden sm:block">
                              <div class="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Exact</div>
                              <div class="font-bold text-gray-600 text-sm">${user.exact}</div>
                          </div>
                          <div class="text-right min-w-[40px]">
                              <div class="text-[10px] text-gray-400 uppercase tracking-wider sm:hidden font-bold">Pts</div>
                              <div class="font-black text-primary text-lg">${user.points}</div>
                          </div>
                      </div>
                  </div>`;
        }).join('')}
          </div>
      </div>
    `;
    }
}

customElements.define('leaderboard-widget', LeaderboardWidget);
