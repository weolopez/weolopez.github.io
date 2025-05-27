// chat-component.js
import { getOpenAIResponse } from '../js/openai.js';

class ChatWindow extends HTMLElement {
    constructor() {
      super();
      // Attach an open Shadow DOM for encapsulation.
      this.attachShadow({ mode: 'open' });
  
      // Get attribute values or use defaults.
      this._headerText = this.getAttribute('header-text') || 'Chat';
      this._sendButtonText = this.getAttribute('send-button-text') || 'Send';
      this._placeholder = this.getAttribute('placeholder') || 'Type your message...';
      this._animationDuration = this.getAttribute('animation-duration') || '0.3s';
      this._theme = this.getAttribute('theme') || 'light';
  
      // New customizable layout attributes.
      this._chatWidth = this.getAttribute('chat-width') || '300px';
      this._chatHeight = this.getAttribute('chat-height') || ''; // optional
      this._chatBottom = this.getAttribute('chat-bottom') || '20px';
      this._chatRight = this.getAttribute('chat-right') || '20px';
  
      // The "opened" attribute controls if the chat is open.
      // If the attribute is present, the chat is open; otherwise, it’s closed.
      this._isOpen = this.hasAttribute('opened');
  
      // Set up the component’s inner HTML.
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            /* Use customizable dimensions and positioning from attributes */
            position: fixed;
            bottom: ${this._chatBottom};
            right: ${this._chatRight};
            width: ${this._chatWidth};
            ${this._chatHeight ? `height: ${this._chatHeight};` : ''}
            font-family: Arial, sans-serif;
            z-index: 1000;
          }
          /* CSS Custom Properties for message styling (can be overridden externally) */
          :host {
            --chat-sent-bg: #007bff;
            --chat-sent-color: #fff;
            --chat-received-bg: #f1f0f0;
            --chat-received-color: #333;
            --chat-message-padding: 8px 12px;
            --chat-message-border-radius: 16px;
          }
          .chat-container {
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            border-radius: 10px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            height: 100%;
            background: ${this._theme === 'dark' ? '#333' : '#fff'};
            color: ${this._theme === 'dark' ? '#eee' : '#333'};
            transition: transform ${this._animationDuration} ease, opacity ${this._animationDuration} ease;
          }
          /* When closed, slide down and fade out */
          .chat-container.closed {
            transform: translateY(100%);
            opacity: 0;
            pointer-events: none;
          }
          .chat-header {
            background: ${this._theme === 'dark' ? '#444' : '#f5f5f5'};
            padding: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            flex-shrink: 0;
          }
          .chat-header h3 {
            margin: 0;
            font-size: 1.1em;
          }
          .chat-close {
            background: none;
            border: none;
            font-size: 1.2em;
            cursor: pointer;
            color: inherit;
          }
          .chat-messages {
            flex: 1;
            padding: 10px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 5px;
            background: ${this._theme === 'dark' ? '#555' : '#fafafa'};
            min-height: 0;
          }
          /* Message bubble styles */
          .chat-message {
            margin: 5px 0;
            padding: var(--chat-message-padding);
            border-radius: var(--chat-message-border-radius);
            max-width: 80%;
            word-break: break-word;
            display: inline-block;
          }
          .chat-message.sent {
            background-color: var(--chat-sent-bg);
            color: var(--chat-sent-color);
            align-self: flex-end;
          }
          .chat-message.received {
            background-color: var(--chat-received-bg);
            color: var(--chat-received-color);
            align-self: flex-start;
          }
          .chat-input {
            display: flex;
            border-top: 1px solid ${this._theme === 'dark' ? '#666' : '#ddd'};
            flex-shrink: 0;
          }
          .chat-input input {
            flex: 1;
            padding: 10px;
            border: none;
            outline: none;
            font-size: 1em;
            background: ${this._theme === 'dark' ? '#666' : '#fff'};
            color: ${this._theme === 'dark' ? '#eee' : '#333'};
          }
          .chat-input button {
            background: ${this._theme === 'dark' ? '#777' : '#007BFF'};
            color: ${this._theme === 'dark' ? '#eee' : '#fff'};
            border: none;
            padding: 10px 15px;
            cursor: pointer;
            transition: background 0.3s;
          }
          .chat-input button:hover {
            background: ${this._theme === 'dark' ? '#888' : '#0056b3'};
          }
          @media (max-width: 480px) {
            :host {
              right: 10px;
              bottom: 10px;
              width: 90%;
            }
          }
        </style>
        <div class="chat-container ${this._isOpen ? '' : 'closed'}">
          <div class="chat-header">
            <h3>${this._headerText}</h3>
            <button class="chat-close">&times;</button>
          </div>
          <div class="chat-messages"></div>
          <div class="chat-input">
            <input type="text" placeholder="${this._placeholder}" />
            <button>${this._sendButtonText}</button>
          </div>
        </div>
      `;
  
      // Cache references to inner elements.
      this._container = this.shadowRoot.querySelector('.chat-container');
      this._header = this.shadowRoot.querySelector('.chat-header');
      this._closeButton = this.shadowRoot.querySelector('.chat-close');
      this._messagesContainer = this.shadowRoot.querySelector('.chat-messages');
      this._inputField = this.shadowRoot.querySelector('.chat-input input');
      this._sendButton = this.shadowRoot.querySelector('.chat-input button');
  
      // Bind methods.
      this._toggleChat = this._toggleChat.bind(this);
      this._sendMessage = this._sendMessage.bind(this);
    }
  
    static get observedAttributes() {
      return [
        'header-text',
        'send-button-text',
        'placeholder',
        'animation-duration',
        'theme',
        'opened',
        'chat-width',
        'chat-height',
        'chat-bottom',
        'chat-right'
      ];
    }
  
    connectedCallback() {
      //this._header.addEventListener('click', this._toggleChat);
      this._closeButton.addEventListener('click', this._toggleChat);
      this._sendButton.addEventListener('click', this._sendMessage);
      this._inputField.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
          this._sendMessage();
        }
      });
      // Apply initial host styles for layout.
      this._applyHostStyles();
    }
  
    disconnectedCallback() {
      this._header.removeEventListener('click', this._toggleChat);
      this._closeButton.removeEventListener('click', this._toggleChat);
      this._sendButton.removeEventListener('click', this._sendMessage);
    }
  
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;
      switch (name) {
        case 'header-text':
          this._headerText = newValue;
          this.shadowRoot.querySelector('.chat-header h3').textContent = newValue;
          break;
        case 'send-button-text':
          this._sendButtonText = newValue;
          this.shadowRoot.querySelector('.chat-input button').textContent = newValue;
          break;
        case 'placeholder':
          this._placeholder = newValue;
          this.shadowRoot.querySelector('.chat-input input').setAttribute('placeholder', newValue);
          break;
        case 'animation-duration':
          this._animationDuration = newValue;
          this._refreshStyles();
          break;
        case 'theme':
          this._theme = newValue;
          this._refreshStyles();
          break;
        case 'opened':
          // If the attribute is present, set _isOpen to true; otherwise, false.
          this._isOpen = newValue !== null;
          this._updateOpenState();
          break;
        case 'chat-width':
          this._chatWidth = newValue;
          this.style.width = newValue;
          break;
        case 'chat-height':
          this._chatHeight = newValue;
          this.style.height = newValue;
          break;
        case 'chat-bottom':
          this._chatBottom = newValue;
          this.style.bottom = newValue;
          break;
        case 'chat-right':
          this._chatRight = newValue;
          this.style.right = newValue;
          break;
      }
    }
  
    // Refresh the internal <style> block (used when animation duration or theme changes)
    _refreshStyles() {
      const styleEl = this.shadowRoot.querySelector('style');
      styleEl.textContent = `
        :host {
          position: fixed;
          bottom: ${this._chatBottom};
          right: ${this._chatRight};
          width: ${this._chatWidth};
          ${this._chatHeight ? `height: ${this._chatHeight};` : ''}
          font-family: Arial, sans-serif;
          z-index: 1000;
          /* Custom properties for message styling */
          --chat-sent-bg: #007bff;
          --chat-sent-color: #fff;
          --chat-received-bg: #f1f0f0;
          --chat-received-color: #333;
          --chat-message-padding: 8px 12px;
          --chat-message-border-radius: 16px;
        }
        .chat-container {
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          border-radius: 10px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
          background: ${this._theme === 'dark' ? '#333' : '#fff'};
          color: ${this._theme === 'dark' ? '#eee' : '#333'};
          transition: transform ${this._animationDuration} ease, opacity ${this._animationDuration} ease;
        }
        .chat-container.closed {
          transform: translateY(100%);
          opacity: 0;
          pointer-events: none;
        }
        .chat-header {
          background: ${this._theme === 'dark' ? '#444' : '#f5f5f5'};
          padding: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          flex-shrink: 0;
        }
        .chat-header h3 {
          margin: 0;
          font-size: 1.1em;
        }
        .chat-close {
          background: none;
          border: none;
          font-size: 1.2em;
          cursor: pointer;
          color: inherit;
        }
        .chat-messages {
          flex: 1;
          padding: 10px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 5px;
          background: ${this._theme === 'dark' ? '#555' : '#fafafa'};
          min-height: 0;
        }
        .chat-message {
          margin: 5px 0;
          padding: var(--chat-message-padding);
          border-radius: var(--chat-message-border-radius);
          max-width: 80%;
          word-break: break-word;
          display: inline-block;
        }
        .chat-message.sent {
          background-color: var(--chat-sent-bg);
          color: var(--chat-sent-color);
          align-self: flex-end;
        }
        .chat-message.received {
          background-color: var(--chat-received-bg);
          color: var(--chat-received-color);
          align-self: flex-start;
        }
        .chat-input {
          display: flex;
          border-top: 1px solid ${this._theme === 'dark' ? '#666' : '#ddd'};
          flex-shrink: 0;
        }
        .chat-input input {
          flex: 1;
          padding: 10px;
          border: none;
          outline: none;
          font-size: 1em;
          background: ${this._theme === 'dark' ? '#666' : '#fff'};
          color: ${this._theme === 'dark' ? '#eee' : '#333'};
        }
        .chat-input button {
          background: ${this._theme === 'dark' ? '#777' : '#007BFF'};
          color: ${this._theme === 'dark' ? '#eee' : '#fff'};
          border: none;
          padding: 10px 15px;
          cursor: pointer;
          transition: background 0.3s;
        }
        .chat-input button:hover {
          background: ${this._theme === 'dark' ? '#888' : '#0056b3'};
        }
        @media (max-width: 480px) {
          :host {
            right: 10px;
            bottom: 10px;
            width: 90%;
          }
        }
      `;
    }
  
    // Apply layout styles from attributes to the host element.
    _applyHostStyles() {
      this.style.width = this._chatWidth;
      if (this._chatHeight) this.style.height = this._chatHeight;
      this.style.bottom = this._chatBottom;
      this.style.right = this._chatRight;
    }
  
    // Update the container’s class based on open/closed state.
    _updateOpenState() {
      if (this._isOpen) {
        this._container.classList.remove('closed');
      } else {
        this._container.classList.add('closed');
      }
    }
  
    // Toggle open/closed state and update the "opened" attribute accordingly.
    _toggleChat(e) {
      // Prevent propagation if clicking the close button.
      if (e.target === this._closeButton) e.stopPropagation();
      this._isOpen = !this._isOpen;
      this._updateOpenState();
      // Reflect the state in the attribute.
      if (this._isOpen) {
        this.setAttribute('opened', '');
        this.dispatchEvent(new CustomEvent('chat-opened'));
      } else {
        this.removeAttribute('opened');
        this.dispatchEvent(new CustomEvent('chat-closed'));
      }
    }
  
    // Send a message from the user.
    async _sendMessage() {
      const message = this._inputField.value.trim();
      if (message) {
        // Append the message as a "sent" bubble.
        this._appendMessage(message, 'sent');
        // Clear the input.
        this._inputField.value = '';
        
        // Dispatch a custom event with the message.
        this.dispatchEvent(new CustomEvent('chat-message', { detail: { message } }));
        
        try {
          // Get response from OpenAI
          const response = await getOpenAIResponse(message);
          // Add the response as a "received" message
          this._appendMessage(response, 'received');
          // Dispatch event for the response
          this.dispatchEvent(new CustomEvent('chat-response', { detail: { response } }));
        } catch (error) {
          console.error('Error getting OpenAI response:', error);
          this._appendMessage('Sorry, I encountered an error while processing your message.', 'received');
        }
      }
    }
  
    // Internal method to append a message to the chat.
    _appendMessage(message, type) {
      const messageEl = document.createElement('div');
      messageEl.className = `chat-message ${type}`;
      messageEl.textContent = message;
      this._messagesContainer.appendChild(messageEl);
      // Scroll to the bottom.
      this._messagesContainer.scrollTop = this._messagesContainer.scrollHeight;
    }
  
    /**
     * Public API: Allows external code to add a new message (for example, a response).
     * @param {string} message - The message text.
     * @param {string} type - Either "sent" or "received" (default: "received").
     */
    addMessage(message, type = 'received') {
      this._appendMessage(message, type);
    }
  }
  
  customElements.define('chat-window', ChatWindow);