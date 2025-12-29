export class EditorControls extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = `
        <style>
            .controls { 
                background: #252526; padding: 8px 12px; display: flex; gap: 8px; 
                border-bottom: 1px solid #333; align-items: center; flex-shrink: 0;
            }
            .controls button {
                background: #3c3c3c; color: white; border: 1px solid #454545;
                padding: 5px 10px; border-radius: 2px; cursor: pointer; font-size: 12px;
            }
            .controls button:hover { background: #4a4a4a; }
            .controls button.primary { background: #007acc; border-color: #007acc; }
            .controls button.ai-btn { color: #d4bfff; border-color: #8e44ad; }
        </style>
        <div class="controls">
            <button id="run-btn" class="primary">▶ Run</button>
            <button id="save-btn">💾 Save</button>
            <button id="explain-btn" class="ai-btn">✨ Explain</button>
            <button id="fix-btn" class="ai-btn">✨ Fix</button>
            <button id="clear-btn">Clear Logs</button>
        </div>
        `;

        this.querySelector('#run-btn').onclick = () => this.dispatchEvent(new CustomEvent('run-code', { bubbles: true, composed: true }));
        this.querySelector('#save-btn').onclick = () => this.dispatchEvent(new CustomEvent('save-code', { bubbles: true, composed: true }));
        this.querySelector('#explain-btn').onclick = () => this.dispatchEvent(new CustomEvent('ai-explain', { bubbles: true, composed: true }));
        this.querySelector('#fix-btn').onclick = () => this.dispatchEvent(new CustomEvent('ai-fix', { bubbles: true, composed: true }));
        this.querySelector('#clear-btn').onclick = () => this.dispatchEvent(new CustomEvent('clear-logs', { bubbles: true, composed: true }));
    }
}

customElements.define('editor-controls', EditorControls);
