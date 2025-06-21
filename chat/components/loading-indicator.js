class LoadingIndicator extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['visible', 'progress', 'status'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  get visible() {
    return this.hasAttribute('visible');
  }

  set visible(value) {
    if (value) {
      this.setAttribute('visible', '');
    } else {
      this.removeAttribute('visible');
    }
  }

  get progress() {
    return parseFloat(this.getAttribute('progress')) || 0;
  }

  set progress(value) {
    this.setAttribute('progress', value.toString());
  }

  get status() {
    return this.getAttribute('status') || 'Initializing...';
  }

  set status(value) {
    this.setAttribute('status', value);
  }

  render() {
    const isVisible = this.visible;
    const progress = this.progress;
    const status = this.status;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--background-color, #ffffff);
          display: ${isVisible ? 'flex' : 'none'};
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 20;
          padding: 20px;
          text-align: center;
          backdrop-filter: blur(5px);
        }

        .loading-content {
          background-color: var(--background-color, #ffffff);
          padding: 30px;
          border-radius: var(--border-radius, 8px);
          box-shadow: 0 10px 50px var(--shadow-color, rgba(0, 0, 0, 0.1));
          max-width: 500px;
          width: 90%;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: scale-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .loading-logo {
          position: relative;
          width: 80px;
          height: 80px;
          margin-bottom: 20px;
        }

        .loading-icon {
          position: relative;
          z-index: 2;
          filter: drop-shadow(0 2px 8px var(--shadow-color, rgba(0, 0, 0, 0.1)));
        }

        .loading-circles {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }

        .loading-circle {
          position: absolute;
          border-radius: 50%;
          background: var(--primary-gradient, linear-gradient(135deg, #00A9E0 0%, #0568AE 100%));
          opacity: 0.2;
          transform-origin: center;
        }

        .loading-circle:nth-child(1) {
          width: 100%;
          height: 100%;
          left: 0;
          top: 0;
          animation: pulse 2s infinite;
        }

        .loading-circle:nth-child(2) {
          width: 80%;
          height: 80%;
          left: 10%;
          top: 10%;
          animation: pulse 2s infinite 0.4s;
        }

        .loading-circle:nth-child(3) {
          width: 60%;
          height: 60%;
          left: 20%;
          top: 20%;
          animation: pulse 2s infinite 0.8s;
        }

        h3 {
          font-size: 1.4rem;
          margin: 0 0 10px 0;
          color: var(--primary-color, #00A9E0);
        }

        p {
          margin: 0 0 20px 0;
          opacity: 0.8;
          font-size: 1rem;
          color: var(--text-color, #2A2A2A);
        }

        .progress-container {
          width: 100%;
          max-width: 300px;
          margin-top: 20px;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background-color: var(--input-background, #F2F2F2);
          overflow: hidden;
          position: relative;
        }

        .progress-bar::-webkit-progress-bar {
          background-color: var(--input-background, #F2F2F2);
          border-radius: 3px;
        }

        .progress-bar::-webkit-progress-value {
          background: var(--primary-gradient, linear-gradient(135deg, #00A9E0 0%, #0568AE 100%));
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .progress-text {
          margin-top: 10px;
          font-size: 0.9rem;
          color: var(--text-color, #2A2A2A);
          animation: fade-in 0.5s ease;
        }

        @keyframes scale-in {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0.2; }
          50% { transform: scale(1.1); opacity: 0.3; }
          100% { transform: scale(0.8); opacity: 0.2; }
        }
      </style>
      <div class="loading-content">
        <div class="loading-logo">
          <svg viewBox="0 0 36 36" class="loading-icon">
            <path fill="var(--primary-color, #00A9E0)" d="M18,2 C9.163,2 2,9.163 2,18 C2,26.837 9.163,34 18,34 C26.837,34 34,26.837 34,18 C34,9.163 26.837,2 18,2 Z M18,7 C20.761,7 23,9.239 23,12 C23,14.761 20.761,17 18,17 C15.239,17 13,14.761 13,12 C13,9.239 15.239,7 18,7 Z M18,29 C14.134,29 10.65,27.111 8.567,24.111 C8.731,21.026 14.273,19.334 18,19.334 C21.727,19.334 27.269,21.026 27.433,24.111 C25.35,27.111 21.866,29 18,29 Z"></path>
          </svg>
          <div class="loading-circles">
            <div class="loading-circle"></div>
            <div class="loading-circle"></div>
            <div class="loading-circle"></div>
          </div>
        </div>
        <h3>Loading AI Model</h3>
        <p>Please wait while we load the language model.</p>
        <div class="progress-container">
          <progress class="progress-bar" value="${progress * 100}" max="100"></progress>
          <div class="progress-text">${status}</div>
        </div>
      </div>
    `;
  }
}

customElements.define('loading-indicator', LoadingIndicator);