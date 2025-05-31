class ScoreComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Default configuration
        this.config = {
            numPlayers: 3,
            playerNames: ['Team 1', 'Team 2', 'Team 3'],
            playerColors: ['sky', 'rose', 'emerald'],
            showDealer: true,
            showRunningTotal: true,
            maxNameLength: 15,
            allowNegativeScores: false
        };
        
        // Game state
        this.state = {
            currentDealer: 1,
            players: []
        };
        
        // Initialize players based on config
        this.initializePlayers();
    }
    
    static get observedAttributes() {
        return [
            'num-players',
            'player-names', 
            'player-colors',
            'show-dealer',
            'show-running-total',
            'max-name-length',
            'allow-negative-scores'
        ];
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        switch (name) {
            case 'num-players':
                this.config.numPlayers = parseInt(newValue) || 3;
                break;
            case 'player-names':
                this.config.playerNames = newValue ? newValue.split(',').map(n => n.trim()) : ['Team 1', 'Team 2', 'Team 3'];
                break;
            case 'player-colors':
                this.config.playerColors = newValue ? newValue.split(',').map(c => c.trim()) : ['sky', 'rose', 'emerald'];
                break;
            case 'show-dealer':
                this.config.showDealer = newValue !== 'false';
                break;
            case 'show-running-total':
                this.config.showRunningTotal = newValue !== 'false';
                break;
            case 'max-name-length':
                this.config.maxNameLength = parseInt(newValue) || 15;
                break;
            case 'allow-negative-scores':
                this.config.allowNegativeScores = newValue === 'true';
                break;
        }
        
        if (this.shadowRoot.innerHTML) {
            this.initializePlayers();
            this.render();
        }
    }
    
    connectedCallback() {
        this.parseAttributes();
        this.initializePlayers();
        this.render();
        this.setupEventListeners();
        this.updateDisplay();
        this.updateDealerPuckDisplay();
    }
    
    parseAttributes() {
        // Parse attributes from HTML
        const numPlayers = this.getAttribute('num-players');
        if (numPlayers) this.config.numPlayers = parseInt(numPlayers) || 3;
        
        const playerNames = this.getAttribute('player-names');
        if (playerNames) this.config.playerNames = playerNames.split(',').map(n => n.trim());
        
        const playerColors = this.getAttribute('player-colors');
        if (playerColors) this.config.playerColors = playerColors.split(',').map(c => c.trim());
        
        this.config.showDealer = this.getAttribute('show-dealer') !== 'false';
        this.config.showRunningTotal = this.getAttribute('show-running-total') !== 'false';
        
        const maxNameLength = this.getAttribute('max-name-length');
        if (maxNameLength) this.config.maxNameLength = parseInt(maxNameLength) || 15;
        
        this.config.allowNegativeScores = this.getAttribute('allow-negative-scores') === 'true';
    }
    
    initializePlayers() {
        this.state.players = [];
        for (let i = 0; i < this.config.numPlayers; i++) {
            this.state.players.push({
                id: i + 1,
                name: this.config.playerNames[i] || `Team ${i + 1}`,
                currentScore: 0,
                runningTotal: 0,
                color: this.config.playerColors[i] || 'gray'
            });
        }
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: 'Inter', sans-serif;
                    height: 100vh;
                    overflow: hidden;
                }
                
                .score-keeper {
                    background-color: rgb(17 24 39);
                    color: white;
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    overflow: hidden;
                    -webkit-font-smoothing: antialiased;
                }
                
                .players-container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: scroll;

                }
                
                .player-section {
                    position: relative;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 0.5rem;
                    margin: 0.25rem;
                    border-radius: 0.5rem;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }
                
                @media (min-width: 640px) {
                    .player-section {
                        padding: 0.75rem;
                        border-radius: 0.75rem;
                    }
                }
                
                .player-name {
                    font-size: 1.25rem;
                    font-weight: bold;
                    background: transparent;
                    text-align: center;
                    width: 100%;
                    margin-bottom: 0.25rem;
                    border-radius: 0.375rem;
                    border: none;
                    outline: none;
                    padding: 0.25rem 0.5rem;
                    color: inherit;
                }
                
                .player-name:focus {
                    outline: 2px solid rgba(255, 255, 255, 0.3);
                }
                
                @media (min-width: 640px) {
                    .player-name {
                        font-size: 1.5rem;
                        margin-bottom: 0.5rem;
                    }
                }
                
                .score-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-bottom: 0.5rem;
                }
                
                .current-score {
                    font-size: 3rem;
                    line-height: 1;
                    font-weight: 900;
                    user-select: none;
                }
                
                @media (min-width: 640px) {
                    .current-score {
                        font-size: 3.75rem;
                    }
                }
                
                @media (min-width: 768px) {
                    .current-score {
                        font-size: 4.5rem;
                    }
                }
                
                .total-score-label {
                    font-size: 0.875rem;
                    font-weight: normal;
                    opacity: 0.7;
                    margin-top: 0.25rem;
                }
                
                .total-score-value {
                    font-size: 1.5rem;
                    font-weight: bold;
                    user-select: none;
                }
                
                @media (min-width: 640px) {
                    .total-score-label {
                        font-size: 1rem;
                    }
                    .total-score-value {
                        font-size: 1.875rem;
                    }
                }
                
                .score-buttons {
                    display: flex;
                    gap: 0.5rem;
                }
                
                @media (min-width: 640px) {
                    .score-buttons {
                        gap: 0.75rem;
                    }
                }
                
                .score-btn {
                    font-weight: bold;
                    padding: 0.5rem 1rem;
                    border-radius: 0.375rem;
                    font-size: 1.125rem;
                    transition: all 0.15s ease-in-out;
                    width: 3.5rem;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    user-select: none;
                    border: none;
                    cursor: pointer;
                    color: white;
                }
                
                @media (min-width: 640px) {
                    .score-btn {
                        padding: 0.75rem 1.5rem;
                        border-radius: 0.5rem;
                        font-size: 1.25rem;
                        width: 5rem;
                    }
                }
                
                .decrement-btn {
                    background-color: rgb(220 38 38);
                }
                
                .decrement-btn:hover {
                    background-color: rgb(185 28 28);
                }
                
                .decrement-btn:active {
                    background-color: rgb(153 27 27);
                }
                
                .increment-btn {
                    background-color: rgb(22 163 74);
                }
                
                .increment-btn:hover {
                    background-color: rgb(21 128 61);
                }
                
                .increment-btn:active {
                    background-color: rgb(20 83 45);
                }
                
                .dealer-puck {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%);
                    border: 4px solid #b8860b;
                    border-radius: 50%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: 900;
                    color: #8b4513;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                    box-shadow:
                        0 4px 8px rgba(0,0,0,0.3),
                        inset 0 2px 4px rgba(255,255,255,0.3),
                        inset 0 -2px 4px rgba(0,0,0,0.2);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    z-index: 10;
                    opacity: 0;
                    transform: scale(0.8);
                }
                
                .dealer-puck.active {
                    opacity: 1;
                    transform: scale(1);
                }
                
                .dealer-puck:hover {
                    transform: scale(1.05);
                    box-shadow:
                        0 6px 12px rgba(0,0,0,0.4),
                        inset 0 2px 4px rgba(255,255,255,0.4),
                        inset 0 -2px 4px rgba(0,0,0,0.3);
                }
                
                .dealer-puck:active {
                    transform: scale(0.95);
                }
                
                .dealer-text {
                    font-size: 8px;
                    letter-spacing: 0.5px;
                }
                
                .dealer-icon {
                    font-size: 16px;
                    margin-bottom: 2px;
                }
                
                @media (min-width: 640px) {
                    .dealer-puck {
                        width: 100px;
                        height: 100px;
                        font-size: 12px;
                        top: 15px;
                        right: 15px;
                    }
                    
                    .dealer-text {
                        font-size: 10px;
                    }
                    
                    .dealer-icon {
                        font-size: 20px;
                    }
                }
                
                
                /* Color variants */
                .bg-sky { background-color: rgb(3 105 161); }
                .bg-rose { background-color: rgb(190 18 60); }
                .bg-emerald { background-color: rgb(5 150 105); }
                .bg-purple { background-color: rgb(126 34 206); }
                .bg-orange { background-color: rgb(234 88 12); }
                .bg-teal { background-color: rgb(13 148 136); }
                .bg-indigo { background-color: rgb(79 70 229); }
                .bg-pink { background-color: rgb(219 39 119); }
                
                .text-sky-100 { color: rgb(224 242 254); }
                .text-sky-200 { color: rgb(186 230 253); }
                .text-rose-100 { color: rgb(255 228 230); }
                .text-rose-200 { color: rgb(254 205 211); }
                .text-emerald-100 { color: rgb(209 250 229); }
                .text-emerald-200 { color: rgb(167 243 208); }
                .text-purple-100 { color: rgb(243 232 255); }
                .text-purple-200 { color: rgb(233 213 255); }
                .text-orange-100 { color: rgb(255 237 213); }
                .text-orange-200 { color: rgb(254 215 170); }
                .text-teal-100 { color: rgb(204 251 241); }
                .text-teal-200 { color: rgb(153 246 228); }
                .text-indigo-100 { color: rgb(224 231 255); }
                .text-indigo-200 { color: rgb(199 210 254); }
                .text-pink-100 { color: rgb(252 231 243); }
                .text-pink-200 { color: rgb(251 207 232); }
            </style>
            
            <div class="score-keeper">
                <div class="players-container">
                    ${this.renderPlayers()}
                </div>
            </div>
        `;
    }
    
    renderPlayers() {
        return this.state.players.map(player => `
            <div class="player-section bg-${player.color}" data-player-id="${player.id}">
                ${this.config.showDealer ? `
                    <div class="dealer-puck" data-dealer-id="${player.id}">
                        <div class="dealer-icon">♠</div>
                        <div class="dealer-text">DEALER</div>
                    </div>
                ` : ''}
                <input 
                    type="text" 
                    class="player-name" 
                    data-player-id="${player.id}"
                    value="${player.name}" 
                    maxlength="${this.config.maxNameLength}"
                >
                <div class="score-container">
                    <div class="current-score text-${player.color}-100" data-score-id="${player.id}">${player.currentScore}</div>
                    ${this.config.showRunningTotal ? `
                        <div class="total-score-label">Total:</div>
                        <div class="total-score-value text-${player.color}-200" data-total-id="${player.id}">${player.runningTotal}</div>
                    ` : ''}
                </div>
                <div class="score-buttons">
                    <button class="score-btn decrement-btn" data-action="decrement" data-player-id="${player.id}">-</button>
                    <button class="score-btn increment-btn" data-action="increment" data-player-id="${player.id}">+</button>
                </div>
            </div>
        `).join('');
    }
    
    setupEventListeners() {
        const shadowRoot = this.shadowRoot;
        
        // Score buttons
        shadowRoot.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const playerId = parseInt(e.target.dataset.playerId);
            
            if (action && playerId) {
                if (action === 'increment') {
                    this.incrementScore(playerId);
                } else if (action === 'decrement') {
                    this.decrementScore(playerId);
                }
            }
        });
        
        // Hold-to-change functionality
        shadowRoot.querySelectorAll('.score-btn').forEach(btn => {
            this.setupHoldToChange(btn);
        });
        
        // Player name changes
        shadowRoot.addEventListener('input', (e) => {
            if (e.target.classList.contains('player-name')) {
                const playerId = parseInt(e.target.dataset.playerId);
                const player = this.state.players.find(p => p.id === playerId);
                if (player) {
                    player.name = e.target.value;
                    this.dispatchEvent(new CustomEvent('player-name-changed', {
                        detail: { playerId, name: e.target.value }
                    }));
                }
            }
        });
        
        // Dealer puck clicks
        shadowRoot.addEventListener('click', (e) => {
            const dealerId = e.target.closest('.dealer-puck')?.dataset.dealerId;
            if (dealerId) {
                this.moveDealerPuck(parseInt(dealerId));
            }
        });
        
    }
    
    setupHoldToChange(button) {
        let intervalId = null;
        let timeoutId = null;
        const initialDelay = 400;
        const repeatDelay = 75;
        
        const performAction = () => {
            const action = button.dataset.action;
            const playerId = parseInt(button.dataset.playerId);
            
            if (action === 'increment') {
                this.incrementScore(playerId);
                return true;
            } else if (action === 'decrement') {
                if (this.config.allowNegativeScores || this.getPlayerScore(playerId) > 0) {
                    this.decrementScore(playerId);
                    return true;
                }
                return false;
            }
            return false;
        };
        
        const startRapidChange = () => {
            if (intervalId) clearInterval(intervalId);
            intervalId = setInterval(() => {
                if (!performAction()) {
                    stopRapidChange();
                }
            }, repeatDelay);
        };
        
        const stopRapidChange = () => {
            clearTimeout(timeoutId);
            clearInterval(intervalId);
            timeoutId = null;
            intervalId = null;
        };
        
        const handlePress = (event) => {
            if (event.type === 'touchstart') {
                event.preventDefault();
            }
            if (event.type === 'mousedown' && event.button !== 0) {
                return;
            }
            performAction();
            timeoutId = setTimeout(startRapidChange, initialDelay);
        };
        
        const handleRelease = () => {
            stopRapidChange();
        };
        
        button.addEventListener('mousedown', handlePress);
        button.addEventListener('touchstart', handlePress, { passive: false });
        button.addEventListener('mouseup', handleRelease);
        button.addEventListener('mouseleave', handleRelease);
        button.addEventListener('touchend', handleRelease);
        button.addEventListener('touchcancel', handleRelease);
    }
    
    // Public API methods
    incrementScore(playerId) {
        const player = this.state.players.find(p => p.id === playerId);
        if (player) {
            player.currentScore++;
            this.updateDisplay();
            this.dispatchEvent(new CustomEvent('score-changed', {
                detail: { 
                    playerId, 
                    currentScore: player.currentScore, 
                    runningTotal: player.runningTotal,
                    action: 'increment'
                }
            }));
        }
    }
    
    decrementScore(playerId) {
        const player = this.state.players.find(p => p.id === playerId);
        if (player && (this.config.allowNegativeScores || player.currentScore > 0)) {
            player.currentScore--;
            this.updateDisplay();
            this.dispatchEvent(new CustomEvent('score-changed', {
                detail: { 
                    playerId, 
                    currentScore: player.currentScore, 
                    runningTotal: player.runningTotal,
                    action: 'decrement'
                }
            }));
        }
    }
    
    getPlayerScore(playerId) {
        const player = this.state.players.find(p => p.id === playerId);
        return player ? player.currentScore : 0;
    }
    
    getPlayerTotal(playerId) {
        const player = this.state.players.find(p => p.id === playerId);
        return player ? player.runningTotal : 0;
    }
    
    setPlayerScore(playerId, score) {
        const player = this.state.players.find(p => p.id === playerId);
        if (player) {
            player.currentScore = score;
            this.updateDisplay();
            this.dispatchEvent(new CustomEvent('score-changed', {
                detail: { 
                    playerId, 
                    currentScore: player.currentScore, 
                    runningTotal: player.runningTotal,
                    action: 'set'
                }
            }));
        }
    }
    
    processNextRound() {
        // Add current scores to running totals
        this.state.players.forEach(player => {
            player.runningTotal += player.currentScore;
            player.currentScore = 0;
        });
        
        // Rotate dealer if enabled
        if (this.config.showDealer) {
            this.rotateDealerPuck();
        }
        
        this.updateDisplay();
        this.dispatchEvent(new CustomEvent('next-round', {
            detail: { 
                players: this.state.players.map(p => ({
                    id: p.id,
                    name: p.name,
                    currentScore: p.currentScore,
                    runningTotal: p.runningTotal
                })),
                currentDealer: this.state.currentDealer
            }
        }));
    }
    
    resetGame() {
        // Reset all scores and names
        this.state.players.forEach((player, index) => {
            player.currentScore = 0;
            player.runningTotal = 0;
            player.name = this.config.playerNames[index] || `Team ${index + 1}`;
        });
        
        this.state.currentDealer = 1;
        this.updateDisplay();
        this.updateDealerPuckDisplay();
        
        // Update name inputs
        this.shadowRoot.querySelectorAll('.player-name').forEach((input, index) => {
            input.value = this.state.players[index].name;
        });
        
        this.dispatchEvent(new CustomEvent('game-reset', {
            detail: { 
                players: this.state.players.map(p => ({
                    id: p.id,
                    name: p.name,
                    currentScore: p.currentScore,
                    runningTotal: p.runningTotal
                }))
            }
        }));
    }
    
    updateDisplay() {
        this.state.players.forEach(player => {
            const scoreElement = this.shadowRoot.querySelector(`[data-score-id="${player.id}"]`);
            const totalElement = this.shadowRoot.querySelector(`[data-total-id="${player.id}"]`);
            
            if (scoreElement) {
                scoreElement.textContent = player.currentScore;
            }
            if (totalElement) {
                totalElement.textContent = player.runningTotal;
            }
        });
    }
    
    updateDealerPuckDisplay() {
        if (!this.config.showDealer) return;
        
        // Hide all dealer pucks
        this.shadowRoot.querySelectorAll('.dealer-puck').forEach(puck => {
            puck.classList.remove('active');
        });
        
        // Show current dealer's puck
        const currentDealerPuck = this.shadowRoot.querySelector(`[data-dealer-id="${this.state.currentDealer}"]`);
        if (currentDealerPuck) {
            currentDealerPuck.classList.add('active');
        }
    }
    
    rotateDealerPuck() {
        this.state.currentDealer = this.state.currentDealer === this.config.numPlayers ? 1 : this.state.currentDealer + 1;
        this.updateDealerPuckDisplay();
        this.dispatchEvent(new CustomEvent('dealer-changed', {
            detail: { currentDealer: this.state.currentDealer }
        }));
    }
    
    moveDealerPuck(playerId) {
        if (playerId >= 1 && playerId <= this.config.numPlayers) {
            this.state.currentDealer = playerId;
            this.updateDealerPuckDisplay();
            this.dispatchEvent(new CustomEvent('dealer-changed', {
                detail: { currentDealer: this.state.currentDealer }
            }));
        }
    }
    
    // Getter methods for external access
    getGameState() {
        return {
            players: this.state.players.map(p => ({
                id: p.id,
                name: p.name,
                currentScore: p.currentScore,
                runningTotal: p.runningTotal,
                color: p.color
            })),
            currentDealer: this.state.currentDealer,
            config: { ...this.config }
        };
    }
    
    setGameState(gameState) {
        if (gameState.players) {
            gameState.players.forEach((playerData, index) => {
                if (this.state.players[index]) {
                    Object.assign(this.state.players[index], playerData);
                }
            });
        }
        
        if (gameState.currentDealer) {
            this.state.currentDealer = gameState.currentDealer;
        }
        
        this.updateDisplay();
        this.updateDealerPuckDisplay();
        
        // Update name inputs
        this.shadowRoot.querySelectorAll('.player-name').forEach((input, index) => {
            if (this.state.players[index]) {
                input.value = this.state.players[index].name;
            }
        });
    }
}

// Register the custom element
customElements.define('score-component', ScoreComponent);