class AppTelemetry extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.registry = [];
        this.selectedTag = null;
        this.searchQuery = '';
        this.hiddenTags = JSON.parse(localStorage.getItem('telemetry-hidden-tags') || '[]');
    }

    connectedCallback() {
        this.render();
        this.startTracking();
    }

    startTracking() {
        this.refreshInterval = setInterval(() => this.updateRegistry(), 1000);
        this.updateRegistry();
    }

    disconnectedCallback() {
        clearInterval(this.refreshInterval);
    }

    // Deep scanner to find components even inside Shadow DOM
    findAllCustomElements(root, tags = new Set()) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        let node = walker.nextNode();
        while (node) {
            const tagName = node.tagName.toLowerCase();
            if (tagName.includes('-') && tagName !== 'app-telemetry') {
                tags.add(tagName);
            }
            if (node.shadowRoot) {
                this.findAllCustomElements(node.shadowRoot, tags);
            }
            node = walker.nextNode();
        }
        return tags;
    }

    updateRegistry() {
        const tags = this.findAllCustomElements(document.body);

        this.registry = Array.from(tags).map(tag => {
            const constructor = customElements.get(tag);
            // Find all instances including deep search
            const instances = this.findInstancesDeep(document.body, tag);
            
            return {
                tag,
                className: constructor ? constructor.name : 'UnknownClass',
                observedAttributes: constructor?.observedAttributes || [],
                instanceCount: instances.length,
                isHidden: this.hiddenTags.includes(tag),
                constructor: constructor,
                instances: instances
            };
        });

        this.updateSidebar();
        this.updateDetails();
        this.updateLayoutState();
    }

    findInstancesDeep(root, tag, found = []) {
        const elements = root.querySelectorAll(tag);
        elements.forEach(el => found.push(el));
        
        const all = root.querySelectorAll('*');
        all.forEach(el => {
            if (el.shadowRoot) this.findInstancesDeep(el.shadowRoot, tag, found);
        });
        return found;
    }

    toggleHide(tag) {
        this.hiddenTags = this.hiddenTags.includes(tag) 
            ? this.hiddenTags.filter(t => t !== tag) 
            : [...this.hiddenTags, tag];
        localStorage.setItem('telemetry-hidden-tags', JSON.stringify(this.hiddenTags));
        this.updateRegistry();
    }

    selectTag(tag) {
        this.selectedTag = (this.selectedTag === tag) ? null : tag;
        this.updateRegistry();
    }

    updateLayoutState() {
        const host = this.shadowRoot.host;
        if (this.selectedTag) {
            host.classList.add('expanded');
        } else {
            host.classList.remove('expanded');
        }
    }

    bringToFront(el) {
        const maxZ = Math.max(0, ...Array.from(document.querySelectorAll('*')).map(e => parseInt(getComputedStyle(e).zIndex) || 0));
        el.style.zIndex = maxZ + 1;
        this.flashElement(el, '#27c93f');
    }

    flashElement(el, color = '#00d4ff') {
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const oldOutline = el.style.outline;
        el.style.outline = `4px solid ${color}`;
        el.style.outlineOffset = "2px";
        setTimeout(() => el.style.outline = oldOutline, 1000);
    }

    getStyles() {
        return `
            :host {
                display: block;
                position: relative;
                width: 100%;
                height: 100%;
                background: var(--bg-primary);
                border: 1px solid var(--border);
                border-radius: 12px;
                display: flex;
                flex-direction: column;
                box-shadow: 0 20px 50px rgba(0,0,0,0.6);
                z-index: 100000;
                color: var(--text-main);
                overflow: hidden;
                transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }

            header {
                padding: 14px 18px;
                background: var(--bg-secondary);
                border-bottom: 1px solid var(--border);
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
            }

            .search-container {
                padding: 10px;
                border-bottom: 1px solid var(--border);
                background: #111;
                flex-shrink: 0;
            }

            .search-container input {
                width: 100%;
                background: #000;
                border: 1px solid #333;
                color: white;
                padding: 8px 10px;
                border-radius: 6px;
                font-size: 12px;
                outline: none;
            }

            .container {
                display: flex;
                flex: 1;
                overflow: hidden;
            }

            .sidebar {
                width: 280px;
                flex-shrink: 0;
                border-right: 1px solid var(--border);
                overflow-y: auto;
                background: #0a0a0a;
            }

            .main-view {
                flex: 1;
                overflow-y: auto;
                padding: 24px;
                background: var(--bg-primary);
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.2s;
            }

            :host(.expanded) .main-view {
                opacity: 1;
                visibility: visible;
            }

            .app-row {
                padding: 12px 16px;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #1a1a1a;
                transition: background 0.2s;
            }

            .app-row:hover { background: #161616; }
            .app-row.selected { background: var(--selection); border-left: 3px solid var(--accent); }
            .app-row.hidden { opacity: 0.25; }

            .badge {
                background: #222;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 10px;
                font-weight: bold;
                color: var(--accent);
                border: 1px solid #333;
            }

            .instance-card {
                background: #161616;
                border: 1px solid var(--border);
                border-radius: 8px;
                padding: 14px;
                margin-bottom: 14px;
            }

            .attr-row {
                display: grid;
                grid-template-columns: 100px 1fr;
                gap: 10px;
                margin-bottom: 5px;
                align-items: center;
            }

            input.attr-input {
                background: #000;
                border: 1px solid #333;
                color: var(--accent);
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-family: monospace;
            }

            .btn-icon {
                background: none;
                border: none;
                color: var(--text-dim);
                cursor: pointer;
                padding: 5px;
                display: flex;
                border-radius: 4px;
            }

            .btn-icon:hover { background: #333; color: white; }
            
            .btn-action {
                background: var(--accent);
                color: #000;
                border: none;
                padding: 8px 14px;
                border-radius: 6px;
                font-weight: bold;
                cursor: pointer;
                font-size: 11px;
            }

            .tag-title { font-family: 'Fira Code', monospace; color: var(--accent); font-size: 1.3em; }
            .meta-label { font-size: 11px; color: var(--text-dim); margin-bottom: 2px; }
        `;
    }

    updateSidebar() {
        const list = this.shadowRoot.getElementById('app-list');
        if (!list) return;

        const filtered = this.registry.filter(item => 
            item.tag.includes(this.searchQuery) || item.className.toLowerCase().includes(this.searchQuery)
        );

        list.innerHTML = filtered.map(item => `
            <div class="app-row ${item.tag === this.selectedTag ? 'selected' : ''} ${item.isHidden ? 'hidden' : ''}" data-tag="${item.tag}">
                <div style="flex: 1; overflow: hidden;">
                    <div style="font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis;">${item.tag}</div>
                    <div style="font-size: 10px; color: var(--text-dim);">${item.className}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="badge">${item.instanceCount}</span>
                    <button class="btn-icon hide-toggle" data-tag="${item.tag}">
                        ${item.isHidden ? this.icons.eyeOff : this.icons.eye}
                    </button>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.app-row').forEach(row => {
            row.onclick = (e) => {
                if (e.target.closest('.hide-toggle')) return;
                this.selectTag(row.dataset.tag);
            };
        });

        list.querySelectorAll('.hide-toggle').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                this.toggleHide(btn.dataset.tag);
            };
        });
    }

    updateDetails() {
        const view = this.shadowRoot.getElementById('details-view');
        if (!this.selectedTag) return;

        const data = this.registry.find(r => r.tag === this.selectedTag);
        const instances = data?.instances || [];

        view.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div>
                    <div class="tag-title"><${this.selectedTag}></div>
                    <div style="font-size: 11px; color: var(--text-dim); margin-top: 5px;">
                        <strong>Class:</strong> ${data.className} | 
                        <strong>Observed:</strong> [${data.observedAttributes.join(', ') || 'none'}]
                    </div>
                </div>
                <button class="btn-action" id="spawn-btn">Spawn New</button>
            </div>

            <div style="font-size: 10px; font-weight: 800; margin-bottom: 12px; color: var(--text-dim); letter-spacing: 0.5px; text-transform: uppercase;">
                Active Instances (${instances.length})
            </div>

            ${instances.map((el, i) => {
                const rect = el.getBoundingClientRect();
                const attrs = Array.from(el.attributes).map(a => `
                    <div class="attr-row">
                        <label style="font-size: 10px; opacity: 0.6; font-family: monospace;">${a.name}</label>
                        <input type="text" value="${a.value}" class="attr-input" data-idx="${i}" data-attr="${a.name}">
                    </div>
                `).join('');

                return `
                    <div class="instance-card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div style="font-size: 11px; font-weight: bold;">INSTANCE #${i + 1} ${el.id ? `(${el.id})` : ''}</div>
                            <div style="display: flex; gap: 4px;">
                                <button class="btn-icon front-btn" data-idx="${i}">${this.icons.layers}</button>
                                <button class="btn-icon flash-btn" data-idx="${i}">${this.icons.locate}</button>
                                <button class="btn-icon del-btn" data-idx="${i}">${this.icons.trash}</button>
                            </div>
                        </div>
                        <div style="font-size: 10px; color: #555; margin-bottom: 10px;">
                            Dim: ${Math.round(rect.width)}x${Math.round(rect.height)} @ ${Math.round(rect.x)},${Math.round(rect.y)}
                        </div>
                        <div style="background: #0a0a0a; padding: 10px; border-radius: 6px;">
                            ${attrs || '<div style="font-size: 10px; color: #333;">No attributes</div>'}
                        </div>
                    </div>
                `;
            }).join('') || '<div style="padding: 30px; text-align: center; border: 1px dashed #222; border-radius: 8px; color: #333;">No instances found in DOM.</div>'}
        `;

        // Bindings
        view.querySelector('#spawn-btn').onclick = () => {
            const el = document.createElement(this.selectedTag);
            el.textContent = `New ${this.selectedTag}`;
            document.body.appendChild(el);
            this.updateRegistry();
        };
        view.querySelectorAll('.flash-btn').forEach(b => b.onclick = () => this.flashElement(instances[b.dataset.idx]));
        view.querySelectorAll('.front-btn').forEach(b => b.onclick = () => this.bringToFront(instances[b.dataset.idx]));
        view.querySelectorAll('.del-btn').forEach(b => b.onclick = () => {
            instances[b.dataset.idx].remove();
            this.updateRegistry();
        });
        view.querySelectorAll('.attr-input').forEach(input => {
            input.onchange = (e) => instances[input.dataset.idx].setAttribute(input.dataset.attr, e.target.value);
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>${this.getStyles()}</style>
        <header>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: var(--accent)">${this.icons.activity}</span>
                <span style="font-weight: 800; font-size: 11px; letter-spacing: 1px;">TELEMETRY</span>
            </div>
        </header>
        <div class="search-container">
            <input type="text" placeholder="Search components..." id="search-input">
        </div>
        <div class="container">
            <div class="sidebar" id="app-list"></div>
            <div class="main-view" id="details-view"></div>
        </div>
        `;

        this.shadowRoot.getElementById('search-input').oninput = (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.updateSidebar();
        };
    }

    get icons() {
        return {
            activity: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
            eye: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
            eyeOff: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`,
            trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
            locate: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>`,
            layers: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`
        };
    }
}

customElements.define('app-telemetry', AppTelemetry);