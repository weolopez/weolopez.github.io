class ChatHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['title', 'status', 'brand'];
  }

  connectedCallback() {
    console.log('ChatHeader: connectedCallback called');
    this.render();
    // Use a small delay to ensure Shadow DOM is fully rendered
    setTimeout(() => {
      this.setupEventListeners();
    }, 0);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  get title() {
    return this.getAttribute('title') || 'Chat';
  }

  set title(value) {
    this.setAttribute('title', value);
  }

  get status() {
    return this.getAttribute('status') || 'Ready';
  }

  set status(value) {
    this.setAttribute('status', value);
  }

  get brand() {
    return this.getAttribute('brand') || 'att';
  }

  set brand(value) {
    this.setAttribute('brand', value);
  }

  setupEventListeners() {
    console.log('ChatHeader: Setting up event listeners...');
    
    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      const memoryToggle = this.shadowRoot.querySelector('.memory-toggle');
      const historyToggle = this.shadowRoot.querySelector('.history-toggle-btn');
      const themeToggle = this.shadowRoot.querySelector('.theme-toggle');
      const closeButton = this.shadowRoot.querySelector('.close-chat');

      console.log('ChatHeader: DOM elements found:', {
        memoryToggle: !!memoryToggle,
        historyToggle: !!historyToggle,
        themeToggle: !!themeToggle,
        closeButton: !!closeButton
      });

      if (memoryToggle) {
        console.log('ChatHeader: Adding memory toggle listener');
        memoryToggle.addEventListener('click', () => {
          console.log('ChatHeader: Memory toggle clicked');
          this.dispatchEvent(new CustomEvent('memory-toggle', {
            bubbles: true,
            composed: true
          }));
        });
      }

      if (historyToggle) {
        console.log('ChatHeader: Adding history toggle listener');
        historyToggle.addEventListener('click', () => {
          console.log('ChatHeader: History toggle clicked');
          this.dispatchEvent(new CustomEvent('history-toggle', {
            bubbles: true,
            composed: true
          }));
        });
      }

      if (themeToggle) {
        console.log('ChatHeader: Adding theme toggle listener');
        themeToggle.addEventListener('click', () => {
          console.log('ChatHeader: Theme toggle clicked');
          this.dispatchEvent(new CustomEvent('theme-toggle', {
            bubbles: true,
            composed: true
          }));
        });
      }

      if (closeButton) {
        console.log('ChatHeader: Adding close button listener');
        closeButton.addEventListener('click', () => {
          console.log('ChatHeader: Close button clicked');
          this.dispatchEvent(new CustomEvent('close-chat', {
            bubbles: true,
            composed: true
          }));
        });
      }

      console.log('ChatHeader: Event listeners setup completed');
    });
  }

  render() {
    const title = this.title;
    const status = this.status;
    const brandDisplay = this.brand.toUpperCase() === 'ATT' ? 'AT&T' : 
                        this.brand.charAt(0).toUpperCase() + this.brand.slice(1);

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .header {
          padding: 16px;
          background: var(--primary-color, #00A9E0);
          background: var(--primary-gradient, linear-gradient(135deg, #00A9E0 0%, #0568AE 100%));
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 8px var(--shadow-color, rgba(0, 0, 0, 0.1));
          z-index: 1;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header h2 {
          margin: 0;
          font-weight: 600;
          font-size: 1.2rem;
        }

        .status {
          font-size: 0.85rem;
          opacity: 0.9;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
        }

        .typing-dots {
          display: inline-flex;
        }

        .typing-dots span {
          animation: typingDot 1.4s infinite;
          font-size: 1.2rem;
          line-height: 0.7;
        }

        .typing-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typingDot {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-2px); }
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .header-btn:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }

        .header-btn svg {
          width: 20px;
          height: 20px;
        }

        .close-chat {
          padding: 6px 12px;
          background-color: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 16px;
          color: white;
          font-size: 0.85rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s ease;
        }

        .close-chat:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }

        .close-chat svg {
          width: 16px;
          height: 16px;
        }

        @media (max-width: 768px) {
          .header {
            padding: 12px 16px;
          }
          
          .header h2 {
            font-size: 1.1rem;
          }
          
          .header-actions {
            gap: 6px;
          }
          
          .header-btn {
            width: 32px;
            height: 32px;
          }
          
          .header-btn svg {
            width: 18px;
            height: 18px;
          }
        }
      </style>
      <div class="header">
        <div class="header-content">
          <div>
            <h2>${brandDisplay} ${title}</h2>
            <div class="status">${status}</div>
          </div>
        </div>
        <div class="header-actions">
          <button class="header-btn memory-toggle" aria-label="View memory" title="View Memory" onclick="this.getRootNode().host.handleMemoryToggle()">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"></path></svg>
          </button>
          <button class="header-btn history-toggle-btn" aria-label="View history" title="View History" onclick="this.getRootNode().host.handleHistoryToggle()">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M13,3A9,9 0 0,0 4,12H1L4.89,15.89L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3Z"></path></svg>
          </button>
          <button class="header-btn theme-toggle" aria-label="Change theme" title="Change Theme" onclick="this.getRootNode().host.handleThemeToggle()">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M12,20C7.58,20 4,16.42 4,12C4,7.58 7.58,4 12,4C16.42,4 20,7.58 20,12C20,16.42 16.42,20 12,20M13,7H11V14H13V7M13,15H11V17H13V15Z"></path></svg>
          </button>
          <button class="close-chat" aria-label="Close chat" title="Close Chat" onclick="this.getRootNode().host.handleCloseChat()">
            <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 
                5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  updateStatus(status) {
    this.status = status;
  }

  handleMemoryToggle() {
    console.log('ChatHeader: handleMemoryToggle called via onclick');
    this.dispatchEvent(new CustomEvent('memory-toggle', {
      bubbles: true,
      composed: true
    }));
  }

  handleHistoryToggle() {
    console.log('ChatHeader: handleHistoryToggle called via onclick');
    this.dispatchEvent(new CustomEvent('history-toggle', {
      bubbles: true,
      composed: true
    }));
  }

  handleThemeToggle() {
    console.log('ChatHeader: handleThemeToggle called via onclick');
    this.dispatchEvent(new CustomEvent('theme-toggle', {
      bubbles: true,
      composed: true
    }));
  }

  handleCloseChat() {
    console.log('ChatHeader: handleCloseChat called via onclick');
    this.dispatchEvent(new CustomEvent('close-chat', {
      bubbles: true,
      composed: true
    }));
  }

  showTypingIndicator() {
    const statusEl = this.shadowRoot.querySelector('.status');
    if (statusEl) {
      statusEl.innerHTML = 'Thinking <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>';
    }
  }
}

customElements.define('chat-header', ChatHeader);