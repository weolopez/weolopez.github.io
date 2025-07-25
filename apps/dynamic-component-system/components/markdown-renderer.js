import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

class MarkdownRenderer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._textContent = '';
    }

    set textContent(value) {
        this._textContent = value;
        this.render();
    }

    get textContent() {
        return this._textContent;
    }

    connectedCallback() {
        this.render();
    }

    render() {
        if (!this.shadowRoot) return;

        if (this._textContent) {
            this.shadowRoot.innerHTML = marked(this._textContent);
        } else {
            this.shadowRoot.innerHTML = '';
        }
    }
}

customElements.define('markdown-renderer', MarkdownRenderer);