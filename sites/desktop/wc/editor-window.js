/**
 * Component: <editor-window>
 * Handles Window UI, dragging, and resizing
 */
export class EditorWindow extends HTMLElement {
    static get observedAttributes() { return ['title', 'active']; }

    constructor() {
        super();
        this.isMaximized = false;
        this.prevRect = null;
    }

    connectedCallback() {
        this.render();
        this.setupInteractions();
    }

    render() {
        const title = this.getAttribute('title') || 'Untitled';
        this.innerHTML = `
            <div class="window-header">
                <span class="text-xs text-gray-400 font-medium">${title}</span>
                <div class="window-controls">
                    <div class="control-btn bg-yellow-500" data-action="minimize"></div>
                    <div class="control-btn bg-green-500" data-action="maximize"></div>
                    <div class="control-btn bg-red-500" data-action="close"></div>
                </div>
            </div>
            <div class="monaco-instance-container">
                <monaco-editor-instance 
                    language="${this.getAttribute('language') || 'javascript'}"
                    value="${this.getAttribute('initial-content') || ''}">
                </monaco-editor-instance>
            </div>
            <div class="resizer"></div>
        `;
    }

    setupInteractions() {
        const header = this.querySelector('.window-header');
        const resizer = this.querySelector('.resizer');
        const editor = this.querySelector('monaco-editor-instance');

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
                editor.layout();
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // Control Buttons
        this.querySelector('[data-action="close"]').onclick = () => this.remove();
        this.querySelector('[data-action="minimize"]').onclick = () => {
            this.style.display = 'none';
            this.dispatchEvent(new CustomEvent('window-minimize', { bubbles: true }));
        };
        this.querySelector('[data-action="maximize"]').onclick = () => this.toggleMaximize();
    }

    toggleMaximize() {
        const editor = this.querySelector('monaco-editor-instance');
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
        setTimeout(() => editor.layout(), 50);
    }
}

customElements.define('editor-window', EditorWindow);
