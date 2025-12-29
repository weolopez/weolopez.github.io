
                            /**
 * <vibe-json-editor>
 * A high-quality, standalone graphical JSON editor web component.
 */
customElements.define('vibe-json-editor', class extends HTMLElement {
  static get observedAttributes() {
    return ['json-string-content', 'accent-ui-color', 'editor-font-size', 'is-readonly-mode'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._data = {};
    this._accentColor = '#6366f1';
    this._fontSize = '14px';
    this._isReadonly = false;
  }

  connectedCallback() {
    this._renderSkeleton();
    this._updateFromAttribute();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    switch (name) {
      case 'json-string-content':
        try {
          this._data = JSON.parse(newVal || '{}');
          this._refreshTree();
        } catch (e) {}
        break;
      case 'accent-ui-color':
        this._accentColor = newVal;
        this._updateStyles();
        break;
      case 'editor-font-size':
        this._fontSize = newVal;
        this._updateStyles();
        break;
      case 'is-readonly-mode':
        this._isReadonly = newVal !== null && newVal !== 'false';
        this._refreshTree();
        break;
    }
  }

  _updateFromAttribute() {
    const attrJson = this.getAttribute('json-string-content');
    if (attrJson) { try { this._data = JSON.parse(attrJson); } catch(e) {} }
    this._refreshTree();
  }

  _dispatchChange() {
    this.dispatchEvent(new CustomEvent('json-change', {
      detail: { json: this._data },
      bubbles: true,
      composed: true
    }));
  }

  _updateStyles() {
    const styleTag = this.shadowRoot.querySelector('style');
    if (styleTag) styleTag.textContent = this._generateCSS();
  }

  _generateCSS() {
    return `
      :host {
        display: block; font-family: 'Segoe UI', system-ui, sans-serif;
        --accent: ${this._accentColor}; --bg: #ffffff; --text: #1e293b; --border: #e2e8f0;
        --key: #7c3aed; --string: #059669; --number: #d97706; --bool: #2563eb;
        background: var(--bg); font-size: ${this._fontSize}; color: var(--text);
      }
      .tree-node { margin-left: 1.2rem; position: relative; border-left: 1px solid var(--border); }
      .row { display: flex; align-items: center; padding: 2px 0; gap: 8px; }
      .collapser { cursor: pointer; user-select: none; width: 16px; text-align: center; }
      .collapsed .children { display: none; }
      .collapsed .collapser { transform: rotate(-90deg); }
      .key { color: var(--key); font-weight: 600; }
      input { border: 1px transparent; background: transparent; font-family: inherit; font-size: inherit; color: inherit; padding: 1px 4px; border-radius: 4px; }
      input:focus { outline: none; background: #fff; border-color: var(--accent); }
      .actions { opacity: 0; display: flex; gap: 2px; }
      .row:hover .actions { opacity: 1; }
      .btn { cursor: pointer; border: none; background: #f1f5f9; border-radius: 4px; width: 18px; height: 18px; font-size: 10px; }
    `;
  }

  _renderSkeleton() {
    this.shadowRoot.innerHTML = `<style>${this._generateCSS()}</style><div id="container"></div>`;
  }

  _refreshTree() {
    const container = this.shadowRoot.getElementById('container');
    if (!container) return;
    container.innerHTML = '';
    container.appendChild(this._createNode('root', this._data, null, true));
  }

  _createNode(key, value, parentObj, isRoot = false) {
    const wrapper = document.createElement('div');
    wrapper.className = 'tree-node';
    const isObject = value !== null && typeof value === 'object';
    const row = document.createElement('div');
    row.className = 'row';

    if (isObject) {
      const coll = document.createElement('span');
      coll.className = 'collapser';
      coll.textContent = '▼';
      coll.onclick = () => wrapper.classList.toggle('collapsed');
      row.appendChild(coll);
    } else {
      const sp = document.createElement('span');
      sp.className = 'collapser';
      row.appendChild(sp);
    }

    if (!isRoot) {
      const ks = document.createElement('span');
      ks.className = 'key';
      ks.textContent = Array.isArray(parentObj) ? `[${key}]` : `"${key}":`;
      row.appendChild(ks);
    }

    if (isObject) {
      const tl = document.createElement('span');
      tl.style.fontSize = '10px';
      tl.style.opacity = '0.5';
      tl.textContent = Array.isArray(value) ? `Array[${value.length}]` : '{Object}';
      row.appendChild(tl);
      
      if (!this._isReadonly) {
        const acts = document.createElement('div');
        acts.className = 'actions';
        const add = document.createElement('button');
        add.className = 'btn';
        add.textContent = '+';
        add.onclick = () => {
          if (Array.isArray(value)) value.push("");
          else value[`new_${Object.keys(value).length}`] = "";
          this._refreshTree();
          this._dispatchChange();
        };
        acts.appendChild(add);
        row.appendChild(acts);
      }
      wrapper.appendChild(row);
      const childs = document.createElement('div');
      childs.className = 'children';
      Object.entries(value).forEach(([k, v]) => childs.appendChild(this._createNode(k, v, value)));
      wrapper.appendChild(childs);
    } else {
      const inp = document.createElement('input');
      inp.value = value;
      inp.disabled = this._isReadonly;
      inp.onchange = (e) => {
        let v = e.target.value;
        if (v === 'true') v = true; else if (v === 'false') v = false; else if (!isNaN(v) && v !== '') v = Number(v);
        parentObj[key] = v;
        this._dispatchChange();
      };
      row.appendChild(inp);
      wrapper.appendChild(row);
    }
    return wrapper;
  }

  get value() { return this._data; }
  set value(v) { this._data = v; this._refreshTree(); }
});

/**
 * <local-storage-editor>
 * Integrated with <vibe-json-editor> for graphical JSON manipulation.
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
    this._activeJson = null;
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
    select.innerHTML = '<option value="" disabled selected>Select a key...</option>';
    Object.keys(localStorage).sort().forEach(key => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = key;
      select.appendChild(opt);
    });
    if (currentSelection) select.value = currentSelection;
  }

  loadKey(key) {
    const textarea = this.shadowRoot.querySelector('#editor-area');
    const vibeEditor = this.shadowRoot.querySelector('#vibe-editor');
    const rawValue = localStorage.getItem(key) || '';
    
    try {
      const json = JSON.parse(rawValue);
      this._activeJson = json;
      vibeEditor.setAttribute('json-string-content', JSON.stringify(json));
      vibeEditor.style.display = 'block';
      textarea.style.display = 'none';
    } catch (e) {
      this._activeJson = null;
      textarea.value = rawValue;
      vibeEditor.style.display = 'none';
      textarea.style.display = 'block';
    }
  }

  saveData() {
    const key = this.shadowRoot.querySelector('#key-selector').value;
    const textarea = this.shadowRoot.querySelector('#editor-area');
    const vibeEditor = this.shadowRoot.querySelector('#vibe-editor');

    if (!key) return this.setStatus('Select a key', 'error');

    let finalValue;
    if (this._activeJson) {
      finalValue = JSON.stringify(vibeEditor.value);
    } else {
      finalValue = textarea.value;
    }

    try {
      localStorage.setItem(key, finalValue);
      this.setStatus('Saved to Storage', 'success');
      this.loadKey(key); // Refresh view
    } catch (e) {
      this.setStatus('Save Error', 'error');
    }
  }

  setStatus(msg, type) {
    const statusEl = this.shadowRoot.querySelector('#status-bar');
    statusEl.textContent = msg;
    statusEl.className = `status ${type}`;
    const dur = parseInt(this.getAttribute('status-display-duration-ms')) || 3000;
    setTimeout(() => statusEl.textContent = '', dur);
  }

  updateStyles() {
    const host = this.shadowRoot.host;
    host.style.setProperty('--accent', this.getAttribute('accent-color-hex') || '#6366f1');
    host.style.setProperty('--editor-height', `${this.getAttribute('editor-height-pixels') || '400'}px`);
    host.style.setProperty('--font-stack', this.getAttribute('ui-font-family') || 'system-ui, sans-serif');
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --accent: #6366f1; --bg: #ffffff; --border: #e2e8f0; --text: #1e293b;
          --editor-height: 400px; --font-stack: system-ui, sans-serif;
          display: block; max-width: 900px; margin: 1rem auto; font-family: var(--font-stack);
          border: 1px solid var(--border); border-radius: 12px; background: var(--bg); overflow: hidden;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        }
        .container { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .toolbar { display: flex; gap: 0.6rem; align-items: center; }
        select, textarea, button { font-family: inherit; font-size: 0.9rem; border-radius: 8px; border: 1px solid var(--border); padding: 0.6rem; }
        select { flex: 1; }
        textarea { width: 100%; height: var(--editor-height); background: #f8fafc; resize: vertical; box-sizing: border-box; font-family: monospace; }
        #vibe-editor { 
          height: var(--editor-height); overflow-y: auto; border: 1px solid var(--border); 
          border-radius: 8px; padding: 10px; background: #fff; display: none;
        }
        button { cursor: pointer; font-weight: 600; background: #f1f5f9; transition: all 0.2s; border: none; }
        button:hover { background: #e2e8f0; }
        button.primary { background: var(--accent); color: white; }
        .status { font-size: 0.8rem; font-weight: bold; }
        .status.success { color: #10b981; }
        .status.error { color: #ef4444; }
        h2 { margin: 0; font-size: 1.1rem; color: var(--accent); }
        .header { display: flex; justify-content: space-between; align-items: center; }
      </style>
      <div class="container">
        <div class="header">
          <h2>Storage Vibe Editor</h2>
          <div id="status-bar" class="status"></div>
        </div>
        <div class="toolbar">
          <select id="key-selector"></select>
          <button id="refresh-btn">↻</button>
          <button style="color:#ef4444" id="delete-btn">Delete</button>
        </div>
        
        <vibe-json-editor id="vibe-editor"></vibe-json-editor>
        <textarea id="editor-area" placeholder="Raw value..."></textarea>

        <div class="toolbar">
          <button class="primary" id="save-btn">Save Changes</button>
          <button id="toggle-type-btn">Switch to Raw/JSON</button>
        </div>
      </div>
    `;

    this.updateStyles();
    const sel = this.shadowRoot.querySelector('#key-selector');
    sel.onchange = (e) => this.loadKey(e.target.value);
    this.shadowRoot.querySelector('#refresh-btn').onclick = () => { this.refreshKeys(); this.setStatus('Refreshed', 'success'); };
    this.shadowRoot.querySelector('#save-btn').onclick = () => this.saveData();
    this.shadowRoot.querySelector('#delete-btn').onclick = () => {
      if (confirm('Delete this key?')) {
        localStorage.removeItem(sel.value);
        this.refreshKeys();
        this.loadKey('');
      }
    };
    this.shadowRoot.querySelector('#toggle-type-btn').onclick = () => {
      const v = this.shadowRoot.querySelector('#vibe-editor');
      const t = this.shadowRoot.querySelector('#editor-area');
      if (v.style.display === 'none') {
        try {
          this._activeJson = JSON.parse(t.value);
          v.setAttribute('json-string-content', t.value);
          v.style.display = 'block'; t.style.display = 'none';
        } catch(e) { this.setStatus('Not valid JSON', 'error'); }
      } else {
        t.value = JSON.stringify(v.value, null, 2);
        this._activeJson = null;
        v.style.display = 'none'; t.style.display = 'block';
      }
    };

    this.shadowRoot.querySelector('#vibe-editor').addEventListener('json-change', (e) => {
      this._activeJson = e.detail.json;
    });
  }
}
                        