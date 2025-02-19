// toolbar-component.js

 class ToolbarComponent extends HTMLElement {
  constructor() {
    super();
    // Create an open shadow DOM for style and markup encapsulation.
    this.attachShadow({ mode: "open" });

    // Create a container for the toolbar items.
    this.container = document.createElement("div");
    this.container.className = "toolbar";

    // Append style for the toolbar.
    const style = document.createElement("style");
    style.textContent = `
        .toolbar {
          display: flex;
          gap: 10px;
          padding: 5px;
          background: #f0f0f0;
          border: 1px solid #ccc;
          border-radius: 4px;
          align-items: center;
          font-family: sans-serif;
        }
        .toolbar-item {
          display: flex;
          align-items: center;
        }
        .toolbar-item label {
          margin-right: 5px;
          font-size: 0.9em;
        }
        button {
          cursor: pointer;
        }
        input[type="text"] {
          padding: 2px 4px;
        }
        select {
          padding: 2px 4px;
        }
      `;
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(this.container);
  }
  /**
   * Gets a toolbar item by its ID.
   * 
   * @param {string} id - The ID of the toolbar item.
   * @returns {HTMLElement} - The toolbar item.
   * 
   */
  getComponent(id) {
    return this.container.querySelector(`#${id}`);
  }

  /**
   * Adds a toolbar item.
   *
   * @param {string} type - The type of component to add ("button", "select", "input", "toggle").
   * @param {string} config - A configuration string.
   *                          For button, input, toggle: "Label | ActionName"
   *                          For select: "Label | ActionName | Option1, Option2, Option3"
   */
  addComponent(type, config) {
    // Split the config string by "|" and trim any extra whitespace.
    const parts = config.split("|").map((part) => part.trim());
    const label = parts[0] || "";
    const action = parts[1] || "";
    const value = parts[2] || "";
    const id = action.replace(/\s/g, "-");

    let element;
    switch (type.toLowerCase()) {
      case "button":
        element = this._createButton(label, action);
        break;
      case "input":
        element = this._createInput(label, action, value);
        break;
      case "toggle":
        element = this._createToggle(label, action);
        break;
      case "select":
        // For select, the third part should contain a comma-separated list of options.
        const optionsStr = value || "";
        const options = optionsStr.split(",").map((opt) => opt.trim()).filter(
          Boolean,
        );
        element = this._createSelect(label, action, options);
        break;
      default:
        console.error(`Unknown component type: ${type}`);
        return;
    }

    if (!element) return;
    
    element.classList.add("toolbar-item");
    
    if (id) {
      const currentElement = this.container.querySelector(`#${id}`);
      if (currentElement) {
        this.container.replaceChild(element, currentElement);
        return;
      }
    }
    
    this.container.appendChild(element);
  }

  // Private method: Create a button.
  _createButton(label, action) {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("toolbar-action", {
          detail: { action },
        }),
      );
    });
    return btn;
  }

  // Private method: Create a text input.
  _createInput(label, action, placeholder) {
    const wrapper = document.createElement("div");
    const lbl = document.createElement("label");
    lbl.textContent = label;
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = placeholder;
    input.addEventListener("change", (e) => {
      this.dispatchEvent(
      new CustomEvent("toolbar-action", {
        detail: { action, value: e.target.value },
      }),
      );
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === "Tab") {
      this.dispatchEvent(
        new CustomEvent("toolbar-action", {
        detail: { action, value: e.target.value },
        }),
      );
      }
    });
    wrapper.appendChild(lbl);
    wrapper.appendChild(input);
    return wrapper;
  }

  // Private method: Create a toggle (checkbox).
  _createToggle(label, action) {
    const wrapper = document.createElement("div");
    const lbl = document.createElement("label");
    lbl.textContent = label;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.addEventListener("change", (e) => {
      this.dispatchEvent(
        new CustomEvent("toolbar-action", {
          detail: { action, value: e.target.checked },
        }),
      );
    });
    wrapper.appendChild(lbl);
    wrapper.appendChild(checkbox);
    return wrapper;
  }

  // Private method: Create a select element.
  _createSelect(label, action, options) {
    const wrapper = document.createElement("div");
    const lbl = document.createElement("label");
    lbl.textContent = label;
    const select = document.createElement("select");
    options.forEach((opt) => {
      const optionEl = document.createElement("option");
      optionEl.value = opt;
      optionEl.textContent = opt;
      select.appendChild(optionEl);
    });
    select.addEventListener("change", (e) => {
      this.dispatchEvent(
        new CustomEvent("toolbar-action", {
          detail: { action, value: e.target.value },
        }),
      );
    });
    wrapper.appendChild(lbl);
    wrapper.appendChild(select);
    return wrapper;
  }
}

// Define the custom element.
customElements.define("toolbar-component", ToolbarComponent);