class MyComponent extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            background: var(--my-component-background, #fff);
            color: var(--my-component-text-color, #333);
            font-size: var(--my-component-font-size, 16px);
            padding: 1rem;
            border: 1px solid #ddd;
            border-radius: 8px;
          }
        </style>
        <div>
          <h2>${this.getAttribute('title') || 'Default Title'}</h2>
          <p>This is MyComponent.</p>
        </div>
      `;
    }
  
    static get observedAttributes() {
      return ['title', 'color'];
    }
  
    attributeChangedCallback(name, oldValue, newValue) {
      // Update the component based on the attribute changes.
      if (name === 'title' && this.shadowRoot) {
        this.shadowRoot.querySelector('h2').textContent = newValue;
      }
    }
  
    // Example method
    doSomething(param1, param2) {
      console.log('doSomething called with', param1, param2);
      return `${param1} and ${param2} processed`;
    }
  
    // Static dojoMeta providing metadata for Dojo inspector.
    /*
  DojoMeta Schema for Dojo Inspector:

  {
    attributes: {
      <attributeName>: {
        description: 'A description of what this attribute does.',
        default: 'Default value (if any)'
      },
      // Add additional attributes...
    },
    css: {
      <cssVariableName>: {
        description: 'A description of the CSS variable.',
        default: 'Default value (if any)'
      },
      // Add additional CSS variables...
    },
    events: {
      <eventName>: {
        description: 'A description of the event.',
        callback: function(event) {
          // optional default callback implementation (if applicable)
          console.log('<eventName> triggered:', event.detail);
        }
      },
      // Add additional events...
    },
    methods: {
      <methodName>: {
        description: 'A description of what this method does.',
        parameters: ['param1', 'param2'] // list the parameter names expected
      },
      // Add additional methods...
    }
  }
*/
    static get dojoMeta() {
      return {
        attributes: {
          title: {
            description: 'The title text for the component header.',
            default: 'Default Title'
          },
          color: {
            description: 'Primary color for text or other elements.',
            default: 'black'
          }
        },
        css: {
          '--my-component-background': {
            description: 'Background color of the component.',
            default: '#fff'
          },
          '--my-component-text-color': {
            description: 'Text color for the component content.',
            default: '#333'
          },
          '--my-component-font-size': {
            description: 'Font size of the component text.',
            default: '16px'
          }
        },
        events: {
          customEvent: {
            description: 'Fires when a custom action occurs.',
            callback: function (event) {
              console.log('Custom event fired:', event.detail);
            }
          }
        },
        methods: {
          doSomething: {
            description: 'Processes two parameters and returns a result.',
            parameters: ['param1', 'param2']
          }
        }
      };
    }
  }
  
  customElements.define('my-component', MyComponent);