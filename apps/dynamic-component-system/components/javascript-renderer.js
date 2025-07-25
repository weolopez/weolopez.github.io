class JavascriptRenderer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._textContent = '';
        this.WEB_COMPONENT_TAG_REGEX = /customElements\.define\s*\(\s*['"`]([^'"`]+)['"`]/;
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
        this.shadowRoot.innerHTML = '<div class="status">Processing JavaScript...</div>';
        const code = this._textContent;

        if (!code || !code.trim()) {
            this.shadowRoot.innerHTML = '<div class="error">No JavaScript content provided.</div>';
            return;
        }

        const match = code.match(this.WEB_COMPONENT_TAG_REGEX);
        if (!match) {
            this.shadowRoot.innerHTML = `
                <div class="error">Not a valid web component definition.</div>
                <p>The code must contain a <code>customElements.define(...)</code> call.</p>
            `;
            // As a fallback, we can display the code itself using the code-highlighter
            const codeHighlighter = document.createElement('code-highlighter');
            codeHighlighter.textContent = code;
            this.shadowRoot.appendChild(codeHighlighter);
            return;
        }

        this.registerAndRender(code);
    }

    registerAndRender(code) {
        const mimeType = `application/javascript-component-${Date.now()}`; // Unique mimeType

        const registrationHandler = (e) => {
            if (e.detail.mimeType === mimeType) {
                document.removeEventListener('COMPONENT_REGISTERED', registrationHandler);
                if (e.detail.success) {
                    this.shadowRoot.innerHTML = ''; // Clear status
                    const componentTag = e.detail.tagName;
                    const componentInstance = document.createElement(componentTag);
                    this.shadowRoot.appendChild(componentInstance);
                } else {
                    this.shadowRoot.innerHTML = `<div class="error">Failed to register component: ${e.detail.error}</div>`;
                }
            }
        };

        // document.addEventListener('COMPONENT_REGISTERED', registrationHandler);
        // document.dispatchEvent(new CustomEvent('PUBLISH_COMPONENT', {
        //     detail: { url: '/wc/dynamic-component-system/components/javascript-renderer.js', mimeType: MIME_TYPES.JAVASCRIPT }
        // }));
        this.dispatchEvent(new CustomEvent('PUBLISH_COMPONENT', {
            bubbles: true,
            composed: true,
            detail: {
                code,
                mimeType
            }
        }));

        // Timeout for registration
        setTimeout(() => {
            document.removeEventListener('COMPONENT_REGISTERED', registrationHandler);
            if (this.shadowRoot.querySelector('.status')) {
                 this.shadowRoot.innerHTML = `<div class="error">Timeout waiting for component registration.</div>`;
            }
        }, 5000);
    }
}

customElements.define('javascript-renderer', JavascriptRenderer);