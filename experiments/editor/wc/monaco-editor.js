import { getAllFiles, saveFile } from './db-manager.js';

export class MonacoJsEditor extends HTMLElement {
    constructor() {
        super();
        this._editor = null;
        this._currentFileId = null;
        this._currentFileName = '';
    }

    connectedCallback() {
        this.render();
        window.addEventListener('monaco-ready', () => this.initMonaco());
        if (window.monaco) this.initMonaco();
    }

    render() {
        this.innerHTML = `
        <style>
            monaco-js-editor { display: flex; flex-direction: column; overflow: hidden; background: #1e1e1e; }
            #editor-surface { flex: 1; width: 100%; min-height: 0; background: #1e1e1e; }
        </style>
        <div id="editor-surface"></div>
        `;
    }

    async initMonaco() {
        if (!window.monaco || this._editor) return;
        
        this._editor = monaco.editor.create(this.querySelector('#editor-surface'), {
            value: '',
            language: 'javascript',
            theme: 'vs-dark',
            automaticLayout: true,
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false
        });
        
        this._setupEventListeners();
        
        const files = await getAllFiles();
        if (files.length === 0) {
            const defaultCode = `class MyCard extends HTMLElement {\n  constructor() {\n    super();\n    this.attachShadow({ mode: 'open' });\n    this.shadowRoot.innerHTML = \`<h2>Hello!</h2>\`;\n  }\n}\nconst tagName = 'my-card-' + Date.now();\ncustomElements.define(tagName, MyCard);\ndocument.body.appendChild(document.createElement(tagName));`;
            const id = await saveFile({ name: 'main.js', content: defaultCode });
            this.loadFile(id, 'main.js', defaultCode);
        } else {
            this.loadFile(files[0].id, files[0].name, files[0].content);
        }
        this.dispatchEvent(new CustomEvent('file-list-changed', { bubbles: true }));
    }

    loadFile(id, name, content) {
        this._currentFileId = id;
        this._currentFileName = name;
        this._editor.setValue(content);
        this.log(`Opened ${name}`, 'system');
        this.dispatchEvent(new CustomEvent('file-selected', { detail: { id }, bubbles: true }));
    }

    _setupEventListeners() {
        this._editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => this.saveCurrent());
    }

    async saveCurrent() {
        if (this._currentFileId) {
            await saveFile({ 
                id: this._currentFileId, 
                name: this._currentFileName, 
                content: this._editor.getValue() 
            });
            this.log(`File saved.`, 'system');
        }
    }

    async callGemini(mode) {
        const code = this._editor.getValue();
        const status = document.getElementById('ai-status');
        if (status) status.style.display = 'flex';
        this.log(`Asking Gemini...`, 'system');

        const prompts = {
            explain: `Explain this code in 2 simple sentences:\n\n${code}`,
            fix: `Find any bugs in this Web Component code and return ONLY the fixed JavaScript:\n\n${code}`
        };

        try {
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompts[mode] }] }] })
            });
            const data = await response.json();
            const result = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (mode === 'explain') {
                this.log(result, 'ai');
            } else {
                const clean = result.replace(/```javascript|```js|```/g, '').trim();
                this._editor.setValue(clean);
                this.log("Code updated.", "ai");
            }
        } catch (err) {
            this.log(`AI Error: ${err.message}`, 'error');
        } finally {
            if (status) status.style.display = 'none';
        }
    }

    log(msg, type = '') {
        this.dispatchEvent(new CustomEvent('editor-log', { 
            detail: { msg, type },
            bubbles: true,
            composed: true
        }));
    }

    executeCode() {
        const code = this._editor.getValue();
        const frame = document.getElementById('preview-frame');
        this.log("Updating preview...", "system");
        const content = `<html><body style="padding:20px; font-family:sans-serif;"><script>
            const log = (...args) => window.parent.postMessage({ type: 'log', data: args }, '*');
            window.onerror = (m) => window.parent.postMessage({ type: 'error', data: m }, '*');
            console.log = log;
            try { ${code} } catch(e) { log('Error: ' + e.message); }
        <\/script></body></html>`;
        if (frame) frame.srcdoc = content;
    }
}

customElements.define('monaco-js-editor', MonacoJsEditor);
