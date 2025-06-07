export class HistoryService {
  constructor(config = {}) {
    this.storageKey = config.storageKey || 'chat-history';
    this.chatHistory = [];
    this.activeChat = null;
  }

  // Load history from localStorage
  loadHistory() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      this.chatHistory = saved
        ? JSON.parse(saved)
        : [{ id: 'default', name: 'New Chat', messages: [] }];
      this.activeChat = this.chatHistory.length > 0
        ? this.chatHistory[0].id
        : null;
    } catch (e) {
      console.error('Failed to load chat history:', e);
      this.chatHistory = [{ id: 'default', name: 'New Chat', messages: [] }];
      this.activeChat = this.chatHistory[0].id;
    }
  }

  // Persist history to localStorage
  saveHistory() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.chatHistory));
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  }

  // Get messages for a specific chat
  getMessages(chatId) {
    const chat = this.chatHistory.find(c => c.id === chatId);
    return chat ? [...chat.messages] : [];
  }

  // Update messages for the current active chat
  updateMessages(messages) {
    const chat = this.chatHistory.find(c => c.id === this.activeChat);
    if (chat) {
      chat.messages = [...messages];
      this.saveHistory();
    }
  }

  // Create and activate a new chat
  createNewChat() {
    // Persist current chat history
    this.saveHistory();

    const newChat = {
      id: `chat_${Date.now()}`,
      name: `Chat ${this.chatHistory.length + 1}`,
      messages: []
    };
    this.chatHistory.unshift(newChat);
    this.activeChat = newChat.id;

    this.saveHistory();
  }

  // Activate an existing chat
  loadChat(chatId) {
    const chat = this.chatHistory.find(c => c.id === chatId);
    if (chat) {
      this.activeChat = chatId;
    }
  }

  // Delete a chat and update activeChat
  deleteChat(chatId) {
    const idx = this.chatHistory.findIndex(c => c.id === chatId);
    if (idx !== -1) {
      this.chatHistory.splice(idx, 1);
      if (this.activeChat === chatId) {
        if (this.chatHistory.length > 0) {
          this.activeChat = this.chatHistory[0].id;
        } else {
          const newChat = { id: `chat_${Date.now()}`, name: 'New Chat', messages: [] };
          this.chatHistory.push(newChat);
          this.activeChat = newChat.id;
        }
      }
      this.saveHistory();
    }
  }
}