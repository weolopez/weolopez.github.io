class MermaidDiagram extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._diagramData = null;
    }

    connectedCallback() {
        // When the component is added to the DOM, we initiate the script loading.
        // The .then() ensures that we only attempt to render the diagram *after*
        // the script has been successfully loaded and initialized.
        this.loadMermaidScript().then(() => {
            this.renderDiagram();
        }).catch(error => {
            console.error("Failed to load Mermaid script:", error);
            this.shadowRoot.innerHTML = `<pre>Failed to load Mermaid library.</pre>`;
        });
    }

    /**
     * Loads the Mermaid.js script from a CDN and returns a Promise that resolves when the script is loaded.
     * This function ensures the script is only added to the page once, even if multiple
     * mermaid-diagram components are on the page.
     */
    loadMermaidScript() {
        return new Promise((resolve, reject) => {
            // Use a window-level flag to ensure initialization happens only once.
            if (window.mermaidScriptLoaded) {
                return resolve();
            }
            if (window.mermaidScriptLoading) {
                // If script is already loading, wait for it to finish.
                document.addEventListener('mermaid-loaded', () => resolve());
                return;
            }

            window.mermaidScriptLoading = true;
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js';
            
            // The 'load' event fires when the script has been fully downloaded and executed.
            script.onload = () => {
                // Initialize Mermaid. `startOnLoad: false` is crucial because we will
                // manually trigger rendering for each component.
                window.mermaid.initialize({ startOnLoad: false });
                window.mermaidScriptLoaded = true;
                window.mermaidScriptLoading = false;
                // Dispatch a custom event to notify other components that the script is ready.
                document.dispatchEvent(new CustomEvent('mermaid-loaded'));
                resolve();
            };

            // Handle cases where the script fails to load.
            script.onerror = () => {
                window.mermaidScriptLoading = false;
                reject('Failed to load mermaid.min.js');
            }

            document.head.appendChild(script);
        });
    }

    get diagramData() {
        if (this._diagramData) {
            return this._diagramData;
        }

        const fromAttribute = this.getAttribute('diagram');
        if (fromAttribute) {
            return fromAttribute;
        }

        // Look for a <pre> or <template> tag in the light DOM.
        // Use textContent and trim() to get only the raw text, free of extra whitespace.
        const slot = this.querySelector('pre, template');
        if (slot) {
            return slot.textContent.trim();
        }

        const urlParams = new URLSearchParams(window.location.search);
        const fromQuery = urlParams.get('diagram');
        if (fromQuery) {
            return decodeURIComponent(fromQuery).trim();
        }

        // Fallback to the component's own text content.
        // This handles cases where text is placed directly inside the component tags.
        const textContent = this.textContent.trim();
        if (textContent) {
            return textContent;
        }

        return `
graph TD;
    A[Default Diagram] --> B{Nothing Provided};
        `;
    }

    async renderDiagram() {
        const diagramContent = this.diagramData;
        // Generate a unique ID for each diagram to avoid conflicts.
        const diagramId = 'mermaid-' + Math.random().toString(36).substr(2, 9);

        try {
            // Use mermaid.render to generate the SVG in memory without DOM interaction.
            // This is the most robust method for Shadow DOM compatibility.
            const { svg } = await window.mermaid.render(diagramId, diagramContent);

            // Now, inject the generated SVG into the shadow DOM.
            this.shadowRoot.innerHTML = `
                <style>
                    :host {
                        display: block;
                        text-align: center;
                    }
                    svg {
                        max-width: 100%;
                        height: auto;
                    }
                </style>
                ${svg}
            `;
        } catch (e) {
            console.error('Error rendering mermaid diagram:', e);
            this.shadowRoot.innerHTML = `<pre>Error rendering diagram: ${e.message}</pre>`;
        }
    }
}

customElements.define('mermaid-diagram', MermaidDiagram);