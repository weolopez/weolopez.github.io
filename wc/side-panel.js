   /**
     * SidePanel web component that expands and collapses.
     * When open, it takes a specified width and squeezes the main content.
     */
   class SidePanel extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      const template = document.createElement("template");
      template.innerHTML = `
        <style>
          :host {
            display: block;
            flex-shrink: 0;
            overflow: hidden;
            transition: width 0.3s ease;
            /* When closed, width is 0 */
            width: 0;
            box-sizing: border-box;
            height: 100vh;
            position: absolute;
            z-index: 100;
          }
          /* When open, use the configured width (via a CSS variable) */
          :host([open]) {
            width: var(--side-panel-width, 300px);
          }
          .panel-content {
            padding: 0px;
            box-sizing: border-box;
            height: 100%;
            border-right: 1px solid #ccc;
          }
          /* If positioned on the right, adjust the border */
          :host([position="right"]) .panel-content {
            border-right: none;
            border-left: 1px solid #ccc;
          }
        </style>
        <div class="panel-content">
          <header>
            <button id="close-button" style="background:none; border:none; cursor:pointer; float:left;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </header>
          <slot></slot>
        </div>
      `;
      this.shadowRoot.appendChild(template.content.cloneNode(true));

      this.shadowRoot.getElementById('close-button').addEventListener('click', () => {
        this.close();
      });
    }

    static get observedAttributes() {
      return ["open", "width"];
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "width") {
        // Update the custom property to set the panel width.
        this.style.setProperty("--side-panel-width", newValue || "300px");
      }
    }

    // Public API: Open the panel.
    open() {
      if (!this.hasAttribute("open")) {
        this.setAttribute("open", "");
        this.dispatchEvent(new CustomEvent("panel-open", { bubbles: true, composed: true }));
      }
    }

    // Public API: Close the panel.
    close() {
      if (this.hasAttribute("open")) {
        this.removeAttribute("open");
        this.dispatchEvent(new CustomEvent("panel-close", { bubbles: true, composed: true }));
      }
    }

    // Public API: Toggle the panel state.
    toggle() {
      if (this.hasAttribute("open")) {
        this.close();
      } else {
        this.open();
      }
    }
  }

  // Define the custom element.
  customElements.define("side-panel", SidePanel);