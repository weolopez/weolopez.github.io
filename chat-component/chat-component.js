class ChatComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    
    
    // Clear any existing styles if element is reused
    if (this.shadowRoot.children.length > 0) {
      this.shadowRoot.innerHTML = '';
    }
    
    this.messages = [];
    this.isProcessing = false;
    this.engine = null;
    this.modelLoaded = false;
    this.selectedModel = "Qwen2.5-0.5B-Instruct-q0f16-MLC";
    this.availableModels = [
      { id: "Phi-3.5-mini-instruct-q4f16_1-MLC", name: "Phi 3.5 Mini (Fast)" },
      { id: "Phi-4-mini-instruct-q4f16_1-MLC", name: "Phi 4 Mini (Smart)" },
      { id: "Qwen2.5-0.5B-Instruct-q0f16-MLC", name: "Qwen 0.5B (Legacy)" }
    ];
    this.chatHistory = this.loadChatHistory();
    this.activeChat = this.chatHistory.length > 0 ? this.chatHistory[0].id : null;
    this.typingTimeout = null;
    
    // Memory system
    this.memoryManager = null;
    this.knowledgeLoader = null;
    this.intentLoader = null;
    this.memoryInitialized = false;
    this.knowledgeInitialized = false;
    this.intentInitialized = false;
    
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
    this.getApiKey();
  }

    getApiKey(keyName = 'GEMINI_API_KEY') {
      this.geminiApiKey = localStorage.getItem(keyName);
      if (!this.geminiApiKey) {
        this.geminiApiKey = prompt(`Please enter your ${keyName}:`);
        if (this.geminiApiKey) {
          localStorage.setItem(keyName, this.geminiApiKey);
        }
      }
      return this.geminiApiKey;
    }

  async connectedCallback() {
    // Load AT&T font if using AT&T theme
    if (this.brand === 'att') {
      const fontLink = document.createElement('link');
      fontLink.href = './deps/fonts/open-sans.css';
      fontLink.rel = 'stylesheet';
      document.head.appendChild(fontLink);
    }
    
    this.render();
    this.setupEventListeners();
    this.initWorker();
    this.setupTheme();
    
    // Initialize memory and knowledge systems
    this.initializeMemory();
  }
  
  async initializeMemory() {
    try {
      // Dynamically import memory, knowledge, and intent components
      const [MemoryManagerModule, KnowledgeLoaderModule, IntentLoaderModule] = await Promise.all([
        import('./lib/memory-manager.js'),
        import('./lib/knowledge-loader.js'),
        import('./lib/intent-loader.js')
      ]);
      
      // Initialize memory manager
      const { MemoryManager } = MemoryManagerModule;
      this.memoryManager = new MemoryManager({
        historySize: 20,
        useLocalStorage: true,
        binarize: false // Use standard vector embeddings (not binary)
      });
      this.memoryInitialized = true;
      
      // Initialize knowledge base
      const { KnowledgeLoader } = KnowledgeLoaderModule;
      this.knowledgeLoader = new KnowledgeLoader({
        directoryPath: '/chat-component/knowledge/',
        binarize: false 
      });
      
      // Load knowledge base from markdown files
      this.knowledgeLoader.loadKnowledgeBase()
        .then(results => {
          console.log(`Loaded ${results.filter(r => r.success).length} knowledge files`);
          this.knowledgeInitialized = true;
        })
        .catch(error => {
          console.error('Error loading knowledge base:', error);
        });

      // Initialize intent loader
      const { IntentLoader } = IntentLoaderModule;
      this.intentLoader = new IntentLoader({
        directoryPath: '/chat-component/intents/'
      });

      // Load intents from JSON files
      this.intentLoader.loadIntents()
        .then(results => {
          console.log(`Loaded ${results.filter(r => r.success).length} intent files`);
          this.intentInitialized = true;
        })
        .catch(error => {
          console.error('Error loading intents:', error);
        });
        
      console.log('Memory, knowledge, and intent systems initialized');
    } catch (error) {
      console.error('Error initializing memory systems:', error);
    }
  }
  
  setupTheme() {
    const container = this.shadowRoot.querySelector('.chat-container');
    if (!container) return;
    
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
      hostStyle.textContent = hostCss + `
        .intent-suggestions {
            padding: 8px 15px;
            display: flex;
            gap: 10px;
            overflow-x: auto;
            background: var(--sidebar-bg);
            border-top: 1px solid var(--shadow-color);
        }
        .intent-pill {
            background: var(--primary-color);
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            cursor: pointer;
            white-space: nowrap;
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `;
      this.shadowRoot.appendChild(hostStyle);
      
      // Log theme application
      console.log(`Applied theme: ${this.theme}`);
    }
  }

  initWorker() {
    this.worker = new Worker('/chat-component/chat-worker.js', { type: 'module' });
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
    
    // Initialize the model
    this.worker.postMessage({ 
      type: 'init', 
      model: this.selectedModel,
      messages: [{geminiToken: this.geminiApiKey}]
    });
    
    this.updateStatus('Initializing model...');
  }

  handleWorkerMessage(event) {
    const { type, data } = event.data;
    
    switch(type) {
      case 'init-progress':
        this.updateProgress(data);
        break;
      case 'init-complete':
        this.dispatchEvent(new CustomEvent("SHOW_CHAT", { bubbles: true, composed: true }));
        this.modelLoaded = true;
        this.updateStatus('Model loaded');
        this.enableInput();
        this.shadowRoot.querySelector('.loading-container').classList.add('hidden');
        break;
      case 'response-chunk':
        this.updateResponse(data.text);
        break;
      case 'intent':
        console.log('Worker detected intent:', data.intent);
        this.showIntentSuggestion(data.intent);
        break;
      case 'response-complete':
        this.completeResponse(data.message);
        break;
      case 'error':
        this.handleError(data.error);
        break;
    }
  }

  showIntentSuggestion(intent) {
    const suggestionContainer = this.shadowRoot.querySelector('.intent-suggestions');
    if (!suggestionContainer) return;

    suggestionContainer.innerHTML = '';
    const suggestion = document.createElement('div');
    suggestion.className = 'intent-pill';
    suggestion.innerHTML = `<span>Switching to: ${intent}</span>`;
    suggestion.onclick = () => {
        // Here we could trigger a specific action or just keep it as informative
        suggestion.remove();
    };
    
    suggestionContainer.appendChild(suggestion);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (suggestion.parentNode) {
            suggestion.remove();
        }
    }, 5000);
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
      // responseEl.innerHTML =  marked.parse(text);

      // Apply syntax highlighting to code blocks
      this.highlightCodeBlocks(responseEl);
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        /* Base internal styles */
        :host {
          --primary-color: #00A9E0;
          --sidebar-bg: #f8f9fa;
        }
        /* ... existing styles ... */
      </style>
      <div class="chat-container">
        <!-- ... existing template ... -->
        <div class="chat-main">
          <div class="messages"></div>
          <div class="intent-suggestions"></div>
          <div class="input-area">
            <form>
              <input type="text" class="message-input" placeholder="Type a message...">
              <!-- ... existing buttons ... -->
            </form>
          </div>
        </div>
      </div>
    `;
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

  async completeResponse(message) {
    // Update the complete response
    const assistantMessage = {
      role: 'assistant',
      content: message.content,
      timestamp: new Date().toISOString()
    };
    
    // Find the user message that triggered this (it's the one before the assistant placeholder)
    const userMessageIndex = this.messages.findIndex(m => m.role === 'assistant' && m.content === '') - 1;
    const userMessage = userMessageIndex >= 0 ? this.messages[userMessageIndex] : null;

    // Update the UI message list
    this.messages[this.messages.length - 1] = assistantMessage;
    
    // Remove the 'latest' class and enable input
    const latestMessage = this.shadowRoot.querySelector('.message.assistant.latest');
    if (latestMessage) {
      latestMessage.classList.remove('latest');
    }
    
    // Logic: Treat the Request + Response + History as a single conceptual "interaction"
    if (this.memoryInitialized && this.memoryManager) {
      try {
        // 1. Add assistant message to short-term history buffer
        await this.memoryManager.addMessage(assistantMessage);
        
        // 2. Commit the entire exchange as a single "Concept" in the Vector DB
        // We use the last N messages to capture the semantic context of this interaction
        if (userMessage) {
          const interactionContext = this.messages.slice(-10, -1); // Last 10 messages excluding current assistant msg
          await this.memoryManager.saveInteraction(userMessage, assistantMessage, interactionContext);
        }
      } catch (error) {
        console.error('Error saving conceptual memory:', error);
      }
    }
    
    this.isProcessing = false;
    this.enableInput();
    
    // Save the updated chat history
    this.saveChatHistory();
  }

  handleError(error) {
    console.error('Error:', error);
    this.updateStatus(`Error: ${error.message || 'Unknown error'}`);
    this.isProcessing = false;
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
      
      if (message && !this.isProcessing && this.modelLoaded) {
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
        
        // Only reinitialize if model actually changed
        if (newModel !== this.selectedModel) {
          this.selectedModel = newModel;
          
          // Show the loading screen again
          this.shadowRoot.querySelector('.loading-container').classList.remove('hidden');
          this.modelLoaded = false;
          
          // Reinitialize the worker with the new model
          this.worker.terminate();
          this.initWorker();
        }
      });
    }
    
    // Clear chat button
    if (closeButton) {
      closeButton.addEventListener('click', async () => {
        this.dispatchEvent(new CustomEvent("CLOSE_CHAT", { bubbles: true, composed: true }));
        // if (confirm('Are you sure you want to clear the current chat and memory?')) {
        //   this.messages = [];
        //   this.renderMessages();
        //   this.saveChatHistory();
          
        //   // Clear memory if available
        //   if (this.memoryInitialized && this.memoryManager) {
        //     try {
        //       await this.memoryManager.clearMemory();
        //       console.log('Memory cleared');
        //     } catch (error) {
        //       console.error('Error clearing memory:', error);
        //     }
        //   }
        // }
        // window.closeChat()
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

  async _pushMessage(role, content) {
    const msg = { role, content, timestamp: new Date().toISOString() };
    this.messages.push(msg);
    
    if (this.memoryInitialized && this.memoryManager) {
      await this.memoryManager.addMessage(msg);
    }
    
    this.renderMessages();
    return msg;
  }

  async sendMessage(content) {
    // 1. Unified entry for user message
    await this._pushMessage('user', content);

    let intent = this.intentLoader ? await this.intentLoader.classify(content) : null;

    // UI Feedback
    this.showTypingIndicator();
    this.isProcessing = true;
    this.disableInput();
    
    // 2. Add assistant placeholder immediately for the UI
    this.messages.push({ 
      role: 'assistant', 
      content: '',
      timestamp: new Date().toISOString()
    });
    this.renderMessages();

    try {
      let workerPayload = [];

      if (this.memoryInitialized && this.memoryManager) {
        // Fetch context and RAG simultaneously
        const [context, knowledge] = await Promise.all([
          this.memoryManager.buildContext(content),
          this.knowledgeInitialized && this.knowledgeLoader ? this.knowledgeLoader.query(content, 3) : Promise.resolve([])
        ]);

        // Build base messages from memory
        workerPayload = this.memoryManager.formatContextMessages(context, content);

        // Inject Knowledge into the System Message
        if (knowledge && knowledge.length > 0) {
          const knowledgeText = knowledge.map((r, i) => 
            `[Source: ${r.document?.title || 'Documentation'}] ${r.text}`
          ).join('\n\n');

          const ragContext = `I've found relevant information to help answer:\n\n${knowledgeText}`;

          if (workerPayload.length > 0 && workerPayload[0].role === 'system') {
            workerPayload[0].content += '\n\n' + ragContext;
          } else {
            workerPayload.unshift({ role: 'system', content: ragContext });
          }
        }
        
        console.log('Using enhanced context:', workerPayload);
      } else {
        // Fallback: History minus the empty assistant placeholder we just pushed
        workerPayload = this.messages.slice(0, -1);
      }

      // Safety: Ensure the current prompt is at the end if context building stripped it
      if (workerPayload.length === 0 || workerPayload[workerPayload.length - 1].content !== content) {
        workerPayload.push({ role: 'user', content });
      }

      this.worker.postMessage({
        type: 'generate',
        messages: workerPayload,
        model: this.selectedModel
      });

    } catch (error) {
      console.error('Error building context:', error);
      // Fallback: Send only the prompt
      this.worker.postMessage({
        type: 'generate',
        messages: [{ role: 'user', content }],
        model: this.selectedModel
      });
    }
    
    this.saveChatHistory();
  }
  
  showTypingIndicator() {
    const statusEl = this.shadowRoot.querySelector('.status');
    if (statusEl) {
      statusEl.innerHTML = 'Thinking <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>';
    }
  }
  
  async updateMemoryPanel() {
    if (!this.memoryInitialized || !this.memoryManager) {
      console.warn('Memory not initialized');
      return;
    }
    
    const memoryContent = this.shadowRoot.querySelector('.memory-content');
    const memoryStats = this.shadowRoot.querySelector('.memory-stats');
    
    if (!memoryContent || !memoryStats) {
      return;
    }
    
    try {
      // Get recent messages
      const recentMessages = this.memoryManager.getRecentMessages(5);
      
      // Get stats
      const allMemories = await this.memoryManager.db.getAll();
      const recentCount = recentMessages.length;
      const totalCount = allMemories.length;
      
      // Update stats
      if (memoryStats) {
        const recentCountEl = memoryStats.querySelector('#recentCount');
        const totalCountEl = memoryStats.querySelector('#totalCount');
        
        if (recentCountEl) recentCountEl.textContent = recentCount;
        if (totalCountEl) totalCountEl.textContent = totalCount;
      }
      
      // Clear memory content
      memoryContent.innerHTML = '';
      
      // No context case
      if (recentCount === 0 && totalCount === 0) {
        memoryContent.innerHTML = '<p>No context has been sent to the AI yet. Send a message to see what context is used.</p>';
        return;
      }
      
      // Create section for recent conversation history
      if (recentCount > 0) {
        const historySection = document.createElement('div');
        historySection.className = 'memory-item';
        
        let historyContent = `
          <div class="memory-item-header">
            <span>Recent Conversation History</span>
          </div>
          <div class="memory-item-text" style="white-space: pre-line;">
        `;
        
        recentMessages.forEach(msg => {
          historyContent += `${msg.role}: ${msg.content}\n`;
        });
        
        historyContent += `</div>`;
        historySection.innerHTML = historyContent;
        memoryContent.appendChild(historySection);
      }
      
      // Create section for knowledge base if available
      if (this.knowledgeInitialized && this.knowledgeLoader) {
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
  }
  
  loadChat(chatId) {
    // Find the chat in history
    const chat = this.chatHistory.find(c => c.id === chatId);
    if (chat) {
      this.activeChat = chatId;
      this.messages = [...chat.messages];
      this.renderMessages();
      this.renderChatSidebar();
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
        // contentEl.innerHTML = marked.parse( message.content);
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
  }

  scrollToBottom() {
    const messagesContainer = this.shadowRoot.querySelector('.messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      // Secondary check to ensure it scrolls even if content still rendering
      setTimeout(() => {
        messagesContainer.scrollTo({
          top: messagesContainer.scrollHeight,
          behavior: 'smooth'
        });
      }, 50);
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

  async completeResponse(message) {
    // Update the complete response
    const assistantMessage = {
      role: 'assistant',
      content: message.content,
      timestamp: new Date().toISOString()
    };
    
    // Find the user message that triggered this (it's the one before the assistant placeholder)
    const userMessageIndex = this.messages.findIndex(m => m.role === 'assistant' && m.content === '') - 1;
    const userMessage = userMessageIndex >= 0 ? this.messages[userMessageIndex] : null;

    // Update the UI message list
    this.messages[this.messages.length - 1] = assistantMessage;
    
    // Remove the 'latest' class and enable input
    const latestMessage = this.shadowRoot.querySelector('.message.assistant.latest');
    if (latestMessage) {
      latestMessage.classList.remove('latest');
    }
    
    // Logic: Treat the Request + Response + History as a single conceptual "interaction"
    if (this.memoryInitialized && this.memoryManager) {
      try {
        // 1. Add assistant message to short-term history buffer
        await this.memoryManager.addMessage(assistantMessage);
        
        // 2. Commit the entire exchange as a single "Concept" in the Vector DB
        // We use the last N messages to capture the semantic context of this interaction
        if (userMessage) {
          const interactionContext = this.messages.slice(-10, -1); // Last 10 messages excluding current assistant msg
          await this.memoryManager.saveInteraction(userMessage, assistantMessage, interactionContext);
        }
      } catch (error) {
        console.error('Error saving conceptual memory:', error);
      }
    }
    
    this.isProcessing = false;
    this.enableInput();
    
    // Save the updated chat history
    this.saveChatHistory();
  }

  handleError(error) {
    console.error('Error:', error);
    this.updateStatus(`Error: ${error.message || 'Unknown error'}`);
    this.isProcessing = false;
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
      
      if (message && !this.isProcessing && this.modelLoaded) {
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
        
        // Only reinitialize if model actually changed
        if (newModel !== this.selectedModel) {
          this.selectedModel = newModel;
          
          // Show the loading screen again
          this.shadowRoot.querySelector('.loading-container').classList.remove('hidden');
          this.modelLoaded = false;
          
          // Reinitialize the worker with the new model
          this.worker.terminate();
          this.initWorker();
        }
      });
    }
    
    // Clear chat button
    if (closeButton) {
      closeButton.addEventListener('click', async () => {
        this.dispatchEvent(new CustomEvent("CLOSE_CHAT", { bubbles: true, composed: true }));
        // if (confirm('Are you sure you want to clear the current chat and memory?')) {
        //   this.messages = [];
        //   this.renderMessages();
        //   this.saveChatHistory();
          
        //   // Clear memory if available
        //   if (this.memoryInitialized && this.memoryManager) {
        //     try {
        //       await this.memoryManager.clearMemory();
        //       console.log('Memory cleared');
        //     } catch (error) {
        //       console.error('Error clearing memory:', error);
        //     }
        //   }
        // }
        // window.closeChat()
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

  async _pushMessage(role, content) {
    const msg = { role, content, timestamp: new Date().toISOString() };
    this.messages.push(msg);
    
    if (this.memoryInitialized && this.memoryManager) {
      await this.memoryManager.addMessage(msg);
    }
    
    this.renderMessages();
    return msg;
  }

  async sendMessage(content) {
    // 1. Unified entry for user message
    await this._pushMessage('user', content);

    let intent = this.intentLoader ? await this.intentLoader.classify(content) : null;

    // UI Feedback
    this.showTypingIndicator();
    this.isProcessing = true;
    this.disableInput();
    
    // 2. Add assistant placeholder immediately for the UI
    this.messages.push({ 
      role: 'assistant', 
      content: '',
      timestamp: new Date().toISOString()
    });
    this.renderMessages();

    try {
      let workerPayload = [];

      if (this.memoryInitialized && this.memoryManager) {
        // Fetch context and RAG simultaneously
        const [context, knowledge] = await Promise.all([
          this.memoryManager.buildContext(content),
          this.knowledgeInitialized && this.knowledgeLoader ? this.knowledgeLoader.query(content, 3) : Promise.resolve([])
        ]);

        // Build base messages from memory
        workerPayload = this.memoryManager.formatContextMessages(context, content);

        // Inject Knowledge into the System Message
        if (knowledge && knowledge.length > 0) {
          const knowledgeText = knowledge.map((r, i) => 
            `[Source: ${r.document?.title || 'Documentation'}] ${r.text}`
          ).join('\n\n');

          const ragContext = `I've found relevant information to help answer:\n\n${knowledgeText}`;

          if (workerPayload.length > 0 && workerPayload[0].role === 'system') {
            workerPayload[0].content += '\n\n' + ragContext;
          } else {
            workerPayload.unshift({ role: 'system', content: ragContext });
          }
        }
        
        console.log('Using enhanced context:', workerPayload);
      } else {
        // Fallback: History minus the empty assistant placeholder we just pushed
        workerPayload = this.messages.slice(0, -1);
      }

      // Safety: Ensure the current prompt is at the end if context building stripped it
      if (workerPayload.length === 0 || workerPayload[workerPayload.length - 1].content !== content) {
        workerPayload.push({ role: 'user', content });
      }

      this.worker.postMessage({
        type: 'generate',
        messages: workerPayload,
        model: this.selectedModel
      });

    } catch (error) {
      console.error('Error building context:', error);
      // Fallback: Send only the prompt
      this.worker.postMessage({
        type: 'generate',
        messages: [{ role: 'user', content }],
        model: this.selectedModel
      });
    }
    
    this.saveChatHistory();
  }
  
  showTypingIndicator() {
    const statusEl = this.shadowRoot.querySelector('.status');
    if (statusEl) {
      statusEl.innerHTML = 'Thinking <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>';
    }
  }
  
  async updateMemoryPanel() {
    if (!this.memoryInitialized || !this.memoryManager) {
      console.warn('Memory not initialized');
      return;
    }
    
    const memoryContent = this.shadowRoot.querySelector('.memory-content');
    const memoryStats = this.shadowRoot.querySelector('.memory-stats');
    
    if (!memoryContent || !memoryStats) {
      return;
    }
    
    try {
      // Get recent messages
      const recentMessages = this.memoryManager.getRecentMessages(5);
      
      // Get stats
      const allMemories = await this.memoryManager.db.getAll();
      const recentCount = recentMessages.length;
      const totalCount = allMemories.length;
      
      // Update stats
      if (memoryStats) {
        const recentCountEl = memoryStats.querySelector('#recentCount');
        const totalCountEl = memoryStats.querySelector('#totalCount');
        
        if (recentCountEl) recentCountEl.textContent = recentCount;
        if (totalCountEl) totalCountEl.textContent = totalCount;
      }
      
      // Clear memory content
      memoryContent.innerHTML = '';
      
      // No context case
      if (recentCount === 0 && totalCount === 0) {
        memoryContent.innerHTML = '<p>No context has been sent to the AI yet. Send a message to see what context is used.</p>';
        return;
      }
      
      // Create section for recent conversation history
      if (recentCount > 0) {
        const historySection = document.createElement('div');
        historySection.className = 'memory-item';
        
        let historyContent = `
          <div class="memory-item-header">
            <span>Recent Conversation History</span>
          </div>
          <div class="memory-item-text" style="white-space: pre-line;">
        `;
        
        recentMessages.forEach(msg => {
          historyContent += `${msg.role}: ${msg.content}\n`;
        });
        
        historyContent += `</div>`;
        historySection.innerHTML = historyContent;
        memoryContent.appendChild(historySection);
      }
      
      // Create section for knowledge base if available
      if (this.knowledgeInitialized && this.knowledgeLoader) {
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
  }
  
  loadChat(chatId) {
    // Find the chat in history
    const chat = this.chatHistory.find(c => c.id === chatId);
    if (chat) {
      this.activeChat = chatId;
      this.messages = [...chat.messages];
      this.renderMessages();
      this.renderChatSidebar();
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
}
customElements.define('chat-component', ChatComponent);