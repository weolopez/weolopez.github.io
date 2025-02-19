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
      this.shadowRoot.querySelector('#load-btn').addEventListener('click', () => this.loadComponent());
    }
  
     async loadComponent() {
        const urlInput = this.shadowRoot.querySelector('#component-url').value.trim();
        const url = urlInput.includes('.') ? urlInput : `/wc/${urlInput}-component.js`;
        if (!url) return alert('Please provide a valid URL.');
    
        // Create and append a script tag to load the component.
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
    
        script.onload = () => {
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
            container.innerHTML = ''; // Clear previous component
            container.appendChild(componentInstance);
    
            // Retrieve the component class from the customElements registry.
            const ComponentClass = customElements.get(tagName);
            // Use provided metadata or a fallback to populate the inspector.
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
        // Get current computed style or use default
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
  
        // Attach event listener to run user-provided callback code.
        componentInstance.addEventListener(eventName, (event) => {
          try {
            // Create a new function with the user's code.
            // Warning: Using `new Function` executes code dynamically.
            const userCallback = new Function('event', textarea.value);
            userCallback(event);
          } catch (err) {
            console.error(`Error in ${eventName} callback:`, err);
          }
        });
      }
    }
       /**
     * Traverses the prototype chain of a given class's prototype and returns an ordered array 
     * of objects representing properties that are not part of HTMLElement. 
     * For function properties, an object with its name, parameters, and inferred type is returned.
     * 
     * @param {Function} ComponentClass - The custom element class.
     * @param {Function} [stopAt=HTMLElement] - The base class to stop at.
     * @returns {Object[]} Array of property objects.
     */
    getPrototypeChainProperties(ComponentClass, stopAt = HTMLElement) {
      const properties = [];
      const htmlProps = new Set(Object.getOwnPropertyNames(HTMLElement.prototype));
      let proto = ComponentClass.prototype;
    
      // Traverse until we reach the stopAt prototype (or null)
      while (proto && proto !== stopAt.prototype) {
        // Get all own property names for this prototype level.
        const ownProps = Object.getOwnPropertyNames(proto).filter(name => name !== 'constructor');
        ownProps.forEach(prop => {
          // Only add if not already added and not part of standard HTMLElement
          if (!properties.some(item => item.name === prop) && !htmlProps.has(prop)) {
            const propValue = proto[prop];
            if (typeof propValue === 'function') {
              const funcString = propValue.toString();
              const paramsString = funcString.slice(
                funcString.indexOf('(') + 1,
                funcString.indexOf(')')
              );
              const params = paramsString.split(',').map(param => param.trim()).filter(Boolean);
              // Infer type from constructor name ("AsyncFunction" or "Function")
              const type = propValue.constructor.name;
              properties.push({ name: prop, params, type });
            } else {
              properties.push({ name: prop, type: typeof propValue });
            }
          }
        });
        proto = Object.getPrototypeOf(proto);
      }
    
      // Optionally, add properties from the base HTMLElement prototype.
      if (proto === stopAt.prototype) {
        const baseProps = Object.getOwnPropertyNames(proto).filter(name => name !== 'constructor');
        baseProps.forEach(prop => {
          if (!properties.some(item => item.name === prop) && !htmlProps.has(prop)) {
            const propValue = proto[prop];
            if (typeof propValue === 'function') {
              const funcString = propValue.toString();
              const paramsString = funcString.slice(
                funcString.indexOf('(') + 1,
                funcString.indexOf(')')
              );
              const params = paramsString.split(',').map(param => param.trim()).filter(Boolean);
              const type = propValue.constructor.name;
              properties.push({ name: prop, params, type });
            } else {
              properties.push({ name: prop, type: typeof propValue });
            }
          }
        });
      }
      return properties;
    }
populateInspectorFromComponent(ComponentClass, componentInstance) {
  // Fallback for attributes if no metadata is provided.
  const attrPanel = this.shadowRoot.querySelector('#attributes-panel');
  attrPanel.innerHTML = '<h3>Attributes</h3>';

  // List out observed attributes (if any) as before.
  const observed = ComponentClass.observedAttributes || [];
  observed.forEach(attr => {
    const label = document.createElement('label');
    label.textContent = attr;
    const input = document.createElement('input');
    input.placeholder = attr;
    input.value = componentInstance.getAttribute(attr) || '';
    input.addEventListener('change', (e) => {
      componentInstance.setAttribute(attr, e.target.value);
    });
    label.appendChild(input);
    attrPanel.appendChild(label);
  });

  // New: Create a panel for methods and properties.
  const propPanel = document.createElement('div');
  propPanel.innerHTML = '<h3>Component Methods & Properties</h3>';
  const properties = this.getPrototypeChainProperties(ComponentClass);

  properties.forEach(prop => {
    if (prop.name.startsWith('_')) {
      return;
    }
    const propItem = document.createElement('div');
    propItem.style.padding = '4px';
    propItem.style.border = '1px solid #ddd';
    propItem.style.marginBottom = '4px';

    // Editable property name.
    const nameLabel = document.createElement('label');
    nameLabel.textContent = `${(prop.type === 'Function') ? "F" : "P"} Name: ${prop.name} `;
    propItem.appendChild(nameLabel);

    // If property is a function, create an input for each parameter.
    if (prop.type === 'Function' && Array.isArray(prop.params)) {
      const paramsContainer = document.createElement('div');
      paramsContainer.style.marginTop = '4px';
      prop.params.forEach((param, index) => {
        const paramLabel = document.createElement('label');
        paramLabel.style.display = 'block';
        paramLabel.textContent = `${param}: `;
        const paramInput = document.createElement('input');
        // paramInput.value = param;
        paramInput.style.width = '200px';
        paramInput.addEventListener('change', () => {
          prop.params[index] = paramInput.value.trim();
          componentInstance[prop.name](...prop.params);
        });
        paramLabel.appendChild(paramInput);
        paramsContainer.appendChild(paramLabel);
      });
      propItem.appendChild(paramsContainer);
    }

    propPanel.appendChild(propItem);
  });

  // Append the property panel to the inspector.
  const inspector = this.shadowRoot.querySelector('.inspector');
  inspector.replaceChildren(propPanel);
}
  }
  
  customElements.define('dojo-component', DojoComponent);