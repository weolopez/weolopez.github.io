class PromptEditor extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({
            mode: 'open'
        });

        this.shadowRoot.innerHTML = /*html*/ `
        <style>
            :root {
                --border: #d1d3d4;
                --foreground: #ffffff;
                --toolbar-bg: #00a8e0;
                --primary: #00a8e0;
                --primary-dark: #0078a0;
                --background: #f4f4f9;
                --secondary: #ff8200;
                --text: #333;
            }
        
            :host {
                display: block;
                width: 100%;
                height: 80%;
                font-family: 'Inter', sans-serif;
            }
        
            .container {
                display: flex;
                flex-direction: column;
                height: 100%;
                transition: all 0.3s ease;
            }
        
            .editor {
                flex: 1;
                display: flex;
                flex-direction: column;
                border: 1px solid var(--border);
                margin: 10px;
                padding: 10px;
                background: var(--foreground);
                transition: all 0.3s ease;
            }
        
            .editor.collapsed {
                height: 0;
                overflow: hidden;
                margin: 0;
                padding: 0;
                border: none;
            }
        
            .toolbar {
                display: flex;
                justify-content: space-between;
                background: var(--toolbar-bg);
                padding: 10px;
                border-bottom: 1px solid var(--border);
            }
        
            .toolbar button {
                background: var(--primary);
                color: var(--foreground);
                border: none;
                padding: 5px 10px;
                cursor: pointer;
                transition: background 0.3s ease;
            }
        
            .toolbar button:hover {
                background: var(--primary-dark);
            }
        
            textarea {
                flex: 1;
                width: 100%;
                border: none;
                resize: none;
                padding: 0px;
                font-size: 1em;
                transition: all 0.3s ease;
            }
        </style>
        <div class="container">
            <div class="toolbar">
                <button id="togglePrompt">Toggle Prompt</button>
                <button id="toggleResponse">Toggle Response</button>
            </div>
            <div id="promptEditor" class="editor">
                <textarea placeholder="Edit your prompt here..."></textarea>
            </div>
            <div id="responseEditor" class="editor">
                <textarea placeholder="Edit your response here..."></textarea>
            </div>
        </div>
        `;

        this.promptEditor = this.shadowRoot.getElementById('promptEditor');
        this.responseEditor = this.shadowRoot.getElementById('responseEditor');
        this.togglePromptButton = this.shadowRoot.getElementById('togglePrompt');
        this.toggleResponseButton = this.shadowRoot.getElementById('toggleResponse');

        this.togglePromptButton.addEventListener('click', () => this.toggleEditor('prompt'));
        this.toggleResponseButton.addEventListener('click', () => this.toggleEditor('response'));
    }

    static get observedAttributes() {
        return ['prompt', 'response'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'prompt') {
            this.promptEditor.querySelector('textarea').value = newValue;
        } else if (name === 'response') {
            this.responseEditor.querySelector('textarea').value = newValue;
        }
    }

    get prompt() {
        return this.getAttribute('prompt');
    }

    set prompt(value) {
        this.setAttribute('prompt', value);
    }

    get response() {
        return this.getAttribute('response');
    }

    set response(value) {
        this.setAttribute('response', value);
    }

    toggleEditor(editor) {
        if (editor === 'prompt') {
            this.promptEditor.classList.toggle('collapsed');
            if (this.promptEditor.classList.contains('collapsed') && this.responseEditor.classList.contains('collapsed')) {
                this.responseEditor.classList.remove('collapsed');
            }
        } else if (editor === 'response') {
            this.responseEditor.classList.toggle('collapsed');
            if (this.promptEditor.classList.contains('collapsed') && this.responseEditor.classList.contains('collapsed')) {
                this.promptEditor.classList.remove('collapsed');
            }
        }
    }
}

customElements.define('prompt-editor-component', PromptEditor);