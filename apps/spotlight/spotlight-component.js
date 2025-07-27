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
    modal.style.display = this.isVisible ? 'flex' : 'none';
    if (this.isVisible) {
      this.shadowRoot.querySelector('#search-input').focus();
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
      this.shadowRoot.querySelector('#results').innerHTML = '<p>Loading...</p>';
    }
  }

  displayResponse(response) {
    this.messages.push({ role: 'assistant', content: response });
    const resultsDiv = this.shadowRoot.querySelector('#results');
    resultsDiv.innerHTML = `<p>${response}</p>`;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .spotlight-modal {
          display: none;
          position: fixed;
          top: 20%;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 10px;
          padding: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          z-index: 10000;
          flex-direction: column;
        }
        #search-form {
          display: flex;
        }
        #search-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 18px;
          outline: none;
        }
        #results {
          margin-top: 10px;
          max-height: 300px;
          overflow-y: auto;
        }
      </style>
      <div class="spotlight-modal">
        <form id="search-form">
          <input id="search-input" type="text" placeholder="Search or Ask..." autocomplete="off">
        </form>
        <div id="results"></div>
      </div>
    `;
    this.shadowRoot.querySelector('#search-form').addEventListener('submit', this.handleSubmit.bind(this));
  }
}

customElements.define('spotlight-component', SpotlightComponent);