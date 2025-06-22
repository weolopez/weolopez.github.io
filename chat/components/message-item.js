class MessageItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['role', 'content', 'timestamp', 'is-latest', 'image-url'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  get role() {
    return this.getAttribute('role') || 'user';
  }

  set role(value) {
    this.setAttribute('role', value);
  }
  get imageURL() {
    return this.getAttribute('image-url') || '';
  }
  set imageURL(value) {
    this.setAttribute('image-url', value);
  }
  get content() {
    return this.getAttribute('content') || '';
  }

  set content(value) {
    this.setAttribute('content', value);
  }

  get timestamp() {
    return this.getAttribute('timestamp') || new Date().toISOString();
  }

  set timestamp(value) {
    this.setAttribute('timestamp', value);
  }

  get isLatest() {
    return this.hasAttribute('is-latest');
  }

  set isLatest(value) {
    if (value) {
      this.setAttribute('is-latest', '');
    } else {
      this.removeAttribute('is-latest');
    }
  }

  setupEventListeners() {
    const copyBtn = this.shadowRoot.querySelector('.copy-btn');
    const feedbackBtns = this.shadowRoot.querySelectorAll('.feedback-btn');

    copyBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.copyToClipboard();
    });

    feedbackBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isPositive = btn.classList.contains('positive');
        this.provideFeedback(isPositive);
      });
    });
  }

  copyToClipboard() {
    const contentEl = this.shadowRoot.querySelector('.message-content');
    const textToCopy = contentEl.textContent;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      const copyBtn = this.shadowRoot.querySelector('.copy-btn');
      copyBtn.classList.add('copied');
      copyBtn.setAttribute('title', 'Copied!');
      
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.setAttribute('title', 'Copy to clipboard');
      }, 2000);
    });
  }

  provideFeedback(isPositive) {
    const messageEl = this.shadowRoot.querySelector('.message');
    const feedbackBtns = this.shadowRoot.querySelectorAll('.feedback-btn');
    
    // Visual feedback
    messageEl.classList.add(isPositive ? 'feedback-positive' : 'feedback-negative');
    
    // Disable all feedback buttons
    feedbackBtns.forEach(btn => btn.disabled = true);
    
    // Dispatch feedback event
    this.dispatchEvent(new CustomEvent('message-feedback', {
      bubbles: true,
      composed: true,
      detail: { isPositive, content: this.content }
    }));
  }

  markdownToHtml(text) {
    // Simple markdown parser for common elements
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

  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  render() {
    const role = this.role;
    const imageURL = this.imageURL;
    const content = this.content;
    const timestamp = this.timestamp;
    const isLatest = this.isLatest;
    const isUser = role === 'user';
    const isAssistant = role === 'assistant';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          margin-bottom: 20px;
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
          margin-left: auto;
        }

        .message.feedback-positive .message-content {
          border: 1px solid var(--success-color, #4CAF50);
        }

        .message.feedback-negative .message-content {
          border: 1px solid var(--error-color, #F44336);
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
          box-shadow: 0 2px 10px var(--shadow-color, rgba(0, 0, 0, 0.1));
          position: relative;
          overflow: hidden;
        }

        .message.user .avatar {
          background: var(--primary-color, #00A9E0);
          background: var(--primary-gradient, linear-gradient(135deg, #00A9E0 0%, #0568AE 100%));
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
          background: var(--primary-color, #00A9E0);
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
          border-radius: var(--border-radius, 8px);
          box-shadow: 0 2px 10px var(--shadow-color, rgba(0, 0, 0, 0.1));
          line-height: 1.6;
          font-size: 0.95rem;
          position: relative;
          transition: all 0.3s ease;
          z-index: 1;
        }

        .message-image {
          max-width: 100px; /* Smaller than a thumbnail */
          height: auto;
          border-radius: 4px;
          margin-top: 8px;
          display: block;
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
          background: var(--primary-color, #00A9E0);
          background: var(--primary-gradient, linear-gradient(135deg, #00A9E0 0%, #0568AE 100%));
          color: white;
          border-top-right-radius: 4px;
          align-self: flex-end;
        }

        .message.user .message-content::before {
          right: -14px;
          border-left-color: var(--primary-color, #00A9E0);
        }

        .message.assistant .message-content {
          background-color: var(--message-assistant-bg, #F2F2F2);
          border-top-left-radius: 4px;
          color: var(--text-color, #2A2A2A);
        }

        .message.assistant .message-content::before {
          left: -14px;
          border-right-color: var(--message-assistant-bg, #F2F2F2);
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
          color: var(--primary-color, #00A9E0);
        }

        .message.assistant.latest .message-content::after {
          content: '';
          display: inline-block;
          width: 3px;
          height: 14px;
          background-color: var(--primary-color, #00A9E0);
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
          color: var(--text-color, #2A2A2A);
        }

        .message.user .message-time {
          margin-right: 8px;
        }

        .message.assistant .message-time {
          margin-left: 8px;
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
          background-color: var(--secondary-color, #F2F2F2);
          color: var(--text-color, #2A2A2A);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 5px var(--shadow-color, rgba(0, 0, 0, 0.1));
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px var(--shadow-color, rgba(0, 0, 0, 0.1));
        }

        .action-btn svg {
          width: 16px;
          height: 16px;
        }

        .action-btn.copied {
          background-color: var(--success-color, #4CAF50);
          color: white;
        }

        .feedback-btn.positive:hover {
          background-color: var(--success-color, #4CAF50);
          color: white;
        }

        .feedback-btn.negative:hover {
          background-color: var(--error-color, #F44336);
          color: white;
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

        @media (max-width: 768px) {
          .message {
            max-width: 95%;
          }
          
          .avatar {
            width: 32px;
            height: 32px;
          }
          
          .avatar svg {
            width: 16px;
            height: 16px;
          }
          
          .message-content {
            padding: 12px 16px;
            font-size: 0.9rem;
          }
        }
      </style>
      <div class="message ${role} ${isLatest ? 'latest' : ''}">
        <div class="avatar">
          ${isUser ? `
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>
          ` : `
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
          `}
        </div>
        <div class="message-wrapper">
          <div class="message-content">
            ${imageURL ? `<img src="${imageURL}" class="message-image" alt="Message attachment">` : ''}
            ${isAssistant ? this.markdownToHtml(content) : content}
          </div>
          <div class="message-time">${this.formatTime(timestamp)}</div>
          ${isAssistant && !isLatest ? `
            <div class="message-actions">
              <button class="action-btn copy-btn" title="Copy to clipboard">
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path></svg>
              </button>
              <button class="action-btn feedback-btn positive" title="Good response">
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"></path></svg>
              </button>
              <button class="action-btn feedback-btn negative" title="Bad response">
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"></path></svg>
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Apply syntax highlighting to code blocks for assistant messages
    if (isAssistant) {
      const contentEl = this.shadowRoot.querySelector('.message-content');
      this.highlightCodeBlocks(contentEl);
    }
  }
}

customElements.define('message-item', MessageItem);