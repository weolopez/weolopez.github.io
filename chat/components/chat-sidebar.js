class ChatSidebar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._chatHistory = [];
    this._activeChatId = null;
  }

  static get observedAttributes() {
    return ['open'];
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

  get open() {
    return this.hasAttribute('open');
  }

  set open(value) {
    if (value) {
      this.setAttribute('open', '');
    } else {
      this.removeAttribute('open');
    }
  }

  get chatHistory() {
    return this._chatHistory;
  }

  set chatHistory(value) {
    this._chatHistory = Array.isArray(value) ? value : [];
    this.updateContent();
  }

  get activeChatId() {
    return this._activeChatId;
  }

  set activeChatId(value) {
    this._activeChatId = value;
    this.updateContent();
  }

  setupEventListeners() {
    const newChatBtn = this.shadowRoot.querySelector('.new-chat-btn');
    
    newChatBtn?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('new-chat', { bubbles: true }));
    });
  }

  updateContent() {
    const historyList = this.shadowRoot.querySelector('.chat-history-list');
    
    if (!historyList) return;
    
    // Clear existing content
    historyList.innerHTML = '';
    
    // Add chat history items
    this._chatHistory.forEach(chat => {
      const chatItem = document.createElement('div');
      chatItem.className = 'chat-history-item';
      if (chat.id === this._activeChatId) {
        chatItem.classList.add('active');
      }
      
      // Get preview text from the first user message
      const previewMessage = chat.messages.find(m => m.role === 'user')?.content || 'New conversation';
      const preview = previewMessage.length > 25 ? previewMessage.substring(0, 25) + '...' : previewMessage;
      
      chatItem.innerHTML = `
        <div class="chat-item-content">
          <svg viewBox="0 0 24 24" class="chat-icon"><path fill="currentColor" d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"></path></svg>
          <div class="chat-item-text">
            <div class="chat-item-title">${chat.name}</div>
            <div class="chat-item-preview">${preview}</div>
          </div>
        </div>
        <button class="chat-delete-btn" data-chat-id="${chat.id}" title="Delete chat">
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>
        </button>
      `;
      
      // Add click listener to load chat
      chatItem.addEventListener('click', (e) => {
        // Don't trigger if clicking the delete button
        if (e.target.closest('.chat-delete-btn')) return;
        this.dispatchEvent(new CustomEvent('chat-load', {
          bubbles: true,
          detail: { chatId: chat.id }
        }));
      });
      
      historyList.appendChild(chatItem);
    });
    
    // Setup delete buttons
    const deleteButtons = this.shadowRoot.querySelectorAll('.chat-delete-btn');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chatId = btn.dataset.chatId;
        if (confirm('Are you sure you want to delete this chat?')) {
          this.dispatchEvent(new CustomEvent('chat-delete', {
            bubbles: true,
            detail: { chatId }
          }));
        }
      });
    });
  }

  render() {
    const isOpen = this.open;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          background-color: var(--sidebar-bg, #F8F9FA);
          border-right: 1px solid rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          transition: transform 0.3s ease;
          z-index: 10;
          width: 0px;
          visibility: hidden;
          transform: translateX(-100%);
        }

        :host([open]) {
          width: 280px;
          visibility: visible;
          transform: translateX(0);
        }

        .chat-sidebar-header {
          padding: 16px;
          background: var(--primary-color, #00A9E0);
          background: var(--primary-gradient, linear-gradient(135deg, #00A9E0 0%, #0568AE 100%));
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .chat-sidebar-title {
          margin: 0;
          font-weight: 600;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .chat-sidebar-title svg {
          width: 24px;
          height: 24px;
        }

        .chat-sidebar-content {
          flex-grow: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chat-sidebar-content::-webkit-scrollbar {
          width: 6px;
        }

        .chat-sidebar-content::-webkit-scrollbar-track {
          background: var(--input-background, #F2F2F2);
          border-radius: 3px;
        }

        .chat-sidebar-content::-webkit-scrollbar-thumb {
          background: var(--primary-color, #00A9E0);
          border-radius: 3px;
          opacity: 0.7;
        }

        .new-chat-btn {
          background-color: var(--accent-color, #FF7F32);
          color: white;
          border: none;
          border-radius: 30px;
          padding: 10px 16px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          margin-bottom: 12px;
        }

        .new-chat-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .new-chat-btn svg {
          width: 18px;
          height: 18px;
        }

        .sidebar-divider {
          height: 1px;
          background-color: rgba(0, 0, 0, 0.1);
          margin: 12px 0;
        }

        .chat-history-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chat-history-item {
          padding: 10px;
          border-radius: var(--border-radius, 8px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }

        .chat-history-item:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }

        .chat-history-item.active {
          background-color: rgba(0, 0, 0, 0.08);
          border-color: var(--primary-color, #00A9E0);
        }

        .chat-item-content {
          display: flex;
          gap: 10px;
          align-items: center;
          flex: 1;
          min-width: 0;
        }

        .chat-icon {
          width: 18px;
          height: 18px;
          color: var(--primary-color, #00A9E0);
          flex-shrink: 0;
        }

        .chat-item-text {
          flex: 1;
          min-width: 0;
        }

        .chat-item-title {
          font-weight: 500;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--text-color, #2A2A2A);
        }

        .chat-item-preview {
          font-size: 0.8rem;
          opacity: 0.7;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--text-color, #2A2A2A);
        }

        .chat-delete-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          background-color: transparent;
          color: var(--text-color, #2A2A2A);
          opacity: 0.6;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .chat-delete-btn:hover {
          background-color: rgba(244, 67, 54, 0.1);
          color: var(--error-color, #F44336);
          opacity: 1;
        }

        .chat-delete-btn svg {
          width: 16px;
          height: 16px;
        }

        @media (max-width: 768px) {
          :host([open]) {
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            width: 100%;
            z-index: 20;
          }

          .chat-sidebar-header {
            padding: 12px 16px;
          }

          .chat-sidebar-title {
            font-size: 1.1rem;
          }

          .chat-sidebar-content {
            padding: 8px 12px;
          }
        }
      </style>
      <div class="chat-sidebar-header">
        <h3 class="chat-sidebar-title">
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12,3C17.5,3 22,6.58 22,11C22,15.42 17.5,19 12,19C10.76,19 9.57,18.82 8.47,18.5C5.55,21 2,21 2,21C4.33,18.67 4.7,17.1 4.75,16.5C3.05,15.07 2,13.13 2,11C2,6.58 6.5,3 12,3M17,12V10H15V12H17M13,12V10H11V12H13M9,12V10H7V12H9Z"></path></svg>
          Chats
        </h3>
      </div>
      <div class="chat-sidebar-content">
        <button class="new-chat-btn">
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>
          New Chat
        </button>
        <div class="sidebar-divider"></div>
        <div class="chat-history-list">
          <!-- Chat history will be populated here -->
        </div>
      </div>
    `;

    // Update content if we have chat history
    this.updateContent();
  }
}

customElements.define('chat-sidebar', ChatSidebar);