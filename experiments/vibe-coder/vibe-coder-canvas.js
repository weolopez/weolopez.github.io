import { createCanvasItemHTML } from './vibe-coder-canvas-item.js';

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
                .paste-btn {
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
                .paste-btn:hover {
                    color: #f1f5f9;
                    background: rgba(30, 41, 59, 0.8);
                    border-color: #475569;
                }
                .wc-selector {
                    background: #1e293b;
                    border: 1px solid #334155;
                    color: #f1f5f9;
                    padding: 0.4rem 0.75rem;
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    outline: none;
                    cursor: pointer;
                }
                .add-btn {
                    background: #0ea5e9;
                    color: white;
                    border: none;
                    padding: 0.4rem 1rem;
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .add-btn:hover {
                    background: #0284c7;
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
                    <select class="wc-selector">
                        <option value="">Select Component...</option>
                    </select>
                    <button class="add-btn">
                        <i class="fas fa-plus"></i> Add
                    </button>
                    <div class="divider"></div>
                    <button class="paste-btn" title="Paste from Clipboard">
                        <i class="fas fa-paste"></i> 
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
        this.wcSelector = this.shadowRoot.querySelector('.wc-selector');
        this.addBtn = this.shadowRoot.querySelector('.add-btn');
        this.pasteBtn = this.shadowRoot.querySelector('.paste-btn');

        this.pasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text && typeof window.register === 'function') {
                    const tag = window.register(text);
                    if (tag) {
                        this.addTag(tag);
                    }
                }
            } catch (err) {
                console.error('Failed to read clipboard:', err);
            }
        });

        this.addBtn.addEventListener('click', () => {
            const selectedFile = this.wcSelector.value;
            if (selectedFile) {
                this.loadAndAddComponent(selectedFile);
            }
        });

        this.loadWCOptions();

        // Listen for item events
        // this.canvasStage.addEventListener('item-select', (e) => {
        //     this.selectItem(e.detail.id);
        // });

        this.canvasStage.addEventListener('item-delete', (e) => {
            this.remove(e.detail.id);
            this.dispatchEvent(new CustomEvent('component-removed', { detail: { id: e.detail.id }, bubbles: true }));
        });

        // Listen for play-code events to update the canvas
        // document.addEventListener('vibe-coder-play-code', (e) => {
        //     const { tag } = e.detail;
        //     if (tag) {
        //         this.addTag(tag);
        //     }
        // });
    }

    async loadWCOptions() {
        const repo = 'weolopez/weolopez.github.io';
        const apiUrl = `https://api.github.com/repos/${repo}/git/trees/main?recursive=1`;
        
        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            const wcFiles = data.tree
                .filter(file => file.path.startsWith('experiments/wc/') && file.path.endsWith('.js'))
                .map(file => ({
                    name: file.path.split('/').pop(),
                    path: file.path
                }));

            this.wcSelector.innerHTML = '<option value="">Select Component...</option>' + 
                wcFiles.map(file => `<option value="${file.path}">${file.name}</option>`).join('');
        } catch (error) {
            console.error('Error loading WC options:', error);
        }
    }

    async loadAndAddComponent(filePath) {
        const repo = 'weolopez/weolopez.github.io';
        const rawUrl = `https://raw.githubusercontent.com/${repo}/main/`;
        const fullUrl = `${rawUrl}${filePath}`;

        try {
            const response = await fetch(fullUrl);
            const code = await response.text();
            
            // Use the register function from the global scope (vibe-coder.js)
            if (typeof window.register === 'function') {
                const tag = window.register(code);
                if (tag) {
                    this.addTag(tag);
                }
            } else {
                console.error('register function not found in global scope');
            }
        } catch (error) {
            console.error('Error loading component:', error);
        }
    }

    addTag(tag, id = null, attributes = {}) {
        // Remove empty state if it exists
        const emptyState = this.canvasStage.querySelector('.empty-state');
        if (emptyState) {
            this.canvasStage.innerHTML = '';
        }

        const componentId = id || `comp-${Math.random().toString(36).substr(2, 9)}`;

        const wrapper = document.createElement('section');
        wrapper.className = 'canvas-item';
        wrapper.id = componentId;
        wrapper.innerHTML = createCanvasItemHTML(false);

        const el = document.createElement(tag);
        el.id = `el-${Math.random().toString(36).substr(2, 9)}`;

        // Apply attributes if provided
        Object.entries(attributes).forEach(([key, value]) => {
            el.setAttribute(key, value);
        });

        const contentDiv = wrapper.querySelector('.content');
        contentDiv.appendChild(el);

        // Add event listeners
        const selectBtn = wrapper.querySelector('.select');
        const deleteBtn = wrapper.querySelector('.delete');
        const container = wrapper.querySelector('.item-container');

        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.dispatchEvent(new CustomEvent('item-select', {
                bubbles: true,
                composed: true,
                detail: { id: componentId }
            }));
        });

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.dispatchEvent(new CustomEvent('item-delete', {
                bubbles: true,
                composed: true,
                detail: { id: componentId }
            }));
        });

        container.addEventListener('click', () => {
            this.selectItem(componentId);
            // this.dispatchEvent(new CustomEvent('item-select', {
            //     bubbles: true,
            //     composed: true,
            //     detail: { id: componentId }
            // }));
        });

        this.canvasStage.appendChild(wrapper);

        this._updateEmptyState();

        // Auto-select new item
        setTimeout(() => this.selectItem(componentId), 0);

        return componentId;
    }

    selectItem(id) {
        const items = this.canvasStage.querySelectorAll('.canvas-item');
        items.forEach(item => {
            const container = item.querySelector('.item-container');
            if (item.id === id) {
                container.classList.add('selected');
            } else {
                container.classList.remove('selected');
            }
        });

        const selectedItem = this.canvasStage.querySelector(`#${id}`);
        if (selectedItem) {
            const el = selectedItem.querySelector('.content').firstElementChild;
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
        return wrapper ? wrapper.querySelector('.content').firstElementChild : null;
    }

    getComponents() {
        return Array.from(this.canvasStage.children)
            .filter(el => el.classList.contains('canvas-item'))
            .map(wrapper => {
                const el = wrapper.querySelector('.content').firstElementChild;
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