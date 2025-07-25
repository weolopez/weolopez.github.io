import hljs from 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/es/highlight.min.js';

class CodeHighlighter extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._textContent = '';
        this._language = 'plaintext';

        // Link to a stylesheet for syntax highlighting themes
        const stylesheet = document.createElement('link');
        stylesheet.setAttribute('rel', 'stylesheet');
        stylesheet.setAttribute('href', 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css');
        this.shadowRoot.appendChild(stylesheet);
    }

    static get observedAttributes() {
        return ['language'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'language' && oldValue !== newValue) {
            this._language = newValue;
            this.render();
        }
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

        const pre = document.createElement('pre');
        const code = document.createElement('code');
        
        if (this._language && hljs.getLanguage(this._language)) {
            code.className = `language-${this._language}`;
        }
        
        code.textContent = this._textContent;
        hljs.highlightElement(code);
        
        pre.appendChild(code);

        // Clear previous content and append new
        while (this.shadowRoot.childNodes.length > 1) { // Keep the stylesheet
            this.shadowRoot.removeChild(this.shadowRoot.lastChild);
        }
        this.shadowRoot.appendChild(pre);
    }
}

customElements.define('code-highlighter', CodeHighlighter);