class VibeCoderApp extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    background-color: #020617;
                    color: #f1f5f9;
                    overflow: hidden;
                    font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
                }
                main {
                    flex: 1;
                    display: flex;
                    overflow: hidden;
                }
                @media (max-width: 699px) {
                    main {
                        flex-direction: column;
                    }
                    main > vibe-coder-chat,
                    main > .right-section {
                        width: 100%; /* Or flex: 1; */
                    }
                }
                .right-section {
                    width: 50vw;
                    display: flex;
                    flex-direction: row;
                    flex: 1;
                    flex-grow: 1, flex-shrink: 1, flex-basis: 0%
                    background-color: #020617;
                    border-left: 1px solid #1e293b;
                }
                .right-section[hidden] {
                    display: none;
                }
                vibe-coder-chat {
                    flex-grow: 1;
                    flex-shrink: 1;
                    flex-basis: 0%;
                    width: 45vw;
                }
                .canvas-area {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                vibe-coder-chat[hidden] {
                    display: none;
                }
                    
            </style>
            <vibe-coder-header></vibe-coder-header>
            <main>
                <vibe-coder-chat></vibe-coder-chat>
                <div class="right-section">
                    <div class="canvas-area">
                        <vibe-coder-canvas></vibe-coder-canvas>
                    </div>
                    <div style="position: absolute; bottom: 1.5rem; right: 1.5rem; z-index: 100;">
                        <vibe-coder-mode-selector selected-id="${localStorage.getItem('vibe-coder-selected-mode') || 'architect'}"></vibe-coder-mode-selector>
                    </div>
                    <vibe-coder-controls></vibe-coder-controls>
                </div>
            </main>
        `;

        this.chat = this.shadowRoot.querySelector('vibe-coder-chat');
        this.canvas = this.shadowRoot.querySelector('vibe-coder-canvas');
        this.controls = this.shadowRoot.querySelector('vibe-coder-controls');

        this._handleKeyDown = this._handleKeyDown.bind(this);
        // this._handleComponentSelected = this._handleComponentSelected.bind(this);
        this._handleAttributeChanged = this._handleAttributeChanged.bind(this);
    }

    connectedCallback() {
        window.addEventListener('keydown', this._handleKeyDown);
        // this.addEventListener('component-selected', this._handleComponentSelected);
        this.addEventListener('attribute-changed', this._handleAttributeChanged);
        this.addEventListener('component-removed', () => {
            this.controls.hide();
        });
    }

    disconnectedCallback() {
        window.removeEventListener('keydown', this._handleKeyDown);
        // this.removeEventListener('component-selected', this._handleComponentSelected);
        this.removeEventListener('attribute-changed', this._handleAttributeChanged);
    }

    // _handleComponentSelected(e) {
    //     const { tag, id, element } = e.detail;
    //     this.activeComponentId = id;
    //     this.controls.setTag(tag);
        
    //     const observed = element.constructor.observedAttributes || [];
    //     this.controls.renderAttributes(observed, element);
    //     this.controls.show();
    // }

    _handleAttributeChanged(e) {
        const { attribute, value } = e.detail;
        if (this.activeComponentId) {
            const el = this.canvas.getComponent(this.activeComponentId);
            if (el) {
                el.setAttribute(attribute, value);
            }
        }
    }

    _handleKeyDown(e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
            e.preventDefault();
            this.chat.hidden = !this.chat.hidden;
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            const rightSection = this.shadowRoot.querySelector('.right-section');
            rightSection.hidden = !rightSection.hidden;
        }
        else if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
            e.preventDefault();
            this.controls.hidden = !this.controls.hidden;
        }
    }
}

customElements.define('vibe-coder-app', VibeCoderApp);