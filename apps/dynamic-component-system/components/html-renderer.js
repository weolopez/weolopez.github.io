class HtmlRenderer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    render() {
        // Clear shadow root
        this.shadowRoot.innerHTML = '';
        // Create an iframe to render the inner HTML content
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';

        // Wait for iframe to load, then write the inner HTML
        iframe.onload = () => {
            iframe.contentDocument.open();
            iframe.contentDocument.write(this.innerHTML);
            iframe.contentDocument.close();
        };

        this.shadowRoot.appendChild(iframe);
    }
}

customElements.define('html-renderer', HtmlRenderer);