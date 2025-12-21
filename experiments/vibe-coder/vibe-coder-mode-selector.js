import { MODES } from './modes.js';

class VibeCoderModeSelector extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isOpen = false;
        this.selectedModeId = localStorage.getItem('vibe-coder-selected-mode') || MODES[0].id;
        this.render();
    }

    static get observedAttributes() {
        return ['selected-id'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'selected-id' && oldValue !== newValue) {
            this.selectedModeId = newValue;
            this.render();
        }
    }

    toggleOpen() {
        this.isOpen = !this.isOpen;
        this.render();
        
        if (this.isOpen) {
            const onOutsideClick = (e) => {
                if (!this.contains(e.target) && !e.composedPath().includes(this)) {
                    this.isOpen = false;
                    this.render();
                    document.removeEventListener('click', onOutsideClick);
                }
            };
            setTimeout(() => document.addEventListener('click', onOutsideClick), 0);
        }
    }

    selectMode(id) {
        const mode = MODES.find(m => m.id === id);
        if (mode && mode.disabled) return;

        this.selectedModeId = id;
        localStorage.setItem('vibe-coder-selected-mode', id);
        this.isOpen = false;
        this.dispatchEvent(new CustomEvent('mode-change', {
            detail: { mode: MODES.find(m => m.id === id) },
            bubbles: true,
            composed: true
        }));
        this.render();
    }

    render() {
        const selectedMode = MODES.find(m => m.id === this.selectedModeId) || MODES[0];
        
        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css">
            <style>
                :host {
                    position: relative;
                    display: inline-block;
                }
                .trigger-btn {
                    background: #1e293b;
                    border: 1px solid #334155;
                    color: #94a3b8;
                    padding: 0.5rem;
                    border-radius: 0.75rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    width: 2.5rem;
                    height: 2.5rem;
                }
                .trigger-btn:hover {
                    background: #334155;
                    color: #f1f5f9;
                    border-color: #475569;
                }
                .trigger-btn i {
                    font-size: 1rem;
                }
                .dropdown {
                    position: absolute;
                    bottom: calc(100% + 0.75rem);
                    left: 0;
                    background: #0f172a;
                    border: 1px solid #334155;
                    border-radius: 1rem;
                    width: 280px;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
                    display: ${this.isOpen ? 'block' : 'none'};
                    z-index: 100;
                    overflow: hidden;
                    animation: slideUp 0.2s ease-out;
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .mode-list {
                    list-style: none;
                    padding: 0.5rem;
                    margin: 0;
                }
                .mode-item {
                    padding: 0.75rem;
                    border-radius: 0.75rem;
                    cursor: pointer;
                    display: flex;
                    gap: 0.75rem;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                }
                .mode-item:hover {
                    background: #1e293b;
                }
                .mode-item.selected {
                    background: rgba(14, 165, 233, 0.1);
                    border-color: rgba(14, 165, 233, 0.3);
                }
                .mode-item.disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    filter: grayscale(1);
                }
                .mode-item.disabled:hover {
                    background: transparent;
                }
                .mode-icon {
                    width: 2.5rem;
                    height: 2.5rem;
                    background: #020617;
                    border-radius: 0.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #0ea5e9;
                    flex-shrink: 0;
                }
                .mode-info {
                    display: flex;
                    flex-direction: column;
                    gap: 0.125rem;
                }
                .mode-title {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #f1f5f9;
                }
                .mode-desc {
                    font-size: 0.75rem;
                    color: #94a3b8;
                    line-height: 1.2;
                }
            </style>
            <button class="trigger-btn" title="Change Mode">
                <i class="${selectedMode.icon}"></i>
            </button>
            <div class="dropdown">
                <ul class="mode-list">
                    ${MODES.map(mode => `
                        <li class="mode-item ${mode.id === this.selectedModeId ? 'selected' : ''} ${mode.disabled ? 'disabled' : ''}" data-id="${mode.id}">
                            <div class="mode-icon">
                                <i class="${mode.icon}"></i>
                            </div>
                            <div class="mode-info">
                                <span class="mode-title">${mode.title}</span>
                                <span class="mode-desc">${mode.description}</span>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;

        this.shadowRoot.querySelector('.trigger-btn').onclick = () => this.toggleOpen();
        this.shadowRoot.querySelectorAll('.mode-item').forEach(item => {
            item.onclick = () => this.selectMode(item.dataset.id);
        });
    }
}

customElements.define('vibe-coder-mode-selector', VibeCoderModeSelector);
