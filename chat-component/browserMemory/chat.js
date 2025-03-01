import { EntityDB } from './entity-db.js';

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const memoryPanel = document.getElementById('memoryPanel');
const memoryContent = document.getElementById('memoryContent');
const memoryStats = document.getElementById('memoryStats');
const toggleMemoryBtn = document.getElementById('toggleMemory');
const closeMemoryBtn = document.getElementById('closeMemory');
const settingsModal = document.getElementById('settingsModal');
const openSettingsBtn = document.getElementById('openSettings');
const closeSettingsBtn = document.getElementById('closeSettings');
const settingsForm = document.getElementById('settingsForm');
const cancelSettingsBtn = document.getElementById('cancelSettings');
const clearMemoryBtn = document.getElementById('clearMemoryBtn');

// Chat and memory configuration
let config = {
  botName: 'AI Assistant',
  userName: 'User',
  memorySize: 10,
  embeddingModel: 'Xenova/all-MiniLM-L6-v2',
  memoryType: 'standard',
  openaiApiKey: '',  // Will store the OpenAI API key
};

// Load config from localStorage if available
const savedConfig = localStorage.getItem('chatConfig');
if (savedConfig) {
  config = { ...config, ...JSON.parse(savedConfig) };
  
  // Update form fields with saved values
  document.getElementById('botName').value = config.botName;
  document.getElementById('userName').value = config.userName;
  document.getElementById('memorySize').value = config.memorySize;
  document.getElementById('embeddingModel').value = config.embeddingModel;
  document.getElementById('memoryType').value = config.memoryType;
  
  // Note: we don't pre-fill the API key field for security, but it's still in config
  if (config.openaiApiKey) {
    document.getElementById('openaiApiKey').placeholder = '••••••••••••••••••••••••••••••••';
  }
}

// Initialize the database
let memoryDb;
let conversationHistory = [];

// Initialize the chat
async function initChat() {
  try {
    // Add welcome message
    let welcomeMessage = `Hello! I'm ${config.botName}. How can I help you today?`;
    
    // Add API key message if not set
    if (!config.openaiApiKey) {
      welcomeMessage += " To use OpenAI's advanced responses, please click the settings icon and enter your API key.";
    }
    
    addBotMessage(welcomeMessage);
    
    // Initialize EntityDB
    memoryDb = new EntityDB({
      vectorPath: 'chat_memory_db',
      model: config.embeddingModel,
    });
    
    console.log('Memory database initialized with model:', config.embeddingModel);
    
    // Load memory items to display in the memory panel
    await refreshMemoryPanel();
  } catch (error) {
    console.error('Error initializing chat:', error);
    addBotMessage('I had trouble loading my memory. Some features may not work correctly.');
  }
}

// Update the memory panel with context information
function updateContextPanel(relevantMemories, recentMessages) {
  try {
    // Get counts for the stats section
    const recentCount = recentMessages ? recentMessages.split('\n').filter(line => line.trim()).length - 1 : 0;
    const relevantCount = relevantMemories.length;
    
    // Update the stats at the bottom
    document.getElementById('recentCount').textContent = recentCount;
    document.getElementById('relevantCount').textContent = relevantCount;
    
    // Clear current memory display
    memoryContent.innerHTML = '';
    
    if (relevantCount === 0 && recentCount === 0) {
      memoryContent.innerHTML = '<p>No context is currently being sent to the AI.</p>';
      return;
    }
    
    // Create section for system context (with relevant memories)
    if (relevantCount > 0) {
      const systemSection = document.createElement('div');
      systemSection.className = 'memory-item';
      systemSection.innerHTML = `
        <div class="memory-item-header">
          <span>System Context (Relevant Memories)</span>
        </div>
        <div class="memory-item-text" style="white-space: pre-line;">
          ${relevantMemories.map((memory, index) => 
            `${index + 1}. ${memory.speaker}: ${memory.text}`
          ).join('\n')}
        </div>
      `;
      memoryContent.appendChild(systemSection);
    }
    
    // Create section for recent conversation history
    if (recentMessages && recentMessages.trim()) {
      const historySection = document.createElement('div');
      historySection.className = 'memory-item';
      historySection.innerHTML = `
        <div class="memory-item-header">
          <span>Recent Conversation History</span>
        </div>
        <div class="memory-item-text" style="white-space: pre-line;">
          ${recentMessages.replace("Recent conversation:", "")}
        </div>
      `;
      memoryContent.appendChild(historySection);
    }
    
    // Add the current prompt section
    const promptSection = document.createElement('div');
    promptSection.className = 'memory-item';
    promptSection.innerHTML = `
      <div class="memory-item-header">
        <span>Current Format</span>
      </div>
      <div class="memory-item-text">
        <p><strong>System:</strong> You are ${config.botName}, a helpful AI assistant with memory...</p>
        <p><strong>User:</strong> [Recent conversation] + Current message</p>
      </div>
    `;
    memoryContent.appendChild(promptSection);
    
  } catch (error) {
    console.error('Error updating context panel:', error);
    memoryContent.innerHTML = '<p>Error displaying context information.</p>';
  }
}

// Load and display all memory items (for initial display only)
async function refreshMemoryPanel() {
  try {
    const allMemories = await memoryDb.getAll();
    
    // If there are no memories yet, show a message
    if (allMemories.length === 0) {
      memoryContent.innerHTML = '<p>No context has been sent to the AI yet. Send a message to see what context is used.</p>';
      document.getElementById('recentCount').textContent = '0';
      document.getElementById('relevantCount').textContent = '0';
      return;
    }
    
    // If there is conversation history, build the context display
    if (conversationHistory.length > 0) {
      // Build the recent messages string
      let recentMessages = "Recent conversation:\n";
      const recentCount = Math.min(5, conversationHistory.length);
      for (let i = conversationHistory.length - recentCount; i < conversationHistory.length; i++) {
        const msg = conversationHistory[i];
        recentMessages += `${msg.speaker}: ${msg.text}\n`;
      }
      
      // Get relevant memories for the last message
      const lastMessage = conversationHistory[conversationHistory.length - 1];
      const relevantMemories = await retrieveRelevantMemories(lastMessage.text);
      
      // Update the context panel with this information
      updateContextPanel(relevantMemories, recentMessages);
    } else {
      memoryContent.innerHTML = '<p>Send a message to see what context is sent to the AI.</p>';
      document.getElementById('recentCount').textContent = '0';
      document.getElementById('relevantCount').textContent = '0';
    }
    
  } catch (error) {
    console.error('Error loading memories for context panel:', error);
    memoryContent.innerHTML = '<p>Error loading context information.</p>';
  }
}

// Add message to memory database
async function addToMemory(text, speaker) {
  try {
    const memoryItem = {
      text,
      speaker,
      timestamp: Date.now()
    };
    
    // Store in memory DB based on selected memory type
    if (config.memoryType === 'binary') {
      await memoryDb.insertBinary({
        text: memoryItem.text,
        metadata: {
          speaker: memoryItem.speaker,
          timestamp: memoryItem.timestamp
        }
      });
    } else if (config.memoryType === 'binarySIMD') {
      // For SIMD we still use binary storage but will query with SIMD
      await memoryDb.insertBinary({
        text: memoryItem.text,
        metadata: {
          speaker: memoryItem.speaker,
          timestamp: memoryItem.timestamp
        }
      });
    } else {
      // Standard vector storage
      await memoryDb.insert({
        text: memoryItem.text,
        metadata: {
          speaker: memoryItem.speaker,
          timestamp: memoryItem.timestamp
        }
      });
    }
    
    // Add to conversation history (limited by memorySize)
    conversationHistory.push(memoryItem);
    if (conversationHistory.length > config.memorySize) {
      conversationHistory.shift();
    }
    
    // Refresh memory panel if it's open
    if (memoryPanel.classList.contains('active')) {
      await refreshMemoryPanel();
    }
    
  } catch (error) {
    console.error('Error adding to memory:', error);
  }
}

// Retrieve relevant memories based on current message
async function retrieveRelevantMemories(message) {
  try {
    let results;
    
    // Use the appropriate query method based on memoryType
    if (config.memoryType === 'binary') {
      results = await memoryDb.queryBinary(message, 5);
    } else if (config.memoryType === 'binarySIMD') {
      results = await memoryDb.queryBinarySIMD(message, 5);
    } else {
      results = await memoryDb.query(message, 5);
    }
    
    return results;
  } catch (error) {
    console.error('Error retrieving memories:', error);
    return [];
  }
}

// Generate AI response
async function generateResponse(userMessage) {
  // First, search memory for relevant context
  const relevantMemories = await retrieveRelevantMemories(userMessage);
  
  console.log('Retrieved relevant memories:', relevantMemories);
  
  // Check if we have an OpenAI API key
  if (!config.openaiApiKey) {
    // Prompt for API key if not available
    const apiKey = prompt(
      "Please enter your OpenAI API key to enable AI responses. " +
      "Your key will be stored locally in your browser and is only used for this demo.",
      ""
    );
    
    if (apiKey) {
      config.openaiApiKey = apiKey;
      localStorage.setItem('chatConfig', JSON.stringify(config));
    } else {
      // Fall back to rule-based responses if user cancels
      return generateFallbackResponse(userMessage, relevantMemories);
    }
  }
  
  try {
    // Format relevant memories for context
    let memoryContext = "";
    if (relevantMemories.length > 0) {
      memoryContext = "\nRelevant conversation history:\n";
      relevantMemories.forEach((memory, index) => {
        memoryContext += `${index + 1}. ${memory.speaker}: ${memory.text}\n`;
      });
    }
    
    // Format recent conversation history
    let recentMessages = "";
    if (conversationHistory.length > 0) {
      recentMessages = "\nRecent conversation:\n";
      // Get the last few messages (limited by memorySize)
      const recentCount = Math.min(5, conversationHistory.length);
      for (let i = conversationHistory.length - recentCount; i < conversationHistory.length; i++) {
        const msg = conversationHistory[i];
        recentMessages += `${msg.speaker}: ${msg.text}\n`;
      }
    }
    
    // Update the memory panel to show what's being sent to the AI
    if (memoryPanel.classList.contains('active')) {
      updateContextPanel(relevantMemories, recentMessages);
    }
    
    // Create the OpenAI API request
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: `You are ${config.botName}, a helpful AI assistant with memory.
                     You can recall previous conversations to provide more relevant answers.
                     Keep your responses conversational, helpful, and concise.
                     ${memoryContext}`
          },
          {
            role: 'user',
            content: `${recentMessages}\n\nCurrent message: ${userMessage}`
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      
      // If authentication error, reset the API key
      if (response.status === 401) {
        config.openaiApiKey = '';
        localStorage.setItem('chatConfig', JSON.stringify(config));
        throw new Error('Invalid API key. Please try again with a valid OpenAI API key.');
      }
      
      throw new Error(`API request failed: ${error.error?.message || 'Unknown error'}`);
    }
    
    const result = await response.json();
    return result.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // Handle various error cases
    if (error.message.includes('API key')) {
      return `I need a valid OpenAI API key to provide intelligent responses. ${error.message}`;
    }
    
    // Fall back to rule-based responses for other errors
    return `I encountered an error while generating a response: ${error.message}. Let me try a simpler response.
            \n\n${generateFallbackResponse(userMessage, relevantMemories)}`;
  }
}

// Generate a fallback response when API is unavailable
function generateFallbackResponse(userMessage, relevantMemories) {
  // Simple rule-based response logic as a fallback
  if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
    return `Hello! How can I help you today?`;
  } 
  else if (userMessage.toLowerCase().includes('who are you')) {
    return `I'm ${config.botName}, an AI assistant with memory capabilities powered by EntityDB. I can remember our conversations and use that context to provide better responses!`;
  }
  else if (userMessage.toLowerCase().includes('memory') || userMessage.toLowerCase().includes('remember')) {
    if (relevantMemories.length > 0) {
      return `I remember we talked about: "${relevantMemories[0].text}". Is there something specific about that you'd like to discuss?`;
    } else {
      return `I'm using my memory capabilities to store and recall our conversation. What would you like me to remember?`;
    }
  }
  else if (relevantMemories.length > 0) {
    // Use the most relevant memory to inform the response
    const topMemory = relevantMemories[0];
    if (topMemory.score > 0.7) {
      return `Based on our previous conversation about "${topMemory.text}", I think I can help with that. What specific aspect are you interested in?`;
    } else {
      return `I'm here to assist you with any questions or tasks you have. Can you provide more details about what you're looking for?`;
    }
  }
  else {
    const responses = [
      "I understand. What else would you like to know?",
      "That's interesting. Could you tell me more?",
      "I see. How else can I assist you today?",
      "Thanks for sharing that. Is there anything specific you'd like me to help with?",
      "Got it. What other questions do you have?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

// Add user message to chat
function addUserMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message user-message';
  
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  messageElement.innerHTML = `
    <div class="avatar user-avatar">${config.userName.charAt(0)}</div>
    <div class="message-content">
      <div class="message-text">${message}</div>
      <div class="message-time">${time}</div>
    </div>
  `;
  
  chatMessages.appendChild(messageElement);
  scrollToBottom();
}

// Add bot message to chat
function addBotMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message ai-message';
  
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  messageElement.innerHTML = `
    <div class="avatar ai-avatar">${config.botName.charAt(0)}</div>
    <div class="message-content">
      <div class="message-text">${message}</div>
      <div class="message-time">${time}</div>
    </div>
  `;
  
  chatMessages.appendChild(messageElement);
  scrollToBottom();
}

// Add "thinking" indicator
function addThinkingIndicator() {
  const thinkingElement = document.createElement('div');
  thinkingElement.className = 'message ai-message thinking-message';
  thinkingElement.id = 'thinkingIndicator';
  
  thinkingElement.innerHTML = `
    <div class="avatar ai-avatar">${config.botName.charAt(0)}</div>
    <div class="message-content thinking">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
  `;
  
  chatMessages.appendChild(thinkingElement);
  scrollToBottom();
}

// Remove thinking indicator
function removeThinkingIndicator() {
  const thinkingElement = document.getElementById('thinkingIndicator');
  if (thinkingElement) {
    thinkingElement.remove();
  }
}

// Scroll to the bottom of the chat
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle sending a message
async function handleSendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;
  
  // Clear input
  messageInput.value = '';
  messageInput.style.height = 'auto';
  
  // Add user message to chat
  addUserMessage(message);
  
  // Store in memory
  await addToMemory(message, config.userName);
  
  // Show thinking indicator
  addThinkingIndicator();
  
  try {
    // Generate response
    const response = await generateResponse(message);
    
    // Remove thinking indicator
    removeThinkingIndicator();
    
    // Add bot response
    addBotMessage(response);
    
    // Store bot response in memory
    await addToMemory(response, config.botName);
  } catch (error) {
    console.error('Error generating response:', error);
    removeThinkingIndicator();
    addBotMessage('I had trouble generating a response. Please try again.');
  }
}

// Event Listeners
sendButton.addEventListener('click', handleSendMessage);

messageInput.addEventListener('keypress', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSendMessage();
  }
});

messageInput.addEventListener('input', () => {
  // Adjust height of textarea based on content
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
  
  // Enable/disable send button based on input
  sendButton.disabled = messageInput.value.trim() === '';
});

// Memory panel toggle
toggleMemoryBtn.addEventListener('click', async () => {
  memoryPanel.classList.toggle('active');
  if (memoryPanel.classList.contains('active')) {
    await refreshMemoryPanel();
  }
});

closeMemoryBtn.addEventListener('click', () => {
  memoryPanel.classList.remove('active');
});

// Settings modal
openSettingsBtn.addEventListener('click', () => {
  settingsModal.classList.add('active');
});

function closeSettingsModal() {
  settingsModal.classList.remove('active');
}

closeSettingsBtn.addEventListener('click', closeSettingsModal);
cancelSettingsBtn.addEventListener('click', closeSettingsModal);

// Handle outside click on modal
settingsModal.addEventListener('click', event => {
  if (event.target === settingsModal) {
    closeSettingsModal();
  }
});

// Save settings
settingsForm.addEventListener('submit', async event => {
  event.preventDefault();
  
  const newConfig = {
    botName: document.getElementById('botName').value,
    userName: document.getElementById('userName').value,
    memorySize: parseInt(document.getElementById('memorySize').value, 10),
    embeddingModel: document.getElementById('embeddingModel').value,
    memoryType: document.getElementById('memoryType').value,
    openaiApiKey: document.getElementById('openaiApiKey').value || config.openaiApiKey,
  };
  
  // Check if embedding model changed
  const modelChanged = newConfig.embeddingModel !== config.embeddingModel;
  
  // Update config
  config = newConfig;
  
  // Save to localStorage
  localStorage.setItem('chatConfig', JSON.stringify(config));
  
  // Reinitialize DB if model changed
  if (modelChanged) {
    try {
      memoryDb = new EntityDB({
        vectorPath: 'chat_memory_db',
        model: config.embeddingModel,
      });
      console.log('Memory database reinitialized with new model:', config.embeddingModel);
    } catch (error) {
      console.error('Error reinitializing memory database:', error);
      addBotMessage('I had trouble updating my memory settings. Some features may not work correctly.');
    }
  }
  
  closeSettingsModal();
  
  // Update UI to reflect new names
  document.querySelectorAll('.user-avatar').forEach(avatar => {
    avatar.textContent = config.userName.charAt(0);
  });
  
  document.querySelectorAll('.ai-avatar').forEach(avatar => {
    avatar.textContent = config.botName.charAt(0);
  });
  
  addBotMessage(`Settings updated. I'll now remember up to ${config.memorySize} messages using the ${config.memoryType} memory type.`);
});

// Clear memory
clearMemoryBtn.addEventListener('click', async () => {
  try {
    // Clear the database
    await memoryDb.clear();
    
    // Refresh memory panel
    await refreshMemoryPanel();
    
    // Reset conversation history
    conversationHistory = [];
    
    alert('Memory database cleared successfully.');
  } catch (error) {
    console.error('Error clearing memory:', error);
    alert('Error clearing memory database.');
  }
});

// Initialize the chat when the page loads
initChat();