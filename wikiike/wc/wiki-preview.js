
      /***********************
       * Wiki Preview Component *
       ***********************/
      class WikiPreview extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({ mode: 'open' });
          this.shadowRoot.innerHTML = `
            <style>
              :host {
                display: block;
                padding: 1rem;
                overflow-y: auto;
                background: var(--background, #fff);
                color: var(--text, #000);
              }
            </style>
            <div id="previewContent"></div>
          `;
        }
        set content(markdown) {
          this.shadowRoot.getElementById('previewContent').innerHTML = marked.parse(markdown);
        }
        get content() {
          return this.shadowRoot.getElementById('previewContent').innerHTML;
        }
      }
      customElements.define('wiki-preview', WikiPreview);
  