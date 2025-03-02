import { joinRoom } from 'https://esm.run/trystero@0.20.1';

export class ChatInterface extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // State
    this._activeGroup = '';
    this._messages = {};
    this._username = 'User_' + Math.floor(Math.random() * 10000);
    this._userColor = this._generateUserColor();
    this._room = null;
    this._sendMessage = null;
    this._getMessage = null;
    this._peers = {};
    this._isTyping = {};
    this._typingTimeout = null;
    this._initialized = false;
    this._sendTypingStatus = () => {}; // Initialize with empty function
    
    // User profile information
    this._userProfile = {
      displayName: this._username,
      status: 'Available',
      bio: '',
      email: '',
      avatar: this._userColor,
      customFields: {}
    };
    
    // Bind methods
    this._handleMessageSubmit = this._handleMessageSubmit.bind(this);
    this._handleUserTyping = this._handleUserTyping.bind(this);
    this._handlePeerJoin = this._handlePeerJoin.bind(this);
    this._handlePeerLeave = this._handlePeerLeave.bind(this);
    this._handleMessage = this._handleMessage.bind(this);
    this._handleTypingStatus = this._handleTypingStatus.bind(this);
    this._handleEditProfile = this._handleEditProfile.bind(this);
  }

  static get observedAttributes() {
    return ['active-group', 'username'];
  }

  connectedCallback() {
    // Initialize the component structure
    this._render();
    this._initialized = true;
    
    // Wait for the next tick to ensure DOM is ready
    setTimeout(() => {
      // Initialize with current active group
      if (this._activeGroup) {
        this._setupChatUI();
        this._setupTrystero(this._activeGroup);
      }
    }, 0);
  }

  disconnectedCallback() {
    // Remove event listeners
    this._removeEventListeners();
    
    // Clean up Trystero room
    if (this._room) {
      this._room = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'active-group' && oldValue !== newValue) {
      console.log('Chat interface active group changed to:', newValue);
      this._activeGroup = newValue;
      
      // Only update UI if component is initialized
      if (this._initialized) {
        // Use a small timeout to ensure DOM is ready
        setTimeout(() => {
          this._switchGroup(newValue);
        }, 0);
      }
    }
    
    if (name === 'username' && oldValue !== newValue) {
      this._username = newValue;
      this._userProfile.displayName = newValue;
      
      // Update the UI and broadcast the change
      this._updatePeersList();
      this._broadcastProfileUpdate();
    }
  }

  _render() {
    // Add the initial HTML structure
    this.shadowRoot.innerHTML = `
      <style>
        /* Form styles for profile editing */
        .form-group {
          margin-bottom: 1.25rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          font-size: 0.875rem;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border-radius: var(--border-radius, 8px);
          border: 1px solid var(--panel-border, #e5e7eb);
          font-family: inherit;
          font-size: 0.9375rem;
          background-color: white;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--primary-color, #6366f1);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }
        
        .form-group textarea {
          min-height: 100px;
          resize: vertical;
        }
        
        .color-picker .color-options {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        
        .color-option {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          cursor: pointer;
          position: relative;
          transition: transform 0.2s;
        }
        
        .color-option:hover {
          transform: scale(1.1);
        }
        
        .color-option.active::after {
          content: "✓";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-weight: bold;
          text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
        }
        
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }
        
        .save-button {
          background-color: var(--primary-color, #6366f1);
          color: white;
          border: none;
          border-radius: var(--border-radius, 8px);
          padding: 0.75rem 1.25rem;
          font-weight: 500;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .save-button:hover {
          background-color: var(--primary-hover, #4f46e5);
        }
        
        .cancel-button {
          background-color: transparent;
          color: var(--text-color, #1f2937);
          border: 1px solid var(--panel-border, #e5e7eb);
          border-radius: var(--border-radius, 8px);
          padding: 0.75rem 1.25rem;
          font-weight: 500;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .cancel-button:hover {
          background-color: var(--item-hover, #f9fafb);
        }
        
        .edit-profile-btn {
          background-color: var(--item-hover, #f9fafb);
          color: var(--primary-color, #6366f1);
          border: 1px solid var(--panel-border, #e5e7eb);
          border-radius: var(--border-radius, 8px);
          padding: 0.5rem 0.75rem;
          font-weight: 500;
          font-size: 0.8125rem;
          cursor: pointer;
          margin-top: 0.5rem;
          margin-bottom: 1rem;
          transition: background-color 0.2s;
        }
        
        .edit-profile-btn:hover {
          background-color: var(--selection, #e0e7ff);
        }
        
        .edit-profile-button {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: var(--text-light, #6b7280);
          background-color: transparent;
          transition: background-color 0.2s;
          cursor: pointer;
        }
        
        .edit-profile-button:hover {
          background-color: rgba(0, 0, 0, 0.05);
          color: var(--primary-color, #6366f1);
        }
        
        /* Modal styles for peer details */
        .peer-details-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fade-in 0.3s ease-out;
        }
        
        .peer-details-content {
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          animation: slide-up 0.3s ease-out;
        }
        
        .peer-details-header {
          padding: 1.25rem;
          border-bottom: 1px solid var(--panel-border, #e5e7eb);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .peer-details-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: var(--text-color, #1f2937);
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--text-light, #6b7280);
          padding: 0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }
        
        .close-button:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        
        .peer-details-body {
          padding: 1.5rem;
        }
        
        .user-profile {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          margin-bottom: 2rem;
        }
        
        .large-avatar {
          width: 70px;
          height: 70px;
          border-radius: 12px;
          background-color: var(--primary-color, #6366f1);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 2rem;
          flex-shrink: 0;
        }
        
        .user-info {
          flex: 1;
        }
        
        .user-info h4 {
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
          color: var(--text-color, #1f2937);
        }
        
        .user-meta {
          color: var(--text-light, #6b7280);
          font-size: 0.875rem;
          line-height: 1.6;
        }
        
        .network-info {
          background-color: var(--item-hover, #f9fafb);
          padding: 1.25rem;
          border-radius: 8px;
        }
        
        .network-info h4 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
          color: var(--text-color, #1f2937);
        }
        
        .info-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        
        .info-table td {
          padding: 0.5rem;
          border-bottom: 1px solid var(--panel-border, #e5e7eb);
        }
        
        .info-table tr:last-child td {
          border-bottom: none;
        }
        
        .info-table td:first-child {
          font-weight: 500;
          width: 35%;
          color: var(--text-color, #1f2937);
        }
        
        .info-table td:last-child {
          color: var(--text-light, #6b7280);
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-up {
          from { transform: translateY(20px); }
          to { transform: translateY(0); }
        }
        
        .chat-container {
          background-color: var(--panel-bg, #ffffff);
          border-radius: var(--border-radius, 8px);
          border: 1px solid var(--panel-border, #e5e7eb);
          overflow: hidden;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .chat-header {
          padding: 1.25rem;
          border-bottom: 1px solid var(--panel-border, #e5e7eb);
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .group-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background-color: var(--primary-color, #6366f1);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 1.25rem;
        }
        
        .chat-info {
          flex: 1;
        }
        
        .group-name {
          font-weight: 600;
          font-size: 1.125rem;
          margin-bottom: 0.25rem;
        }
        
        .typing-indicator {
          font-size: 0.875rem;
          color: var(--text-light, #6b7280);
          height: 18px; /* Fixed height to prevent layout shift */
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        .typing-indicator.visible {
          opacity: 1;
        }
        
        .chat-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        
        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .peers-sidebar {
          width: 250px;
          border-left: 1px solid var(--panel-border, #e5e7eb);
          display: flex;
          flex-direction: column;
          background-color: var(--item-hover, #f9fafb);
        }
        
        .peers-header {
          padding: 1.25rem;
          font-weight: 600;
          font-size: 0.9375rem;
          color: var(--text-color, #1f2937);
          border-bottom: 1px solid var(--panel-border, #e5e7eb);
        }
        
        .peers-list {
          flex: 1;
          overflow-y: auto;
          padding: 0.75rem;
        }
        
        .peer-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: var(--border-radius, 8px);
          margin-bottom: 0.5rem;
          transition: background-color var(--transition-speed, 0.2s);
        }
        
        .peer-item:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        
        .peer-item.self {
          background-color: rgba(99, 102, 241, 0.08);
        }
        
        .peer-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
          color: white;
          flex-shrink: 0;
        }
        
        .peer-info {
          flex: 1;
          overflow: hidden;
        }
        
        .peer-name {
          font-weight: 500;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .peer-status {
          font-size: 0.75rem;
          color: var(--text-light, #6b7280);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .peer-status::before {
          content: "";
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #10b981;
        }
        
        .message {
          display: flex;
          gap: 0.75rem;
          max-width: 80%;
          animation: message-appear 0.3s ease-out;
        }
        
        .message.outgoing {
          align-self: flex-end;
          flex-direction: row-reverse;
        }
        
        .message.system {
          align-self: center;
          max-width: 90%;
          margin: 0.5rem 0;
        }
        
        .system-message {
          background-color: rgba(0, 0, 0, 0.05);
          padding: 0.5rem 1rem;
          border-radius: 16px;
          font-size: 0.8125rem;
          color: var(--text-light, #6b7280);
          text-align: center;
        }
        
        .system-text {
          margin-left: 0.5rem;
          font-style: italic;
        }
        
        .message-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
          color: white;
          flex-shrink: 0;
        }
        
        .message-content {
          display: flex;
          flex-direction: column;
        }
        
        .message-header {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }
        
        .message-username {
          font-weight: 600;
          font-size: 0.875rem;
        }
        
        .message-time {
          font-size: 0.75rem;
          color: var(--text-light, #6b7280);
        }
        
        .message-bubble {
          background-color: #f3f4f6;
          padding: 0.75rem 1rem;
          border-radius: 16px;
          border-top-left-radius: 0;
          font-size: 0.9375rem;
          color: var(--text-color, #1f2937);
          line-height: 1.5;
          position: relative;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        
        .message.outgoing .message-bubble {
          background-color: var(--primary-color, #6366f1);
          color: white;
          border-top-left-radius: 16px;
          border-top-right-radius: 0;
        }
        
        .input-container {
          padding: 1.25rem;
          border-top: 1px solid var(--panel-border, #e5e7eb);
        }
        
        form {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }
        
        input {
          flex: 1;
          padding: 0.75rem 1rem;
          border-radius: var(--border-radius, 8px);
          border: 1px solid var(--panel-border, #e5e7eb);
          font-family: inherit;
          font-size: 0.9375rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        input:focus {
          border-color: var(--primary-color, #6366f1);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }
        
        button {
          background-color: var(--primary-color, #6366f1);
          color: white;
          border: none;
          border-radius: var(--border-radius, 8px);
          padding: 0.75rem 1.25rem;
          font-weight: 500;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        button:hover {
          background-color: var(--primary-hover, #4f46e5);
        }
        
        button svg {
          width: 18px;
          height: 18px;
        }
        
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-light, #6b7280);
          padding: 2rem;
          text-align: center;
          gap: 1rem;
        }
        
        .empty-icon {
          font-size: 4rem;
          color: var(--primary-color, #6366f1);
          opacity: 0.7;
        }
        
        .empty-text {
          font-size: 1.125rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        
        .empty-subtext {
          font-size: 0.9375rem;
        }
        
        @keyframes message-appear {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes typing-pulse {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
        
        .dot {
          display: inline-block;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background-color: currentColor;
          margin: 0 1px;
          animation: typing-pulse 1.5s infinite;
        }
        
        .dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @media (max-width: 768px) {
          .peers-sidebar {
            display: none;
          }
        }
      </style>
      <div class="chat-container">
        <div class="empty-state">
          <div class="empty-icon">💬</div>
          <div class="empty-text">Select a group to start chatting</div>
          <div class="empty-subtext">Choose a group from the panel on the left</div>
        </div>
      </div>
    `;
  }

  _setupChatUI() {
    console.log('Setting up chat UI for group:', this._activeGroup);
    
    const container = this.shadowRoot.querySelector('.chat-container');
    if (!container) {
      console.error('Chat container element not found');
      return;
    }
    
    // Set up the chat interface
    container.innerHTML = `
      <div class="chat-header">
        <div class="group-icon">${this._getGroupInitials(this._activeGroup)}</div>
        <div class="chat-info">
          <div class="group-name">${this._activeGroup}</div>
          <div class="typing-indicator"></div>
        </div>
      </div>
      
      <div class="chat-content">
        <div class="messages-container"></div>
        
        <div class="peers-sidebar">
          <div class="peers-header">Connected Users (1)</div>
          <div class="peers-list"></div>
        </div>
      </div>
      
      <div class="input-container">
        <form>
          <input type="text" placeholder="Type a message..." autocomplete="off">
          <button type="submit">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </form>
      </div>
    `;
    
    // Add event listeners
    this._addEventListeners();
    
    // Add a welcome message if there are no messages
    if (!this._messages[this._activeGroup] || this._messages[this._activeGroup].length === 0) {
      const welcomeMessage = {
        id: 'welcome-' + Date.now(),
        text: `Welcome to the ${this._activeGroup} group! Start chatting by typing a message below.`,
        sender: 'System',
        color: '#10b981',
        timestamp: Date.now()
      };
      
      if (!this._messages[this._activeGroup]) {
        this._messages[this._activeGroup] = [];
      }
      
      this._messages[this._activeGroup].push(welcomeMessage);
    }
    
    // Load existing messages for this group
    this._displayMessages();
    
    // Initialize peers list
    this._updatePeersList();
  }
  
  _addEventListeners() {
    const form = this.shadowRoot.querySelector('form');
    if (form) {
      form.addEventListener('submit', this._handleMessageSubmit);
    }
    
    const input = this.shadowRoot.querySelector('input');
    if (input) {
      input.addEventListener('input', this._handleUserTyping);
    }
  }
  
  _removeEventListeners() {
    const form = this.shadowRoot.querySelector('form');
    if (form) {
      form.removeEventListener('submit', this._handleMessageSubmit);
    }
    
    const input = this.shadowRoot.querySelector('input');
    if (input) {
      input.removeEventListener('input', this._handleUserTyping);
    }
  }

  _switchGroup(groupId) {
    const oldGroup = this._activeGroup;
    this._activeGroup = groupId;
    
    // If we're already connected to a Trystero room, leave it
    if (this._room && oldGroup) {
      // Trystero doesn't have a built-in leave method, so we'll just clean up
      this._room = null;
    }
    
    // Remove old event listeners
    this._removeEventListeners();
    
    // Set up new chat UI
    this._setupChatUI();
    
    // Connect to the new Trystero room
    if (groupId) {
      this._setupTrystero(groupId);
    }
  }

  _setupTrystero(groupId) {
    try {
      // Initialize Trystero room with torrent strategy for better reliability
      const config = { 
        appId: 'messaging-components-demo',
        // Force torrent strategy which is more reliable for demos
        //rtcConfig: {
          //iceServers: [
            //{ urls: 'stun:stun.l.google.com:19302' },
            //{ urls: 'stun:global.stun.twilio.com:3478' }
          //]
        //}
      };
      
      this._room = joinRoom(config, `chat-${groupId}`);
      
      // Set up actions
      [this._sendMessage, this._getMessage] = this._room.makeAction('message');
      
      // Set up typing indicators
      const [sendTyping, getTyping] = this._room.makeAction('typing');
      this._sendTypingStatus = sendTyping;
      
      // Listen for peers joining and leaving
      this._room.onPeerJoin(this._handlePeerJoin);
      this._room.onPeerLeave(this._handlePeerLeave);
      
      // Listen for messages and typing indicators
      this._getMessage(this._handleMessage);
      getTyping(this._handleTypingStatus);
      
      // Initialize messages array for this group if it doesn't exist
      if (!this._messages[groupId]) {
        this._messages[groupId] = [];
      }
    } catch (error) {
      console.error('Failed to initialize Trystero:', error);
    }
  }

  _handleMessageSubmit(event) {
    event.preventDefault();
    
    const input = this.shadowRoot.querySelector('input');
    const message = input.value.trim();
    
    if (!message || !this._activeGroup || !this._room) return;
    
    // Clear the input
    input.value = '';
    
    // Create message object
    const messageObj = {
      id: Date.now().toString(),
      text: message,
      sender: this._username,
      color: this._userColor,
      timestamp: Date.now()
    };
    
    // Add to local messages
    this._addMessage(messageObj, true);
    
    // Send to peers
    if (this._sendMessage) {
      this._sendMessage(messageObj);
    }
    
    // Send stop typing status
    if (this._sendTypingStatus) {
      this._sendTypingStatus(false);
    }
    
    // Focus back on input
    input.focus();
  }

  _handleUserTyping() {
    if (!this._activeGroup || !this._room || !this._sendTypingStatus) return;
    
    // Send typing status directly - we don't need throttling for this demo
    this._sendTypingStatus(true);
    
    // Clear the typing status after a delay
    clearTimeout(this._typingTimeout);
    this._typingTimeout = setTimeout(() => {
      if (this._sendTypingStatus) {
        this._sendTypingStatus(false);
      }
    }, 2000);
  }

  _handlePeerJoin(peerId) {
    // Gather network information if available
    const networkInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      connectionType: navigator.connection ? navigator.connection.effectiveType : 'unknown',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      time: new Date().toLocaleTimeString()
    };
    
    this._peers[peerId] = {
      id: peerId,
      joinedAt: Date.now(),
      lastActive: Date.now(),
      network: networkInfo,
      messages: 0
    };
    
    // Send our own info to the new peer
    this._broadcastProfileUpdate(peerId);
    
    this._updatePeersList();
    
    // Show a system message that a peer joined
    this._addSystemMessage(`A new user (${peerId.substring(0, 6)}) has joined the chat.`);
  }
  
  _broadcastProfileUpdate(specificPeerId = null) {
    if (this._room && this._sendMessage) {
      try {
        // Gather network information
        const networkInfo = {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          connectionType: navigator.connection ? navigator.connection.effectiveType : 'unknown',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          time: new Date().toLocaleTimeString()
        };
        
        // Create profile info message
        const profileInfo = {
          type: 'peer-info',
          peerId: specificPeerId, // If null, will be sent to all peers
          userId: this._username,
          displayName: this._userProfile.displayName,
          status: this._userProfile.status,
          bio: this._userProfile.bio,
          email: this._userProfile.email,
          avatar: this._userColor,
          network: networkInfo
        };
        
        // Send to peers
        this._sendMessage(profileInfo);
      } catch (error) {
        console.error('Failed to send profile update:', error);
      }
    }
  }

  _handlePeerLeave(peerId) {
    // Show a system message that a peer left
    if (this._peers[peerId]) {
      this._addSystemMessage(`User (${peerId.substring(0, 6)}) has left the chat.`);
    }
    
    delete this._peers[peerId];
    delete this._isTyping[peerId];
    this._updateTypingIndicator();
    this._updatePeersList();
  }
  
  _updatePeersList() {
    const peersList = this.shadowRoot.querySelector('.peers-list');
    if (!peersList) return;
    
    const peerCount = Object.keys(this._peers).length;
    const peersHeader = this.shadowRoot.querySelector('.peers-header');
    
    if (peersHeader) {
      peersHeader.textContent = `Connected Users (${peerCount + 1})`; // +1 for self
    }
    
    // Clear and rebuild the list
    peersList.innerHTML = '';
    
    // Self network info
    const selfNetworkInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      connectionType: navigator.connection ? navigator.connection.effectiveType : 'unknown',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      time: new Date().toLocaleTimeString()
    };
    
    // Add self first
    const selfPeer = document.createElement('div');
    selfPeer.className = 'peer-item self';
    selfPeer.dataset.id = 'self';
    
    // Get initials from display name or username
    const displayName = this._userProfile.displayName || this._username;
    const initials = displayName.substring(0, 2).toUpperCase();
    
    selfPeer.innerHTML = `
      <div class="peer-avatar" style="background-color: ${this._userColor}">
        ${initials}
      </div>
      <div class="peer-info">
        <div class="peer-name">${displayName} (You)</div>
        <div class="peer-status">${this._userProfile.status || 'Online'}</div>
      </div>
      <div class="edit-profile-button" title="Edit your profile">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </div>
    `;
    
    // Add click event for details
    selfPeer.addEventListener('click', (e) => {
      // Check if the click was on the edit button
      if (e.target.closest('.edit-profile-button')) {
        this._showEditProfileModal();
      } else {
        this._showPeerDetails('self', {
          id: 'self',
          username: this._username,
          displayName: this._userProfile.displayName,
          status: this._userProfile.status,
          bio: this._userProfile.bio,
          email: this._userProfile.email,
          network: selfNetworkInfo,
          joinedAt: Date.now(), // Just use current time for self
          messages: this._messages[this._activeGroup] ? 
            this._messages[this._activeGroup].filter(m => m.sender === this._username).length : 0
        });
      }
    });
    
    peersList.appendChild(selfPeer);
    
    // Add other peers
    Object.values(this._peers).forEach(peer => {
      const peerItem = document.createElement('div');
      peerItem.className = 'peer-item';
      peerItem.dataset.id = peer.id;
      
      // Generate a deterministic color based on peer ID
      const peerColor = this._generateDeterministicColor(peer.id);
      const displayName = peer.username || `User ${peer.id.substring(0, 6)}`;
      const initials = displayName.substring(0, 2).toUpperCase();
      
      // Calculate time since last active
      const lastActive = peer.lastActive ? this._formatTimeSince(peer.lastActive) : 'Just now';
      
      peerItem.innerHTML = `
        <div class="peer-avatar" style="background-color: ${peerColor}">
          ${initials}
        </div>
        <div class="peer-info">
          <div class="peer-name">${displayName}</div>
          <div class="peer-status">
            <span class="status-dot"></span>
            Active ${lastActive}
          </div>
        </div>
      `;
      
      // Add click event for details
      peerItem.addEventListener('click', () => {
        this._showPeerDetails(peer.id, peer);
      });
      
      peersList.appendChild(peerItem);
    });
  }
  
  _showPeerDetails(peerId, peerData) {
    // Create modal for showing peer details
    const modal = document.createElement('div');
    modal.className = 'peer-details-modal';
    
    // Format join time
    const joinTime = new Date(peerData.joinedAt).toLocaleString();
    
    // Format last active time
    const lastActive = peerData.lastActive ? 
      new Date(peerData.lastActive).toLocaleString() : 
      'Now';
    
    const networkInfo = peerData.network || {};
    
    // User title and avatar
    const userColor = peerId === 'self' ? this._userColor : this._generateDeterministicColor(peerId);
    const displayName = peerData.displayName || peerData.username || `User ${peerId.substring(0, 6)}`;
    
    // Create edit button for self profile
    const editButton = peerId === 'self' ? 
      `<button class="edit-profile-btn">Edit Profile</button>` : '';
    
    modal.innerHTML = `
      <div class="peer-details-content">
        <div class="peer-details-header">
          <button class="close-button">&times;</button>
          <h3>User Details</h3>
        </div>
        
        <div class="peer-details-body">
          <div class="user-profile">
            <div class="large-avatar" style="background-color: ${userColor}">
              ${displayName.substring(0, 2).toUpperCase()}
            </div>
            <div class="user-info">
              <h4>${displayName}${peerId === 'self' ? ' (You)' : ''}</h4>
              ${editButton}
              <div class="user-meta">
                ${peerData.status ? `<div>Status: ${peerData.status}</div>` : ''}
                ${peerData.bio ? `<div>Bio: ${peerData.bio}</div>` : ''}
                ${peerData.email ? `<div>Email: ${peerData.email}</div>` : ''}
                <div>User ID: ${peerId === 'self' ? 'You' : peerId.substring(0, 10) + '...'}</div>
                <div>Joined: ${joinTime}</div>
                <div>Last active: ${lastActive}</div>
                <div>Messages sent: ${peerData.messages || 0}</div>
              </div>
            </div>
          </div>
          
          <div class="network-info">
            <h4>Network Information</h4>
            <table class="info-table">
              <tr>
                <td>Device:</td>
                <td>${networkInfo.platform || 'Unknown'}</td>
              </tr>
              <tr>
                <td>Browser:</td>
                <td>${this._formatUserAgent(networkInfo.userAgent || 'Unknown')}</td>
              </tr>
              <tr>
                <td>Language:</td>
                <td>${networkInfo.language || 'Unknown'}</td>
              </tr>
              <tr>
                <td>Connection:</td>
                <td>${networkInfo.connectionType || 'Unknown'}</td>
              </tr>
              <tr>
                <td>Time Zone:</td>
                <td>${networkInfo.timeZone || 'Unknown'}</td>
              </tr>
              <tr>
                <td>Local Time:</td>
                <td>${networkInfo.time || 'Unknown'}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    `;
    
    // Add event listener to close button
    const closeButton = modal.querySelector('.close-button');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    }
    
    // Add event listener to edit button
    const editBtn = modal.querySelector('.edit-profile-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        this._showEditProfileModal();
      });
    }
    
    // Close when clicking outside the modal
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        document.body.removeChild(modal);
      }
    });
    
    document.body.appendChild(modal);
  }
  
  _showEditProfileModal() {
    // Create modal for editing profile
    const modal = document.createElement('div');
    modal.className = 'peer-details-modal';
    
    modal.innerHTML = `
      <div class="peer-details-content">
        <div class="peer-details-header">
          <button class="close-button">&times;</button>
          <h3>Edit Your Profile</h3>
        </div>
        
        <div class="peer-details-body">
          <form class="edit-profile-form">
            <div class="form-group">
              <label for="display-name">Display Name</label>
              <input type="text" id="display-name" value="${this._userProfile.displayName || this._username}" placeholder="Your display name">
            </div>
            
            <div class="form-group">
              <label for="status">Status</label>
              <select id="status">
                <option value="Available" ${this._userProfile.status === 'Available' ? 'selected' : ''}>Available</option>
                <option value="Away" ${this._userProfile.status === 'Away' ? 'selected' : ''}>Away</option>
                <option value="Busy" ${this._userProfile.status === 'Busy' ? 'selected' : ''}>Busy</option>
                <option value="Do Not Disturb" ${this._userProfile.status === 'Do Not Disturb' ? 'selected' : ''}>Do Not Disturb</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="bio">Bio</label>
              <textarea id="bio" placeholder="Tell others about yourself">${this._userProfile.bio || ''}</textarea>
            </div>
            
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" value="${this._userProfile.email || ''}" placeholder="Your email address">
            </div>
            
            <div class="form-group color-picker">
              <label>Avatar Color</label>
              <div class="color-options">
                <div class="color-option" style="background-color: #3B82F6" data-color="#3B82F6"></div>
                <div class="color-option" style="background-color: #F59E0B" data-color="#F59E0B"></div>
                <div class="color-option" style="background-color: #10B981" data-color="#10B981"></div>
                <div class="color-option" style="background-color: #8B5CF6" data-color="#8B5CF6"></div>
                <div class="color-option" style="background-color: #EC4899" data-color="#EC4899"></div>
                <div class="color-option" style="background-color: #EF4444" data-color="#EF4444"></div>
                <div class="color-option" style="background-color: #6366F1" data-color="#6366F1"></div>
                <div class="color-option" style="background-color: #14B8A6" data-color="#14B8A6"></div>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="save-button">Save Changes</button>
              <button type="button" class="cancel-button">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Add event listener to close button
    const closeButton = modal.querySelector('.close-button');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    }
    
    // Add event listeners to color options
    const colorOptions = modal.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
      // Set active on the current color
      if (option.dataset.color === this._userColor) {
        option.classList.add('active');
      }
      
      option.addEventListener('click', () => {
        // Remove active class from all options
        colorOptions.forEach(o => o.classList.remove('active'));
        // Add active class to the clicked option
        option.classList.add('active');
      });
    });
    
    // Add event listener to form submission
    const form = modal.querySelector('.edit-profile-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form values
        const displayName = modal.querySelector('#display-name').value;
        const status = modal.querySelector('#status').value;
        const bio = modal.querySelector('#bio').value;
        const email = modal.querySelector('#email').value;
        const activeColor = modal.querySelector('.color-option.active');
        const color = activeColor ? activeColor.dataset.color : this._userColor;
        
        // Update profile
        this._userProfile.displayName = displayName;
        this._userProfile.status = status;
        this._userProfile.bio = bio;
        this._userProfile.email = email;
        this._userColor = color;
        
        // Update UI
        this._updatePeersList();
        
        // Broadcast profile update
        this._broadcastProfileUpdate();
        
        // Show system message about profile update
        this._addSystemMessage('You updated your profile. Other users will see your changes.');
        
        // Close modal
        document.body.removeChild(modal);
      });
    }
    
    // Add event listener to cancel button
    const cancelButton = modal.querySelector('.cancel-button');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    }
    
    // Close when clicking outside the modal
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        document.body.removeChild(modal);
      }
    });
    
    document.body.appendChild(modal);
  }
  
  // Method for updating profile publicly
  _handleEditProfile() {
    this._showEditProfileModal();
  }
  
  _formatTimeSince(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
  
  _formatUserAgent(userAgent) {
    if (!userAgent) return 'Unknown';
    
    // Simplify user agent string
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('MSIE') || userAgent.includes('Trident')) return 'Internet Explorer';
    
    return 'Other Browser';
  }
  
  _addSystemMessage(text) {
    if (!this._activeGroup) return;
    
    // Create system message
    const messageObj = {
      id: 'system-' + Date.now(),
      text: text,
      sender: 'System',
      color: '#6b7280', // Gray color for system messages
      timestamp: Date.now(),
      isSystem: true
    };
    
    // Add to messages store
    if (!this._messages[this._activeGroup]) {
      this._messages[this._activeGroup] = [];
    }
    
    this._messages[this._activeGroup].push(messageObj);
    
    // Add to DOM if we're in the active group
    const messagesContainer = this.shadowRoot.querySelector('.messages-container');
    if (!messagesContainer) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = 'message system';
    messageEl.dataset.id = messageObj.id;
    
    messageEl.innerHTML = `
      <div class="system-message">
        <span class="message-time">${this._formatTime(messageObj.timestamp)}</span>
        <span class="system-text">${messageObj.text}</span>
      </div>
    `;
    
    messagesContainer.appendChild(messageEl);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  _generateDeterministicColor(str) {
    // Simple hash function to generate a color
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert to RGB values between 30-220 (not too light or dark)
    const r = (hash & 0xFF) % 190 + 30;
    const g = ((hash >> 8) & 0xFF) % 190 + 30;
    const b = ((hash >> 16) & 0xFF) % 190 + 30;
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  _handleMessage(messageObj, peerId) {
    // Only process messages for the active group
    if (!this._activeGroup) return;
    
    // Handle special message types
    if (messageObj.type === 'peer-info') {
      // Update peer information if we have this peer
      if (this._peers[peerId]) {
        // Update all profile information
        this._peers[peerId].username = messageObj.userId;
        this._peers[peerId].displayName = messageObj.displayName;
        this._peers[peerId].status = messageObj.status;
        this._peers[peerId].bio = messageObj.bio;
        this._peers[peerId].email = messageObj.email;
        this._peers[peerId].avatar = messageObj.avatar;
        this._peers[peerId].network = messageObj.network;
        this._peers[peerId].lastActive = Date.now();
        
        this._updatePeersList();
        
        // If it's the first time we're getting this info, show a system message with the display name
        if (messageObj.displayName && !this._peers[peerId].displayNameShown) {
          this._peers[peerId].displayNameShown = true;
          this._addSystemMessage(`User ${peerId.substring(0, 6)} is known as ${messageObj.displayName}`);
        }
      }
      return;
    }
    
    // Update peer activity
    if (this._peers[peerId]) {
      this._peers[peerId].lastActive = Date.now();
      this._peers[peerId].messages = (this._peers[peerId].messages || 0) + 1;
      this._updatePeersList();
    }
    
    this._addMessage(messageObj, false);
    
    // Dispatch event for potential notification
    this.dispatchEvent(new CustomEvent('new-message', {
      detail: { 
        groupId: this._activeGroup,
        message: messageObj
      },
      bubbles: true,
      composed: true
    }));
  }

  _handleTypingStatus(isTyping, peerId) {
    this._isTyping[peerId] = isTyping;
    this._updateTypingIndicator();
  }

  _updateTypingIndicator() {
    const typingUsers = Object.entries(this._isTyping)
      .filter(([_, isTyping]) => isTyping)
      .map(([peerId]) => peerId);
    
    const indicator = this.shadowRoot.querySelector('.typing-indicator');
    if (!indicator) return;
    
    if (typingUsers.length > 0) {
      indicator.innerHTML = `
        Someone is typing
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      `;
      indicator.classList.add('visible');
    } else {
      indicator.innerHTML = '';
      indicator.classList.remove('visible');
    }
  }

  _addMessage(messageObj, isOutgoing) {
    if (!this._activeGroup) return;
    
    // Add to messages store
    if (!this._messages[this._activeGroup]) {
      this._messages[this._activeGroup] = [];
    }
    
    this._messages[this._activeGroup].push(messageObj);
    
    // Add to DOM
    const messagesContainer = this.shadowRoot.querySelector('.messages-container');
    if (!messagesContainer) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = `message ${isOutgoing ? 'outgoing' : ''}`;
    messageEl.dataset.id = messageObj.id;
    
    const initials = messageObj.sender.substring(0, 2).toUpperCase();
    const avatarColor = messageObj.color || this._generateUserColor();
    
    messageEl.innerHTML = `
      <div class="message-avatar" style="background-color: ${avatarColor}">
        ${initials}
      </div>
      <div class="message-content">
        <div class="message-header">
          <span class="message-username">${messageObj.sender}</span>
          <span class="message-time">${this._formatTime(messageObj.timestamp)}</span>
        </div>
        <div class="message-bubble">${this._formatMessageText(messageObj.text)}</div>
      </div>
    `;
    
    messagesContainer.appendChild(messageEl);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  _displayMessages() {
    if (!this._activeGroup || !this._messages[this._activeGroup]) return;
    
    const messagesContainer = this.shadowRoot.querySelector('.messages-container');
    if (!messagesContainer) return;
    
    // Clear existing messages
    messagesContainer.innerHTML = '';
    
    // Display messages
    this._messages[this._activeGroup].forEach(messageObj => {
      const isOutgoing = messageObj.sender === this._username;
      this._addMessage(messageObj, isOutgoing);
    });
  }

  // Utility methods
  _getGroupInitials(groupName) {
    if (!groupName) return '';
    return groupName.split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  _formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  _formatMessageText(text) {
    // Basic formatting to handle URLs, etc.
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  _generateUserColor() {
    const colors = [
      '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', 
      '#EC4899', '#EF4444', '#6366F1', '#06B6D4',
      '#F97316', '#14B8A6', '#7C3AED'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  _throttle(func, delay) {
    let lastCall = 0;
    return function(...args) {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return func.apply(this, args);
      }
    };
  }
  
  // Public API
  sendMessage(text) {
    if (!text || !this._activeGroup || !this._room) return;
    
    // Create message object
    const messageObj = {
      id: Date.now().toString(),
      text: text,
      sender: this._username,
      color: this._userColor,
      timestamp: Date.now()
    };
    
    // Add to local messages
    this._addMessage(messageObj, true);
    
    // Send to peers
    if (this._sendMessage) {
      this._sendMessage(messageObj);
    }
  }
  
  setUsername(username) {
    this._username = username;
    this.setAttribute('username', username);
  }
}

// Register the web component
customElements.define('chat-interface', ChatInterface);
