class BasePage extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  // Lifecycle method - called when element is inserted into the DOM.
  connectedCallback() {
    console.log('BasePage connected');
    this.componentDidMount();
  }

  // Lifecycle method - called when element is removed from the DOM.
  disconnectedCallback() {
    console.log('BasePage disconnected');
    this.componentWillUnmount();
  }

  // Lifecycle method - called when element is moved to a new document.
  adoptedCallback() {
    console.log('BasePage adopted');
  }

  // Lifecycle method - called when an attribute is changed.
  attributeChangedCallback(name, oldValue, newValue) {
    console.log(`Attribute: ${name} changed from ${oldValue} to ${newValue}`);
    this.updateAttribute(name, oldValue, newValue);
  }

  // Specify the attributes to observe.
  static get observedAttributes() {
    return ['data-title'];
  }

  // Custom lifecycle methods
  componentDidMount() {
    // User can override for custom mount logic.
  }

  componentWillUnmount() {
    // User can override for custom unmount logic.
  }

  updateAttribute(name, oldValue, newValue) {
    // User can override for custom attribute updates.
  }

  // Render function to setup initial shadow DOM content.
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        /* Default styling for BasePage */
        :host {
          display: block;
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
        }
        .page-container {
          padding: 1rem;
        }
      </style>
      <div class="page-container">
        ${this.html()}
      </div>
    `;
  }

  // Returns HTML structure, intended to be overridden by subclasses.
  html() {
    return `<p>This is the base page component.</p>`;
  }
}

customElements.define('base-page', BasePage);
export default BasePage;