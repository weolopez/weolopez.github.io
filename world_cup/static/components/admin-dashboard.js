class AdminDashboard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.activeTab = 'api-tester';
        this.user = null;
    }

    async connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.checkAdminAuth();
    }

    async checkAdminAuth() {
        try {
            const res = await fetch('/world_cup/admin/me');
            if (res.ok) {
                this.user = await res.json();
                this.render();
            } else {
                this.showLogin();
            }
        } catch (e) {
            console.error('Auth check failed:', e);
            this.showLogin();
        }
    }

    showLogin() {
        const container = this.shadowRoot.querySelector('.container');
        container.innerHTML = `
            <div class="login-form">
                <h2>Admin Login</h2>
                <input type="password" id="password" placeholder="Admin Password" />
                <button id="login-btn">Login</button>
                <div id="error" class="error" style="display: none;"></div>
            </div>
        `;

        container.querySelector('#login-btn').addEventListener('click', async () => {
            const password = container.querySelector('#password').value;
            try {
                const res = await fetch('/world_cup/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });

                if (res.ok) {
                    const data = await res.json();
                    this.user = data.user;
                    this.render();
                } else {
                    const error = container.querySelector('#error');
                    error.textContent = 'Invalid password';
                    error.style.display = 'block';
                }
            } catch (e) {
                console.error('Login failed:', e);
            }
        });
    }

    setupEventListeners() {
        this.shadowRoot.addEventListener('click', (e) => {
            if (e.target.matches('.tab-btn')) {
                this.activeTab = e.target.dataset.tab;
                this.render();
            }
        });

        this.setupTabEventListeners();
    }

    setupTabEventListeners() {
        // API Tester events
        this.shadowRoot.addEventListener('click', (e) => {
            if (e.target.id === 'api-submit') {
                this.handleApiCall();
            } else if (e.target.id === 'create-users') {
                this.handleCreateUsers();
            } else if (e.target.id === 'delete-simulated') {
                this.handleDeleteSimulated();
            } else if (e.target.id === 'load-matches') {
                this.handleLoadMatches();
            } else if (e.target.id === 'recalculate-scores') {
                this.handleRecalculateScores();
            } else if (e.target.id === 'reset-db') {
                this.handleResetDb();
            } else if (e.target.matches('.update-match-btn')) {
                this.handleUpdateMatch(e.target);
            }
        });

        // API Endpoint selector
        this.shadowRoot.addEventListener('change', (e) => {
            if (e.target.id === 'api-endpoint-select') {
                this.handleApiEndpointChange(e.target.value);
            }
        });
    }

    handleApiEndpointChange(value) {
        const endpointMappings = {
            matches: { endpoint: '/api/matches', method: 'GET' },
            leaderboard: { endpoint: '/api/leaderboard', method: 'GET' },
            events: { endpoint: '/api/events', method: 'GET' },
            dev_login: { endpoint: '/auth/dev-login', method: 'POST' },
            predictions: { endpoint: '/api/predictions', method: 'GET' },
            leagues: { endpoint: '/api/leagues', method: 'GET' },
            leagues_post: { endpoint: '/api/leagues', method: 'POST' },
            leagues_join: { endpoint: '/api/leagues/join', method: 'POST' },
            predict: { endpoint: '/api/predict', method: 'POST' },
            admin_users_bulk: { endpoint: '/admin/users/bulk-create', method: 'POST' },
            admin_users_delete: { endpoint: '/admin/users/simulated', method: 'DELETE' },
            admin_matches: { endpoint: '/admin/matches', method: 'PUT' },
            admin_scoring: { endpoint: '/admin/scoring/recalculate', method: 'POST' },
            admin_data_reset: { endpoint: '/admin/data/reset', method: 'POST' }
        };

        if (value && endpointMappings[value]) {
            const mapping = endpointMappings[value];
            this.shadowRoot.querySelector('#api-endpoint').value = mapping.endpoint;
            this.shadowRoot.querySelector('#api-method').value = mapping.method;

            const bodyTextarea = this.shadowRoot.querySelector('#api-body');
            if (mapping.method === 'GET') {
                bodyTextarea.value = '';
            } else {
                bodyTextarea.value = '{}';
            }
        }
    }

    async handleApiCall() {
        const endpoint = this.shadowRoot.querySelector('#api-endpoint').value;
        const method = this.shadowRoot.querySelector('#api-method').value;
        const body = this.shadowRoot.querySelector('#api-body').value;
        const responseDiv = this.shadowRoot.querySelector('#api-response');

        try {
            const res = await fetch('/world_cup/admin/api/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint, method, body: body ? JSON.parse(body) : null })
            });

            const result = await res.json();
            responseDiv.textContent = JSON.stringify(result, null, 2);
        } catch (e) {
            responseDiv.textContent = `Error: ${e.message}`;
        }
    }

    async handleCreateUsers() {
        const count = parseInt(this.shadowRoot.querySelector('#user-count').value);
        const resultsDiv = this.shadowRoot.querySelector('#user-results');

        try {
            const res = await fetch('/world_cup/admin/users/bulk-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ count })
            });

            const result = await res.json();
            resultsDiv.textContent = `Created ${result.count} users`;
        } catch (e) {
            resultsDiv.textContent = `Error: ${e.message}`;
        }
    }

    async handleDeleteSimulated() {
        if (!confirm('Are you sure you want to delete all simulated users?')) return;

        const resultsDiv = this.shadowRoot.querySelector('#user-results');

        try {
            const res = await fetch('/world_cup/admin/users/simulated', {
                method: 'DELETE'
            });

            const result = await res.json();
            resultsDiv.textContent = `Deleted ${result.deleted} simulated users`;
        } catch (e) {
            resultsDiv.textContent = `Error: ${e.message}`;
        }
    }

    async handleLoadMatches() {
        const matchesList = this.shadowRoot.querySelector('#matches-list');

        try {
            const res = await fetch('/world_cup/admin/api/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: '/api/matches', method: 'GET' })
            });

            const result = await res.json();
            const matches = JSON.parse(result.body);

            matchesList.innerHTML = matches.map(match => `
                <div class="match-item">
                    <strong>${match.home.name} vs ${match.away.name}</strong>
                    <input type="number" class="home-score" value="${match.homeScore || 0}" placeholder="Home" />
                    <input type="number" class="away-score" value="${match.awayScore || 0}" placeholder="Away" />
                    <select class="match-status">
                        <option value="scheduled" ${match.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                        <option value="live" ${match.status === 'live' ? 'selected' : ''}>Live</option>
                        <option value="finished" ${match.status === 'finished' ? 'selected' : ''}>Finished</option>
                    </select>
                    <button class="update-match-btn" data-match-id="${match.id}">Update</button>
                </div>
            `).join('');
        } catch (e) {
            matchesList.innerHTML = `Error loading matches: ${e.message}`;
        }
    }

    async handleUpdateMatch(button) {
        const matchItem = button.closest('.match-item');
        const matchId = parseInt(button.dataset.matchId);
        const homeScore = parseInt(matchItem.querySelector('.home-score').value);
        const awayScore = parseInt(matchItem.querySelector('.away-score').value);
        const status = matchItem.querySelector('.match-status').value;

        try {
            const res = await fetch('/world_cup/admin/matches', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([{ id: matchId, homeScore, awayScore, status }])
            });

            const result = await res.json();
            alert('Match updated successfully');
        } catch (e) {
            alert(`Error updating match: ${e.message}`);
        }
    }

    async handleRecalculateScores() {
        try {
            const res = await fetch('/world_cup/admin/scoring/recalculate', {
                method: 'POST'
            });

            const result = await res.json();
            alert(`Recalculated scores for ${result.recalculated} users`);
        } catch (e) {
            alert(`Error recalculating scores: ${e.message}`);
        }
    }

    async handleResetDb() {
        if (!confirm('WARNING: This will delete ALL data and reseed. Are you sure?')) return;

        const resultsDiv = this.shadowRoot.querySelector('#data-results');

        try {
            const res = await fetch('/world_cup/admin/data/reset', {
                method: 'POST'
            });

            const result = await res.json();
            resultsDiv.textContent = result.message;
        } catch (e) {
            resultsDiv.textContent = `Error: ${e.message}`;
        }
    }

    render() {
        if (!this.user) {
            this.shadowRoot.innerHTML = this.getStyles() + '<div class="container"></div>';
            return;
        }

        this.shadowRoot.innerHTML = this.getStyles() + `
            <div class="container">
                <header class="header">
                    <h1>World Cup Admin Dashboard</h1>
                    <div class="user-info">
                        Logged in as: ${this.user.name}
                        <button id="logout-btn">Logout</button>
                    </div>
                </header>

                <nav class="tabs">
                    <button class="tab-btn ${this.activeTab === 'api-tester' ? 'active' : ''}" data-tab="api-tester">API Tester</button>
                    <button class="tab-btn ${this.activeTab === 'user-sim' ? 'active' : ''}" data-tab="user-sim">User Simulation</button>
                    <button class="tab-btn ${this.activeTab === 'tournament' ? 'active' : ''}" data-tab="tournament">Tournament Control</button>
                    <button class="tab-btn ${this.activeTab === 'data' ? 'active' : ''}" data-tab="data">Data Management</button>
                </nav>

                <main class="content">
                    ${this.renderTabContent()}
                </main>
            </div>
        `;

        // Setup logout
        this.shadowRoot.querySelector('#logout-btn')?.addEventListener('click', () => {
            this.user = null;
            this.showLogin();
        });
    }

    renderTabContent() {
        switch (this.activeTab) {
            case 'api-tester':
                return `
                    <div class="tab-content">
                        <h3>API Tester</h3>
                        <div class="api-tester">
                            <div class="form-group">
                                <label>API Endpoint:</label>
                                <select id="api-endpoint-select">
                                    <option value="">-- Select API Endpoint --</option>
                                    <optgroup label="Public APIs">
                                        <option value="matches">GET /api/matches - Get all matches</option>
                                        <option value="leaderboard">GET /api/leaderboard - Get leaderboard</option>
                                        <option value="events">GET /api/events - Get server events</option>
                                    </optgroup>
                                    <optgroup label="Authenticated APIs">
                                        <option value="predictions">GET /api/predictions - Get user predictions</option>
                                        <option value="leagues">GET /api/leagues - Get user leagues</option>
                                        <option value="leagues_post">POST /api/leagues - Create league</option>
                                        <option value="leagues_join">POST /api/leagues/join - Join league</option>
                                        <option value="predict">POST /api/predict - Submit prediction</option>
                                    </optgroup>
                                    <optgroup label="Admin APIs">
                                        <option value="admin_users_bulk">POST /admin/users/bulk-create - Create users</option>
                                        <option value="admin_users_delete">DELETE /admin/users/simulated - Delete simulated users</option>
                                        <option value="admin_matches">PUT /admin/matches - Update matches</option>
                                        <option value="admin_scoring">POST /admin/scoring/recalculate - Recalculate scores</option>
                                        <option value="admin_data_reset">POST /admin/data/reset - Reset database</option>
                                    </optgroup>
                                </select>
                                <input type="text" id="api-endpoint" placeholder="/api/matches" style="margin-top: 5px;" />
                            </div>
                            <div class="form-group">
                                <label>Method:</label>
                                <select id="api-method">
                                    <option value="GET">GET</option>
                                    <option value="POST">POST</option>
                                    <option value="PUT">PUT</option>
                                    <option value="DELETE">DELETE</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Request Body (JSON):</label>
                                <textarea id="api-body" rows="4"></textarea>
                            </div>
                            <button id="api-submit">Send Request</button>
                            <div id="api-response" class="response-display"></div>
                        </div>
                    </div>
                `;

            case 'user-sim':
                return `
                    <div class="tab-content">
                        <h3>User Simulation</h3>
                        <div class="user-simulator">
                            <div class="form-group">
                                <label>Number of users to create:</label>
                                <input type="number" id="user-count" value="10" />
                                <button id="create-users">Create Users</button>
                            </div>
                            <div class="form-group">
                                <button id="delete-simulated">Delete All Simulated Users</button>
                            </div>
                            <div id="user-results" class="results-display"></div>
                        </div>
                    </div>
                `;

            case 'tournament':
                return `
                    <div class="tab-content">
                        <h3>Tournament Control</h3>
                        <div class="tournament-control">
                            <div class="form-group">
                                <button id="load-matches">Load Matches</button>
                                <button id="recalculate-scores">Recalculate All Scores</button>
                            </div>
                            <div id="matches-list" class="matches-list"></div>
                        </div>
                    </div>
                `;

            case 'data':
                return `
                    <div class="tab-content">
                        <h3>Data Management</h3>
                        <div class="data-management">
                            <div class="form-group">
                                <button id="reset-db" class="danger">Reset Database (WARNING: Deletes all data)</button>
                            </div>
                            <div id="data-results" class="results-display"></div>
                        </div>
                    </div>
                `;

            default:
                return '';
        }
    }

    getStyles() {
        return `
            <style>
                :host { display: block; font-family: 'Inter', sans-serif; }
                .container { max-width: 1200px; margin: 0 auto; padding: 20px; }

                .login-form {
                    max-width: 400px;
                    margin: 100px auto;
                    padding: 30px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .login-form h2 { margin-bottom: 20px; text-align: center; }
                .login-form input { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px; }
                .login-form button { width: 100%; padding: 10px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; }
                .login-form button:hover { background: #1d4ed8; }
                .error { color: red; margin-top: 10px; }

                .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb; }
                .header h1 { margin: 0; color: #1f2937; }
                .user-info { font-size: 14px; color: #6b7280; }
                #logout-btn { margin-left: 10px; padding: 5px 10px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; }

                .tabs { display: flex; gap: 10px; margin-bottom: 20px; }
                .tab-btn { padding: 10px 20px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
                .tab-btn.active { background: #2563eb; color: white; border-color: #2563eb; }
                .tab-btn:hover:not(.active) { background: #e5e7eb; }

                .content { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

                .form-group { margin-bottom: 15px; }
                .form-group label { display: block; margin-bottom: 5px; font-weight: 500; }
                .form-group input, .form-group select, .form-group textarea {
                    width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;
                }
                .form-group textarea { font-family: monospace; }

                button { padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; }
                button:hover { background: #1d4ed8; }
                button.danger { background: #dc2626; }
                button.danger:hover { background: #b91c1c; }

                .response-display, .results-display { margin-top: 20px; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; white-space: pre-wrap; font-family: monospace; max-height: 400px; overflow-y: auto; }
                .matches-list { margin-top: 20px; }
                .match-item { padding: 10px; border: 1px solid #e5e7eb; border-radius: 4px; margin-bottom: 10px; }
                .match-item input { width: 60px; margin-right: 10px; }
            </style>
        `;
    }
}

customElements.define('admin-dashboard', AdminDashboard);