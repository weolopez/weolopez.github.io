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
          }
          /* When open, use the configured width (via a CSS variable) */
          :host([open]) {
            width: var(--side-panel-width, 300px);
          }
          .panel-content {
            padding: 10px;
            box-sizing: border-box;
            height: 100%;
            background: #fff;
            border-right: 1px solid #ccc;
          }
          /* If positioned on the right, adjust the border */
          :host([position="right"]) .panel-content {
            border-right: none;
            border-left: 1px solid #ccc;
          }
        </style>
        <div class="panel-content">
          <slot></slot>
        </div>
      `;
      this.shadowRoot.appendChild(template.content.cloneNode(true));
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