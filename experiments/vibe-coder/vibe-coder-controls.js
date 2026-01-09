import { inspectElement } from '../js/element-tools.js';

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
                .hidden .scroll-area {
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
        this.toggleBtn = this.shadowRoot.querySelector('.toggle-btn');

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
        this.attributesContainer.innerHTML = '';
        this.hide();
    }
renderAttributes(element) {
    // 1. Use the new "Stateful" introspection
    // This assumes inspectElement is imported from your control logic file
    const meta = inspectElement(element);

    this.attributesContainer.innerHTML = '';

    // Handle cases where element is not a custom element or has no schema
    if (!meta || Object.keys(meta.properties).length === 0) {
        this.attributesContainer.innerHTML = '<p class="no-attributes">No editable properties found.</p>';
        return;
    }

    // 2. Iterate over the consolidated properties schema
    Object.entries(meta.properties).forEach(([attrName, config]) => {
        const group = document.createElement('div');
        group.className = 'attribute-group';

        const label = document.createElement('label');
        label.className = 'attribute-label';
        label.textContent = attrName;

        // Optional: You can make getInputType smarter by passing the 'config' object
        // e.g. if config.type === 'boolean', return 'checkbox'
        const inputType = this.getInputType ? this.getInputType(attrName) : 'text';
        
        const input = document.createElement('input');
        input.type = inputType;
        input.placeholder = 'Set value...';
        
        // 3. Use the captured state from the inspection
        // This is cleaner than calling getAttribute() manually inside the loop
        const currentVal = meta.currentState[attrName];
        input.value = (currentVal === null || currentVal === undefined) ? '' : currentVal;

        // 4. Smart Update Logic (Mirrors the AI's logic)
        input.addEventListener('input', (e) => {
            const newValue = e.target.value;

            // STRATEGY: Property > Attribute
            // We try to set the JS property first (e.g., element.value = "10")
            // This is critical if your components have setters that do extra logic (like validation)
            if (attrName in element) {
                element[attrName] = newValue;
            } else {
                element.setAttribute(attrName, newValue);
            }

            // Notify the rest of the app
            this.dispatchEvent(new CustomEvent('attribute-changed', {
                detail: { attribute: attrName, value: newValue },
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