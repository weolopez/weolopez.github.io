// Code for local-storage-manager.js
/**
 * <local-storage-manager>
 * A high-quality, reactive Web Component for managing browser LocalStorage.
 * Integrates with the <vibe-json-editor> for advanced JSON manipulation
 * while providing a robust fallback for raw string data.
 */
import "./vibe-json-editor.js"
class LocalStorageManager extends HTMLElement {
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
    this._isJsonMode = false;
  }

  connectedCallback() {
    this.render();
    this.refreshKeys();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.updateStyles();
    }
  }

  updateStyles() {
    const root = this.shadowRoot.host;
    if (!root) return;
    
    const accent = this.getAttribute('accent-color-hex') || '#6366f1';
    const height = this.getAttribute('editor-height-pixels') || '400';
    const font = this.getAttribute('ui-font-family') || 'system-ui, -apple-system, sans-serif';

    root.style.setProperty('--accent-color', accent);
    root.style.setProperty('--editor-min-height', `${height}px`);
    root.style.setProperty('--font-family', font);
  }

  refreshKeys() {
    const select = this.shadowRoot.querySelector('#key-selector');
    const currentSelection = select.value;
    
    select.innerHTML = '<option value="" disabled selected>Choose a storage key...</option>';
    
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
    const rawValue = localStorage.getItem(key);
    const jsonEditor = this.shadowRoot.querySelector('#json-editor');
    const rawTextarea = this.shadowRoot.querySelector('#raw-editor');
    
    if (rawValue === null) {
      this.toggleEditorMode(false);
      rawTextarea.value = '';
      return;
    }

    try {
      // Attempt to parse to see if it's valid JSON
      JSON.parse(rawValue);
      this._isJsonMode = true;
      this.toggleEditorMode(true);
      // Pass the raw string to the custom component's specific attribute
      jsonEditor.setAttribute('json-value', rawValue);
    } catch (e) {
      this._isJsonMode = false;
      this.toggleEditorMode(false);
      rawTextarea.value = rawValue;
    }
  }

  toggleEditorMode(isJson) {
    const jsonEditor = this.shadowRoot.querySelector('#json-editor');
    const rawTextarea = this.shadowRoot.querySelector('#raw-editor');
    const typeIndicator = this.shadowRoot.querySelector('#type-indicator');

    if (isJson) {
      jsonEditor.style.display = 'block';
      rawTextarea.style.display = 'none';
      typeIndicator.textContent = 'JSON Mode';
      typeIndicator.style.color = 'var(--accent-color)';
    } else {
      jsonEditor.style.display = 'none';
      rawTextarea.style.display = 'block';
      typeIndicator.textContent = 'Raw Text Mode';
      typeIndicator.style.color = '#64748b';
    }
  }

  saveData() {
    const key = this.shadowRoot.querySelector('#key-selector').value;
    const jsonEditor = this.shadowRoot.querySelector('#json-editor');
    const rawTextarea = this.shadowRoot.querySelector('#raw-editor');

    if (!key) {
      this.setStatus('Error: Select a key first', 'error');
      return;
    }

    let valueToSave;
    if (this._isJsonMode) {
      // We assume the vibe-json-editor updates its internal state 
      // or we extract the current valid JSON from it
      valueToSave = jsonEditor.getAttribute('json-value') || jsonEditor.value;
    } else {
      valueToSave = rawTextarea.value;
    }

    try {
      localStorage.setItem(key, valueToSave);
      this.setStatus('Storage updated successfully', 'success');
      this.refreshKeys();
    } catch (e) {
      this.setStatus(`Save failed: ${e.message}`, 'error');
    }
  }

  deleteData() {
    const key = this.shadowRoot.querySelector('#key-selector').value;
    if (!key) return;

    if (confirm(`Permanent deletion of "${key}"?`)) {
      localStorage.removeItem(key);
      this.refreshKeys();
      this.shadowRoot.querySelector('#raw-editor').value = '';
      this.setStatus('Key removed', 'success');
      this.toggleEditorMode(false);
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

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --accent-color: #6366f1;
          --bg-card: #ffffff;
          --border-color: #e2e8f0;
          --font-family: system-ui, sans-serif;
          --editor-min-height: 400px;
          
          display: block;
          max-width: 900px;
          margin: 2rem auto;
          font-family: var(--font-family);
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .main-container {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 1rem;
        }

        .title-group h1 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
        }

        #type-indicator {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 800;
        }

        .control-bar {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        select {
          flex: 1;
          min-width: 240px;
          padding: 0.6rem 1rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: #f8fafc;
          font-size: 0.95rem;
          outline-color: var(--accent-color);
        }

        .editor-surface {
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
          min-height: var(--editor-min-height);
          background: #fdfdfd;
          position: relative;
        }

        #raw-editor {
          width: 100%;
          height: var(--editor-min-height);
          border: none;
          padding: 1rem;
          box-sizing: border-box;
          font-family: 'Fira Code', 'Monaco', monospace;
          font-size: 0.9rem;
          resize: vertical;
          outline: none;
        }

        vibe-json-editor {
          width: 100%;
          min-height: var(--editor-min-height);
          display: none;
        }

        .actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        button {
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
        }

        button:hover {
          background: #f1f5f9;
          transform: translateY(-1px);
        }

        button.primary {
          background: var(--accent-color);
          color: white;
          border-color: var(--accent-color);
          box-shadow: 0 4px 12px -2px rgba(99, 102, 241, 0.3);
        }

        button.danger {
          color: #dc2626;
        }

        button.danger:hover {
          background: #fef2f2;
          border-color: #fecaca;
        }

        .status {
          font-size: 0.85rem;
          font-weight: 500;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .status.success { opacity: 1; color: #059669; }
        .status.error { opacity: 1; color: #e11d48; }

        .spacer { flex: 1; }
      </style>

      <div class="main-container">
        <header class="app-header">
          <div class="title-group">
            <h1>Storage Navigator</h1>
            <div id="type-indicator">Standby</div>
          </div>
          <div id="status-bar" class="status"></div>
        </header>

        <div class="control-bar">
          <select id="key-selector"></select>
          <button id="refresh-btn" title="Sync local storage">Reload Keys</button>
          <button class="danger" id="delete-btn">Clear Key</button>
        </div>

        <div class="editor-surface">
          <vibe-json-editor id="json-editor"></vibe-json-editor>
          <textarea id="raw-editor" placeholder="Select a storage key to begin editing..."></textarea>
        </div>

        <div class="actions">
          <button class="primary" id="save-btn">Commit Changes</button>
          <div class="spacer"></div>
          <small style="color: #94a3b8">LocalStorage Interface v2.1</small>
        </div>
      </div>
    `;

    this.updateStyles();

    // Select Key Listener
    this.shadowRoot.querySelector('#key-selector').addEventListener('change', (e) => {
      this.loadKey(e.target.value);
    });

    // Save Logic
    this.shadowRoot.querySelector('#save-btn').addEventListener('click', () => this.saveData());

    // Delete Logic
    this.shadowRoot.querySelector('#delete-btn').addEventListener('click', () => this.deleteData());

    // Refresh Logic
    this.shadowRoot.querySelector('#refresh-btn').addEventListener('click', () => {
      this.refreshKeys();
      this.setStatus('Keys synced', 'success');
    });

    // Handle vibe-json-editor internal changes (optional, depending on its API)
    this.shadowRoot.querySelector('#json-editor').addEventListener('vibe-change', (e) => {
      // Logic for real-time validation if the sub-component emits it
    });
  }
}

if (!customElements.get('local-storage-manager')) {
  customElements.define('local-storage-manager', LocalStorageManager);
}
