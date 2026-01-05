import * as monaco from 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/+esm';

/**
 * Component: <monaco-editor-instance>
 * Wraps the Monaco Editor lifecycle
 */
class MonacoEditorInstance extends HTMLElement {
    constructor() {
        super();
        this.editor = null;
    }

    async connectedCallback() {
        if (this.editor) return; // Prevent double initialization

        this.style.display = 'block';
        this.style.flexGrow = '1';
        this.style.height = '100%';
        this.style.width = '100%';

        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        this.appendChild(container);

        // Listen for window resize events from parent
        window.addEventListener('window-resize', (e) => {
            if (this.closest('desktop-window') === e.target || e.target === window) {
                this.layout();
            }
        });

        this.editor = monaco.editor.create(container, {
            value: this.getAttribute('value') || '',
            language: this.getAttribute('language') || 'javascript',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            padding: { top: 10 }
        });
    }

    layout() {
        if (this.editor) this.editor.layout();
    }

    focus() {
        if (this.editor) this.editor.focus();
    }

    disconnectedCallback() {
        if (this.editor) this.editor.dispose();
    }
}

customElements.define('monaco-editor-instance', MonacoEditorInstance);
