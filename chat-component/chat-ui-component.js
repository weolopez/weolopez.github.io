/**
 * Chat UI Component
 * 
 * A pure UI Web Component for chat interfaces that focuses solely on presentation
 * and user interactions. All WebLLM operations are handled by external components.
 */
class ChatUIComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Clear any existing styles if element is reused
    if (this.shadowRoot.children.length > 0) {
      this.shadowRoot.innerHTML = '';
    }
    
    this.messages = [];
    this.chatHistory = this.loadChatHistory();
    this.activeChat = this.chatHistory.length > 0 ? this.chatHistory[0].id : null;
    this.typingTimeout = null;
    this.isStreaming = false;
    
    // Brand and Theme Configuration
    this.defaultThemes = {
      'att': {
        primaryColor: '#00A9E0',
        primaryGradient: 'linear-gradient(135deg, #00A9E0 0%, #0568AE 100%)',
        secondaryColor: '#F2F2F2',
        textColor: '#2A2A2A',
        backgroundColor: '#FFFFFF',
        inputBackground: '#F2F2F2',
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        messageUserBg: '#00A9E0',
        messageAssistantBg: '#F2F2F2',
        sidebarBg: '#F8F9FA',
        accentColor: '#FF7F32',
        successColor: '#4CAF50',
        errorColor: '#F44336',
        warningColor: '#FFC107',
        borderRadius: '8px',
        fontFamily: "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif"
      },
      'dark-sleek': {
        primaryColor: '#00bcd4',
        primaryGradient: 'linear-gradient(135deg, #00bcd4 0%, #006064 100%)',
        secondaryColor: '#2d2d30',
        textColor: '#e0e0e0',
        backgroundColor: '#121212',
        inputBackground: '#1e1e1e',
        shadowColor: 'rgba(0, 0, 0, 0.5)',
        messageUserBg: '#006064',
        messageAssistantBg: '#1e1e1e',
        sidebarBg: '#121212',
        accentColor: '#00E5FF',
        borderRadius: '8px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif"
      },
      'neon-future': {
        primaryColor: '#ff00ff',
        primaryGradient: 'linear-gradient(135deg, #ff00ff 0%, #00ffff 100%)',
        secondaryColor: '#1a1a1a',
        textColor: '#ffffff',
        backgroundColor: '#000000',
        inputBackground: '#1a1a1a',
        shadowColor: 'rgba(255, 0, 255, 0.2)',
        messageUserBg: 'rgba(0, 255, 255, 0.1)',
        messageAssistantBg: 'rgba(255, 0, 255, 0.1)',
        sidebarBg: '#0a0a0a',
        accentColor: '#00ffff',
        borderRadius: '0px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif"
      }
    };
    
    // Get brand attribute or default to AT&T
    this.brand = this.getAttribute('brand') || 'att';
    this.theme = localStorage.getItem('chat-theme') || this.brand;
    
    // Allow custom branding through attributes
    const customBranding = {};
    if (this.hasAttribute('primary-color')) {
      customBranding.primaryColor = this.getAttribute('primary-color');
    }
    if (this.hasAttribute('accent-color')) {
      customBranding.accentColor = this.getAttribute('accent-color');
    }
    if (this.hasAttribute('border-radius')) {
      customBranding.borderRadius = this.getAttribute('border-radius');
    }
    if (this.hasAttribute('font-family')) {
      customBranding.fontFamily = this.getAttribute('font-family');
    }
    
    // Add custom branding if provided
    if (Object.keys(customBranding).length > 0) {
      this.defaultThemes['custom'] = {
        ...this.defaultThemes[this.brand],
        ...customBranding
      };
      this.theme = 'custom';
    }
    
    // Add available themes to the component
    this.availableThemes = Object.keys(this.defaultThemes);
  }

  connectedCallback() {
    // Load AT&T font if using AT&T theme
    if (this.brand === 'att') {
      const fontLink = document.createElement('link');
      fontLink.href = './deps/fonts/open-sans.css';
      fontLink.rel = 'stylesheet';
      document.head.appendChild(fontLink);
    }
    
    this.render();
    this.setupEventListeners();
    this.setupTheme();
    this.renderChatSidebar();
  }
  
  setupTheme() {
    const container = this.shadowRoot.querySelector('.chat-container');
    container.setAttribute('data-theme', this.theme);
    
    // First, clear any previous inline styles to ensure clean slate
    container.removeAttribute('style');
    
    // Apply all CSS variables based on theme
    const themeConfig = this.defaultThemes[this.theme];
    if (themeConfig) {
      Object.keys(themeConfig).forEach(key => {
        // Convert camelCase to kebab-case for CSS vars
        const cssVarName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        container.style.setProperty(`--${cssVarName}`, themeConfig[key]);
      });
      
      // Force update critical values on the :host element too for better specificity
      const hostStyle = document.createElement('style');
      let hostCss = ':host {';
      Object.keys(themeConfig).forEach(key => {
        const cssVarName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        hostCss += `--${cssVarName}: ${themeConfig[key]};`;
      });
      hostCss += '}';
      
      // Apply the host styles
      hostStyle.textContent = hostCss;
      this.shadowRoot.appendChild(hostStyle);
      
      // Dispatch theme change event
      this.dispatchEvent(new CustomEvent('theme-changed', {
        detail: { theme: this.theme },
        bubbles: true,
        composed: true
      }));
    }
  }

  setupEventListeners() {
    const form = this.shadowRoot.querySelector('form');
    const input = this.shadowRoot.querySelector('.message-input');
    const themeToggle = this.shadowRoot.querySelector('.theme-toggle');
    const sidebarToggle = this.shadowRoot.querySelector('.sidebar-toggle');
    const closeButton = this.shadowRoot.querySelector('.close-chat');
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const message = input.value.trim();
      
      if (message && !this.isStreaming) {
        this.addUserMessage(message);
        input.value = '';
        
        // Reset typing indicator styles
        if (this.typingTimeout) {
          clearTimeout(this.typingTimeout);
        }
        input.classList.remove('is-typing');
        
        // Dispatch message sent event
        this.dispatchEvent(new CustomEvent('message-sent', {
          detail: { content: message },
          bubbles: true,
          composed: true
        }));
      }
    });

    // Enhanced input with typing events
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        form.dispatchEvent(new Event('submit'));
      } else {
        // Show typing indicator
        input.classList.add('is-typing');
        
        // Clear previous timeout
        if (this.typingTimeout) {
          clearTimeout(this.typingTimeout);
        }
        
        // Set new timeout
        this.typingTimeout = setTimeout(() => {
          input.classList.remove('is-typing');
        }, 1000);
      }
    });
    
    // Theme toggle
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        // Use available themes from the component
        const themes = this.availableThemes;
        const currentIndex = themes.indexOf(this.theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.theme = themes[nextIndex];
        localStorage.setItem('chat-theme', this.theme);
        this.setupTheme();
      });
    }
    
    // Sidebar toggle for mobile
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        const container = this.shadowRoot.querySelector('.chat-container');
        container.classList.toggle('sidebar-open');
      });
    }
    
    // Close chat button
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('close-chat', {
          bubbles: true,
          composed: true
        }));
      });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        const container = this.shadowRoot.querySelector('.chat-container');
        const sidebar = this.shadowRoot.querySelector('.chat-sidebar');
        const sidebarBtn = this.shadowRoot.querySelector('.sidebar-toggle');
        
        // Check if click was outside sidebar and not on the toggle button
        if (container && container.classList.contains('sidebar-open') && 
            sidebar && !sidebar.contains(e.target) && 
            sidebarBtn && !sidebarBtn.contains(e.target)) {
          container.classList.remove('sidebar-open');
        }
      }
    });
  }

  /**
   * Add a user message to the chat
   * @param {string} content - Message content
   */
  addUserMessage(content) {
    const userMessage = { 
      role: 'user', 
      content,
      timestamp: new Date().toISOString()
    };
    this.messages.push(userMessage);
    this.renderMessages();
    this.saveChatHistory();
    this.disableInput();
  }

  /**
   * Start streaming an assistant response
   */
  startAssistantResponse() {
    this.isStreaming = true;
    // Add placeholder for assistant response with timestamp
    this.messages.push({ 
      role: 'assistant', 
      content: '',
      timestamp: new Date().toISOString()
    });
    this.renderMessages();
    this.showTypingIndicator();
  }

  /**
   * Update the streaming response
   * @param {string} text - Updated response text
   */
  updateStreamingResponse(text) {
    if (this.messages.length > 0 && this.messages[this.messages.length - 1].role === 'assistant') {
      this.messages[this.messages.length - 1].content = text;
      const responseEl = this.shadowRoot.querySelector('.message.assistant.latest .message-content');
      if (responseEl) {
        const formatted = this.markdownToHtml(text);
        responseEl.innerHTML = formatted;
        this.highlightCodeBlocks(responseEl);
      }
    }
  }

  /**
   * Complete the assistant response
   * @param {string} finalText - Final response text
   */
  completeAssistantResponse(finalText) {
    if (this.messages.length > 0 && this.messages[this.messages.length - 1].role === 'assistant') {
      this.messages[this.messages.length - 1].content = finalText;
    }
    
    // Remove the 'latest' class and enable input
    const latestMessage = this.shadowRoot.querySelector('.message.assistant.latest');
    if (latestMessage) {
      latestMessage.classList.remove('latest');
    }
    
    this.isStreaming = false;
    this.enableInput();
    this.updateStatus('Ready');
    
    // Save the updated chat history
    this.saveChatHistory();
  }

  /**
   * Show typing indicator
   */
  showTypingIndicator() {
    const statusEl = this.shadowRoot.querySelector('.status');
    if (statusEl) {
      statusEl.innerHTML = 'Thinking <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>';
    }
  }

  /**
   * Update status message
   * @param {string} status - Status text
   */
  updateStatus(status) {
    const statusEl = this.shadowRoot.querySelector('.status');
    if (statusEl) {
      statusEl.textContent = status;
    }
  }

  /**
   * Show an error message
   * @param {string} error - Error message
   */
  showError(error) {
    this.updateStatus(`Error: ${error}`);
    this.isStreaming = false;
    this.enableInput();
  }

  disableInput() {
    const input = this.shadowRoot.querySelector('.message-input');
    const sendButton = this.shadowRoot.querySelector('.send-button');
    
    input.disabled = true;
    if (sendButton) sendButton.disabled = true;
  }

  enableInput() {
    const input = this.shadowRoot.querySelector('.message-input');
    const sendButton = this.shadowRoot.querySelector('.send-button');
    
    input.disabled = false;
    if (sendButton) sendButton.disabled = false;
    input.focus();
  }

  markdownToHtml(text) {
    // Very simple markdown parser for common elements
    return text
      // Code blocks
      .replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Headers
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      // Lists
      .replace(/^\s*- (.*$)/gm, '<li>$1</li>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Line breaks
      .replace(/\n/g, '<br>');
  }
  
  highlightCodeBlocks(element) {
    const codeBlocks = element.querySelectorAll('pre code');
    codeBlocks.forEach(block => {
      block.classList.add('highlighted');
    });
  }

  renderMessages() {
    const messagesContainer = this.shadowRoot.querySelector('.messages');
    messagesContainer.innerHTML = '';
    
    this.messages.forEach((message, index) => {
      const messageEl = document.createElement('div');
      messageEl.classList.add('message', message.role);
      
      // If it's the latest assistant message, add a class for streaming updates
      if (message.role === 'assistant' && index === this.messages.length - 1) {
        messageEl.classList.add('latest');
      }
      
      // Add timestamp if available
      const timestamp = message.timestamp || new Date().toISOString();
      messageEl.dataset.timestamp = timestamp;
      
      const avatarEl = document.createElement('div');
      avatarEl.classList.add('avatar');
      
      // Enhanced avatars with animation
      if (message.role === 'user') {
        avatarEl.innerHTML = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>';
      } else {
        avatarEl.innerHTML = `
          <div class="ai-avatar">
            <svg viewBox="0 0 36 36" class="ai-icon">
              <path fill="currentColor" d="M18,2 C9.163,2 2,9.163 2,18 C2,26.837 9.163,34 18,34 C26.837,34 34,26.837 34,18 C34,9.163 26.837,2 18,2 Z M18,6 C16.895,6 16,6.895 16,8 C16,9.105 16.895,10 18,10 C19.105,10 20,9.105 20,8 C20,6.895 19.105,6 18,6 Z M18,29 C14.134,29 11,25.866 11,22 C11,18.134 14.134,15 18,15 C21.866,15 25,18.134 25,22 C25,25.866 21.866,29 18,29 Z"></path>
            </svg>
            <div class="ai-circles">
              <div class="ai-circle"></div>
              <div class="ai-circle"></div>
              <div class="ai-circle"></div>
            </div>
          </div>
        `;
      }
      
      const contentWrapper = document.createElement('div');
      contentWrapper.classList.add('message-wrapper');
      
      // Add timestamp display
      const timeEl = document.createElement('div');
      timeEl.classList.add('message-time');
      timeEl.textContent = this.formatTime(timestamp);
      
      const contentEl = document.createElement('div');
      contentEl.classList.add('message-content');
      
      // Convert markdown to HTML
      if (message.role === 'assistant') {
        contentEl.innerHTML = this.markdownToHtml(message.content);
        this.highlightCodeBlocks(contentEl);
      } else {
        contentEl.textContent = message.content;
      }
      
      // Add reaction buttons for assistant messages
      if (message.role === 'assistant' && !messageEl.classList.contains('latest')) {
        const actionsEl = document.createElement('div');
        actionsEl.classList.add('message-actions');
        actionsEl.innerHTML = `
          <button class="action-btn copy-btn" title="Copy to clipboard">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path></svg>
          </button>
          <button class="action-btn feedback-btn positive" title="Good response">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"></path></svg>
          </button>
          <button class="action-btn feedback-btn negative" title="Bad response">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"></path></svg>
          </button>
        `;
        contentWrapper.appendChild(actionsEl);
      }
      
      contentWrapper.appendChild(contentEl);
      contentWrapper.appendChild(timeEl);
      
      messageEl.appendChild(avatarEl);
      messageEl.appendChild(contentWrapper);
      
      messagesContainer.appendChild(messageEl);
    });
    
    // Scroll to bottom with smooth animation
    this.scrollToBottom();
    
    // Setup copy buttons
    this.setupCopyButtons();
    this.setupFeedbackButtons();
  }
  
  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  scrollToBottom() {
    const messagesContainer = this.shadowRoot.querySelector('.messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  setupCopyButtons() {
    const copyButtons = this.shadowRoot.querySelectorAll('.copy-btn');
    copyButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const messageEl = btn.closest('.message');
        const contentEl = messageEl.querySelector('.message-content');
        
        // Get text content, not HTML
        const textToCopy = contentEl.textContent;
        
        navigator.clipboard.writeText(textToCopy).then(() => {
          // Show copied tooltip
          btn.classList.add('copied');
          btn.setAttribute('title', 'Copied!');
          
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.setAttribute('title', 'Copy to clipboard');
          }, 2000);
        });
      });
    });
  }
  
  setupFeedbackButtons() {
    const feedbackButtons = this.shadowRoot.querySelectorAll('.feedback-btn');
    feedbackButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isPositive = btn.classList.contains('positive');
        const messageEl = btn.closest('.message');
        
        // Visual feedback
        messageEl.classList.add(isPositive ? 'feedback-positive' : 'feedback-negative');
        
        // Disable all feedback buttons for this message
        const allBtns = messageEl.querySelectorAll('.feedback-btn');
        allBtns.forEach(b => b.disabled = true);
        
        // Dispatch feedback event
        this.dispatchEvent(new CustomEvent('message-feedback', {
          detail: { 
            positive: isPositive,
            messageContent: messageEl.querySelector('.message-content').textContent
          },
          bubbles: true,
          composed: true
        }));
      });
    });
  }

  loadChatHistory() {
    try {
      const savedHistory = localStorage.getItem('chat-history');
      return savedHistory ? JSON.parse(savedHistory) : [
        { id: 'default', name: 'New Chat', messages: [] }
      ];
    } catch (e) {
      console.error('Failed to load chat history:', e);
      return [{ id: 'default', name: 'New Chat', messages: [] }];
    }
  }
  
  saveChatHistory() {
    try {
      // Find the current chat history object
      let currentChat = this.chatHistory.find(chat => chat.id === this.activeChat);
      
      if (!currentChat) {
        // Create a new chat if none exists
        currentChat = {
          id: `chat_${Date.now()}`,
          name: `Chat ${this.chatHistory.length + 1}`,
          messages: []
        };
        this.chatHistory.unshift(currentChat);
        this.activeChat = currentChat.id;
      }
      
      // Update the messages
      currentChat.messages = [...this.messages];
      
      // Save to localStorage
      localStorage.setItem('chat-history', JSON.stringify(this.chatHistory));
      
      // Update the sidebar
      this.renderChatSidebar();
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  }
  
  createNewChat() {
    // Save current chat first
    this.saveChatHistory();
    
    // Create new chat
    const newChat = {
      id: `chat_${Date.now()}`,
      name: `Chat ${this.chatHistory.length + 1}`,
      messages: []
    };
    
    // Add to history and set as active
    this.chatHistory.unshift(newChat);
    this.activeChat = newChat.id;
    
    // Clear messages and render UI
    this.messages = [];
    this.renderMessages();
    this.renderChatSidebar();
    
    // Save updated history
    localStorage.setItem('chat-history', JSON.stringify(this.chatHistory));
    
    // Focus input
    this.shadowRoot.querySelector('input').focus();
    
    // Dispatch new chat event
    this.dispatchEvent(new CustomEvent('new-chat-created', {
      detail: { chatId: newChat.id },
      bubbles: true,
      composed: true
    }));
  }
  
  loadChat(chatId) {
    // Find the chat in history
    const chat = this.chatHistory.find(c => c.id === chatId);
    if (chat) {
      this.activeChat = chatId;
      this.messages = [...chat.messages];
      this.renderMessages();
      this.renderChatSidebar();
      
      // Dispatch chat loaded event
      this.dispatchEvent(new CustomEvent('chat-loaded', {
        detail: { chatId, messages: this.messages },
        bubbles: true,
        composed: true
      }));
    }
  }
  
  deleteChat(chatId) {
    // Find the chat index
    const index = this.chatHistory.findIndex(c => c.id === chatId);
    if (index !== -1) {
      // Remove the chat
      this.chatHistory.splice(index, 1);
      
      // If it was the active chat, switch to another one
      if (this.activeChat === chatId) {
        if (this.chatHistory.length > 0) {
          this.activeChat = this.chatHistory[0].id;
          this.messages = [...this.chatHistory[0].messages];
        } else {
          // Create a new chat if none left
          const newChat = {
            id: `chat_${Date.now()}`,
            name: 'New Chat',
            messages: []
          };
          this.chatHistory.push(newChat);
          this.activeChat = newChat.id;
          this.messages = [];
        }
      }
      
      // Update UI
      this.renderMessages();
      this.renderChatSidebar();
      
      // Save updated history
      localStorage.setItem('chat-history', JSON.stringify(this.chatHistory));
      
      // Dispatch chat deleted event
      this.dispatchEvent(new CustomEvent('chat-deleted', {
        detail: { chatId },
        bubbles: true,
        composed: true
      }));
    }
  }
  
  renderChatSidebar() {
    const sidebar = this.shadowRoot.querySelector('.chat-sidebar-content');
    if (!sidebar) return;
    
    sidebar.innerHTML = '';
    
    // Add "New Chat" button
    const newChatBtn = document.createElement('button');
    newChatBtn.classList.add('new-chat-btn');
    newChatBtn.innerHTML = `
      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>
      New Chat
    `;
    newChatBtn.addEventListener('click', () => this.createNewChat());
    sidebar.appendChild(newChatBtn);
    
    // Add divider
    const divider = document.createElement('div');
    divider.classList.add('sidebar-divider');
    sidebar.appendChild(divider);
    
    // Add chat history
    const historyList = document.createElement('div');
    historyList.classList.add('chat-history-list');
    
    this.chatHistory.forEach(chat => {
      const chatItem = document.createElement('div');
      chatItem.classList.add('chat-history-item');
      if (chat.id === this.activeChat) {
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
        this.loadChat(chat.id);
      });
      
      historyList.appendChild(chatItem);
    });
    
    sidebar.appendChild(historyList);
    
    // Setup delete buttons
    const deleteButtons = this.shadowRoot.querySelectorAll('.chat-delete-btn');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chatId = btn.dataset.chatId;
        if (confirm('Are you sure you want to delete this chat?')) {
          this.deleteChat(chatId);
        }
      });
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
      :host {
        display: block;
        width: 100%;
        height: 100%;
        /* AT&T Theme Colors */
        --primary-color: #00A9E0 !important;
        --primary-gradient: linear-gradient(135deg, #00A9E0 0%, #0568AE 100%) !important;
        --secondary-color: #F2F2F2 !important;
        --text-color: #2A2A2A !important;
        --background-color: #FFFFFF !important;
        --input-background: #F2F2F2 !important;
        --shadow-color: rgba(0, 0, 0, 0.1) !important;
        --message-user-bg: #00A9E0 !important;
        --message-assistant-bg: #F2F2F2 !important;
        --sidebar-bg: #F8F9FA !important;
        --accent-color: #FF7F32 !important;
        --success-color: #4CAF50 !important;
        --error-color: #F44336 !important;
        --warning-color: #FFC107 !important;
        --border-radius: 8px !important;
        --font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif !important;
        font-family: var(--font-family);
      }
      
      .chat-container {
        display: flex;
        height: 100%;
        background-color: var(--background-color);
        color: var(--text-color);
        border-radius: var(--border-radius);
        overflow: hidden;
        box-shadow: 0 8px 30px var(--shadow-color);
        position: relative;
        transition: all 0.3s ease;
      }
      
      .chat-sidebar {
        background-color: var(--sidebar-bg);
        border-right: 1px solid rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        transition: transform 0.3s ease;
        z-index: 10;
        width: 0px;
        visibility: hidden;
        transform: translateX(-100%);
      }
      
      .chat-sidebar-header {
        padding: 16px;
        background: #00A9E0;
        background: linear-gradient(135deg, #00A9E0 0%, #0568AE 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: space-between;
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
      
      .new-chat-btn {
        background-color: #FF7F32;
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
        border-radius: var(--border-radius);
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
        border-color: var(--primary-color);
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
        color: var(--primary-color);
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
      }
      
      .chat-item-preview {
        font-size: 0.8rem;
        opacity: 0.7;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .chat-delete-btn {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: none;
        background-color: transparent;
        color: var(--text-color);
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
        color: var(--error-color);
        opacity: 1;
      }
      
      .chat-delete-btn svg {
        width: 16px;
        height: 16px;
      }
        
      .chat-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 0;
      }

      .header {
        padding: 16px;
        background: #00A9E0;
        background: linear-gradient(135deg, #00A9E0 0%, #0568AE 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 2px 8px var(--shadow-color);
        z-index: 1;
      }

      .header-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .sidebar-toggle {
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
      
      .sidebar-toggle:hover {
        background-color: rgba(255, 255, 255, 0.3);
      }
      
      .sidebar-toggle svg {
        width: 20px;
        height: 20px;
      }

      .header h2 {
        margin: 0;
        font-weight: 600;
        font-size: 1.2rem;
      }
      
      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .theme-toggle {
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
      
      .theme-toggle:hover {
        background-color: rgba(255, 255, 255, 0.3);
      }
      
      .theme-toggle svg {
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

      .messages {
        flex-grow: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        scroll-behavior: smooth;
        background-size: 20px 20px;
        position: relative;
      }

      .message {
        display: flex;
        gap: 12px;
        max-width: 90%;
        animation: fade-in 0.3s cubic-bezier(0.39, 0.575, 0.565, 1);
        position: relative;
      }

      .message.user {
        align-self: flex-end;
        flex-direction: row-reverse;
      }
      
      .message.feedback-positive .message-content {
        border: 1px solid var(--success-color);
      }
      
      .message.feedback-negative .message-content {
        border: 1px solid var(--error-color);
      }

      .avatar {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        flex-shrink: 0;
        box-shadow: 0 2px 10px var(--shadow-color);
        position: relative;
        overflow: hidden;
      }

      .message.user .avatar {
        background: #00A9E0;
        background: linear-gradient(135deg, #00A9E0 0%, #0568AE 100%);
      }

      .message.assistant .avatar {
        background: #4a4a4a;
        background: linear-gradient(135deg, #4a4a4a 0%, #2d2d2d 100%);
      }
      
      .ai-avatar {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .ai-icon {
        width: 24px;
        height: 24px;
        z-index: 1;
      }
      
      .ai-circles {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
      }
      
      .ai-circle {
        position: absolute;
        border-radius: 50%;
        background: var(--primary-color);
        opacity: 0.15;
        transform-origin: center;
      }
      
      .ai-circle:nth-child(1) {
        width: 100%;
        height: 100%;
        animation: pulse 3s infinite;
      }
      
      .ai-circle:nth-child(2) {
        width: 80%;
        height: 80%;
        top: 10%;
        left: 10%;
        animation: pulse 3s infinite 0.5s;
      }
      
      .ai-circle:nth-child(3) {
        width: 60%;
        height: 60%;
        top: 20%;
        left: 20%;
        animation: pulse 3s infinite 1s;
      }
      
      @keyframes pulse {
        0% { transform: scale(0.8); opacity: 0.2; }
        50% { transform: scale(1.1); opacity: 0.3; }
        100% { transform: scale(0.8); opacity: 0.2; }
      }

      .avatar svg {
        width: 20px;
        height: 20px;
      }
      
      .message-wrapper {
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-width: 100%;
      }

      .message-content {
        padding: 14px 18px;
        border-radius: var(--border-radius);
        box-shadow: 0 2px 10px var(--shadow-color);
        line-height: 1.6;
        font-size: 0.95rem;
        position: relative;
        transition: all 0.3s ease;
        z-index: 1;
      }
      
      .message-content::before {
        content: '';
        position: absolute;
        width: 0;
        height: 0;
        top: 14px;
        border: 8px solid transparent;
        z-index: 0;
      }

      .message.user .message-content {
        background: #00A9E0;
        background: linear-gradient(135deg, #00A9E0 0%, #0568AE 100%);
        color: white;
        border-top-right-radius: 4px;
        align-self: flex-end;
      }
      
      .message.user .message-content::before {
        right: -14px;
        border-left-color: #00A9E0;
      }

      .message.assistant .message-content {
        background-color: var(--message-assistant-bg);
        border-top-left-radius: 4px;
      }
      
      .message.assistant .message-content::before {
        left: -14px;
        border-right-color: var(--message-assistant-bg);
      }
      
      .message.assistant .message-content code {
        background-color: rgba(0, 0, 0, 0.1);
        padding: 2px 5px;
        border-radius: 4px;
        font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
        font-size: 0.9em;
      }
      
      .message.assistant .message-content pre {
        background-color: rgba(0, 0, 0, 0.1);
        padding: 12px;
        border-radius: 6px;
        overflow-x: auto;
        margin: 8px 0;
      }
      
      .message.assistant .message-content pre code {
        background-color: transparent;
        padding: 0;
        display: block;
        line-height: 1.5;
      }
      
      .message.assistant .message-content pre code.highlighted {
        color: var(--primary-color);
      }

      .message.assistant.latest .message-content::after {
        content: '';
        display: inline-block;
        width: 3px;
        height: 14px;
        background-color: var(--primary-color);
        margin-left: 4px;
        border-radius: 1px;
        animation: blink 1s infinite;
        vertical-align: middle;
      }
      
      .message-time {
        font-size: 0.7rem;
        opacity: 0.6;
        margin-top: 2px;
        align-self: flex-end;
      }
      
      .message.user .message-time {
        margin-right: 8px;
      }
      
      .message.assistant .message-time {
        margin-left: 8px;
      }
      
      .message-actions {
        display: flex;
        gap: 6px;
        margin-top: 8px;
        opacity: 0;
        transition: opacity 0.2s ease;
        align-self: flex-end;
      }
      
      .message:hover .message-actions {
        opacity: 1;
      }
      
      .action-btn {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: none;
        background-color: var(--secondary-color);
        color: var(--text-color);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 5px var(--shadow-color);
      }
      
      .action-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px var(--shadow-color);
      }
      
      .action-btn svg {
        width: 16px;
        height: 16px;
      }
      
      .action-btn.copied {
        background-color: var(--success-color);
        color: white;
      }
      
      .feedback-btn.positive:hover {
        background-color: var(--success-color);
        color: white;
      }
      
      .feedback-btn.negative:hover {
        background-color: var(--error-color);
        color: white;
      }

      .input-container {
        padding: 16px 20px;
        border-top: 1px solid rgba(0, 0, 0, 0.1);
        background-color: var(--background-color);
        z-index: 1;
        position: relative;
      }
      
      .input-container::before {
        content: '';
        position: absolute;
        top: -10px;
        left: 0;
        right: 0;
        height: 10px;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.05), transparent);
        pointer-events: none;
      }

      form {
        display: flex;
        gap: 10px;
        position: relative;
      }
      
      .message-input-container {
        flex-grow: 1;
        position: relative;
        
      }

      .message-input {
        width: 95%;
        padding: 14px 16px;
        border: none;
        border-radius: 24px;
        background-color: var(--input-background);
        color: var(--text-color);
        outline: none;
        font-family: inherit;
        transition: all 0.3s ease;
        box-shadow: 0 2px 10px var(--shadow-color);
        font-size: 0.95rem;
      }

      .message-input:focus {
        box-shadow: 0 0 0 2px var(--primary-color), 0 4px 15px var(--shadow-color);
      }
      
      .message-input.is-typing {
        box-shadow: 0 0 0 2px var(--accent-color), 0 4px 15px var(--shadow-color);
      }

      .send-button {
        background: #00A9E0;
        background: linear-gradient(135deg, #00A9E0 0%, #0568AE 100%);
        color: white;
        border: none;
        border-radius: 50%;
        width: 46px;
        height: 46px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        outline: none;
        box-shadow: 0 2px 10px var(--shadow-color);
        flex-shrink: 0;
      }

      .send-button:hover {
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 4px 20px var(--shadow-color);
      }

      .send-button:active {
        transform: translateY(0) scale(0.95);
      }

      .send-button svg {
        width: 22px;
        height: 22px;
        transition: transform 0.2s ease;
      }
      
      .send-button:hover svg {
        transform: translateX(2px);
      }

      .send-button:disabled, .message-input:disabled {
        opacity: 0.7;
        cursor: not-allowed;
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

      @keyframes blink {
        0%, 100% { opacity: 0; }
        50% { opacity: 1; }
      }

      @media (prefers-color-scheme: dark) {
        :host {
          --primary-color: #bb86fc;
          --secondary-color: #2d2d30;
          --text-color: #e0e0e0;
          --background-color: #1e1e1e;
          --input-background: #2d2d30;
          --shadow-color: rgba(0, 0, 0, 0.3);
          --message-user-bg: #3700b3;
          --message-assistant-bg: #2d2d30;
        }
      }

      @media (max-width: 768px) {
        .chat-container {
          border-radius: 0;
          height: 100vh;
        }
        
        .message {
          max-width: 95%;
        }
      }
      </style>
      <div class="chat-container">
        <!-- Sidebar -->
        <div class="chat-sidebar">
          <div class="chat-sidebar-header">
            <h3 class="chat-sidebar-title">
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12,3C17.5,3 22,6.58 22,11C22,15.42 17.5,19 12,19C10.76,19 9.57,18.82 8.47,18.5C5.55,21 2,21 2,21C4.33,18.67 4.7,17.1 4.75,16.5C3.05,15.07 2,13.13 2,11C2,6.58 6.5,3 12,3M17,12V10H15V12H17M13,12V10H11V12H13M9,12V10H7V12H9Z"></path></svg>
              Chats
            </h3>
          </div>
          <div class="chat-sidebar-content">
            <!-- Chat history will be populated here -->
          </div>
        </div>
        
        <!-- Main chat area -->
        <div class="chat-main">
          <div class="header">
            <div class="header-content">
              <div>
                <h2>${this.brand.toUpperCase() === 'ATT' ? 'AT&T' : this.brand.charAt(0).toUpperCase() + this.brand.slice(1)} Assistant</h2>
                <div class="status">Ready</div>
              </div>
            </div>
            <div class="header-actions">
              <button class="theme-toggle" aria-label="Change theme">
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M12,20C7.58,20 4,16.42 4,12C4,7.58 7.58,4 12,4C16.42,4 20,7.58 20,12C20,16.42 16.42,20 12,20M13,7H11V14H13V7M13,15H11V17H13V15Z"></path></svg>
              </button>
              <button class="close-chat" aria-label="Close chat">
                <svg viewBox="0 0 24 24">
                    <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 
                    5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
                </svg>
              </button>
            </div>
          </div>
          
          <div class="messages"></div>
          
          <div class="input-container">
            <form>
              <div class="message-input-container">
                <input type="text" class="message-input" placeholder="Type your message..." autocomplete="off">
              </div>
              <button type="submit" class="send-button">
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
  }
}

// Define the custom element
customElements.define('chat-ui-component', ChatUIComponent);

export { ChatUIComponent };