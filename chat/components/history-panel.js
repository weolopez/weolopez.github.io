class HistoryPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._chatHistory = [];
    this._activeChatId = null;
  }

  static get observedAttributes() {
    return ['active'];
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

  get active() {
    return this.hasAttribute('active');
  }

  set active(value) {
    if (value) {
      this.setAttribute('active', '');
    } else {
      this.removeAttribute('active');
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
    const closeBtn = this.shadowRoot.querySelector('.close-history');
    const newChatBtn = this.shadowRoot.querySelector('.new-chat-btn-history');

    closeBtn?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('history-close', { bubbles: true }));
    });

    newChatBtn?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('new-chat', { bubbles: true }));
    });
  }

  updateContent() {
    const historyContent = this.shadowRoot.querySelector('.history-content');
    const historyStats = this.shadowRoot.querySelector('.history-stats');
    
    if (!historyContent || !historyStats) {
      return;
    }

    // Update stats
    const totalCountEl = historyStats.querySelector('#historyTotalCount');
    const activeCountEl = historyStats.querySelector('#historyActiveCount');
    
    if (totalCountEl) totalCountEl.textContent = this._chatHistory.length;
    if (activeCountEl) activeCountEl.textContent = this._activeChatId ? '1' : '0';
    
    // Clear history content
    historyContent.innerHTML = '';
    
    // No history case
    if (this._chatHistory.length === 0) {
      historyContent.innerHTML = '<p>No chat history yet. Start a conversation to see your chat history here.</p>';
      return;
    }
    
    // Create history items
    this._chatHistory.forEach(chat => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      if (chat.id === this._activeChatId) {
        historyItem.classList.add('active');
      }
      
      // Get preview text from the first user message
      const previewMessage = chat.messages.find(m => m.role === 'user')?.content || 'New conversation';
      const preview = previewMessage.length > 50 ? previewMessage.substring(0, 50) + '...' : previewMessage;
      
      // Format creation date
      const createdDate = chat.createdAt ? new Date(chat.createdAt).toLocaleDateString() : 'Unknown';
      
      historyItem.innerHTML = `
        <div class="history-item-header">
          <span class="history-item-title">${chat.name || 'Untitled Chat'}</span>
          <button class="history-delete-btn" data-chat-id="${chat.id}" title="Delete chat">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>
          </button>
        </div>
        <div class="history-item-preview">${preview}</div>
        <div class="history-item-date">${createdDate}</div>
      `;
      
      // Add click listener to load chat
      historyItem.addEventListener('click', (e) => {
        // Don't trigger if clicking the delete button
        if (e.target.closest('.history-delete-btn')) return;
        this.dispatchEvent(new CustomEvent('chat-load', {
          bubbles: true,
          detail: { chatId: chat.id }
        }));
      });
      
      historyContent.appendChild(historyItem);
    });
    
    // Setup delete buttons
    const deleteButtons = this.shadowRoot.querySelectorAll('.history-delete-btn');
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

  showLoading() {
    const historyContent = this.shadowRoot.querySelector('.history-content');
    if (historyContent) {
      historyContent.innerHTML = '<p>Loading chat history...</p>';
    }
  }

  showError() {
    const historyContent = this.shadowRoot.querySelector('.history-content');
    if (historyContent) {
      historyContent.innerHTML = '<p>Error displaying chat history.</p>';
    }
  }

  render() {
    const isActive = this.active;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: absolute;
          right: 0;
          top: 65px;
          bottom: 80px;
          width: 0;
          background-color: var(--background-color, #ffffff);
          border-left: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: -5px 0 15px var(--shadow-color, rgba(0, 0, 0, 0.1));
          transition: width 0.3s ease;
          overflow: hidden;
          z-index: 10;
          display: flex;
          flex-direction: column;
        }

        :host([active]) {
          width: 350px;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          background-color: var(--primary-color, #00A9E0);
          color: white;
          font-weight: 600;
          flex-shrink: 0;
        }

        .history-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .new-chat-btn-history {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 5px;
          border-radius: 4px;
          transition: background-color 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .new-chat-btn-history:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        .new-chat-btn-history svg {
          width: 16px;
          height: 16px;
        }

        .close-history {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 0 5px;
          line-height: 1;
          transition: opacity 0.2s ease;
        }

        .close-history:hover {
          opacity: 0.8;
        }

        .history-content {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
        }

        .history-content::-webkit-scrollbar {
          width: 6px;
        }

        .history-content::-webkit-scrollbar-track {
          background: var(--input-background, #F2F2F2);
          border-radius: 3px;
        }

        .history-content::-webkit-scrollbar-thumb {
          background: var(--primary-color, #00A9E0);
          border-radius: 3px;
          opacity: 0.7;
        }

        .history-item {
          background-color: var(--secondary-color, #F2F2F2);
          border-radius: var(--border-radius, 8px);
          padding: 12px;
          margin-bottom: 15px;
          border-left: 3px solid var(--primary-color, #00A9E0);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .history-item:hover {
          background-color: rgba(0, 0, 0, 0.05);
          transform: translateX(2px);
        }

        .history-item.active {
          background-color: rgba(0, 169, 224, 0.1);
          border-left-color: var(--accent-color, #FF7F32);
        }

        .history-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .history-item-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--primary-color, #00A9E0);
        }

        .history-delete-btn {
          width: 24px;
          height: 24px;
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
        }

        .history-delete-btn:hover {
          background-color: rgba(244, 67, 54, 0.1);
          color: var(--error-color, #F44336);
          opacity: 1;
        }

        .history-delete-btn svg {
          width: 14px;
          height: 14px;
        }

        .history-item-preview {
          font-size: 0.8rem;
          color: var(--text-color, #2A2A2A);
          opacity: 0.8;
          margin-bottom: 6px;
          line-height: 1.4;
        }

        .history-item-date {
          font-size: 0.7rem;
          color: var(--text-color, #2A2A2A);
          opacity: 0.6;
        }

        .history-stats {
          display: flex;
          justify-content: space-between;
          padding: 10px 15px;
          background-color: var(--secondary-color, #F2F2F2);
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          font-size: 0.8rem;
          color: var(--text-color, #2A2A2A);
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          :host([active]) {
            width: 100%;
            left: 0;
            top: 0;
            bottom: 0;
          }

          .history-header {
            padding: 12px 16px;
          }

          .history-content {
            padding: 12px;
          }

          .history-stats {
            padding: 8px 12px;
          }
        }
      </style>
      <div class="history-header">
        <span>Chat History</span>
        <div class="history-header-actions">
          <button class="new-chat-btn-history" title="New Chat">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>
          </button>
          <button class="close-history" title="Close History Panel">×</button>
        </div>
      </div>
      <div class="history-content">
        <!-- History will be displayed here -->
        <p>No chat history yet. Start a conversation to see your chat history here.</p>
      </div>
      <div class="history-stats">
        <div>Total chats: <span id="historyTotalCount">0</span></div>
        <div>Active chat: <span id="historyActiveCount">0</span></div>
      </div>
    `;
  }
}

customElements.define('history-panel', HistoryPanel);