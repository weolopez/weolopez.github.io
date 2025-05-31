class ScoreToolbar extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Default configuration
        this.config = {
            showNextRound: true,
            showReset: true,
            nextRoundText: 'Next Round',
            resetText: 'Reset All',
            orientation: 'horizontal' // 'horizontal' or 'vertical'
        };
    }
    
    static get observedAttributes() {
        return [
            'show-next-round',
            'show-reset',
            'next-round-text',
            'reset-text',
            'orientation'
        ];
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        switch (name) {
            case 'show-next-round':
                this.config.showNextRound = newValue !== 'false';
                break;
            case 'show-reset':
                this.config.showReset = newValue !== 'false';
                break;
            case 'next-round-text':
                this.config.nextRoundText = newValue || 'Next Round';
                break;
            case 'reset-text':
                this.config.resetText = newValue || 'Reset All';
                break;
            case 'orientation':
                this.config.orientation = newValue === 'vertical' ? 'vertical' : 'horizontal';
                break;
        }
        
        if (this.shadowRoot.innerHTML) {
            this.render();
        }
    }
    
    connectedCallback() {
        this.parseAttributes();
        this.render();
        this.setupEventListeners();
    }
    
    parseAttributes() {
        this.config.showNextRound = this.getAttribute('show-next-round') !== 'false';
        this.config.showReset = this.getAttribute('show-reset') !== 'false';
        this.config.nextRoundText = this.getAttribute('next-round-text') || 'Next Round';
        this.config.resetText = this.getAttribute('reset-text') || 'Reset All';
        this.config.orientation = this.getAttribute('orientation') === 'vertical' ? 'vertical' : 'horizontal';
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: 'Inter', sans-serif;
                }
                
                .toolbar {
                    padding: 0.5rem;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 0.5rem;
                    background-color: rgb(31 41 55);
                    flex-direction: ${this.config.orientation === 'vertical' ? 'column' : 'column'};
                }
                
                @media (min-width: 640px) {
                    .toolbar {
                        padding: 0.75rem 1rem;
                        flex-direction: ${this.config.orientation === 'vertical' ? 'column' : 'row'};
                        gap: 0.75rem;
                    }
                }
                
                .toolbar-btn {
                    width: 100%;
                    font-weight: bold;
                    padding: 0.5rem 1.5rem;
                    border-radius: 0.5rem;
                    font-size: 1rem;
                    transition: all 0.15s ease-in-out;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    user-select: none;
                    border: none;
                    cursor: pointer;
                    min-height: 44px; /* Touch-friendly minimum */
                }
                
                @media (min-width: 640px) {
                    .toolbar-btn {
                        width: ${this.config.orientation === 'vertical' ? '100%' : 'auto'};
                        padding: 0.75rem 1.5rem;
                        font-size: 1.125rem;
                    }
                }
                
                .next-round-btn {
                    background-color: rgb(234 179 8);
                    color: rgb(17 24 39);
                }
                
                .next-round-btn:hover {
                    background-color: rgb(202 138 4);
                }
                
                .next-round-btn:active {
                    background-color: rgb(161 98 7);
                }
                
                .next-round-btn:disabled {
                    background-color: rgb(156 163 175);
                    color: rgb(75 85 99);
                    cursor: not-allowed;
                }
                
                .reset-btn {
                    background-color: rgb(37 99 235);
                    color: white;
                }
                
                .reset-btn:hover {
                    background-color: rgb(29 78 216);
                }
                
                .reset-btn:active {
                    background-color: rgb(30 64 175);
                }
                
                .reset-btn:disabled {
                    background-color: rgb(156 163 175);
                    color: rgb(75 85 99);
                    cursor: not-allowed;
                }
                
                .hidden {
                    display: none;
                }
            </style>
            
            <div class="toolbar">
                ${this.config.showNextRound ? `
                    <button class="toolbar-btn next-round-btn" id="nextRoundBtn">
                        ${this.config.nextRoundText}
                    </button>
                ` : ''}
                ${this.config.showReset ? `
                    <button class="toolbar-btn reset-btn" id="resetBtn">
                        ${this.config.resetText}
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    setupEventListeners() {
        const nextRoundBtn = this.shadowRoot.getElementById('nextRoundBtn');
        const resetBtn = this.shadowRoot.getElementById('resetBtn');
        
        if (nextRoundBtn) {
            nextRoundBtn.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('next-round-clicked', {
                    bubbles: true,
                    detail: { timestamp: Date.now() }
                }));
            });
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('reset-clicked', {
                    bubbles: true,
                    detail: { timestamp: Date.now() }
                }));
            });
        }
    }
    
    // Public API methods
    enableNextRound() {
        const btn = this.shadowRoot.getElementById('nextRoundBtn');
        if (btn) btn.disabled = false;
    }
    
    disableNextRound() {
        const btn = this.shadowRoot.getElementById('nextRoundBtn');
        if (btn) btn.disabled = true;
    }
    
    enableReset() {
        const btn = this.shadowRoot.getElementById('resetBtn');
        if (btn) btn.disabled = false;
    }
    
    disableReset() {
        const btn = this.shadowRoot.getElementById('resetBtn');
        if (btn) btn.disabled = true;
    }
    
    setNextRoundText(text) {
        this.config.nextRoundText = text;
        const btn = this.shadowRoot.getElementById('nextRoundBtn');
        if (btn) btn.textContent = text;
    }
    
    setResetText(text) {
        this.config.resetText = text;
        const btn = this.shadowRoot.getElementById('resetBtn');
        if (btn) btn.textContent = text;
    }
    
    showNextRound() {
        this.config.showNextRound = true;
        this.render();
        this.setupEventListeners();
    }
    
    hideNextRound() {
        this.config.showNextRound = false;
        this.render();
        this.setupEventListeners();
    }
    
    showReset() {
        this.config.showReset = true;
        this.render();
        this.setupEventListeners();
    }
    
    hideReset() {
        this.config.showReset = false;
        this.render();
        this.setupEventListeners();
    }
}

// Register the custom element
customElements.define('score-toolbar', ScoreToolbar);