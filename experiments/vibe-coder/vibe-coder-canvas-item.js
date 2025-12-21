class VibeCoderCanvasItem extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._selected = false;
    }

    static get observedAttributes() {
        return ['selected'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'selected') {
            this._selected = newValue !== null;
            this._updateStyles();
        }
    }

    set selected(value) {
        if (value) {
            this.setAttribute('selected', '');
        } else {
            this.removeAttribute('selected');
        }
    }

    get selected() {
        return this._selected;
    }

    connectedCallback() {
        this.render();
    }

    _updateStyles() {
        const container = this.shadowRoot.querySelector('.item-container');
        if (container) {
            if (this._selected) {
                container.classList.add('selected');
            } else {
                container.classList.remove('selected');
            }
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css">
            <style>
                :host {
                    display: block;
                    position: relative;
                    transition: all 0.2s ease;
                    padding-top: 25px;
                }
                .item-container {
                    position: relative;
                    border: 2px solid transparent;
                    border-radius: 0.75rem;
                    transition: all 0.2s ease;
                    padding: 4px;
                }
                .item-container:hover {
                    border-color: rgba(14, 165, 233, 0.3);
                    background: rgba(14, 165, 233, 0.02);
                }
                .item-container.selected {
                    border-color: #0ea5e9;
                    background: rgba(14, 165, 233, 0.05);
                    box-shadow: 0 0 20px rgba(14, 165, 233, 0.1);
                }
                .toolbar {
                    position: absolute;
                    top: -1.5rem;
                    right: 0.5rem;
                    display: flex;
                    gap: 0.5rem;
                    opacity: 0;
                    transform: translateY(5px);
                    transition: all 0.2s ease;
                    pointer-events: none;
                    z-index: 100;
                }
                .item-container:hover .toolbar,
                .item-container.selected .toolbar {
                    opacity: 1;
                    transform: translateY(0);
                    pointer-events: auto;
                }
                .tool-btn {
                    background: #1e293b;
                    border: 1px solid #334155;
                    color: #94a3b8;
                    width: 2rem;
                    height: 2rem;
                    border-radius: 0.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.8rem;
                }
                .tool-btn:hover {
                    background: #334155;
                    color: #f1f5f9;
                    border-color: #475569;
                }
                .tool-btn.delete:hover {
                    background: #ef4444;
                    border-color: #ef4444;
                    color: white;
                }
                .tool-btn.select {
                    background: #0ea5e9;
                    color: white;
                    border-color: #0ea5e9;
                }
                .tool-btn.select:hover {
                    background: #0284c7;
                }
            </style>
            <div class="item-container ${this._selected ? 'selected' : ''}">
                <div class="toolbar">
                    <button class="tool-btn select" title="Select & Edit">
                        <i class="fas fa-sliders-h"></i>
                    </button>
                    <button class="tool-btn delete" title="Remove">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                <slot></slot>
            </div>
        `;

        this.shadowRoot.querySelector('.select').addEventListener('click', (e) => {
            e.stopPropagation();
            this.dispatchEvent(new CustomEvent('item-select', {
                bubbles: true,
                composed: true,
                detail: { id: this.id }
            }));
        });

        this.shadowRoot.querySelector('.delete').addEventListener('click', (e) => {
            e.stopPropagation();
            this.dispatchEvent(new CustomEvent('item-delete', {
                bubbles: true,
                composed: true,
                detail: { id: this.id }
            }));
        });

        this.shadowRoot.querySelector('.item-container').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('item-select', {
                bubbles: true,
                composed: true,
                detail: { id: this.id }
            }));
        });
    }
}

customElements.define('vibe-coder-canvas-item', VibeCoderCanvasItem);
