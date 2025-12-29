// Code for ls-editor.js
// Code for ls-editor.js
/**
 * <local-storage-editor>
 * A high-quality, reactive Web Component for managing browser LocalStorage.
 * Features: Auto-formatting JSON, key discovery, and dynamic styling via attributes.
 */
class LocalStorageEditor extends HTMLElement {
  static get observedAttributes() {
    return [
      'accent-color-hex',
      'editor-height-pixels',
      'ui-font-family',
      'status-display-duration-ms'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._keys = [];
  }

  connectedCallback() {
    this.render();
    this.refreshKeys();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    this.updateStyles();
  }

  refreshKeys() {
    const select = this.shadowRoot.querySelector('#key-selector');
    const currentSelection = select.value;
    
    // Clear existing
    select.innerHTML = '<option value="" disabled selected>Select a key...</option>';
    
    this._keys = Object.keys(localStorage).sort();
    this._keys.forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = key;
      select.appendChild(option);
    });

    if (this._keys.includes(currentSelection)) {
      select.value = currentSelection;
    }
  }

  loadKey(key) {
    const textarea = this.shadowRoot.querySelector('#editor-area');
    const rawValue = localStorage.getItem(key);
    
    if (rawValue === null) {
      textarea.value = '';
      return;
    }

    try {
      const json = JSON.parse(rawValue);
      textarea.value = JSON.stringify(json, null, 2);
    } catch (e) {
      textarea.value = rawValue;
    }
  }

  saveData() {
    const key = this.shadowRoot.querySelector('#key-selector').value;
    const value = this.shadowRoot.querySelector('#editor-area').value;

    if (!key) {
      this.setStatus('Please select or enter a key first', 'error');
      return;
    }

    try {
      localStorage.setItem(key, value);
      this.setStatus('Saved successfully!', 'success');
    } catch (e) {
      this.setStatus('Error saving: ' + e.message, 'error');
    }
  }

  deleteData() {
    const key = this.shadowRoot.querySelector('#key-selector').value;
    if (!key) return;

    if (confirm(`Delete key "${key}"?`)) {
      localStorage.removeItem(key);
      this.refreshKeys();
      this.shadowRoot.querySelector('#editor-area').value = '';
      this.setStatus('Deleted key', 'success');
    }
  }

  setStatus(msg, type) {
    const statusEl = this.shadowRoot.querySelector('#status-bar');
    statusEl.textContent = msg;
    statusEl.className = `status ${type}`;
    
    const duration = parseInt(this.getAttribute('status-display-duration-ms')) || 3000;
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'status';
    }, duration);
  }

  updateStyles() {
    if (!this.shadowRoot.querySelector('style')) return;
    const accent = this.getAttribute('accent-color-hex') || '#6366f1';
    const height = this.getAttribute('editor-height-pixels') || '300';
    const font = this.getAttribute('ui-font-family') || 'system-ui, sans-serif';

    this.shadowRoot.host.style.setProperty('--accent', accent);
    this.shadowRoot.host.style.setProperty('--editor-height', `${height}px`);
    this.shadowRoot.host.style.setProperty('--font-stack', font);
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --accent: #6366f1;
          --bg: #ffffff;
          --border: #e2e8f0;
          --text: #1e293b;
          --editor-height: 300px;
          --font-stack: system-ui, sans-serif;
          
          display: block;
          max-width: 800px;
          margin: 1rem auto;
          font-family: var(--font-stack);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          background: var(--bg);
        }

        .container {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .toolbar {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-wrap: wrap;
        }

        select, textarea, button {
          font-family: inherit;
          font-size: 0.9rem;
          border-radius: 6px;
          border: 1px solid var(--border);
          padding: 0.5rem;
        }

        select {
          flex: 1;
          min-width: 200px;
          cursor: pointer;
        }

        textarea {
          width: 100%;
          height: var(--editor-height);
          font-family: 'Monaco', 'Consolas', monospace;
          background: #f8fafc;
          resize: vertical;
          box-sizing: border-box;
          line-height: 1.5;
        }

        button {
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
          background: #f1f5f9;
        }

        button:hover {
          background: #e2e8f0;
        }

        button.primary {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }

        button.primary:hover {
          filter: brightness(1.1);
        }

        button.danger {
          color: #ef4444;
        }

        .status {
          font-size: 0.8rem;
          height: 1rem;
          transition: color 0.3s;
        }

        .status.success { color: #10b981; }
        .status.error { color: #ef4444; }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        h2 { margin: 0; font-size: 1.25rem; }
      </style>
      <div class="container">
        <div class="header">
          <h2>LocalStorage Editor</h2>
          <div id="status-bar" class="status"></div>
        </div>

        <div class="toolbar">
          <select id="key-selector"></select>
          <button id="refresh-btn" title="Refresh Keys">↻</button>
          <button class="danger" id="delete-btn">Delete</button>
        </div>

        <textarea id="editor-area" placeholder="Select a key or start typing..."></textarea>

        <div class="toolbar">
          <button class="primary" id="save-btn">Save Changes</button>
          <span style="flex:1"></span>
          <button id="format-btn">Pretty Print JSON</button>
        </div>
      </div>
    `;

    this.updateStyles();

    // Event Listeners
    this.shadowRoot.querySelector('#key-selector').addEventListener('change', (e) => {
      this.loadKey(e.target.value);
    });

    this.shadowRoot.querySelector('#refresh-btn').addEventListener('click', () => {
      this.refreshKeys();
      this.setStatus('Keys refreshed', 'success');
    });

    this.shadowRoot.querySelector('#save-btn').addEventListener('click', () => this.saveData());
    
    this.shadowRoot.querySelector('#delete-btn').addEventListener('click', () => this.deleteData());

    this.shadowRoot.querySelector('#format-btn').addEventListener('click', () => {
      const textarea = this.shadowRoot.querySelector('#editor-area');
      try {
        const json = JSON.parse(textarea.value);
        textarea.value = JSON.stringify(json, null, 2);
        this.setStatus('Formatted', 'success');
      } catch (e) {
        this.setStatus('Invalid JSON', 'error');
      }
    });
  }
}

customElements.define('local-storage-editor', LocalStorageEditor);