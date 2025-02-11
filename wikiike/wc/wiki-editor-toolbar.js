   /***********************
     * Wiki Editor Toolbar *
     ***********************/
   class WikiEditorToolbar extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            background: var(--toolbar-bg, #333);
            padding: 0.5rem 1rem;
            color: #fff;
          }
          button {
            background: transparent;
            border: none;
            padding: 0.5rem;
            cursor: pointer;
            border-radius: 4px;
            transition: background 0.2s ease;
            font-size: 1rem;
            color: #fff;
            margin-right: 0.5rem;
          }
          button:hover {
            background: var(--secondary, #03dac6);
          }
          .toolbar-group {
            display: inline-block;
          }
          .toolbar-right {
            float: right;
          }
        </style>
        <div>
          <div class="toolbar-group">
            <button data-action="bold" title="Bold"><strong>B</strong></button>
            <button data-action="italic" title="Italic"><em>I</em></button>
            <button data-action="heading" title="Heading">H</button>
            <button data-action="link" title="Link">🔗</button>
            <button data-action="code" title="Code">{"</>"}</button>
            <button data-action="list" title="List">•</button>
            <button data-action="quote" title="Quote">“”</button>
            <button data-action="ai" title="Enhance with AI">⚡</button>
          </div>
          <div class="toolbar-group toolbar-right">
            <button data-action="themeToggle" title="Toggle Theme">🌙</button>
            <button data-action="viewToggle" title="Toggle View Mode">⛶</button>
            <button data-action="save" title="Save">💾</button>
          </div>
        </div>
      `;
    }
    connectedCallback() {
      this.shadowRoot.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.getAttribute('data-action');
          this.dispatchEvent(new CustomEvent('toolbarAction', { detail: { action } }));
        });
      });
    }
  }
  customElements.define('wiki-editor-toolbar', WikiEditorToolbar);
