class WikiEditableBase extends HTMLElement {
  static get observedAttributes() {
    return [
      'editable', 'disabled', 'content', 'placeholder',
      'persistence-db', 'persistence-table', 'persistence-key',
      'ai-system-prompt', 'ai-user-prompt', 'ai-enabled'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: sans-serif;
        }
        #container {
          padding: 4px;
          border: 1px solid #ccc;
          border-radius: 4px;
          min-height: 1.2em;
        }
        #container:empty:before {
          content: attr(data-placeholder);
          color: #aaa;
        }
        .controls {
          margin-top: 8px;
        }
        .control-button {
          padding: 4px 8px;
          margin-right: 4px;
          cursor: pointer;
        }
      </style>
      <div id="container" tabindex="0"></div>
      <div class="controls"></div>
    `;

    this._content = '';
    this.container = this.shadowRoot.getElementById('container');
    this.controls = this.shadowRoot.querySelector('.controls');

    // Bind event handlers
    this._onInput = this._onInput.bind(this);
    this._onFocus = this._onFocus.bind(this);
    this._onBlur  = this._onBlur.bind(this);
  }

  connectedCallback() {
    // Upgrade any pre-set properties.
    this._upgradeProperty('content');
    this._upgradeProperty('editable');
    this._upgradeProperty('disabled');
    this._upgradeProperty('placeholder');

    // Attach event listeners.
    this.container.addEventListener('input', this._onInput);
    this.container.addEventListener('focus', this._onFocus);
    this.container.addEventListener('blur', this._onBlur);

    // Render the initial state.
    this._render();

    // Attempt to load persisted content.
    this.loadContent().then((loadedContent) => {
      if (loadedContent) {
        this.content = loadedContent;
        this.dispatchEvent(new CustomEvent('crudread', { detail: { content: loadedContent } }));
      }
    });

    // Render control buttons (for manual triggering if needed).
    this._renderControls();
  }

  disconnectedCallback() {
    this.container.removeEventListener('input', this._onInput);
    this.container.removeEventListener('focus', this._onFocus);
    this.container.removeEventListener('blur', this._onBlur);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    switch(name) {
      case 'editable':
        this._updateEditable();
        break;
      case 'disabled':
        this._updateDisabled();
        break;
      case 'content':
        this._content = newValue;
        this._render();
        break;
      case 'placeholder':
        this._updatePlaceholder();
        break;
      // Persistence and AI properties update internal state directly.
      default:
        break;
    }
  }

  _upgradeProperty(prop) {
    if (this.hasOwnProperty(prop)) {
      let value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  _updateEditable() {
    const isEditable = this.editable;
    this.container.contentEditable = isEditable ? 'true' : 'false';
    this.container.classList.toggle('editable', isEditable);
  }

  _updateDisabled() {
    if (this.disabled) {
      this.container.setAttribute('contenteditable', 'false');
      this.container.tabIndex = -1;
    } else {
      if (this.editable) {
        this.container.contentEditable = 'true';
        this.container.tabIndex = 0;
      }
    }
  }

  _updatePlaceholder() {
    const placeholder = this.placeholder;
    if (placeholder) {
      this.container.setAttribute('data-placeholder', placeholder);
    } else {
      this.container.removeAttribute('data-placeholder');
    }
  }

  _render() {
    this.container.innerHTML = this._content || '';
    this._updatePlaceholder();
  }

  _renderControls() {
    // Clear previous controls.
    this.controls.innerHTML = '';

    // If AI is enabled, add an AI Generation button.
    if (this.aiEnabled) {
      const aiBtn = document.createElement('button');
      aiBtn.textContent = 'Generate AI Content';
      aiBtn.className = 'control-button';
      aiBtn.addEventListener('click', () => this._handleAIFlow());
      this.controls.appendChild(aiBtn);
    }
    // A manual Save button.
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Content';
    saveBtn.className = 'control-button';
    saveBtn.addEventListener('click', () => this._handlePersistenceFlow());
    this.controls.appendChild(saveBtn);
  }

  // --- Event Handlers ---
  _onInput(e) {
    this._content = this.container.innerHTML;
    this.setAttribute('content', this._content);
    this.dispatchEvent(new CustomEvent('input', { detail: { content: this._content } }));
  }

  _onFocus(e) {
    this.dispatchEvent(new CustomEvent('focus', { detail: {} }));
  }

  _onBlur(e) {
    this.dispatchEvent(new CustomEvent('blur', { detail: { content: this._content } }));
    // When editing ends, trigger persistence (save/create) followed by AI generation.
    this._handlePersistenceFlow().then(() => {
      if (this.aiEnabled) {
        return this._handleAIFlow();
      }
    });
  }

  // --- Persistence Methods (CRUD) ---
  loadContent() {
    // Simulate loading from a SQLite-backed persistence layer.
    return new Promise((resolve) => {
      console.log('Loading content from:', this.persistenceDb, this.persistenceTable, this.persistenceKey);
      setTimeout(() => {
        // For demo purposes, use localStorage.
        const storedContent = localStorage.getItem(this.persistenceKey) || '';
        resolve(storedContent);
      }, 300);
    });
  }

  saveContent() {
    // Simulate saving (update) to a SQLite-like DB.
    return new Promise((resolve) => {
      console.log('Saving content to:', this.persistenceDb, this.persistenceTable, this.persistenceKey, this.content);
      localStorage.setItem(this.persistenceKey, this.content);
      setTimeout(() => {
        this.dispatchEvent(new CustomEvent('crudupdate', { detail: { content: this.content } }));
        resolve(true);
      }, 300);
    });
  }

  createContent(content) {
    return new Promise((resolve) => {
      console.log('Creating new content in:', this.persistenceDb, this.persistenceTable);
      localStorage.setItem(this.persistenceKey, content);
      setTimeout(() => {
        this.dispatchEvent(new CustomEvent('crudcreate', { detail: { content } }));
        resolve(true);
      }, 300);
    });
  }

  deleteContent() {
    return new Promise((resolve) => {
      console.log('Deleting content from:', this.persistenceDb, this.persistenceTable, this.persistenceKey);
      localStorage.removeItem(this.persistenceKey);
      setTimeout(() => {
        this.dispatchEvent(new CustomEvent('cruddelete', { detail: {} }));
        resolve(true);
      }, 300);
    });
  }

  // --- AI Generation Methods ---
  generateAIContent(prompt) {
    return new Promise((resolve, reject) => {
      // Dispatch event to indicate an AI request is starting.
      this.dispatchEvent(new CustomEvent('aiRequest', { detail: { prompt } }));
      console.log('Sending AI generation request with system prompt:', this.aiSystemPrompt, 'and user prompt:', prompt);
      
      // Simulate an asynchronous API call (replace with a real API call as needed).
      setTimeout(() => {
        // Simulated AI-generated response.
        const generated = `AI Response based on system: "${this.aiSystemPrompt}" and prompt: "${prompt}"`;
        this.dispatchEvent(new CustomEvent('aiResponse', { detail: { response: generated } }));
        resolve(generated);
      }, 1000);
    });
  }

  // --- Combined Flows ---
  _handlePersistenceFlow() {
    // If there is no persisted content yet, create new; otherwise update.
    if (!localStorage.getItem(this.persistenceKey)) {
      return this.createContent(this.content);
    } else {
      return this.saveContent();
    }
  }

  _handleAIFlow() {
    const prompt = this.aiUserPrompt || this.content || this.placeholder || 'Default prompt';
    return this.generateAIContent(prompt).then((aiResponse) => {
      // Update the component with AI-generated content.
      this.content = aiResponse;
      // Optionally disable further editing.
      this.editable = false;
      // If needed, update the placeholder.
      if (!aiResponse) {
        this.placeholder = 'AI generated content not available.';
      }
      return aiResponse;
    }).catch(err => {
      this.dispatchEvent(new CustomEvent('aiError', { detail: { error: err } }));
      console.error(err);
    });
  }

  // --- Properties ---

  // Content-related properties.
  get content() {
    return this._content;
  }
  set content(val) {
    this._content = val;
    this.setAttribute('content', val);
    this._render();
  }

  get editable() {
    return this.hasAttribute('editable');
  }
  set editable(val) {
    val ? this.setAttribute('editable', '') : this.removeAttribute('editable');
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }
  set disabled(val) {
    val ? this.setAttribute('disabled', '') : this.removeAttribute('disabled');
  }

  get placeholder() {
    return this.getAttribute('placeholder');
  }
  set placeholder(val) {
    val ? this.setAttribute('placeholder', val) : this.removeAttribute('placeholder');
  }

  // Persistence properties (overridable to map to your SQLite DB).
  get persistenceDb() {
    return this.getAttribute('persistence-db') || 'defaultDB';
  }
  set persistenceDb(val) {
    this.setAttribute('persistence-db', val);
  }

  get persistenceTable() {
    return this.getAttribute('persistence-table') || 'defaultTable';
  }
  set persistenceTable(val) {
    this.setAttribute('persistence-table', val);
  }

  get persistenceKey() {
    return this.getAttribute('persistence-key') || 'defaultKey';
  }
  set persistenceKey(val) {
    this.setAttribute('persistence-key', val);
  }

  // AI properties.
  get aiSystemPrompt() {
    return this.getAttribute('ai-system-prompt') || 'Default system prompt';
  }
  set aiSystemPrompt(val) {
    this.setAttribute('ai-system-prompt', val);
  }

  get aiUserPrompt() {
    return this.getAttribute('ai-user-prompt') || '';
  }
  set aiUserPrompt(val) {
    this.setAttribute('ai-user-prompt', val);
  }

  get aiEnabled() {
    return this.hasAttribute('ai-enabled');
  }
  set aiEnabled(val) {
    if (val) {
      this.setAttribute('ai-enabled', '');
    } else {
      this.removeAttribute('ai-enabled');
    }
    // Update control buttons to reflect the AI-enabled state.
    this._renderControls();
  }
}

customElements.define('wiki-editable-base', WikiEditableBase);