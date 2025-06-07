import { ChatManager } from './lib/chat-manager.js';

class ChatComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Initialize ChatManager
    this.chatManager = new ChatManager({
      api: { model: this.selectedModel },
      history: { storageKey: 'chat-history' },
      memory: { historySize: 20 },
      knowledge: { directoryPath: '/chat-component/knowledge/' }
    });
    
    // Clear any existing styles if element is reused
    if (this.shadowRoot.children.length > 0) {
      this.shadowRoot.innerHTML = '';
    }
    
    // UI-only state
    this.selectedModel = "gpt-4o-mini";
    this.availableModels = [
      { id: "gpt-4o-mini", name: "GPT-4o Mini (Fast)" },
      { id: "gpt-4o", name: "GPT-4o (Smart)" }
    ];
    this.typingTimeout = null;
    
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

  async connectedCallback() {
    // Load AT&T font if using AT&T theme
    if (this.brand === 'att') {
      const fontLink = document.createElement('link');
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&display=swap';
      fontLink.rel = 'stylesheet';
      document.head.appendChild(fontLink);
    }
    
    this.render();
    this.setupEventListeners();
    this.setupChatManagerListeners();
    
    // Initialize ChatManager for API, memory, knowledge, history
    try {
      await this.chatManager.initialize();
      this.updateStatus('Model loaded');
      this.enableInput();
      this.shadowRoot.querySelector('.loading-container').classList.add('hidden');
    } catch (error) {
      console.error('ChatManager initialization error:', error);
      this.handleError({ message: `Failed to initialize: ${error.message}` });
    }
    
    this.setupTheme();
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
      
      // Log theme application
      console.log(`Applied theme: ${this.theme}`);
    }
  }

  setupChatManagerListeners() {
    this.chatManager.addEventListener('messageAdded', (e) => {
      this.renderMessages();
    });
    
    this.chatManager.addEventListener('responseUpdate', (e) => {
      this.updateResponse(e.detail.content);
    });
    
    this.chatManager.addEventListener('responseComplete', (e) => {
      this.enableInput();
    });
    
    this.chatManager.addEventListener('stateChanged', (e) => {
      this.updateUI(e.detail.state);
    });
    
    this.chatManager.addEventListener('progressUpdate', (e) => {
      this.updateProgress(e.detail);
    });
    
    this.chatManager.addEventListener('chatChanged', (e) => {
      this.renderChatSidebar();
      this.renderMessages();
    });
    
    this.chatManager.addEventListener('modelChanged', (e) => {
      const modelSelector = this.shadowRoot.querySelector('.model-selector');
      if (modelSelector) {
        modelSelector.value = e.detail.modelId;
      }
    });
    
    this.chatManager.addEventListener('themeChanged', (e) => {
      this.theme = e.detail.theme;
      this.setupTheme();
    });
    
    this.chatManager.addEventListener('error', (e) => {
      this.handleError({ message: e.detail.message });
    });
  }
  
  updateUI(state) {
    if (state.isProcessing !== undefined) {
      if (state.isProcessing) {
        this.disableInput();
        this.showTypingIndicator();
      } else {
        this.enableInput();
      }
    }
  }




  updateProgress(progress) {
    const { text, progress: value } = progress;
    const progressBar = this.shadowRoot.querySelector('.progress-bar');
    const progressText = this.shadowRoot.querySelector('.progress-text');
    
    if (progressBar && progressText) {
      progressBar.value = value * 100;
      progressText.textContent = text;
    }
  }

  updateStatus(status) {
    const statusEl = this.shadowRoot.querySelector('.status');
    if (statusEl) {
      statusEl.textContent = status;
    }
  }

  updateResponse(text) {
    const responseEl = this.shadowRoot.querySelector('.message.assistant.latest .message-content');
    if (responseEl) {
      // Convert markdown to HTML
      const formatted = this.markdownToHtml(text);
      responseEl.innerHTML = formatted;
      
      // Apply syntax highlighting to code blocks
      this.highlightCodeBlocks(responseEl);
    }
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


  handleError(error) {
    console.error('Error:', error);
    this.updateStatus(`Error: ${error.message || 'Unknown error'}`);
    this.enableInput();
  }

  setupEventListeners() {
    const form = this.shadowRoot.querySelector('form');
    const input = this.shadowRoot.querySelector('.message-input');
    const themeToggle = this.shadowRoot.querySelector('.theme-toggle');
    const sidebarToggle = this.shadowRoot.querySelector('.sidebar-toggle');
    const modelSelector = this.shadowRoot.querySelector('.model-selector');
    const closeButton = this.shadowRoot.querySelector('.close-chat');
    const themeSelector = this.shadowRoot.querySelector('.theme-selector');
    const memoryToggle = this.shadowRoot.querySelector('.memory-toggle');
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const message = input.value.trim();
      
      if (message) {
        this.sendMessage(message);
        input.value = '';
        
        // Reset typing indicator styles
        if (this.typingTimeout) {
          clearTimeout(this.typingTimeout);
        }
        input.classList.remove('is-typing');
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
        
        // Update theme selector if available
        if (themeSelector) {
          themeSelector.value = this.theme;
        }
      });
    }
    
    // Theme selector
    if (themeSelector) {
      // Populate theme selector
      themeSelector.innerHTML = this.availableThemes.map(theme => 
        `<option value="${theme}">${theme.charAt(0).toUpperCase() + theme.slice(1).replace(/-/g, ' ')}</option>`
      ).join('');
      
      // Set current theme
      themeSelector.value = this.theme;
      
      // Add change event listener
      themeSelector.addEventListener('change', (e) => {
        this.theme = e.target.value;
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
    
    // Model selector
    if (modelSelector) {
      modelSelector.addEventListener('change', (e) => {
        const newModel = e.target.value;
        
        // Only update if model actually changed
        if (newModel !== this.selectedModel) {
          this.selectedModel = newModel;
          this.chatManager.updateModel(newModel);
        }
      });
    }
    
    // Clear chat button
    if (closeButton) {
      closeButton.addEventListener('click', async () => {
        window.closeChat()
      });
    }
    
    // Memory toggle button
    if (memoryToggle) {
      memoryToggle.addEventListener('click', async () => {
        const memoryPanel = this.shadowRoot.querySelector('.memory-panel');
        
        if (!memoryPanel.classList.contains('active')) {
          // Open memory panel
          memoryPanel.classList.add('active');
          
          // Update memory status display
          this.updateMemoryPanel();
        } else {
          // Close memory panel
          memoryPanel.classList.remove('active');
        }
      });
      
      // Close memory panel button
      const closeMemoryBtn = this.shadowRoot.querySelector('.close-memory');
      if (closeMemoryBtn) {
        closeMemoryBtn.addEventListener('click', () => {
          const memoryPanel = this.shadowRoot.querySelector('.memory-panel');
          memoryPanel.classList.remove('active');
        });
      }
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

  async sendMessage(content) {
    // Display typing indicator and disable input
    this.showTypingIndicator();
    this.disableInput();
    
    // Delegate to ChatManager
    try {
      await this.chatManager.sendMessage(content);
    } catch (error) {
      console.error('Error sending message:', error);
      this.handleError({ message: `Failed to send message: ${error.message}` });
    }
  }
  
  showTypingIndicator() {
    const statusEl = this.shadowRoot.querySelector('.status');
    if (statusEl) {
      statusEl.innerHTML = 'Thinking <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>';
    }
  }
  
  async updateMemoryPanel() {
    const memoryContent = this.shadowRoot.querySelector('.memory-content');
    const memoryStats = this.shadowRoot.querySelector('.memory-stats');
    
    if (!memoryContent || !memoryStats) {
      return;
    }
    
    try {
      // Get memory information from ChatManager
      const memoryInfo = this.chatManager.getMemoryInfo();
      
      // Update stats
      const recentCountEl = memoryStats.querySelector('#recentCount');
      const totalCountEl = memoryStats.querySelector('#totalCount');
      
      if (recentCountEl) recentCountEl.textContent = memoryInfo.recentCount || 0;
      if (totalCountEl) totalCountEl.textContent = memoryInfo.totalCount || 0;
      
      // Clear memory content
      memoryContent.innerHTML = '';
      
      // No context case
      if (!memoryInfo.recentCount && !memoryInfo.totalCount) {
        memoryContent.innerHTML = '<p>No context has been sent to the AI yet. Send a message to see what context is used.</p>';
        return;
      }
      
      // Create section for recent conversation history
      if (memoryInfo.recentMessages && memoryInfo.recentMessages.length > 0) {
        const historySection = document.createElement('div');
        historySection.className = 'memory-item';
        
        let historyContent = `
          <div class="memory-item-header">
            <span>Recent Conversation History</span>
          </div>
          <div class="memory-item-text" style="white-space: pre-line;">
        `;
        
        memoryInfo.recentMessages.forEach(msg => {
          historyContent += `${msg.role}: ${msg.content}\n`;
        });
        
        historyContent += `</div>`;
        historySection.innerHTML = historyContent;
        memoryContent.appendChild(historySection);
      }
      
      // Create section for knowledge base if available
      if (memoryInfo.hasKnowledge) {
        const knowledgeSection = document.createElement('div');
        knowledgeSection.className = 'memory-item';
        knowledgeSection.innerHTML = `
          <div class="memory-item-header">
            <span>Knowledge Base</span>
          </div>
          <div class="memory-item-text">
            <p>Knowledge base is loaded. When you ask a question, relevant information will be retrieved.</p>
          </div>
        `;
        memoryContent.appendChild(knowledgeSection);
      }
      
    } catch (error) {
      console.error('Error updating memory panel:', error);
      memoryContent.innerHTML = '<p>Error displaying memory information.</p>';
    }
  }
  
  
  createNewChat() {
    this.chatManager.createNewChat();
    // Focus input
    this.shadowRoot.querySelector('.message-input').focus();
  }
  
  loadChat(chatId) {
    this.chatManager.loadChat(chatId);
  }
  
  deleteChat(chatId) {
    this.chatManager.deleteChat(chatId);
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
    
    const chatHistory = this.chatManager.getChatHistory();
    const activeChat = this.chatManager.state.currentChatId;
    
    chatHistory.forEach(chat => {
      const chatItem = document.createElement('div');
      chatItem.classList.add('chat-history-item');
      if (chat.id === activeChat) {
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

  disableInput() {
    const input = this.shadowRoot.querySelector('.message-input');
    const sendButton = this.shadowRoot.querySelector('.send-button');
    const micButton = this.shadowRoot.querySelector('.mic-btn');
    const emojiButton = this.shadowRoot.querySelector('.emoji-btn');
    
    input.disabled = true;
    if (sendButton) sendButton.disabled = true;
    if (micButton) micButton.disabled = true;
    if (emojiButton) emojiButton.disabled = true;
  }

  enableInput() {
    const input = this.shadowRoot.querySelector('.message-input');
    const sendButton = this.shadowRoot.querySelector('.send-button');
    const micButton = this.shadowRoot.querySelector('.mic-btn');
    const emojiButton = this.shadowRoot.querySelector('.emoji-btn');
    
    input.disabled = false;
    if (sendButton) sendButton.disabled = false;
    if (micButton) micButton.disabled = false;
    if (emojiButton) emojiButton.disabled = false;
    input.focus();
  }

  renderMessages() {
    const messagesContainer = this.shadowRoot.querySelector('.messages');
    messagesContainer.innerHTML = '';
    
    const messages = this.chatManager.getMessages();
    messages.forEach((message, index) => {
      const messageEl = document.createElement('div');
      messageEl.classList.add('message', message.role);
      
      // If it's the latest assistant message, add a class for streaming updates
      if (message.role === 'assistant' && index === messages.length - 1) {
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
        
        // Here you could send feedback to your analytics or backend
        console.log(`User gave ${isPositive ? 'positive' : 'negative'} feedback for message:`, 
          messageEl.querySelector('.message-content').textContent);
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
     
      .memory-toggle {
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

.memory-toggle:hover {
        background-color: rgba(255, 255, 255, 0.3);
      }
      
      .memory-toggle svg {
        width: 20px;
        height: 20px;
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
      
      .memory-panel {
        position: absolute;
        right: 0;
        top: 65px;
        bottom: 80px;
        width: 0;
        background-color: var(--background-color);
        border-left: 1px solid rgba(0, 0, 0, 0.1);
        box-shadow: -5px 0 15px var(--shadow-color);
        transition: width 0.3s ease;
        overflow: hidden;
        z-index: 10;
        display: flex;
        flex-direction: column;
      }
      
      .memory-panel.active {
        width: 350px;
      }
      
      .memory-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        background-color: var(--primary-color);
        color: white;
        font-weight: 600;
      }
      
      .close-memory {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0 5px;
      }
      
      .memory-content {
        flex: 1;
        overflow-y: auto;
        padding: 15px;
      }
      
      .memory-item {
        background-color: var(--secondary-color);
        border-radius: var(--border-radius);
        padding: 12px;
        margin-bottom: 15px;
        border-left: 3px solid var(--primary-color);
      }
      
      .memory-item-header {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--primary-color);
        margin-bottom: 8px;
      }
      
      .memory-item-text {
        font-size: 0.9rem;
        line-height: 1.5;
      }
      
      .memory-stats {
        display: flex;
        justify-content: space-between;
        padding: 10px 15px;
        background-color: var(--secondary-color);
        border-top: 1px solid rgba(0, 0, 0, 0.1);
        font-size: 0.8rem;
        color: var(--text-color);
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
        width: 100%;
        padding: 14px 16px;
        padding-right: 40px;
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
      
      .input-actions {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .input-action-btn {
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
      }
      
      .input-action-btn:hover {
        opacity: 1;
        background-color: rgba(0, 0, 0, 0.05);
      }
      
      .input-action-btn svg {
        width: 16px;
        height: 16px;
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

      .loading-container {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--background-color);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 20;
        padding: 20px;
        text-align: center;
        backdrop-filter: blur(5px);
      }

      .loading-container.hidden {
        display: none;
      }
      
      .loading-content {
        background-color: var(--background-color);
        padding: 30px;
        border-radius: var(--border-radius);
        box-shadow: 0 10px 50px var(--shadow-color);
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
        filter: drop-shadow(0 2px 8px var(--shadow-color));
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
        background: var(--primary-gradient);
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
      
      .loading-container h3 {
        font-size: 1.4rem;
        margin: 0 0 10px 0;
        color: var(--primary-color);
      }
      
      .loading-container p {
        margin: 0 0 20px 0;
        opacity: 0.8;
        font-size: 1rem;
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
        background-color: var(--input-background);
        overflow: hidden;
        position: relative;
      }

      .progress-bar::-webkit-progress-bar {
        background-color: var(--input-background);
        border-radius: 3px;
      }

      .progress-bar::-webkit-progress-value {
        background: var(--primary-gradient);
        border-radius: 3px;
        transition: width 0.3s ease;
      }

      .progress-text {
        margin-top: 10px;
        font-size: 0.9rem;
        color: var(--text-color);
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
                <div class="status">Initializing...</div>
              </div>
            </div>
            <div class="header-actions">
              <button class="memory-toggle" aria-label="View memory">
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"></path></svg>
              </button>
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
          
          <!-- Memory Panel -->
          <div class="memory-panel" id="memoryPanel">
            <div class="memory-header">
              <span>Memory & Knowledge</span>
              <button class="memory-toggle close-memory" id="closeMemory">×</button>
            </div>
            <div class="memory-content" id="memoryContent">
              <!-- Memory context will be displayed here -->
              <p>No context has been sent to the AI yet. Send a message to see what context is used.</p>
            </div>
            <div class="memory-stats" id="memoryStats">
              <div>Recent messages: <span id="recentCount">0</span></div>
              <div>Total memories: <span id="totalCount">0</span></div>
            </div>
          </div>
          
          <div class="input-container">
            <form>
              <div class="message-input-container">
                <input type="text" class="message-input" placeholder="Type your message..." autocomplete="off" disabled>
                <div class="input-actions">
                  <button type="button" class="input-action-btn emoji-btn" title="Add emoji" disabled>
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12,17.5C14.33,17.5 16.3,16.04 17.11,14H6.89C7.69,16.04 9.67,17.5 12,17.5M8.5,11A1.5,1.5 0 0,0 10,9.5A1.5,1.5 0 0,0 8.5,8A1.5,1.5 0 0,0 7,9.5A1.5,1.5 0 0,0 8.5,11M15.5,11A1.5,1.5 0 0,0 17,9.5A1.5,1.5 0 0,0 15.5,8A1.5,1.5 0 0,0 14,9.5A1.5,1.5 0 0,0 15.5,11M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"></path></svg>
                  </button>
                </div>
              </div>
              <button type="submit" class="send-button" disabled>
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                </svg>
              </button>
            </form>
          </div>
        </div>
        
        <!-- Loading screen -->
        <div class="loading-container">
          <div class="loading-content">
            <div class="loading-logo">
              <svg viewBox="0 0 36 36" class="loading-icon">
                <path fill="var(--primary-color)" d="M18,2 C9.163,2 2,9.163 2,18 C2,26.837 9.163,34 18,34 C26.837,34 34,26.837 34,18 C34,9.163 26.837,2 18,2 Z M18,7 C20.761,7 23,9.239 23,12 C23,14.761 20.761,17 18,17 C15.239,17 13,14.761 13,12 C13,9.239 15.239,7 18,7 Z M18,29 C14.134,29 10.65,27.111 8.567,24.111 C8.731,21.026 14.273,19.334 18,19.334 C21.727,19.334 27.269,21.026 27.433,24.111 C25.35,27.111 21.866,29 18,29 Z"></path>
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
              <progress class="progress-bar" value="0" max="100"></progress>
              <div class="progress-text">Initializing...</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('chat-component', ChatComponent);
