class MessageList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._messages = [];
  }

  static get observedAttributes() {
    return ['auto-scroll'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  get autoScroll() {
    return this.hasAttribute('auto-scroll');
  }

  set autoScroll(value) {
    if (value) {
      this.setAttribute('auto-scroll', '');
    } else {
      this.removeAttribute('auto-scroll');
    }
  }

  get messages() {
    return this._messages;
  }

  set messages(value) {
    this._messages = Array.isArray(value) ? value : [];
    this.renderMessages();
  }

  setupEventListeners() {
    // Listen for feedback events from message items
    this.addEventListener('message-feedback', (e) => {
      // Bubble up the feedback event
      this.dispatchEvent(new CustomEvent('message-feedback', {
        bubbles: true,
        detail: e.detail
      }));
    });
  }

  addMessage(message) {
    this._messages.push(message);
    this.renderMessages();
  }

  updateLatestMessage(content) {
    if (this._messages.length > 0) {
      const lastMessage = this._messages[this._messages.length - 1];
      if (lastMessage.role === 'assistant') {
        lastMessage.content = content;
        this.renderMessages();
      }
    }
  }

  clearMessages() {
    this._messages = [];
    this.renderMessages();
  }

  scrollToBottom() {
    const container = this.shadowRoot.querySelector('.messages-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  renderMessages() {
    const container = this.shadowRoot.querySelector('.messages-container');
    if (!container) return;

    // Clear existing messages
    container.innerHTML = '';

    // Render each message
    this._messages.forEach((message, index) => {
      const messageItem = document.createElement('message-item');
      messageItem.role = message.role;
      messageItem.content = message.content;
      messageItem.timestamp = message.timestamp || new Date().toISOString();
      
      // Mark the latest assistant message for streaming updates
      if (message.role === 'assistant' && index === this._messages.length - 1) {
        messageItem.isLatest = true;
      }

      container.appendChild(messageItem);
    });

    // Auto-scroll to bottom if enabled
    if (this.autoScroll) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => this.scrollToBottom(), 0);
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          flex: 1;
          overflow: hidden;
        }

        .messages-container {
          height: 100%;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 0;
          scroll-behavior: smooth;
          background-size: 20px 20px;
          position: relative;
        }

        /* Custom scrollbar */
        .messages-container::-webkit-scrollbar {
          width: 8px;
        }

        .messages-container::-webkit-scrollbar-track {
          background: var(--input-background, #F2F2F2);
          border-radius: 4px;
        }

        .messages-container::-webkit-scrollbar-thumb {
          background: var(--primary-color, #00A9E0);
          border-radius: 4px;
          opacity: 0.7;
        }

        .messages-container::-webkit-scrollbar-thumb:hover {
          background: var(--primary-color, #00A9E0);
          opacity: 1;
        }

        /* Empty state */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          color: var(--text-color, #2A2A2A);
          opacity: 0.6;
        }

        .empty-state svg {
          width: 64px;
          height: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          font-size: 1.2rem;
          font-weight: 500;
        }

        .empty-state p {
          margin: 0;
          font-size: 0.9rem;
          max-width: 300px;
        }

        @media (max-width: 768px) {
          .messages-container {
            padding: 16px 12px;
          }
        }
      </style>
      <div class="messages-container">
        ${this._messages.length === 0 ? `
          <div class="empty-state">
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M12,3C17.5,3 22,6.58 22,11C22,15.42 17.5,19 12,19C10.76,19 9.57,18.82 8.47,18.5C5.55,21 2,21 2,21C4.33,18.67 4.7,17.1 4.75,16.5C3.05,15.07 2,13.13 2,11C2,6.58 6.5,3 12,3M17,12V10H15V12H17M13,12V10H11V12H13M9,12V10H7V12H9Z"></path>
            </svg>
            <h3>Start a conversation</h3>
            <p>Send a message to begin chatting with the AI assistant.</p>
          </div>
        ` : ''}
      </div>
    `;

    // Render messages if we have any
    if (this._messages.length > 0) {
      this.renderMessages();
    }
  }
}

customElements.define('message-list', MessageList);