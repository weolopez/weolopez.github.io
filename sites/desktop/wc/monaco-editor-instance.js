/**
 * Component: <monaco-editor-instance>
 * Wraps the Monaco Editor lifecycle
 */
export class MonacoEditorInstance extends HTMLElement {
    constructor() {
        super();
        this.editor = null;
    }

    connectedCallback() {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        this.appendChild(container);

        require(['vs/editor/editor.main'], () => {
            this.editor = monaco.editor.create(container, {
                value: this.getAttribute('value') || '',
                language: this.getAttribute('language') || 'javascript',
                theme: 'vs-dark',
                automaticLayout: true,
                minimap: { enabled: false },
                padding: { top: 10 }
            });
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
