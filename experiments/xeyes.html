javascript
/**
 * XEyesComponent
 * A high-quality, modern "X-Eyes" web component where the pupils follow the mouse cursor.
 * 
 * Attributes:
 * - pupil-fill-color: The CSS color for the iris/pupil.
 * - eye-diameter-size: The diameter of the eyes in pixels.
 */
class XEyesComponent extends HTMLElement {
  static get observedAttributes() {
    return ['pupil-fill-color', 'eye-diameter-size'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._onMouseMove = this._onMouseMove.bind(this);
    this._render();
  }

  connectedCallback() {
    window.addEventListener('mousemove', this._onMouseMove);
    this._applyStyles();
  }

  disconnectedCallback() {
    window.removeEventListener('mousemove', this._onMouseMove);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this._applyStyles();
    }
  }

  _applyStyles() {
    const root = this.shadowRoot.querySelector('.eyes-wrapper');
    if (!root) return;

    const pupilColor = this.getAttribute('pupil-fill-color') || '#1a1a1a';
    const diameter = this.getAttribute('eye-diameter-size') || '120';

    root.style.setProperty('--pupil-color', pupilColor);
    root.style.setProperty('--eye-size', `${diameter}px`);
  }

  _onMouseMove(event) {
    const eyes = this.shadowRoot.querySelectorAll('.eye-socket');
    
    eyes.forEach(eye => {
      const pupil = eye.querySelector('.pupil');
      const rect = eye.getBoundingClientRect();
      
      const eyeCenterX = rect.left + rect.width / 2;
      const eyeCenterY = rect.top + rect.height / 2;
      
      // Calculate angle between mouse and eye center
      const angle = Math.atan2(event.clientY - eyeCenterY, event.clientX - eyeCenterX);
      
      // Keep pupil within the socket boundaries
      const distance = rect.width / 4; 
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      pupil.style.transform = `translate(${x}px, ${y}px)`;
    });
  }

  _render() {
    this.shadowRoot.innerHTML = `
      
