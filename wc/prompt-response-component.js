class PromptResponseViewer extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            height: 100%;
            width: 100%;
            box-sizing: border-box;
            font-family: sans-serif;
          }
          /* Container takes full size of the parent */
          .container {
            height: 100%;
            width: 100%;
            display: flex;
            flex-direction: column;
          }
          /* Main prompt/response display area */
          .main {
            position: relative;
            flex: 1;
            display: flex;
            flex-direction: column;
            border: 1px solid #ccc;
            border-radius: 8px;
            overflow: hidden;
          }
          /* Split view: two sections for prompt and response */
          .split {
            display: flex;
            flex-direction: column;
            height: 100%;
          }
          .section {
            flex: 1;
            padding: 1rem;
            overflow: auto;
            transition: flex 0.3s ease;
            border-bottom: 1px solid #eee;
          }
          .section:last-child {
            border-bottom: none;
          }
          /* Expanded and collapsed states */
          .section.expanded {
            flex: 3;
          }
          .section.collapsed {
            flex: 0.5;
          }
          /* Control buttons for adjusting the split */
          .toggle-buttons {
            position: absolute;
            top: 10px;
            right: 10px;
            display: flex;
            gap: 0.5rem;
            z-index: 10;
          }
          .toggle-buttons button {
            padding: 0.4rem 0.8rem;
            font-size: 0.9rem;
            border: none;
            background: #007bff;
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
          }
          .toggle-buttons button:hover {
            background: #0056b3;
          }
          /* Carousel container for history */
          .carousel-wrapper {
            margin-top: 1rem;
          }
          .carousel {
            display: flex;
            overflow-x: auto;
            scroll-behavior: smooth;
            padding-bottom: 0.5rem;
          }
          .carousel::-webkit-scrollbar {
            height: 8px;
          }
          .carousel::-webkit-scrollbar-thumb {
            background: #ccc;
            border-radius: 4px;
          }
          .carousel-item {
            flex: 0 0 auto;
            width: 300px;
            margin-right: 1rem;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 0.5rem;
            background: #f9f9f9;
            cursor: pointer;
          }
          .carousel-item:focus {
            outline: 2px solid #007bff;
          }
          .carousel-controls {
            display: flex;
            justify-content: space-between;
            margin-top: 0.5rem;
          }
          .carousel-controls button {
            padding: 0.5rem;
            border: none;
            background: #007bff;
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
          }
          .carousel-controls button:hover {
            background: #0056b3;
          }
          /* Headings for sections */
          h2 {
            margin-top: 0;
            font-size: 1.1rem;
          }
          /* Editable content areas */
          .content {
            min-height: 3rem;
          }
        </style>
        <div class="container">
          <!-- Main area: prompt and response panels -->
          <div class="main">
            <div class="split">
              <div id="prompt-section" class="section" tabindex="0" aria-label="Prompt Section">
                <h2>Prompt</h2>
                <div contenteditable="true" class="content" id="prompt-content">Enter your prompt here...</div>
              </div>
              <div id="response-section" class="section" tabindex="0" aria-label="Response Section">
                <h2>Response</h2>
                <div contenteditable="true" class="content" id="response-content">Enter your response here...</div>
              </div>
            </div>
            <!-- Toggle buttons to adjust the view -->
            <div class="toggle-buttons">
              <button id="expand-prompt" aria-label="Expand Prompt">Expand Prompt</button>
              <button id="expand-response" aria-label="Expand Response">Expand Response</button>
              <button id="reset-split" aria-label="Reset Split">Reset</button>
            </div>
          </div>
          <!-- Carousel for history of prompt-response pairs -->
          <div class="carousel-wrapper">
            <div class="carousel" id="history-carousel" aria-label="Prompt-Response History">
              <!-- History items get added here -->
            </div>
            <div class="carousel-controls">
              <button id="carousel-prev" aria-label="Previous History">&#9664;</button>
              <button id="carousel-next" aria-label="Next History">&#9654;</button>
            </div>
          </div>
        </div>
      `;
  
      // Bind event handlers
      this.expandPrompt = this.expandPrompt.bind(this);
      this.expandResponse = this.expandResponse.bind(this);
      this.resetSplit = this.resetSplit.bind(this);
      this.carouselPrev = this.carouselPrev.bind(this);
      this.carouselNext = this.carouselNext.bind(this);
  
      // Maintain a history array of pairs
      this.history = [];
    }
  
    connectedCallback() {
      this.shadowRoot.querySelector('#expand-prompt')
        .addEventListener('click', this.expandPrompt);
      this.shadowRoot.querySelector('#expand-response')
        .addEventListener('click', this.expandResponse);
      this.shadowRoot.querySelector('#reset-split')
        .addEventListener('click', this.resetSplit);
      this.shadowRoot.querySelector('#carousel-prev')
        .addEventListener('click', this.carouselPrev);
      this.shadowRoot.querySelector('#carousel-next')
        .addEventListener('click', this.carouselNext);
    }
  
    // Expand prompt panel and collapse response panel.
    expandPrompt() {
      const promptSection = this.shadowRoot.querySelector('#prompt-section');
      const responseSection = this.shadowRoot.querySelector('#response-section');
      promptSection.classList.add('expanded');
      promptSection.classList.remove('collapsed');
      responseSection.classList.add('collapsed');
      responseSection.classList.remove('expanded');
    }
  
    // Expand response panel and collapse prompt panel.
    expandResponse() {
      const promptSection = this.shadowRoot.querySelector('#prompt-section');
      const responseSection = this.shadowRoot.querySelector('#response-section');
      responseSection.classList.add('expanded');
      responseSection.classList.remove('collapsed');
      promptSection.classList.add('collapsed');
      promptSection.classList.remove('expanded');
    }
  
    // Reset to default split (equal height).
    resetSplit() {
      const promptSection = this.shadowRoot.querySelector('#prompt-section');
      const responseSection = this.shadowRoot.querySelector('#response-section');
      promptSection.classList.remove('expanded', 'collapsed');
      responseSection.classList.remove('expanded', 'collapsed');
    }
  
    // Scroll the carousel to the left.
    carouselPrev() {
      const carousel = this.shadowRoot.querySelector('#history-carousel');
      carousel.scrollBy({ left: -300, behavior: 'smooth' });
    }
  
    // Scroll the carousel to the right.
    carouselNext() {
      const carousel = this.shadowRoot.querySelector('#history-carousel');
      carousel.scrollBy({ left: 300, behavior: 'smooth' });
    }
  
    /**
     * Add a prompt-response pair to the history carousel.
     * Each carousel item is clickable and will load its data into the main view.
     * @param {string} promptText - The prompt text.
     * @param {string} responseText - The response text.
     */
    addHistory(promptText, responseText) {
      const item = document.createElement('div');
      item.classList.add('carousel-item');
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', 'History item');
      item.innerHTML = `
        <strong>Prompt:</strong> ${promptText}<br>
        <strong>Response:</strong> ${responseText}
      `;
      item.addEventListener('click', () => {
        this.loadPair(promptText, responseText);
      });
      this.shadowRoot.querySelector('#history-carousel').appendChild(item);
      this.history.push({ prompt: promptText, response: responseText });
    }
  
    /**
     * Load a prompt-response pair from history into the main view.
     * @param {string} promptText
     * @param {string} responseText
     */
    loadPair(promptText, responseText) {
      this.shadowRoot.querySelector('#prompt-content').innerText = promptText;
      this.shadowRoot.querySelector('#response-content').innerText = responseText;
    }
  }
  
  customElements.define('prompt-response-component', PromptResponseViewer);