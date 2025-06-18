import { ApiService } from './api-service.js';
import { HistoryService } from './history-service.js';
import { MemoryManager } from './memory-manager.js';
import { KnowledgeLoader } from './knowledge-loader.js';

export class ChatManager extends EventTarget {
  constructor(config = {}) {
    super();
    this.config = config;
    this.state = {
      messages: [],
      isProcessing: false,
      isInitialized: false,
      currentChatId: null,
      selectedModel: config.model || 'gpt-4o-mini'
    };

    // Initialize services
    this.apiService = new ApiService(config.api);
    this.historyService = new HistoryService(config.history);
    
    // Initialize memory and knowledge systems (optional)
    try {
      this.memoryManager = new MemoryManager(config.memory || {});
    } catch (error) {
      console.warn('Memory system not available:', error.message);
      this.memoryManager = null;
    }
    
    try {
      this.knowledgeLoader = new KnowledgeLoader(config.knowledge || {});
    } catch (error) {
      console.warn('Knowledge system not available:', error.message);
      this.knowledgeLoader = null;
    }
  }

  async initialize() {
    // Initialize API service
    await this.apiService.initialize();

    // Initialize knowledge system (memory is already initialized in constructor)
    if (this.knowledgeLoader) {
      try {
        await this.knowledgeLoader.loadKnowledgeBase();
      } catch (error) {
        console.warn('Failed to load knowledge base:', error.message);
        this.knowledgeLoader = null;
      }
    }

    // Load chat history
    this.historyService.loadHistory();
    this.state.currentChatId = this.historyService.activeChat;
    
    // Load messages for the current chat
    if (this.state.currentChatId) {
      this.state.messages = this.historyService.getMessages(this.state.currentChatId);
    }

    this.state.isInitialized = true;
    this.dispatchEvent(new CustomEvent('initialized'));
  }

  async sendMessage(content) {
    // Add user message with timestamp
    const userMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    
    this.state.messages.push(userMessage);
    this.state.isProcessing = true;
    
    // Emit events for UI updates
    this.dispatchEvent(new CustomEvent('messageAdded', {
      detail: { message: userMessage }
    }));
    
    this.dispatchEvent(new CustomEvent('stateChanged', {
      detail: { state: this.state }
    }));
    
    // Add message to memory if available
    if (this.memoryManager) {
      await this.memoryManager.addMessage(userMessage);
    }
    
    // Build context with memory and knowledge if available
    let context = {};
    
    try {
      if (this.memoryManager) {
        // Get context from memory
        context = await this.memoryManager.buildContext(content);
        
        // Search knowledge base if available
        let knowledgeResults = [];
        if (this.knowledgeLoader) {
          knowledgeResults = await this.knowledgeLoader.query(content, 3);
        }
        
        // Format context as messages for the LLM
        const messageContext = this.memoryManager.formatContextMessages(context, content);
        
        // Add knowledge to the context if available
        if (knowledgeResults && knowledgeResults.length > 0) {
          let knowledgeContext = "I've found some relevant information that might help answer the question:\n\n";
          
          knowledgeResults.forEach((result, index) => {
            knowledgeContext += `[${index + 1}] From ${result.document?.title || 'documentation'}:\n${result.text}\n\n`;
          });
          
          // Add or update system message with knowledge
          if (messageContext.length > 0 && messageContext[0].role === 'system') {
            messageContext[0].content += '\n\n' + knowledgeContext;
          } else {
            messageContext.unshift({
              role: 'system',
              content: knowledgeContext
            });
          }
        }
        
        // Add placeholder for assistant response
        const assistantMessage = {
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString()
        };
        this.state.messages.push(assistantMessage);
        
        this.dispatchEvent(new CustomEvent('messageAdded', {
          detail: { message: assistantMessage }
        }));
        
        // Generate response with enhanced context
        await this.generateResponse(messageContext);
      } else {
        // Fallback to regular approach
        const assistantMessage = {
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString()
        };
        this.state.messages.push(assistantMessage);
        
        this.dispatchEvent(new CustomEvent('messageAdded', {
          detail: { message: assistantMessage }
        }));
        
        // Generate response with regular messages
        await this.generateResponse(this.state.messages.slice(0, -1));
      }
    } catch (error) {
      console.error('Error building context for message:', error);
      throw error;
    }
    
    // Update and save chat history
    this.historyService.updateMessages(this.state.messages);
  }

  async generateResponse(messages) {
    try {
      // Prepare the system prompt with resume data and knowledge base
      const systemPrompt = this.apiService.createSystemPrompt();
      
      // Add system prompt if not present, or replace it
      if (!messages.some(msg => msg.role === 'system')) {
        messages.unshift({
          role: 'system',
          content: systemPrompt
        });
      } else {
        // Find and replace the existing system message
        const systemIndex = messages.findIndex(msg => msg.role === 'system');
        if (systemIndex !== -1) {
          messages[systemIndex].content = systemPrompt;
        }
      }
      
      // Use ApiService to generate streaming response
      const responseStream = this.apiService.streamChatCompletion(messages, {
        temperature: 0.7,
        max_tokens: 1024
      });
      
      let accumulatedResponse = '';
      
      // Process each chunk as it arrives
      for await (const chunk of responseStream) {
        const content = chunk.choices[0]?.delta?.content || '';
        accumulatedResponse += content;
        
        // Emit response update for UI
        this.dispatchEvent(new CustomEvent('responseUpdate', {
          detail: { content: accumulatedResponse }
        }));
      }
      
      // Complete the response
      const assistantMessage = {
        role: 'assistant',
        content: accumulatedResponse,
        timestamp: this.state.messages[this.state.messages.length - 1].timestamp
      };
      
      this.state.messages[this.state.messages.length - 1] = assistantMessage;
      
      // Add to memory if available
      if (this.memoryManager) {
        await this.memoryManager.addMessage(assistantMessage);
      }
      
      this.state.isProcessing = false;
      
      this.dispatchEvent(new CustomEvent('responseComplete', {
        detail: { message: assistantMessage }
      }));
      
      this.dispatchEvent(new CustomEvent('stateChanged', {
        detail: { state: this.state }
      }));
      
    } catch (error) {
      console.error('Generation error:', error);
      this.state.isProcessing = false;
      this.dispatchEvent(new CustomEvent('error', {
        detail: { message: `Failed to generate response: ${error.message}` }
      }));
      throw error;
    }
  }

  createNewChat() {
    // Update current chat messages before creating new one
    if (this.state.currentChatId) {
      this.historyService.updateMessages(this.state.messages);
    }
    
    this.historyService.createNewChat();
    this.state.currentChatId = this.historyService.activeChat;
    this.state.messages = [];
    this.dispatchEvent(new CustomEvent('chatChanged', {
      detail: { chatId: this.state.currentChatId }
    }));
  }

  loadChat(chatId) {
    // Update current chat messages before switching
    if (this.state.currentChatId) {
      this.historyService.updateMessages(this.state.messages);
    }
    
    this.historyService.loadChat(chatId);
    this.state.currentChatId = chatId;
    this.state.messages = this.historyService.getMessages(chatId);
    this.dispatchEvent(new CustomEvent('chatChanged', {
      detail: { chatId }
    }));
  }

  deleteChat(chatId) {
    this.historyService.deleteChat(chatId);
    this.state.currentChatId = this.historyService.activeChat;
    this.state.messages = this.historyService.getMessages(this.state.currentChatId);
    this.dispatchEvent(new CustomEvent('chatChanged', {
      detail: { chatId: this.state.currentChatId }
    }));
  }

  getChatHistory() {
    return this.historyService.chatHistory;
  }

  setModel(modelId) {
    this.state.selectedModel = modelId;
    this.apiService.selectedModel = modelId;
    this.dispatchEvent(new CustomEvent('modelChanged', {
      detail: { modelId }
    }));
  }

  setTheme(theme) {
    this.state.theme = theme;
    this.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { theme }
    }));
  }

  getMessages() {
    return [...this.state.messages];
  }

  isProcessing() {
    return this.state.isProcessing;
  }

  isInitialized() {
    return this.state.isInitialized;
  }

  async getMemoryInfo() {
    console.log('ChatManager: getMemoryInfo called, memoryManager:', this.memoryManager);
    
    if (!this.memoryManager) {
      console.log('ChatManager: No memory manager available.');
      return {
        recentCount: 0,
        totalCount: 0,
        entities: [],
        relations: [],
        hasKnowledge: this.knowledgeLoader !== null,
        knowledgeDetails: this.knowledgeLoader ? await this.getKnowledgeDetails() : null
      };
    }
    
    try {
      // Get memory information from the memory manager
      const recentMessages = this.memoryManager.getRecentMessages();
      const conversationHistory = this.memoryManager.conversationHistory || [];
      
      console.log('ChatManager: Recent messages from memoryManager:', recentMessages);
      console.log('ChatManager: Conversation history from memoryManager:', conversationHistory);
      
      // Get knowledge details if available
      let knowledgeDetails = null;
      if (this.knowledgeLoader) {
        knowledgeDetails = await this.getKnowledgeDetails();
      }
      
      return {
        recentCount: recentMessages.length,
        totalCount: conversationHistory.length,
        recentMessages: recentMessages,
        hasKnowledge: this.knowledgeLoader !== null,
        knowledgeDetails: knowledgeDetails,
        entities: [],
        relations: []
      };
    } catch (error) {
      console.warn('ChatManager: Failed to get memory info from memoryManager:', error);
      return {
        recentCount: 0,
        totalCount: 0,
        entities: [],
        relations: [],
        hasKnowledge: this.knowledgeLoader !== null,
        knowledgeDetails: null
      };
    }
  }

  async getKnowledgeDetails() {
    if (!this.knowledgeLoader) {
      return null;
    }
    
    try {
      // Get loaded files information
      const loadedFiles = Array.from(this.knowledgeLoader.loadedFiles);
      
      // Try to get some sample knowledge entries
      let sampleEntries = [];
      if (this.knowledgeLoader.db) {
        try {
          // Query for a few sample entries to show what's in the knowledge base
          sampleEntries = await this.knowledgeLoader.query("", 5);
        } catch (error) {
          console.warn('Could not retrieve sample knowledge entries:', error);
        }
      }
      
      return {
        loadedFiles: loadedFiles,
        fileCount: loadedFiles.length,
        sampleEntries: sampleEntries.slice(0, 3), // Show first 3 entries
        totalEntries: sampleEntries.length
      };
    } catch (error) {
      console.warn('Error getting knowledge details:', error);
      return {
        loadedFiles: [],
        fileCount: 0,
        sampleEntries: [],
        totalEntries: 0
      };
    }
  }

  on(event, callback) {
    this.addEventListener(event, callback);
  }

  off(event, callback) {
    this.removeEventListener(event, callback);
  }
}