  /**
 * <siri-prompt-interface>
 * A macOS 2025 inspired Siri-like floating command bar.
 * Shortcuts: Cmd+K to toggle, Enter to submit.
 */
class SiriPromptInterface extends HTMLElement {
  static get observedAttributes() {
    return [
      'display-visibility-state',
      'input-placeholder-text',
      'glow-aura-color-scheme'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._isVisible = false;
  }

  connectedCallback() {
    this._render();
    this._setupEventListeners();
    this._setupGlobalShortcut();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'display-visibility-state') {
      this._isVisible = newValue === 'visible';
      this._toggleDisplay();
    }
    if (name === 'input-placeholder-text' && this.shadowRoot.querySelector('input')) {
      this.shadowRoot.querySelector('input').placeholder = newValue;
    }
  }

  _setupEventListeners() {
    const input = this.shadowRoot.querySelector('input');
    const button = this.shadowRoot.querySelector('.submit-btn');
    const container = this.shadowRoot.querySelector('.siri-container');

    const triggerSubmit = () => {
      const prompt = input.value.trim();
      if (prompt) {
        document.dispatchEvent(new CustomEvent('prompt-submit', {
          detail: { prompt },
          bubbles: true,
          composed: true
        }));
        input.value = '';
        this.setAttribute('display-visibility-state', 'hidden');
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') triggerSubmit();
      if (e.key === 'Escape') this.setAttribute('display-visibility-state', 'hidden');
    });

    button.addEventListener('click', triggerSubmit);

    // Close on click outside
    document.addEventListener('mousedown', (e) => {
      if (this._isVisible && !this.contains(e.target) && !e.composedPath().includes(container)) {
        this.setAttribute('display-visibility-state', 'hidden');
      }
    });
  }

  _setupGlobalShortcut() {
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const newState = this.getAttribute('display-visibility-state') === 'visible' ? 'hidden' : 'visible';
        this.setAttribute('display-visibility-state', newState);
      }
    });
  }

  _toggleDisplay() {
    const wrapper = this.shadowRoot.querySelector('.wrapper');
    const input = this.shadowRoot.querySelector('input');
    if (this._isVisible) {
      wrapper.classList.add('active');
      setTimeout(() => input.focus(), 100);
    } else {
      wrapper.classList.remove('active');
      input.blur();
    }
  }

  _render() {
    const placeholder = this.getAttribute('input-placeholder-text') || "How can I help you?";
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --siri-bg: rgba(255, 255, 255, 0.5);
          --siri-border: rgba(255, 255, 255, 0.3);
          --siri-glow: linear-gradient(90deg, #4285f4, #9b72cb, #d96570, #f49a3e);
          --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 9999;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 15vh;
        }

        .wrapper {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
          width: 100%;
          max-width: 680px;
          filter: blur(10px);
        }

        .wrapper.active {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
          filter: blur(0);
        }

        .siri-container {
          position: relative;
          background: var(--siri-bg);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border-radius: 24px;
          padding: 4px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.15), 0 0 0 1px var(--siri-border);
          overflow: hidden;
          display: flex;
          align-items: center;
        }

        .glow-border {
          position: absolute;
          inset: 0;
          padding: 2px;
          border-radius: 24px;
          background: var(--siri-glow);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0.6;
          animation: rotate-glow 6s linear infinite;
        }

        @keyframes rotate-glow {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }

        input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          padding: 18px 24px;
          font-size: 19px;
          font-family: var(--font-family);
          color: #1d1d1f;
          font-weight: 400;
          letter-spacing: -0.01em;
        }

        input::placeholder {
          color: rgba(0, 0, 0, 0.4);
        }

        .submit-btn {
          background: #000;
          color: #fff;
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          margin-right: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
        }

        .submit-btn:hover {
          transform: scale(1.05);
        }

        .submit-btn:active {
          transform: scale(0.95);
        }

        svg {
          width: 18px;
          height: 18px;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .hint {
          position: absolute;
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          font-family: var(--font-family);
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          text-shadow: 0 1px 4px rgba(0,0,0,0.2);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
      </style>
      
      <div class="wrapper">
        <div class="siri-container">
          <div class="glow-border"></div>
          <input type="text" placeholder="${placeholder}" spellcheck="false" autocomplete="off" />
          <button class="submit-btn" aria-label="Submit Prompt">
            <svg viewBox="0 0 24 24"><path d="M7 11l5-5 5 5M12 6v12"/></svg>
          </button>
        </div>
        <div class="hint">Press Esc to dismiss</div>
      </div>
    `;
  }
}

customElements.define('siri-prompt-interface', SiriPromptInterface); 