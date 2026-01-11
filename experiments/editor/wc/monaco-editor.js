import * as monaco from 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.0/+esm';
        window.monaco = monaco;
        window.dispatchEvent(new CustomEvent('monaco-ready'));
import { saveGithubFile } from '/experiments/editor/wc/db-manager.js';
export class MonacoJsEditor extends HTMLElement {
    constructor() {
        super();
        this._editor = null;
        this._currentFileId = null;
        this._currentFileName = '';
        this._currentFilePath = '';
        this._isGithubFile = false;
        this._autoSaveTimeout = null;
        this._isDirty = false;
    }

    connectedCallback() {
        this.render();
        window.addEventListener('monaco-ready', () => this.initMonaco());
        
        document.addEventListener('file-opened', (e) => {
            const { id, name, content, path } = e.detail;
            this._isGithubFile = !!path;
            this._currentFilePath = path || '';
            this.loadFile(id, name, content);
        });

        document.addEventListener('save-code', () => this.saveCurrent());

        if (window.monaco) this.initMonaco();
    }

                // monaco-js-editor {
                //     width: 100%;
                //     flex: 1;
                //     display: flex; 
                //     flex-direction: column; 
                //     height: 93vh;
                // }
    render() {
        this.innerHTML = `
        <style>
            monaco-js-editor { height: 100%; width:100%;
            display: flex; flex-direction: column; overflow: hidden; background: #1e1e1e; position: relative; }
            #editor-surface { flex: 1; width: 100%; min-height: 0; background: #1e1e1e; }
            #editor-status {
                position: absolute;
                top: 10px;
                right: 20px;
                z-index: 10;
                font-size: 11px;
                color: #888;
                pointer-events: none;
                display: flex;
                align-items: center;
                gap: 6px;
                background: rgba(30, 30, 30, 0.8);
                padding: 2px 8px;
                border-radius: 4px;
            }
            .dirty-dot {
                width: 6px;
                height: 6px;
                background: #cca700;
                border-radius: 50%;
                display: none;
            }
            [data-dirty="true"] .dirty-dot { display: block; }
        </style>
        <div id="editor-status">
            <div class="dirty-dot"></div>
            <span id="file-label"></span>
        </div>
        <div id="editor-surface"></div>
        `;
    }

    async initMonaco() {
        if (!window.monaco || this._editor) return;

        // Configure JavaScript/TypeScript defaults for Web Components
        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ESNext,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.CommonJS,
            noEmit: true,
            typeRoots: ["node_modules/@types"]
        });

        // Add basic Web Component types/snippets if needed
        monaco.languages.typescript.javascriptDefaults.addExtraLib(`
            declare class HTMLElement {
                readonly shadowRoot: ShadowRoot | null;
                attachShadow(init: ShadowRootInit): ShadowRoot;
                connectedCallback(): void;
                disconnectedCallback(): void;
                attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
            }
            declare var customElements: {
                define(name: string, constructor: Function, options?: ElementDefinitionOptions): void;
                get(name: string): Function | undefined;
                whenDefined(name: string): Promise<void>;
            };
        `, 'lib.dom.d.ts');
        
        this._editor = monaco.editor.create(this.querySelector('#editor-surface'), {
            value: '',
            language: 'javascript',
            theme: 'vs-dark',
            automaticLayout: true,
            fontSize: 13,
            minimap: { enabled: true },
            scrollBeyondLastLine: false
        });
        
        this._setupEventListeners();
        
        // const files = await getAllFiles();
        // if (files.length === 0) {
        //     const defaultCode = `class MyCard extends HTMLElement {\n  constructor() {\n    super();\n    this.attachShadow({ mode: 'open' });\n    this.shadowRoot.innerHTML = \`<h2>Hello!</h2>\`;\n  }\n}\nconst tagName = 'my-card-' + Date.now();\ncustomElements.define(tagName, MyCard);\ndocument.body.appendChild(document.createElement(tagName));`;
        //     const id = await saveFile({ name: 'main.js', content: defaultCode });
        //     this.loadFile(id, 'main.js', defaultCode);
        // } else {
        //     this.loadFile(files[0].id, files[0].name, files[0].content);
        // }
        // this.dispatchEvent(new CustomEvent('file-list-changed', { bubbles: true }));
    }

    loadFile(id, name, content) {
        this._currentFileId = id;
        this._currentFileName = name;
        this._isDirty = false;
        this.updateStatusUI();
        
        // Set language based on extension
        const ext = name.split('.').pop();
        const langMap = { 'js': 'javascript', 'ts': 'typescript', 'html': 'html', 'css': 'css', 'json': 'json', 'md': 'markdown' };
        if (this._editor) {
            monaco.editor.setModelLanguage(this._editor.getModel(), langMap[ext] || 'javascript');
            this._editor.setValue(content);
        }
        
        this.log(`Opened ${name}`, 'system');
        this.dispatchEvent(new CustomEvent('file-selected', { detail: { id }, bubbles: true }));
    }

    _setupEventListeners() {
        this._editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            if (this._autoSaveTimeout) clearTimeout(this._autoSaveTimeout);
            this.saveCurrent();
        });

        this._editor.onDidChangeModelContent(() => {
            if (!this._isDirty) {
                this._isDirty = true;
                this.updateStatusUI();
            }
            this.scheduleAutoSave();
        });
    }

    scheduleAutoSave() {
        if (this._autoSaveTimeout) clearTimeout(this._autoSaveTimeout);
        this._autoSaveTimeout = setTimeout(() => {
            this.saveCurrent();
        }, 2000); // Auto-save after 2 seconds of inactivity
    }

    updateStatusUI() {
        const label = this.querySelector('#file-label');
        const status = this.querySelector('#editor-status');
        if (label) label.textContent = this._currentFileName + (this._isDirty ? '*' : '');
        if (status) status.dataset.dirty = this._isDirty;
    }

    async saveCurrent() {
        if (!this._currentFileId || !this._isDirty) return;
        
        const content = this._editor.getValue();
        this._isDirty = false;
        this.updateStatusUI();

        // if (this._isGithubFile) {
            await saveGithubFile({
                path: this._currentFilePath,
                name: this._currentFileName,
                content: content,
                sha: this._currentFileId,
                status: 'modified'
            });
            this.log(`Local cache updated. Use Sync to push to GitHub.`, 'system');
            window.dispatchEvent(new CustomEvent('file-list-changed'));
        // }
        //  else {
        //     await saveFile({ 
        //         id: this._currentFileId, 
        //         name: this._currentFileName, 
        //         content: content 
        //     });
        //     this.log(`File saved locally.`, 'system');
        // }
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
