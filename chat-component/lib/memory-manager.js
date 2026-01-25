import { EntityDB } from './entity-db.js';

/**
 * MemoryManager class to manage conversation history and retrieval
 */
class MemoryManager {
  constructor({ 
    historySize = 20,
    model = 'Xenova/all-MiniLM-L6-v2',
    binarize = false,
    minRelevance = 0.65,
    storageKey = 'chat_recent_history',
    maxChars = 12000 // New: Approx 3000-4000 tokens as a safety heuristic
  }) {
    this.historySize = historySize;
    this.model = model;
    this.binarize = binarize;
    this.minRelevance = minRelevance;
    this.storageKey = storageKey;
    this.maxChars = maxChars;
    
    // Initialize EntityDB for vector search
    this.db = new EntityDB({
      vectorPath: 'chat_memory',
      model: this.model
    });
    
    // Conversation history (recent messages for immediate context)
    this.conversationHistory = this.loadHistoryFromStore();
  }

  /**
   * Load history from local storage for persistence across refreshes
   */
  loadHistoryFromStore() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('Failed to load history from store', e);
      return [];
    }
  }

  /**
   * Save current window to local storage
   */
  saveHistoryToStore() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.conversationHistory));
    } catch (e) {
      console.error('Failed to save history to store', e);
    }
  }
  
  /**
   * Add a message to the rolling conversation history (Short-term memory)
   * Note: This no longer saves individual messages to the vector DB to avoid redundancy.
   * @param {Object} message - Message object with role, content, and optional metadata
   */
  async addMessage(message) {
    try {
      const standardMessage = {
        role: message.role,
        content: message.content,
        timestamp: message.timestamp || new Date().toISOString(),
        type: 'message',
        ...message.metadata
      };
      
      this.conversationHistory.push(standardMessage);
      
      if (this.conversationHistory.length > this.historySize) {
        this.conversationHistory.shift();
      }

      this.saveHistoryToStore();
      return standardMessage;
    } catch (error) {
      console.error('Error adding message to memory:', error);
      throw error;
    }
  }

  /**
   * Commits a full interaction (Concept) to the Vector DB.
   * Vectorizes the whole history/context to capture the semantic "episode".
   */
  async saveInteraction(userMessage, assistantMessage, fullContext = []) {
    try {
      // The "text" to be vectorized is the full dialog that led to this point
      // This ensures the vector captures the relationship between query and answer.
      const conceptText = fullContext.length > 0 
        ? fullContext.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
        : `USER: ${userMessage.content}\n\nASSISTANT: ${assistantMessage.content}`;

      const interactionItem = {
        text: conceptText,
        type: 'concept',
        timestamp: new Date().toISOString(),
        metadata: {
          userPrompt: userMessage.content,
          assistantResponse: assistantMessage.content,
          contextLength: fullContext.length
        }
      };

      if (this.binarize) {
        await this.db.insertBinary(interactionItem);
      } else {
        await this.db.insert(interactionItem);
      }
      
      console.log('Successfully saved conceptual memory episode');
    } catch (error) {
      console.error('Error saving interaction concept:', error);
    }
  }
  
  /**
   * Retrieve messages from conversation history
   * @param {number} limit - Maximum number of messages to retrieve
   * @returns {Array} - Recent conversation history
   */
  getRecentMessages(limit = this.historySize) {
    return this.conversationHistory
      .slice(-limit)
      .map(message => ({
        role: message.role,
        content: message.content,
        timestamp: message.timestamp
      }));
  }
  
  /**
   * Retrieve semantically relevant memories based on query text
   * @param {string} query - Query text to find related memories
   * @param {number} limit - Maximum number of memories to retrieve
   * @returns {Promise<Array>} - Relevant memories
   */
  async getRelevantMemories(query, limit = 5) {
    try {
      let results;
      
      // Use appropriate query method based on binarize setting
      if (this.binarize) {
        results = await this.db.queryBinary(query, limit * 2); // Get more candidates for re-ranking
      } else {
        results = await this.db.query(query, limit * 2);
      }
      
      const now = new Date();

      // Format results and apply time-based decay/re-ranking
      const processedResults = results.map(item => {
        const score = item.score || item.similarity || 0;
        const timestamp = item.timestamp ? new Date(item.timestamp) : now;
        
        // Simple decay: Reduce score slightly for older items
        // This gives recent items a "tie-breaker" advantage
        const ageInDays = (now - timestamp) / (1000 * 60 * 60 * 24);
        const decayFactor = Math.max(0.8, 1 - (ageInDays / 30)); // Max 20% penalty over 30 days
        const balancedScore = score * decayFactor;

        return {
          role: item.role,
          content: item.text,
          timestamp: item.timestamp,
          relevance: balancedScore,
          originalScore: score
        };
      });

      // Filter by threshold, sort by the new balanced score, and limit
      return processedResults
        .filter(item => item.originalScore >= this.minRelevance)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit);
    } catch (error) {
      console.error('Error retrieving relevant memories:', error);
      return [];
    }
  }
  
  /**
   * Build context for the LLM by combining recent and relevant messages
   * @param {string} currentMessage - Current user message
   * @param {Object} options - Options for building context
   * @returns {Promise<Object>} - Context object with recent and relevant memories
   */
  async buildContext(currentMessage, options = {}) {
    const {
      recentMessagesLimit = 10,
      relevantMemoriesLimit = 5,
      includeTimestamps = false
    } = options;
    
    try {
      // Get recent conversation history
      const recentMessages = this.getRecentMessages(recentMessagesLimit);
      
      // Get relevant memories based on current message
      const relevantMemories = await this.getRelevantMemories(
        currentMessage,
        relevantMemoriesLimit
      );
      
      // Filter out redundant memories (messages that are already in recent history)
      const recentContentSet = new Set(recentMessages.map(m => m.content));
      const filteredRelevantMemories = relevantMemories.filter(
        memory => !recentContentSet.has(memory.content)
      );
      
      // Format context object
      return {
        recentMessages: recentMessages.map(m => includeTimestamps ? m : {
          role: m.role,
          content: m.content
        }),
        relevantMemories: filteredRelevantMemories.map(m => includeTimestamps ? m : {
          role: m.role,
          content: m.content,
          relevance: m.relevance
        })
      };
    } catch (error) {
      console.error('Error building context:', error);
      // Return just recent messages if error occurs
      return {
        recentMessages: this.getRecentMessages(recentMessagesLimit).map(m => ({
          role: m.role,
          content: m.content
        })),
        relevantMemories: []
      };
    }
  }
  
  /**
   * Format context into a text string for the LLM
   * @param {Object} context - Context object from buildContext
   * @returns {string} - Formatted context string
   */
  formatContextString(context) {
    let contextString = '';
    
    // Add recent conversation
    if (context.recentMessages && context.recentMessages.length > 0) {
      contextString += 'Recent conversation:\n';
      context.recentMessages.forEach((message, index) => {
        contextString += `${message.role}: ${message.content}\n`;
      });
      contextString += '\n';
    }
    
    // Add relevant memories if available
    if (context.relevantMemories && context.relevantMemories.length > 0) {
      contextString += 'Related memories from previous conversations:\n';
      context.relevantMemories.forEach((memory, index) => {
        contextString += `${memory.role}: ${memory.content}\n`;
      });
    }
    
    return contextString;
  }
  
  /**
   * Format context into a messages array for the LLM with budgeting logic
   * @param {Object} context - Context object from buildContext
   * @param {string} currentMessage - Current user message
   * @returns {Array} - Messages array for the LLM
   */
  formatContextMessages(context, currentMessage) {
    let messages = [];
    
    // 1. Add system message with relevant memories (With time labeling)
    if (context.relevantMemories && context.relevantMemories.length > 0) {
      const now = new Date();
      let relevantMemoriesText = 'Relevant context from past interactions:\n';
      
      context.relevantMemories.forEach((memory, index) => {
        // Calculate relative time for the LLM
        let timeLabel = 'In the past';
        if (memory.timestamp) {
          const hoursAgo = Math.floor((now - new Date(memory.timestamp)) / (1000 * 60 * 60));
          if (hoursAgo < 1) timeLabel = 'Just recently';
          else if (hoursAgo < 24) timeLabel = `${hoursAgo} hours ago`;
          else timeLabel = `${Math.floor(hoursAgo / 24)} days ago`;
        }
        
        relevantMemoriesText += `[Historical Memory - ${timeLabel}] ${memory.role}: ${memory.content}\n`;
      });
      
      messages.push({
        role: 'system',
        content: relevantMemoriesText
      });
    }
    
    // 2. Prepare recent conversation messages
    const recent = context.recentMessages || [];
    const filteredRecent = (currentMessage && recent.length > 0 && 
                           recent[recent.length - 1].content === currentMessage)
                           ? recent.slice(0, -1) 
                           : recent;

    filteredRecent.forEach(message => {
      messages.push({
        role: message.role,
        content: message.content
      });
    });
    
    // 3. Add current message
    if (currentMessage) {
      messages.push({
        role: 'user',
        content: currentMessage
      });
    }

    // 4. Budgeting / Smart Pruning (Phase 3)
    return this._applyBudget(messages);
  }

  /**
   * Prunes messages if they exceed the character budget
   * Strategy: Keep First (System), Keep Last 2 (Crucial continuity), Prune Middle
   */
  _applyBudget(messages) {
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    
    if (totalChars <= this.maxChars || messages.length <= 3) {
      return messages;
    }

    console.warn(`Context exceeds budget (${totalChars} chars). Pruning middle messages...`);

    const result = [];
    const first = messages[0];
    const lastTwo = messages.slice(-2);
    const middle = messages.slice(1, -2);
    
    result.push(first);
    
    let currentTotal = first.content.length + lastTwo.reduce((s, m) => s + m.content.length, 0);
    
    // Add middle messages from newest to oldest until budget is hit
    for (let i = middle.length - 1; i >= 0; i--) {
      if (currentTotal + middle[i].content.length < this.maxChars) {
        result.splice(1, 0, middle[i]); // Insert after the system message
        currentTotal += middle[i].content.length;
      } else {
        break;
      }
    }

    result.push(...lastTwo);
    return result;
  }
  
  /**
   * Clear all memory (both recent history and vector DB)
   * @returns {Promise<void>}
   */
  async clearMemory() {
    try {
      // Clear conversation history
      this.conversationHistory = [];
      
      // Clear vector database
      await this.db.clear();
      
      console.log('Memory cleared successfully.');
    } catch (error) {
      console.error('Error clearing memory:', error);
      throw error;
    }
  }
}

export { MemoryManager };