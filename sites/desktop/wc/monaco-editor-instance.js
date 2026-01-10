import { eventBus } from '/desktop/src/events/event-bus.js';
import { MESSAGES } from '/desktop/src/events/message-types.js';
import '/js/monaco/monaco-editor.js'

/**
 * Component: <monaco-editor-instance>
 * Wraps the Monaco Editor lifecycle
 */
class MonacoEditorInstance extends HTMLElement {
    constructor() {
        super();
        this.editor = null;

        eventBus.subscribe(MESSAGES.FINDER_FILE_EDITED, (detail) => {
            console.log('FINDER_FILE_EDITED received:', detail);
            const { id, name, content, path } = detail;
            this._isGithubFile = !!path;
            this._currentFilePath = path || '';
            this.loadFile(id, name, content);
        });

    }

    async connectedCallback() {
        if (this.editor) return; // Prevent double initialization

        this.style.display = 'block';
        this.style.flexGrow = '1';
        this.style.height = '100%';
        this.style.width = '100%';

    //         <monaco-editor 
    //   id="js-editor" 
    //   language="javascript" 
    //   theme="vs-dark" 
    //   value="// Type your code here\nconsole.log('Hello World');"
    //   style="height: 300px;"
    // ></monaco-editor>
        this.editor = document.createElement('monaco-editor');
        this.editor.style.width = '100%';
        this.editor.style.height = '100%';
        this.editor.setAttribute('language', 'javascript');
        this.editor.setAttribute('theme', 'vs-dark');
        this.appendChild(this.editor);

        // Listen for window resize events from parent
        document.addEventListener('window-resize', (e) => {
            if (this.closest('desktop-window') === e.target || e.target === window) {
                this.layout();
            }
        });

        document.addEventListener('editor-show', (e) => {
            console.log('Editor show event received:', JSON.stringify(e.detail));
            const { id, name, content, path } = e.detail;
            this._isGithubFile = !!path;
            this._currentFilePath = path || '';
            this.loadFile(id, name, content);
        });

        document.dispatchEvent(new CustomEvent('editor-show', { 
                    detail: { id: "this._currentFile.sha", name: "this._currentFile.name", content: "this._currentFile.content", path: "this._currentFile.path" },
                }));
    }
    loadFile(id, name, content) {
        // Set language based on extension
        const ext = name.split('.').pop();
        const langMap = { 'js': 'javascript', 'ts': 'typescript', 'html': 'html', 'css': 'css', 'json': 'json', 'md': 'markdown' };
        if (this.editor) {
            this.editor.setAttribute('language', langMap[ext] || 'javascript');
            this.editor.setValue(content);
        }
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

if (!customElements.get('monaco-editor-instance')) {
 customElements.define('monaco-editor-instance', MonacoEditorInstance);
}
