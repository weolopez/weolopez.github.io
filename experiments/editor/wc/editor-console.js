export class EditorConsole extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = `
        <style>
            #console {
                height: 180px; background: #000; color: #ccc; padding: 8px;
                font-family: 'Consolas', monospace; font-size: 11px;
                overflow-y: auto; border-top: 1px solid #333; flex-shrink: 0;
            }
            .log-entry { margin-bottom: 2px; }
            .log-entry.system { color: #666; }
            .log-entry.ai { color: #b794f4; border-left: 2px solid #8e44ad; padding-left: 6px; margin: 4px 0; }
            .log-entry.error { color: #f48771; }
        </style>
        <div id="console"><div id="log-output"></div></div>
        `;
    }

    log(msg, type = '') {
        const output = this.querySelector('#log-output');
        if (!output) return;
        const div = document.createElement('div');
        div.className = `log-entry ${type}`;
        div.textContent = (type === 'ai' ? '✨ ' : '> ') + msg;
        output.appendChild(div);
        output.parentElement.scrollTop = output.parentElement.scrollHeight;
    }

    clear() {
        const output = this.querySelector('#log-output');
        if (output) output.innerHTML = '';
    }
}

customElements.define('editor-console', EditorConsole);
