import { ChatManager } from './lib/chat-manager.js';

// Import all sub-components
import './components/loading-indicator.js';
import './components/chat-header.js';
import './components/message-list.js';
import './components/message-item.js';
import './components/message-input.js';
import './components/chat-sidebar.js';
import './components/memory-panel.js';
import './components/history-panel.js';

class ChatComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
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

    // Initialize ChatManager
    this.chatManager = new ChatManager({
      api: { model: this.selectedModel },
      history: { storageKey: 'chat-history' },
      memory: { historySize: 20 },
      knowledge: { directoryPath: '/chat/knowledge/' }
    });
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
    this.setupChatManagerListeners();
    
    // Use requestAnimationFrame to ensure all child components are fully rendered
    // before setting up event listeners
    requestAnimationFrame(() => {
      this.setupEventListeners();
    });
    
    // Initialize ChatManager for API, memory, knowledge, history
    try {
      console.log('ChatComponent: Initializing ChatManager...');
      await this.chatManager.initialize();
      this.updateStatus('Model loaded');
      this.enableInput();
      this.hideLoading();
      console.log('ChatComponent: ChatManager initialized successfully.');
    } catch (error) {
      console.error('ChatComponent: ChatManager initialization error:', error);
      this.handleError({ message: `Failed to initialize: ${error.message}` });
    }
    
    this.setupTheme();
  }

  setupTheme() {
    const container = this.shadowRoot.querySelector('.chat-container');
    container.setAttribute('data-theme', this.theme);
    
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
      this.updateMessageList();
      this.updateMemoryPanel();
    });
    
    this.chatManager.addEventListener('responseUpdate', (e) => {
      this.updateLatestMessage(e.detail.content);
    });
    
    this.chatManager.addEventListener('responseComplete', (e) => {
      this.enableInput();
      this.updateMemoryPanel();
    });
    
    this.chatManager.addEventListener('stateChanged', (e) => {
      this.updateUI(e.detail.state);
    });
    
    this.chatManager.addEventListener('progressUpdate', (e) => {
      this.updateProgress(e.detail);
    });
    
    this.chatManager.addEventListener('chatChanged', (e) => {
      this.updateChatSidebar();
      this.updateMessageList();
    });
    
    this.chatManager.addEventListener('modelChanged', (e) => {
      this.selectedModel = e.detail.modelId;
    });
    
    this.chatManager.addEventListener('themeChanged', (e) => {
      this.theme = e.detail.theme;
      this.setupTheme();
    });
    
    this.chatManager.addEventListener('error', (e) => {
      this.handleError({ message: e.detail.message });
    });
  }

  setupEventListeners() {
    console.log('ChatComponent: Setting up event listeners...');
    
    // Header events
    this.addEventListener('memory-toggle', () => this.toggleMemoryPanel());
    this.addEventListener('history-toggle', () => this.toggleHistoryPanel());
    this.addEventListener('theme-toggle', () => this.toggleTheme());
    this.addEventListener('close-chat', () => window.closeChat?.());

    // Message input events
    this.addEventListener('message-send', (e) => {
      console.log('ChatComponent: Received message-send event:', e.detail);
      this.sendMessage(e.detail.message);
    });
    
    console.log('ChatComponent: Event listeners setup completed');

    // Message feedback events
    this.addEventListener('message-feedback', (e) => {
      console.log(`User gave ${e.detail.isPositive ? 'positive' : 'negative'} feedback for message:`, e.detail.content);
    });

    // Sidebar events
    this.addEventListener('new-chat', () => this.createNewChat());
    this.addEventListener('chat-load', (e) => this.loadChat(e.detail.chatId));
    this.addEventListener('chat-delete', (e) => this.deleteChat(e.detail.chatId));

    // Panel close events
    this.addEventListener('memory-close', () => this.closeMemoryPanel());
    this.addEventListener('history-close', () => this.closeHistoryPanel());

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        const container = this.shadowRoot.querySelector('.chat-container');
        const sidebar = this.shadowRoot.querySelector('chat-sidebar');
        
        if (container && sidebar?.open &&
            !sidebar.contains(e.target) &&
            !e.target.closest('.sidebar-toggle')) {
          this.closeSidebar();
        }
      }
    });
  }

  // UI Update Methods
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
    const loadingIndicator = this.shadowRoot.querySelector('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.progress = progress.progress;
      loadingIndicator.status = progress.text;
    }
  }

  updateStatus(status) {
    const header = this.shadowRoot.querySelector('chat-header');
    if (header) {
      header.updateStatus(status);
    }
  }

  showTypingIndicator() {
    const header = this.shadowRoot.querySelector('chat-header');
    if (header) {
      header.showTypingIndicator();
    }
  }

  updateMessageList() {
    const messageList = this.shadowRoot.querySelector('message-list');
    if (messageList) {
      messageList.messages = this.chatManager.getMessages();
    }
  }

  updateLatestMessage(content) {
    const messageList = this.shadowRoot.querySelector('message-list');
    if (messageList) {
      messageList.updateLatestMessage(content);
    }
  }

  updateChatSidebar() {
    const sidebar = this.shadowRoot.querySelector('chat-sidebar');
    if (sidebar) {
      sidebar.chatHistory = this.chatManager.getChatHistory();
      sidebar.activeChatId = this.chatManager.state.currentChatId;
    }
  }

  async updateMemoryPanel() {
    const memoryPanel = this.shadowRoot.querySelector('memory-panel');
    if (memoryPanel && memoryPanel.active) {
      try {
        const memoryInfo = await this.chatManager.getMemoryInfo();
        memoryPanel.memoryInfo = memoryInfo;
      } catch (error) {
        console.error('Error updating memory panel:', error);
        memoryPanel.showError();
      }
    }
  }

  updateHistoryPanel() {
    const historyPanel = this.shadowRoot.querySelector('history-panel');
    if (historyPanel && historyPanel.active) {
      historyPanel.chatHistory = this.chatManager.getChatHistory();
      historyPanel.activeChatId = this.chatManager.state.currentChatId;
    }
  }

  // Action Methods
  async sendMessage(content) {
    console.log('ChatComponent: sendMessage called with content:', content);
    this.disableInput();
    this.showTypingIndicator();
    
    try {
      console.log('ChatComponent: Calling chatManager.sendMessage...');
      await this.chatManager.sendMessage(content);
      console.log('ChatComponent: chatManager.sendMessage completed successfully');
    } catch (error) {
      console.error('ChatComponent: Error sending message:', error);
      this.handleError({ message: `Failed to send message: ${error.message}` });
    }
  }

  toggleTheme() {
    const themes = this.availableThemes;
    const currentIndex = themes.indexOf(this.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    this.theme = themes[nextIndex];
    localStorage.setItem('chat-theme', this.theme);
    this.setupTheme();
  }

  toggleMemoryPanel() {
    const memoryPanel = this.shadowRoot.querySelector('memory-panel');
    const historyPanel = this.shadowRoot.querySelector('history-panel');
    
    if (memoryPanel.active) {
      this.closeMemoryPanel();
    } else {
      // Close history panel if open
      if (historyPanel.active) {
        this.closeHistoryPanel();
      }
      this.openMemoryPanel();
    }
  }

  toggleHistoryPanel() {
    const historyPanel = this.shadowRoot.querySelector('history-panel');
    const memoryPanel = this.shadowRoot.querySelector('memory-panel');
    
    if (historyPanel.active) {
      this.closeHistoryPanel();
    } else {
      // Close memory panel if open
      if (memoryPanel.active) {
        this.closeMemoryPanel();
      }
      this.openHistoryPanel();
    }
  }

  openMemoryPanel() {
    const memoryPanel = this.shadowRoot.querySelector('memory-panel');
    memoryPanel.active = true;
    memoryPanel.showLoading();
    this.updateMemoryPanel();
  }

  closeMemoryPanel() {
    const memoryPanel = this.shadowRoot.querySelector('memory-panel');
    memoryPanel.active = false;
  }

  openHistoryPanel() {
    const historyPanel = this.shadowRoot.querySelector('history-panel');
    historyPanel.active = true;
    this.updateHistoryPanel();
  }

  closeHistoryPanel() {
    const historyPanel = this.shadowRoot.querySelector('history-panel');
    historyPanel.active = false;
  }

  toggleSidebar() {
    const sidebar = this.shadowRoot.querySelector('chat-sidebar');
    sidebar.open = !sidebar.open;
    if (sidebar.open) {
      this.updateChatSidebar();
    }
  }

  closeSidebar() {
    const sidebar = this.shadowRoot.querySelector('chat-sidebar');
    sidebar.open = false;
  }

  createNewChat() {
    this.chatManager.createNewChat();
    this.focusInput();
    this.closeSidebar();
    this.closeHistoryPanel();
  }

  loadChat(chatId) {
    this.chatManager.loadChat(chatId);
    this.closeSidebar();
    this.closeHistoryPanel();
  }

  deleteChat(chatId) {
    this.chatManager.deleteChat(chatId);
    this.updateChatSidebar();
    this.updateHistoryPanel();
  }

  // Input Control Methods
  disableInput() {
    const messageInput = this.shadowRoot.querySelector('message-input');
    if (messageInput) {
      messageInput.disable();
    }
  }

  enableInput() {
    const messageInput = this.shadowRoot.querySelector('message-input');
    if (messageInput) {
      messageInput.enable();
    }
  }

  focusInput() {
    const messageInput = this.shadowRoot.querySelector('message-input');
    if (messageInput) {
      messageInput.focus();
    }
  }

  // Loading Control Methods
  showLoading() {
    const loadingIndicator = this.shadowRoot.querySelector('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.visible = true;
    }
  }

  hideLoading() {
    const loadingIndicator = this.shadowRoot.querySelector('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.visible = false;
    }
  }

  // Error Handling
  handleError(error) {
    console.error('Error:', error);
    this.updateStatus(`Error: ${error.message || 'Unknown error'}`);
    this.enableInput();
  }

  render() {
    const brandDisplay = this.brand.toUpperCase() === 'ATT' ? 'AT&T' : 
                        this.brand.charAt(0).toUpperCase() + this.brand.slice(1);

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: -webkit-fill-available;
          height: -webkit-fill-available;
          /* Default AT&T Theme Colors */
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

        .chat-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
          position: relative;
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
        }
      </style>
      <div class="chat-container">
        <!-- Sidebar -->
        <chat-sidebar></chat-sidebar>
        
        <!-- Main chat area -->
        <div class="chat-main">
          <chat-header 
            title="Chat" 
            status="Initializing..." 
            brand="${this.brand}">
          </chat-header>
          
          <message-list auto-scroll></message-list>
          
          <!-- Memory Panel -->
          <memory-panel></memory-panel>
          
          <!-- History Panel -->
          <history-panel></history-panel>
          
          <message-input 
            placeholder="Type your message..." 
            disabled>
          </message-input>
        </div>
        
        <!-- Loading screen -->
        <loading-indicator 
          visible 
          progress="0" 
          status="Initializing...">
        </loading-indicator>
      </div>
    `;
  }
}

customElements.define('chat-component', ChatComponent);
