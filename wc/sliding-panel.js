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
  
      // Bind event handlers.
      this._onKeyDown = this._onKeyDown.bind(this);
      this._onTouchStart = this._onTouchStart.bind(this);
      this._onTouchMove = this._onTouchMove.bind(this);
      this._onTouchEnd = this._onTouchEnd.bind(this);
      
      // Touch tracking variables
      this._touchStartX = 0;
      this._touchStartY = 0;
      this._touchCurrentX = 0;
      this._touchCurrentY = 0;
      this._isTouching = false;
      this._swipeThreshold = 50; // Minimum distance for a swipe
      this._swipeVelocityThreshold = 0.3; // Minimum velocity for a swipe
    }
  
    // List of attributes to observe.
    static get observedAttributes() {
      return ['direction', 'animation-duration', 'easing', 'background-color', 'toggle-key', 'swipe-threshold', 'swipe-velocity-threshold'];
    }
  
    // Helper: Convert dashed attribute names to camelCase option keys.
    _attributeToOptionName(attrName) {
      switch(attrName) {
        case 'animation-duration': return 'animationDuration';
        case 'background-color': return 'backgroundColor';
        case 'toggle-key': return 'toggleKey';
        case 'swipe-threshold': return 'swipeThreshold';
        case 'swipe-velocity-threshold': return 'swipeVelocityThreshold';
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
      
      // Add touch event listeners to the parent element
      const parent = this.parentElement;
      if (parent) {
        parent.addEventListener('touchstart', this._onTouchStart, { passive: false });
        parent.addEventListener('touchmove', this._onTouchMove, { passive: false });
        parent.addEventListener('touchend', this._onTouchEnd, { passive: false });
      }
    }

    disconnectedCallback() {
      window.removeEventListener('keydown', this._onKeyDown);
      
      // Remove touch event listeners from the parent element
      const parent = this.parentElement;
      if (parent) {
        parent.removeEventListener('touchstart', this._onTouchStart);
        parent.removeEventListener('touchmove', this._onTouchMove);
        parent.removeEventListener('touchend', this._onTouchEnd);
      }
    }
  
    // Read all observed attributes and update options accordingly.
    _readAttributes() {
      SlidingPanel.observedAttributes.forEach(attr => {
        const value = this.getAttribute(attr);
        if (value !== null) {
          const optionName = this._attributeToOptionName(attr);
          if (attr === 'swipe-threshold' || attr === 'swipe-velocity-threshold') {
            this[`_${optionName}`] = parseFloat(value);
          } else {
            this._options[optionName] = value;
          }
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
  
    // Listen for key presses to toggle the panel based on the 'toggle-key' attribute.
    _onKeyDown(e) {
      const toggleKey = this.getAttribute('toggle-key');
      if (!toggleKey) return;

      // Parse the toggleKey (e.g., "meta+e", "ctrl+shift+s")
      const parts = toggleKey.split('+');
      const key = parts.pop().toLowerCase(); // The key is the last part
      const modifiers = parts.map(mod => mod.toLowerCase()); // Modifiers are the rest

      // Check if all required modifiers are pressed
      const modifiersMatch = modifiers.every(mod => {
        switch (mod) {
          case 'meta':
            return e.metaKey;
          case 'ctrl':
            return e.ctrlKey;
          case 'alt':
            return e.altKey;
          case 'shift':
            return e.shiftKey;
          default:
            return false; // Unknown modifier
        }
      });

      // Check if the key matches (case insensitive for letters)
      const keyMatches = e.key.toLowerCase() === key;

      // Toggle only if modifiers and key match
      if (modifiersMatch && keyMatches) {
        this.toggle();
      }
    }


    // Touch event handlers for swipe functionality
    _onTouchStart(e) {
      if (e.touches.length === 1) {
        this._isTouching = true;
        this._touchStartX = e.touches[0].clientX;
        this._touchStartY = e.touches[0].clientY;
        this._touchCurrentX = this._touchStartX;
        this._touchCurrentY = this._touchStartY;
        this._touchStartTime = Date.now();
      }
    }

    _onTouchMove(e) {
      if (!this._isTouching || e.touches.length !== 1) return;
      
      this._touchCurrentX = e.touches[0].clientX;
      this._touchCurrentY = e.touches[0].clientY;
    }

    _onTouchEnd(e) {
      if (!this._isTouching) return;
      
      this._isTouching = false;
      
      const deltaX = this._touchCurrentX - this._touchStartX;
      const deltaY = this._touchCurrentY - this._touchStartY;
      const deltaTime = Date.now() - this._touchStartTime;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = distance / deltaTime;
      
      // Check if the swipe meets the threshold requirements
      if (distance < this._swipeThreshold || velocity < this._swipeVelocityThreshold) {
        return;
      }
      
      const direction = this._options.direction;
      let shouldToggle = false;
      
      // Determine if the swipe direction matches the panel direction
      switch (direction) {
        case 'left':
          // Swipe right to show, swipe left to hide
          if (!this._isVisible && deltaX > Math.abs(deltaY) && deltaX > 0) {
            shouldToggle = true;
          } else if (this._isVisible && deltaX < -Math.abs(deltaY) && deltaX < 0) {
            shouldToggle = true;
          }
          break;
        case 'right':
          // Swipe left to show, swipe right to hide
          if (!this._isVisible && deltaX < -Math.abs(deltaY) && deltaX < 0) {
            shouldToggle = true;
          } else if (this._isVisible && deltaX > Math.abs(deltaY) && deltaX > 0) {
            shouldToggle = true;
          }
          break;
        case 'top':
          // Swipe down to show, swipe up to hide
          if (!this._isVisible && deltaY > Math.abs(deltaX) && deltaY > 0) {
            shouldToggle = true;
          } else if (this._isVisible && deltaY < -Math.abs(deltaX) && deltaY < 0) {
            shouldToggle = true;
          }
          break;
        case 'bottom':
          // Swipe up to show, swipe down to hide
          if (!this._isVisible && deltaY < -Math.abs(deltaX) && deltaY < 0) {
            shouldToggle = true;
          } else if (this._isVisible && deltaY > Math.abs(deltaX) && deltaY > 0) {
            shouldToggle = true;
          }
          break;
      }
      
      if (shouldToggle) {
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