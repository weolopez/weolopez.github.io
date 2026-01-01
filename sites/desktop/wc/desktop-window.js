/**
 * Component: <desktop-window>
 * A generic, draggable, resizable window container with slots.
 */
export class DesktopWindow extends HTMLElement {
    static get observedAttributes() { return ['title', 'active']; }

    constructor() {
        super();
        this.isMaximized = false;
        this.prevRect = null;
    }

    connectedCallback() {
        if (!this.shadowRoot) {
            this.attachShadow({ mode: 'open' });
            this.render();
            this.setupInteractions();
        }
    }

    render() {
        const title = this.getAttribute('title') || 'Window';
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: absolute;
                    display: flex;
                    flex-direction: column;
                    background: #252526;
                    border: 1px solid #444;
                    border-radius: 8px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    min-width: 300px;
                    min-height: 200px;
                    overflow: hidden;
                }

                :host(.active) {
                    border-color: #007acc;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.8);
                }

                .window-header {
                    height: 38px;
                    background: #323233;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 12px;
                    cursor: move;
                    -webkit-user-select: none;
                    user-select: none;
                    flex-shrink: 0;
                }

                .window-controls {
                    display: flex;
                    gap: 8px;
                }

                .control-btn {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    cursor: pointer;
                }

                .bg-yellow-500 { background-color: #eab308; }
                .bg-green-500 { background-color: #22c55e; }
                .bg-red-500 { background-color: #ef4444; }

                .window-content-container {
                    flex-grow: 1;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .resizer {
                    position: absolute;
                    width: 15px;
                    height: 15px;
                    right: 0;
                    bottom: 0;
                    cursor: nwse-resize;
                    z-index: 10;
                }

                .text-xs { font-size: 0.75rem; line-height: 1rem; }
                .text-gray-400 { color: #9ca3af; }
                .font-medium { font-weight: 500; }
            </style>
            <div class="window-header">
                <span class="text-xs text-gray-400 font-medium">${title}</span>
                <div class="window-controls">
                    <div class="control-btn bg-yellow-500" data-action="minimize"></div>
                    <div class="control-btn bg-green-500" data-action="maximize"></div>
                    <div class="control-btn bg-red-500" data-action="close"></div>
                </div>
            </div>
            <div class="window-content-container">
                <slot></slot>
            </div>
            <div class="resizer"></div>
        `;
    }

    setupInteractions() {
        const header = this.shadowRoot.querySelector('.window-header');
        const resizer = this.shadowRoot.querySelector('.resizer');

        // Focus on click
        this.addEventListener('mousedown', () => {
            this.dispatchEvent(new CustomEvent('window-focus', { bubbles: true }));
        });

        // Dragging
        header.addEventListener('mousedown', (e) => {
            if (this.isMaximized) return;
            const startX = e.clientX - this.offsetLeft;
            const startY = e.clientY - this.offsetTop;

            const onMouseMove = (moveEvent) => {
                this.style.left = `${moveEvent.clientX - startX}px`;
                this.style.top = `${Math.max(0, moveEvent.clientY - startY)}px`;
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // Resizing
        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const onMouseMove = (moveEvent) => {
                const w = moveEvent.clientX - this.offsetLeft;
                const h = moveEvent.clientY - this.offsetTop;
                this.style.width = `${Math.max(300, w)}px`;
                this.style.height = `${Math.max(200, h)}px`;
                
                // Notify children that size changed (useful for Monaco)
                this.dispatchEvent(new CustomEvent('window-resize', { bubbles: true }));
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // Control Buttons
        this.shadowRoot.querySelector('[data-action="close"]').onclick = () => this.remove();
        this.shadowRoot.querySelector('[data-action="minimize"]').onclick = () => {
            this.style.display = 'none';
            this.dispatchEvent(new CustomEvent('window-minimize', { bubbles: true }));
        };
        this.shadowRoot.querySelector('[data-action="maximize"]').onclick = () => this.toggleMaximize();
    }

    toggleMaximize() {
        if (this.isMaximized) {
            Object.assign(this.style, this.prevRect);
            this.style.borderRadius = '8px';
            this.isMaximized = false;
        } else {
            this.prevRect = {
                width: this.style.width,
                height: this.style.height,
                top: this.style.top,
                left: this.style.left
            };
            Object.assign(this.style, {
                width: '100%', height: '100%', top: '0', left: '0', borderRadius: '0'
            });
            this.isMaximized = true;
        }
        setTimeout(() => this.dispatchEvent(new CustomEvent('window-resize', { bubbles: true })), 50);
    }
}

customElements.define('desktop-window', DesktopWindow);
