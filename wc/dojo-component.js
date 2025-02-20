import { ReflectionHelper } from '/js/reflection-helper.js';
// dojo-component.js
class DojoComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        /* Overall container styling */
        .container {
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          padding: 1rem;
          display: grid;
          grid-template-areas:
            "header header"
            "loader inspector"
            "preview inspector";
          grid-template-columns: 2fr 1fr;
          gap: 1rem;
        }
        header { grid-area: header; }
        .loader { grid-area: loader; }
        .preview { grid-area: preview; border: 1px solid #ddd; padding: 1rem; border-radius: 4px; }
        .inspector { grid-area: inspector; border: 1px solid #ddd; padding: 1rem; border-radius: 4px; max-height: 500px; overflow-y: auto; }
        input[type="text"], textarea {
          width: 100%;
          padding: 0.5rem;
          margin-top: 0.25rem;
          margin-bottom: 0.75rem;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        label { display: block; margin-bottom: 0.5rem; }
        button {
          padding: 0.5rem 1rem;
          border: none;
          background: #007bff;
          color: #fff;
          border-radius: 4px;
          cursor: pointer;
        }
        button:hover { background: #0056b3; }
        h3 { margin-bottom: 0.5rem; }
      </style>
      <div class="container">
        <header>
          <h1>Dojo Web Component Tester</h1>
        </header>
        <section class="loader">
          <input id="component-url" type="text" placeholder="Enter component URL (e.g., ./my-component.js)" />
          <button id="load-btn">Load Component</button>
        </section>
        <section class="preview">
          <h2>Component Preview</h2>
          <div id="component-container"></div>
        </section>
        <section class="inspector">
          <h2>Component Inspector</h2>
          <div id="attributes-panel">
            <h3>Attributes</h3>
          </div>
          <div id="css-panel">
            <h3>CSS Variables</h3>
          </div>
          <div id="events-panel">
            <h3>Events</h3>
          </div>
        </section>
      </div>
    `;
  }

  connectedCallback() {
    this.shadowRoot.querySelector('#load-btn')
      .addEventListener('click', () => this.loadComponent());
  }

  async loadComponent() {
    const urlInput = this.shadowRoot.querySelector('#component-url').value.trim();
    // If the URL doesn’t include a dot, assume it’s a shorthand and construct the URL.
    const url = urlInput.includes('.') ? urlInput : `/wc/${urlInput}-component.js`;
    if (!url) return alert('Please provide a valid URL.');

    // Create and append a script tag to load the component.
    const script = document.createElement('script');
    script.src = url;
    script.async = true;

    script.onload = () => {
      // If we used a shorthand URL, assume the tag name follows the same pattern.
      // Otherwise, prompt for the tag name.
      const tagName = !urlInput.includes('.') 
        ? `${urlInput}-component` 
        : prompt("Enter the registered custom element tag name:");
      if (!tagName) return alert('No tag name provided.');
      if (!customElements.get(tagName)) {
        return alert(`Custom element "${tagName}" is not registered.`);
      }

      // Create and render an instance of the component.
      const componentInstance = document.createElement(tagName);
      const container = this.shadowRoot.querySelector('#component-container');
      container.innerHTML = ''; // Clear any previous component.
      container.appendChild(componentInstance);

      // Retrieve the component class from the customElements registry.
      const ComponentClass = customElements.get(tagName);
      // If the component provides dojoMeta, use that to populate the inspector.
      if (ComponentClass.dojoMeta) {
        this.populateInspector(ComponentClass.dojoMeta, componentInstance);
      } else {
        this.populateInspectorFromComponent(ComponentClass, componentInstance);
      }
    };

    script.onerror = (error) => {
      console.error('Error loading component script:', error);
      alert('Failed to load component. Check the console for details.');
    };

    this.shadowRoot.appendChild(script);
  }

  populateInspector(metadata, componentInstance) {
    // Use dojoMeta to populate attributes, CSS variables, and events.
    // (This method remains largely unchanged.)
    // --- Attributes Panel ---
    const attrPanel = this.shadowRoot.querySelector('#attributes-panel');
    attrPanel.innerHTML = '<h3>Attributes</h3>';
    for (const [attr, config] of Object.entries(metadata.attributes || {})) {
      const label = document.createElement('label');
      label.textContent = attr;
      const input = document.createElement('input');
      input.placeholder = config.description || attr;
      input.value = componentInstance.getAttribute(attr) || config.default || '';
      input.addEventListener('change', (e) => {
        componentInstance.setAttribute(attr, e.target.value);
      });
      label.appendChild(input);
      attrPanel.appendChild(label);
    }

    // --- CSS Variables Panel ---
    const cssPanel = this.shadowRoot.querySelector('#css-panel');
    cssPanel.innerHTML = '<h3>CSS Variables</h3>';
    for (const [cssVar, config] of Object.entries(metadata.css || {})) {
      const label = document.createElement('label');
      label.textContent = cssVar;
      const input = document.createElement('input');
      input.placeholder = config.description || cssVar;
      input.value = getComputedStyle(componentInstance).getPropertyValue(cssVar).trim() || config.default || '';
      input.addEventListener('change', (e) => {
        componentInstance.style.setProperty(cssVar, e.target.value);
      });
      label.appendChild(input);
      cssPanel.appendChild(label);
    }

    // --- Events Panel ---
    const eventsPanel = this.shadowRoot.querySelector('#events-panel');
    eventsPanel.innerHTML = '<h3>Events</h3>';
    for (const [eventName, config] of Object.entries(metadata.events || {})) {
      const label = document.createElement('label');
      label.textContent = eventName;
      const textarea = document.createElement('textarea');
      textarea.placeholder = config.description || `Callback for ${eventName}`;
      textarea.style.minHeight = '60px';
      textarea.value = config.callback ? config.callback.toString() : '';
      label.appendChild(textarea);
      eventsPanel.appendChild(label);

      // Attach an event listener that executes the user’s callback code.
      componentInstance.addEventListener(eventName, (event) => {
        try {
          const userCallback = new Function('event', textarea.value);
          userCallback(event);
        } catch (err) {
          console.error(`Error in ${eventName} callback:`, err);
        }
      });
    }
  }

  /**
   * Refactored to use ReflectionHelper. This method extracts attributes, methods,
   * and properties from the component (excluding any that start with "_" and
   * any inherited from HTMLElement) and builds an interface for updating values
   * and calling functions.
   *
   * @param {Function} ComponentClass - The custom element class.
   * @param {HTMLElement} componentInstance - The instantiated component.
   */
  populateInspectorFromComponent(ComponentClass, componentInstance) {
    // Clear and populate the Attributes panel using observedAttributes.
    const attrPanel = this.shadowRoot.querySelector('#attributes-panel');
    attrPanel.innerHTML = '<h3>Attributes</h3>';

    const reflector = new ReflectionHelper(ComponentClass, componentInstance);
    const attributes = reflector.getAttributes();
    attributes.forEach(attr => {
      const label = document.createElement('label');
      label.textContent = attr.name;
      const input = document.createElement('input');
      input.placeholder = attr.name;
      input.value = attr.get() || '';
      input.addEventListener('change', (e) => {
        attr.set(e.target.value);
      });
      label.appendChild(input);
      attrPanel.appendChild(label);
    });

    // Build a panel for methods and properties.
    const propPanel = document.createElement('div');
    propPanel.innerHTML = '<h3>Component Methods & Properties</h3>';

    // List methods.
    reflector.methods.forEach(method => {
      const methodItem = document.createElement('div');
      methodItem.style.padding = '4px';
      methodItem.style.border = '1px solid #ddd';
      methodItem.style.marginBottom = '4px';

      const nameLabel = document.createElement('label');
      nameLabel.textContent = `F Name: ${method.name} (${method.type})`;
      methodItem.appendChild(nameLabel);

      const paramsContainer = document.createElement('div');
      paramsContainer.style.marginTop = '4px';
      const paramInputs = {};
      method.params.forEach(param => {
        const paramLabel = document.createElement('label');
        paramLabel.style.display = 'block';
        paramLabel.textContent = `${param}: `;
        const paramInput = document.createElement('input');
        paramInput.style.width = '200px';
        paramInput.addEventListener('change', (e) => {
          paramInputs[param] = e.target.value;
        });
        paramLabel.appendChild(paramInput);
        paramsContainer.appendChild(paramLabel);
      });
      methodItem.appendChild(paramsContainer);

      const callButton = document.createElement('button');
      callButton.textContent = 'Call';
      callButton.addEventListener('click', () => {
        const args = method.params.map(param => paramInputs[param]);
        console.log(`Calling ${method.name} with args:`, args);
        const result = method.call(...args);
        console.log('Result:', result);
      });
      methodItem.appendChild(callButton);

      propPanel.appendChild(methodItem);
    });

    // List properties.
    reflector.properties.forEach(prop => {
      const propItem = document.createElement('div');
      propItem.style.padding = '4px';
      propItem.style.border = '1px solid #ddd';
      propItem.style.marginBottom = '4px';

      const nameLabel = document.createElement('label');
      nameLabel.textContent = `P Name: ${prop.name} (${prop.type})`;
      propItem.appendChild(nameLabel);

      const propInput = document.createElement('input');
      propInput.style.width = '200px';
      const currentVal = prop.get();
      propInput.value = currentVal !== undefined ? currentVal : '';
      propInput.addEventListener('change', (e) => {
        prop.set(e.target.value);
      });
      propItem.appendChild(propInput);

      propPanel.appendChild(propItem);
    });

    // Append the new panel to the inspector.
    const inspector = this.shadowRoot.querySelector('.inspector');
    inspector.replaceChildren(propPanel);
  }
}

customElements.define('dojo-component', DojoComponent);