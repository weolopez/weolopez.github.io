import { eventBus } from '../../desktop/src/events/event-bus.js';
import { MESSAGES } from '../../desktop/src/events/message-types.js';


class SpotlightComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.isVisible = false;
    this.conversationId = 'spotlight-' + Date.now();
    this.messages = [];
    this.setupEventListeners();
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
  }

  setupEventListeners() {
    eventBus.subscribe(MESSAGES.WEBLLM_RESPONSE_COMPLETE, (payload) => {
      if (payload.message) {
        this.displayResponse(payload.message.content);
      }
    });
  }

  handleKeydown(event) {
    if (event.metaKey && event.key === 'k') {
      event.preventDefault();
      this.toggleVisibility();
    }
    if (event.key === 'Escape' && this.isVisible) {
      this.toggleVisibility();
    }
  }

  toggleVisibility() {
    this.isVisible = !this.isVisible;
    const modal = this.shadowRoot.querySelector('.spotlight-modal');
    if (this.isVisible) {
      modal.classList.add('visible');
      this.shadowRoot.querySelector('#search-input').focus();
    } else {
      modal.classList.remove('visible');
    }
  }

  handleSubmit(event) {
    event.preventDefault();
    const input = this.shadowRoot.querySelector('#search-input');
    const query = input.value.trim();
    if (query) {
      this.messages.push({ role: 'user', content: query });
      eventBus.publish(MESSAGES.WEBLLM_GENERATE_REQUEST, {
        messages: this.messages,
        conversationId: this.conversationId,
        options: {
          temperature: 0.7,
          maxTokens: 512,
          stream: false
        }
      });
      input.value = '';
      // Show loading indicator
      this.shadowRoot.querySelector('#results').innerHTML = `
        <div class="loader">
          <p>Thinking...</p>
        </div>
      `;
    }
  }

  displayResponse(response) {
    this.messages.push({ role: 'assistant', content: response });
    const resultsDiv = this.shadowRoot.querySelector('#results');
    // A simple way to format the response a bit better.
    // This could be replaced with a markdown parser later.
    const formattedResponse = response.replace(/\n/g, '<br>');
    resultsDiv.innerHTML = `<div class="result-item">${formattedResponse}</div>`;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .spotlight-modal {
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 20%;
          left: 50%;
          width: 640px;
          z-index: 10000;
          
          background: rgba(20, 20, 20, 0.7);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.125);
          
          box-shadow: 0 0 0 1px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.3);

          opacity: 0;
          pointer-events: none;
          transform: translateX(-50%) scale(0.95);
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .spotlight-modal.visible {
          opacity: 1;
          transform: translateX(-50%) scale(1);
          pointer-events: auto;
        }
        #search-form {
          display: flex;
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        #search-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 24px;
          outline: none;
          color: #fff;
        }
        #search-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }
        #results {
          max-height: 400px;
          overflow-y: auto;
          color: #fff;
        }
        #results:empty {
          display: none;
        }
        #results::-webkit-scrollbar {
          width: 6px;
        }
        #results::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.3);
          border-radius: 6px;
        }
        .result-item {
          padding: 16px;
          font-size: 16px;
          line-height: 1.5;
        }
        .loader {
          text-align: center;
          padding: 20px;
        }
        .loader p {
          color: rgba(255, 255, 255, 0.7);
          font-size: 16px;
        }
      </style>
      <div class="spotlight-modal">
        <form id="search-form">
          <input id="search-input" type="text" placeholder="Ask me anything..." autocomplete="off">
        </form>
        <div id="results"></div>
      </div>
    `;
    this.shadowRoot.querySelector('#search-form').addEventListener('submit', this.handleSubmit.bind(this));
  }
}

customElements.define('spotlight-component', SpotlightComponent);