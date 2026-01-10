class VibeCoderInspector extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    height: 100%;
                }
                aside {
                    width: 20rem;
                    height: 100%;
                    border-left: 1px solid #1e293b;
                    background-color: #0f172a;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .header {
                    padding: 1.25rem 1.5rem;
                    border-bottom: 1px solid #1e293b;
                    background-color: rgba(15, 23, 42, 0.5);
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    min-height: 4.5rem;
                    box-sizing: border-box;
                }
                .header-content {
                    flex: 1;
                    overflow: hidden;
                    transition: opacity 0.2s;
                }
                h3 {
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: #0ea5e9;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin: 0 0 0.25rem 0;
                }
                .tag {
                    font-size: 0.7rem;
                    font-family: 'JetBrains Mono', monospace;
                    color: #64748b;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    margin: 0;
                }
                .toggle-btn {
                    background: none;
                    border: 1px solid #334155;
                    color: #94a3b8;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 0.375rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    min-width: 2rem;
                    height: 2rem;
                }
                .toggle-btn:hover {
                    background-color: #1e293b;
                    color: #f1f5f9;
                    border-color: #475569;
                }
                .hidden {
                    width: 2.6rem;
                }
                .hidden .header-content,
                .hidden vibe-coder-controls {
                    opacity: 0;
                    pointer-events: none;
                }
                .hidden .header {
                    padding: 0.25rem;
                    justify-content: center;
                    margin-right: 14px;
                }
            </style>
            <aside class="hidden">
                <div class="header">
                    <div class="header-content">
                        <h3>Observed Attributes</h3>
                        <p class="tag"></p>
                    </div>
                    <button class="toggle-btn" title="Toggle Sidebar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                </div>
                <vibe-coder-controls></vibe-coder-controls>
            </aside>
        `;

        this.aside = this.shadowRoot.querySelector('aside');
        this.tagElement = this.shadowRoot.querySelector('.tag');
        this.toggleBtn = this.shadowRoot.querySelector('.toggle-btn');
        this.controls = this.shadowRoot.querySelector('vibe-coder-controls');

        this.toggleBtn.addEventListener('click', () => {
            const currentlyHidden = this.aside.classList.contains('hidden');
            if (currentlyHidden) {
                this.show();
            } else {
                this.hide();
            }
            localStorage.setItem('vibe-coder-aside-hidden', currentlyHidden);
            this.updateToggleButton();
        });

        const isHidden = localStorage.getItem('vibe-coder-aside-hidden') === 'true';
        if (isHidden) {
            this.hide();
        } else {
            this.show();
        }
        document.addEventListener('vibe-coder-controls-show', () => this.show());
    }

    static get observedAttributes() {
        return ['hidden'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'hidden') {
            if (newValue !== null) {
                this.aside.classList.add('hidden');
            } else {
                this.aside.classList.remove('hidden');
            }
            this.updateToggleButton();
        }
    }

    updateToggleButton() {
        const currentlyHidden = this.aside.classList.contains('hidden');
        this.toggleBtn.style.transform = currentlyHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    }

    show() {
        this.removeAttribute('hidden');
        this.aside.classList.remove('hidden');
    }

    hide() {
        this.setAttribute('hidden', '');
    }

    setTag(tag) {
        this.tagElement.textContent = `<${tag}>`;
    }

    clear() {
        this.tagElement.textContent = '';
        this.controls.clear();
        this.hide();
    }

    renderAttributes(element) {
        this.controls.renderAttributes(element);
    }
}

customElements.define('vibe-coder-inspector', VibeCoderInspector);
