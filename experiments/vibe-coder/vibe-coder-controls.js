class VibeCoderControls extends HTMLElement {
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
                }
                .header {
                    padding: 1.25rem 1.5rem;
                    border-bottom: 1px solid #1e293b;
                    background-color: rgba(15, 23, 42, 0.5);
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
                .scroll-area {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .scroll-area::-webkit-scrollbar {
                    width: 4px;
                }
                .scroll-area::-webkit-scrollbar-thumb {
                    background: #334155;
                    border-radius: 10px;
                }
                .attributes {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .attribute-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.625rem;
                }
                .attribute-label {
                    font-size: 0.65rem;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                }
                .input-wrapper {
                    position: relative;
                }
                input {
                    width: 100%;
                    background-color: #020617;
                    border: 1px solid #334155;
                    border-radius: 0.5rem;
                    padding: 0.625rem 0.75rem;
                    font-size: 0.875rem;
                    color: #f1f5f9;
                    outline: none;
                    transition: all 0.2s;
                    box-sizing: border-box;
                }
                input:focus {
                    border-color: #0ea5e9;
                    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
                }
                input[type="color"] {
                    height: 2.5rem;
                    padding: 0.25rem;
                    cursor: pointer;
                }
                input::placeholder {
                    color: #475569;
                }
                .no-attributes {
                    font-size: 0.75rem;
                    color: #475569;
                    font-style: italic;
                    text-align: center;
                    margin-top: 2rem;
                }
                .hidden {
                    display: none;
                }
            </style>
            <aside class="hidden">
                <div class="header">
                    <h3>Observed Attributes</h3>
                    <p class="tag"></p>
                </div>
                <div class="scroll-area">
                    <div class="attributes">
                        <!-- Attributes will be rendered here -->
                    </div>
                </div>
            </aside>
        `;

        this.aside = this.shadowRoot.querySelector('aside');
        this.tagElement = this.shadowRoot.querySelector('.tag');
        this.attributesContainer = this.shadowRoot.querySelector('.attributes');
    }

    show() {
        this.aside.classList.remove('hidden');
    }

    hide() {
        this.aside.classList.add('hidden');
    }

    setTag(tag) {
        this.tagElement.textContent = `<${tag}>`;
    }

    renderAttributes(attrs, element) {
        this.attributesContainer.innerHTML = '';
        if (!attrs || attrs.length === 0) {
            this.attributesContainer.innerHTML = '<p class="no-attributes">No attributes exposed via observedAttributes.</p>';
            return;
        }

        attrs.forEach(attr => {
            const group = document.createElement('div');
            group.className = 'attribute-group';

            const label = document.createElement('label');
            label.className = 'attribute-label';
            label.textContent = attr.replace(/-/g, ' ');

            const inputType = this.getInputType(attr);
            const input = document.createElement('input');
            input.type = inputType;
            input.placeholder = 'Set value...';
            input.value = element ? element.getAttribute(attr) || '' : '';

            input.addEventListener('input', (e) => {
                this.dispatchEvent(new CustomEvent('attribute-changed', {
                    detail: { attribute: attr, value: e.target.value },
                    bubbles: true
                }));
            });

            group.appendChild(label);
            group.appendChild(input);
            this.attributesContainer.appendChild(group);
        });
    }

    getInputType(attr) {
        const lower = attr.toLowerCase();
        if (lower.includes('color')) return 'color';
        if (lower.includes('number') || lower.includes('size') || lower.includes('width') || lower.includes('height') || lower.includes('duration')) return 'number';
        if (lower.includes('date')) return 'date';
        if (lower.includes('time')) return 'time';
        return 'text';
    }
}

customElements.define('vibe-coder-controls', VibeCoderControls);