class VibeCoderCanvas extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css">
            <style>
                :host {
                    display: block;
                    height: 100%;
                }
                section {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background-color: #020617;
                }
                .canvas-header {
                    height: 3.5rem;
                    border-bottom: 1px solid #1e293b;
                    display: flex;
                    align-items: center;
                    padding: 0 1.5rem;
                    background-color: rgba(15, 23, 42, 0.9);
                    backdrop-filter: blur(8px);
                    gap: 1.5rem;
                    z-index: 20;
                    justify-content: flex-end;
                }
                .divider {
                    height: 1.25rem;
                    width: 1px;
                    background-color: #1e293b;
                }
                .reset-btn {
                    font-size: 0.7rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #64748b;
                    transition: all 0.2s;
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid #334155;
                    padding: 0.4rem 0.75rem;
                    border-radius: 0.5rem;
                    cursor: pointer;
                }
                .reset-btn:hover {
                    color: #f1f5f9;
                    background: rgba(30, 41, 59, 0.8);
                    border-color: #475569;
                }
                .canvas-area {
                    flex: 1;
                    display: flex;
                    overflow: hidden;
                    position: relative;
                }
                .canvas-container {
                    background-image: radial-gradient(circle at 2px 2px, #1e293b 1px, transparent 0);
                    background-size: 24px 24px;
                    background-color: #020617;
                    flex-grow: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    overflow: auto;
                }
                .canvas-stage {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-wrap: wrap;
                    align-items: flex-start;
                    justify-content: center;
                    padding: 2rem;
                    gap: 2rem;
                    overflow-y: auto;
                    align-content: flex-start;
                }
                .canvas-stage > * {
                    max-width: 45vw;
                    flex: 1 1 auto;
                    min-width: 300px;
                }
                .empty-state {
                    color: #334155;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1.5rem;
                    user-select: none;
                }
                .empty-state i {
                    font-size: 3.5rem;
                    color: #0ea5e9;
                    opacity: 0.2;
                    animation: spin 12s linear infinite;
                }
                .empty-state p {
                    font-size: 0.75rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.25em;
                    color: #475569;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            </style>
            <section>
                <div class="canvas-header">
                    <button class="reset-btn">
                        <i class="fas fa-sync-alt"></i> Redraw
                    </button>
                </div>
                <div class="canvas-area">
                    <div class="canvas-container">
                        <div class="canvas-stage">
                            <div class="empty-state">
                                <i class="fas fa-atom"></i>
                                <p>Canvas Ready</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;

        this.resetBtn = this.shadowRoot.querySelector('.reset-btn');
        this.canvasStage = this.shadowRoot.querySelector('.canvas-stage');

        this.resetBtn.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('reset-canvas', { bubbles: true }));
        });

        // Listen for item events
        this.canvasStage.addEventListener('item-select', (e) => {
            this.selectItem(e.detail.id);
        });

        this.canvasStage.addEventListener('item-delete', (e) => {
            this.remove(e.detail.id);
            this.dispatchEvent(new CustomEvent('component-removed', { detail: { id: e.detail.id }, bubbles: true }));
        });

        // Listen for play-code events to update the canvas
        document.addEventListener('vibe-coder-play-code', (e) => {
            const { tag } = e.detail;
            if (tag) {
                this.addTag(tag);
            }
        });
    }

    addTag(tag, id = null, attributes = {}) {
        // Remove empty state if it exists
        const emptyState = this.canvasStage.querySelector('.empty-state');
        if (emptyState) {
            this.canvasStage.innerHTML = '';
        }

        const componentId = id || `comp-${Math.random().toString(36).substr(2, 9)}`;
        
        const wrapper = document.createElement('vibe-coder-canvas-item');
        // wrapper = componentId;

        const el = document.createElement(tag);
        el.id = componentId;
        
        // Apply attributes if provided
        Object.entries(attributes).forEach(([key, value]) => {
            el.setAttribute(key, value);
        });

        wrapper.appendChild(el);
        this.canvasStage.appendChild(wrapper);
        
        this._updateEmptyState();
        
        // Auto-select new item
        setTimeout(() => this.selectItem(componentId), 0);
        
        return componentId;
    }

    selectItem(id) {
        const items = this.canvasStage.querySelectorAll('vibe-coder-canvas-item');
        items.forEach(item => {
            item.selected = (item.id === id);
        });

        const selectedItem = this.canvasStage.querySelector(`#${id}`);
        if (selectedItem) {
            const el = selectedItem.firstElementChild;
            this.dispatchEvent(new CustomEvent('component-selected', { 
                detail: { 
                    tag: el.tagName.toLowerCase(),
                    id: id,
                    element: el
                }, 
                bubbles: true 
            }));
        }
    }

    remove(id) {
        const el = this.canvasStage.querySelector(`#${id}`);
        if (el) {
            el.remove();
        }
        this._updateEmptyState();
        this.dispatchEvent(new CustomEvent('component-removed', { detail: { id }, bubbles: true }));
    }

    clear() {
        this.canvasStage.innerHTML = '';
        this._updateEmptyState();
    }

    backup(chatID = 'default') {
        const components = this.getComponents();
        localStorage.setItem(`vibe-coder-canvas-${chatID}`, JSON.stringify(components));
    }

    restore(chatID = 'default') {
        const data = localStorage.getItem(`vibe-coder-canvas-${chatID}`);
        if (data) {
            this.clear();
            const components = JSON.parse(data);
            components.forEach(comp => {
                this.addTag(comp.tag, comp.id, comp.attributes || {});
            });
        }
    }

    getComponent(id) {
        const wrapper = this.canvasStage.querySelector(`#${id}`);
        return wrapper ? wrapper.firstElementChild : null;
    }

    getComponents() {
        return Array.from(this.canvasStage.children)
            .filter(el => el.tagName.toLowerCase() === 'vibe-coder-canvas-item')
            .map(wrapper => {
                const el = wrapper.firstElementChild;
                const attrs = {};
                const observed = el.constructor.observedAttributes || [];
                observed.forEach(attr => {
                    if (el.hasAttribute(attr)) {
                        attrs[attr] = el.getAttribute(attr);
                    }
                });
                return {
                    tag: el.tagName.toLowerCase(),
                    id: wrapper.id,
                    attributes: attrs
                };
            });
    }

    duplicate(id) {
        const el = this.getComponent(id);
        if (el) {
            const tag = el.tagName.toLowerCase();
            const attrs = {};
            const observed = el.constructor.observedAttributes || [];
            observed.forEach(attr => {
                if (el.hasAttribute(attr)) {
                    attrs[attr] = el.getAttribute(attr);
                }
            });
            return this.addTag(tag, null, attrs);
        }
        return null;
    }

    exportState() {
        return JSON.stringify(this.getComponents(), null, 2);
    }

    _updateEmptyState() {
        if (this.canvasStage.children.length === 0) {
            this.canvasStage.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-atom"></i>
                    <p>Canvas Ready</p>
                </div>
            `;
        }
    }

    syncSelector(tags, active) {
        this.selector.innerHTML = '';
        if (tags.length === 0) {
            this.selector.innerHTML = '<option value="">(No Components)</option>';
            return;
        }
        tags.forEach(tag => {
            const opt = document.createElement('option');
            opt.value = tag;
            opt.textContent = tag;
            opt.selected = (tag === active);
            this.selector.appendChild(opt);
        });
    }
}

customElements.define('vibe-coder-canvas', VibeCoderCanvas);