import { inspectElement } from '/experiments/js/element-tools.js';
import { eventBus } from '/desktop/src/events/event-bus.js';
import { MESSAGES } from '/desktop/src/events/message-types.js';

class VibeCoderControls extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    flex: 1;
                    overflow: hidden;
                    background: #020617;
                }
                .scroll-area {
                    height: 100%;
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
            </style>
            <div class="scroll-area">
                <div class="attributes">
                    <!-- Attributes will be rendered here -->
                </div>
            </div>
        `;

        this.attributesContainer = this.shadowRoot.querySelector('.attributes');
        
        // Use eventBus to listen for window focus
        // eventBus.subscribe(MESSAGES.WINDOW_FOCUSED, ({ windowId }) => {
        //     const window = document.querySelector(`window-component[data-window-id="${windowId}"]`);
        //     if (window) {
        //        this.renderAttributes(window.children[0]);
        //     }
        // });

        eventBus.subscribe(MESSAGES.FINDER_FILE_EDIT, ({ filePath, windowId }) => {
            const window = document.querySelector(`window-component[data-window-id="${windowId}"]`);
            if (window) {
               this.renderAttributes(window.children[0]);
            }
        });
    }

    clear() {
        this.attributesContainer.innerHTML = '';
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

            // 4. Smart Update Logic
            input.addEventListener('input', (e) => {
                const newValue = e.target.value;

                // STRATEGY: Property > Attribute
                if (attrName in element) {
                    element[attrName] = newValue;
                } else {
                    element.setAttribute(attrName, newValue);
                }

                // Notify via eventBus
                eventBus.publish(MESSAGES.ATTRIBUTE_CHANGED, { 
                    attribute: attrName, 
                    value: newValue,
                    elementTag: element.tagName.toLowerCase()
                });
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