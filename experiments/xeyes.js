
                            /**
 * <x-eyes> Web Component
 * A high-quality, reactive pair of eyes that follow the cursor.
 * 
 * Attributes:
 * - iris-color: The color of the eye's iris (e.g., "skyblue", "#ff0000").
 * - pupil-color: The color of the center pupil.
 * - eye-size: The diameter of the eyeball in pixels.
 */
class XEyes extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._onMouseMove = this._onMouseMove.bind(this);
  }

  static get observedAttributes() {
    return ['iris-color', 'pupil-color', 'eye-size'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    this._updateStyles();
  }

  connectedCallback() {
    this._render();
    window.addEventListener('mousemove', this._onMouseMove);
  }

  disconnectedCallback() {
    window.removeEventListener('mousemove', this._onMouseMove);
  }

  _render() {
    const irisColor = this.getAttribute('iris-color') || '#333';
    const pupilColor = this.getAttribute('pupil-color') || '#000';
    const eyeSize = this.getAttribute('eye-size') || '100';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          gap: 20px;
          --iris-color: ${irisColor};
          --pupil-color: ${pupilColor};
          --eye-size: ${eyeSize}px;
          cursor: default;
        }

        .eye-socket {
          width: var(--eye-size);
          height: var(--eye-size);
          background: white;
          border-radius: 50%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: inset 0 0 10px rgba(0,0,0,0.1), 0 5px 15px rgba(0,0,0,0.2);
          border: calc(var(--eye-size) * 0.02) solid #ddd;
        }

        .iris {
          width: 40%;
          height: 40%;
          background: var(--iris-color);
          border-radius: 50%;
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.05s linear;
          box-shadow: inset 0 0 5px rgba(0,0,0,0.3);
        }

        .pupil {
          width: 50%;
          height: 50%;
          background: var(--pupil-color);
          border-radius: 50%;
        }

        .reflection {
          position: absolute;
          top: 15%;
          left: 15%;
          width: 25%;
          height: 25%;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 50%;
        }
      </style>
      <div class="eye-socket">
        <div class="iris">
          <div class="pupil"></div>
          <div class="reflection"></div>
        </div>
      </div>
      <div class="eye-socket">
        <div class="iris">
          <div class="pupil"></div>
          <div class="reflection"></div>
        </div>
      </div>
    `;
  }

  _updateStyles() {
    if (!this.shadowRoot.firstElementChild) return;
    const style = this.shadowRoot.querySelector('style');
    const irisColor = this.getAttribute('iris-color') || '#333';
    const pupilColor = this.getAttribute('pupil-color') || '#000';
    const eyeSize = this.getAttribute('eye-size') || '100';

    this.style.setProperty('--iris-color', irisColor);
    this.style.setProperty('--pupil-color', pupilColor);
    this.style.setProperty('--eye-size', `${eyeSize}px`);
  }

  _onMouseMove(event) {
    const eyes = this.shadowRoot.querySelectorAll('.iris');
    const sockets = this.shadowRoot.querySelectorAll('.eye-socket');

    sockets.forEach((socket, i) => {
      const iris = eyes[i];
      const rect = socket.getBoundingClientRect();
      const eyeX = rect.left + rect.width / 2;
      const eyeY = rect.top + rect.height / 2;

      const angle = Math.atan2(event.clientY - eyeY, event.clientX - eyeX);
      const distance = Math.min(
        rect.width / 4, 
        Math.hypot(event.clientX - eyeX, event.clientY - eyeY) / 5
      );

      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      iris.style.transform = `translate(${x}px, ${y}px)`;
    });
  }
}

customElements.define('x-eyes', XEyes); 
                        