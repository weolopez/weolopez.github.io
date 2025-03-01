import { EntityDB } from './entity-db.js';

/**
 * MemoryManager class to manage conversation history and retrieval
 */
class MemoryManager {
  constructor({ 
    historySize = 20,
    model = 'Xenova/all-MiniLM-L6-v2',
    binarize = false
  }) {
    this.historySize = historySize;
    this.model = model;
    this.binarize = binarize;
    
    // Initialize EntityDB for vector search
    this.db = new EntityDB({
      vectorPath: 'chat_memory',
      model: this.model
    });
    
    // Conversation history (recent messages for immediate context)
    this.conversationHistory = [];
  }
  
  /**
   * Add a message to memory
   * @param {Object} message - Message object with role, content, and optional metadata
   * @returns {Promise<void>}
   */
  async addMessage(message) {
    try {
      // Create a standardized message object
      const standardMessage = {
        role: message.role,
        content: message.content,
        timestamp: message.timestamp || new Date().toISOString(),
        type: 'message',
        ...message.metadata
      };
      
      // Add to conversation history (recent messages)
      this.conversationHistory.push(standardMessage);
      
      // Keep history within limit
      if (this.conversationHistory.length > this.historySize) {
        this.conversationHistory.shift();
      }
      
      // Add to vector database for semantic search
      // Prepare data for EntityDB
      const memoryItem = {
        text: standardMessage.content,
        role: standardMessage.role,
        timestamp: standardMessage.timestamp,
        type: 'memory',
        metadata: { ...standardMessage }
      };
      
      // Insert into vector DB based on type
      if (this.binarize) {
        await this.db.insertBinary(memoryItem);
      } else {
        await this.db.insert(memoryItem);
      }
      
      return standardMessage;
    } catch (error) {
      console.error('Error adding message to memory:', error);
      throw error;
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
        results = await this.db.queryBinary(query, limit);
      } else {
        results = await this.db.query(query, limit);
      }
      
      // Format results for the LLM
      return results.map(item => ({
        role: item.role,
        content: item.text,
        timestamp: item.timestamp,
        relevance: item.score || item.similarity || 0
      }));
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
   * Format context into a messages array for the LLM
   * @param {Object} context - Context object from buildContext
   * @param {string} currentMessage - Current user message
   * @returns {Array} - Messages array for the LLM
   */
  formatContextMessages(context, currentMessage) {
    const messages = [];
    
    // Add system message with relevant memories if available
    if (context.relevantMemories && context.relevantMemories.length > 0) {
      let relevantMemoriesText = 'Here are some relevant memories from previous conversations that might help:\n';
      context.relevantMemories.forEach((memory, index) => {
        relevantMemoriesText += `${index + 1}. ${memory.role}: ${memory.content}\n`;
      });
      
      messages.push({
        role: 'system',
        content: relevantMemoriesText
      });
    }
    
    // Add recent conversation messages
    if (context.recentMessages && context.recentMessages.length > 0) {
      context.recentMessages.forEach(message => {
        messages.push({
          role: message.role,
          content: message.content
        });
      });
    }
    
    // Add current message
    if (currentMessage) {
      messages.push({
        role: 'user',
        content: currentMessage
      });
    }
    
    return messages;
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