// sliding-panel.js

class SlidingPanel extends HTMLElement {
    constructor() {
      super();
      // Attach shadow DOM for encapsulation.
      this.attachShadow({ mode: 'open' });
  
      // Default options.
      this._options = {
        direction: 'left',           // 'left', 'right', 'top', or 'bottom'
        animationDuration: '0.5s',     // CSS transition duration
        easing: 'ease',              // CSS transition easing function
        backgroundColor: 'rgba(0, 0, 0, 0.8)'  // Panel background color
      };
  
      // Create a style element for internal styles.
      this.styleEl = document.createElement('style');
      this.shadowRoot.appendChild(this.styleEl);
  
      // Create the panel container.
      this.panel = document.createElement('div');
      this.panel.classList.add('panel');
  
      // Create a slot so that any inner HTML becomes the panel's content.
      const slot = document.createElement('slot');
      this.panel.appendChild(slot);
      this.shadowRoot.appendChild(this.panel);
  
      // Initialize styles and transform.
      this._updateStyles();
      this._setInitialTransform();
  
      // Bind the keydown handler.
      this._onKeyDown = this._onKeyDown.bind(this);
    }
  
    // List of attributes to observe.
    static get observedAttributes() {
      return ['direction', 'animation-duration', 'easing', 'background-color'];
    }
  
    // Helper: Convert dashed attribute names to camelCase option keys.
    _attributeToOptionName(attrName) {
      switch(attrName) {
        case 'animation-duration': return 'animationDuration';
        case 'background-color': return 'backgroundColor';
        default: return attrName; // e.g., "direction", "easing"
      }
    }
  
    // When an observed attribute changes, update the corresponding option.
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;
      const optionName = this._attributeToOptionName(name);
      this._options[optionName] = newValue;
      this._updateStyles();
      this._setInitialTransform();
    }
  
    connectedCallback() {
      // Read initial attributes.
      this._readAttributes();
      window.addEventListener('keydown', this._onKeyDown);
    }
  
    disconnectedCallback() {
      window.removeEventListener('keydown', this._onKeyDown);
    }
  
    // Read all observed attributes and update options accordingly.
    _readAttributes() {
      SlidingPanel.observedAttributes.forEach(attr => {
        const value = this.getAttribute(attr);
        if (value !== null) {
          const optionName = this._attributeToOptionName(attr);
          this._options[optionName] = value;
        }
      });
      this._updateStyles();
      this._setInitialTransform();
    }
  
    // Update the internal styles based on the current options.
    _updateStyles() {
      const { animationDuration, easing, backgroundColor } = this._options;
      this.styleEl.textContent = `
        :host {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: block;
          pointer-events: none; /* Prevent interaction when hidden */
          z-index: 1000;
        }
        .panel {
          position: fixed;
          width: 100%;
          height: 100%;
          background: ${backgroundColor};
          transition: transform ${animationDuration} ${easing};
          pointer-events: auto;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        }
      `;
    }
  
    // Set the initial transform so the panel starts off-screen.
    _setInitialTransform() {
      const direction = this._options.direction;
      let hiddenTransform;
      const visibleTransform = 'translate(0, 0)';
  
      switch(direction) {
        case 'left':
          hiddenTransform = 'translateX(-100%)';
          break;
        case 'right':
          hiddenTransform = 'translateX(100%)';
          break;
        case 'top':
          hiddenTransform = 'translateY(-100%)';
          break;
        case 'bottom':
          hiddenTransform = 'translateY(100%)';
          break;
        default:
          hiddenTransform = 'translateX(-100%)';
      }
      this._hiddenTransform = hiddenTransform;
      this._visibleTransform = visibleTransform;
      // Only update transform if the panel is not visible.
      if (!this._isVisible) {
        this.panel.style.transform = this._hiddenTransform;
      }
    }
  
    // Listen for Alt+E key presses to toggle the panel.
    _onKeyDown(e) {
      if (e.key === 'ArrowUp') {
        this.toggle();
      }
    }
  
    // Toggle panel visibility.
    toggle() {
      if (this._isVisible) {
        this.hide();
      } else {
        this.show();
      }
    }
  
    // Slide the panel into view.
    show() {
      this.panel.style.transform = this._visibleTransform;
      this._isVisible = true;
    }
  
    // Slide the panel out of view.
    hide() {
      this.panel.style.transform = this._hiddenTransform;
      this._isVisible = false;
    }
  }
  
  // Register the custom element.
  customElements.define('sliding-panel', SlidingPanel);