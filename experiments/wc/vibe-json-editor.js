// Code for json-editor.js

                            /**
 * <vibe-json-editor>
 * A high-quality, standalone graphical JSON editor web component.
 * Features: Collapsible nodes, type-sensitive inputs, live editing, and reactive attributes.
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
    this.shadowRoot.querySelector('slot').addEventListener('slotchange', () => {
      if (!this.getAttribute('json-string-content')) {
        this._updateFromSlot();
      }
    });
    this._updateFromAttribute();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    
    switch (name) {
      case 'json-string-content':
        if (newVal) {
          try {
            this._data = JSON.parse(newVal);
            this._refreshTree();
          } catch (e) {
            console.error('vibe-json-editor: Invalid JSON string provided.', e);
          }
        } else {
          this._updateFromSlot();
        }
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
    if (attrJson) {
      try { 
        this._data = JSON.parse(attrJson); 
        this._refreshTree();
      } catch(e) {}
    } else {
      this._updateFromSlot();
    }
  }

  _updateFromSlot() {
    const slot = this.shadowRoot.querySelector('slot');
    if (!slot) return;
    const content = slot.assignedNodes()
      .map(node => node.textContent)
      .join('')
      .trim();
    
    if (content) {
      try {
        this._data = JSON.parse(content);
        this._refreshTree();
      } catch (e) {
        console.error('vibe-json-editor: Invalid JSON in slot.', e);
      }
    }
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
    if (styleTag) {
      styleTag.textContent = this._generateCSS();
    }
  }

  _generateCSS() {
    return `
      :host {
        display: block;
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        --accent: ${this._accentColor};
        --bg: #ffffff;
        --text: #1e293b;
        --border: #e2e8f0;
        --key: #7c3aed;
        --string: #059669;
        --number: #d97706;
        --bool: #2563eb;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 1rem;
        font-size: ${this._fontSize};
        color: var(--text);
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      }
      .tree-node { margin-left: 1.5rem; position: relative; }
      .tree-node::before {
        content: "";
        position: absolute;
        left: -10px;
        top: 0;
        bottom: 0;
        width: 1px;
        background: var(--border);
      }
      .row { display: flex; align-items: center; padding: 2px 0; gap: 8px; }
      .collapser { 
        cursor: pointer; 
        user-select: none; 
        width: 16px; 
        display: inline-flex; 
        justify-content: center;
        transition: transform 0.2s;
      }
      .collapsed .children { display: none; }
      .collapsed .collapser { transform: rotate(-90deg); }
      .key { color: var(--key); font-weight: 600; }
      .val-string { color: var(--string); }
      .val-number { color: var(--number); }
      .val-boolean { color: var(--bool); }
      input {
        border: 1px transparent;
        background: transparent;
        font-family: inherit;
        font-size: inherit;
        color: inherit;
        padding: 2px 4px;
        border-radius: 4px;
        transition: all 0.2s;
      }
      input:hover:not([disabled]) { background: #f1f5f9; border-color: var(--border); }
      input:focus { outline: none; background: #fff; border-color: var(--accent); box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2); }
      .actions { opacity: 0; transition: opacity 0.2s; display: flex; gap: 4px; }
      .row:hover .actions { opacity: 1; }
      .btn {
        cursor: pointer;
        border: none;
        background: #f1f5f9;
        border-radius: 4px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: #64748b;
      }
      .btn:hover { background: #e2e8f0; color: #0f172a; }
      .btn-del:hover { background: #fee2e2; color: #ef4444; }
      .type-label { font-size: 10px; text-transform: uppercase; opacity: 0.5; font-weight: bold; }
    `;
  }

  _renderSkeleton() {
    this.shadowRoot.innerHTML = `
      <style>${this._generateCSS()}</style>
      <div id="container"></div>
      <slot style="display:none"></slot>
    `;
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

    // Collapse toggle for objects
    if (isObject) {
      const collapser = document.createElement('span');
      collapser.className = 'collapser';
      collapser.textContent = '▼';
      collapser.onclick = () => wrapper.classList.toggle('collapsed');
      row.appendChild(collapser);
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'collapser';
      row.appendChild(spacer);
    }

    // Key display
    if (!isRoot) {
      const keySpan = document.createElement('span');
      keySpan.className = 'key';
      keySpan.textContent = Array.isArray(parentObj) ? `[${key}]` : `"${key}":`;
      row.appendChild(keySpan);
    }

    // Value handling
    if (isObject) {
      const typeLabel = document.createElement('span');
      typeLabel.className = 'type-label';
      typeLabel.textContent = Array.isArray(value) ? `Array(${value.length})` : 'Object';
      row.appendChild(typeLabel);
      
      // Action buttons
      if (!this._isReadonly) {
        const actions = document.createElement('div');
        actions.className = 'actions';
        const addBtn = document.createElement('button');
        addBtn.className = 'btn';
        addBtn.textContent = '+';
        addBtn.onclick = () => {
          if (Array.isArray(value)) value.push(null);
          else value[`newKey_${Object.keys(value).length}`] = null;
          this._refreshTree();
          this._dispatchChange();
        };
        actions.appendChild(addBtn);
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn';
        copyBtn.textContent = '📋';
        copyBtn.title = 'Copy JSON';
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(JSON.stringify(value, null, 2))
            .then(() => {
              const originalText = copyBtn.textContent;
              copyBtn.textContent = '✅';
              setTimeout(() => copyBtn.textContent = originalText, 1000);
            })
            .catch(err => console.error('Failed to copy: ', err));
        };
        actions.appendChild(copyBtn);

        if (!isRoot) {
          const delBtn = document.createElement('button');
          delBtn.className = 'btn btn-del';
          delBtn.textContent = '×';
          delBtn.onclick = () => {
            Array.isArray(parentObj) ? parentObj.splice(key, 1) : delete parentObj[key];
            this._refreshTree();
            this._dispatchChange();
          };
          actions.appendChild(delBtn);
        }
        row.appendChild(actions);
      }

      wrapper.appendChild(row);

      const childrenCont = document.createElement('div');
      childrenCont.className = 'children';
      Object.entries(value).forEach(([k, v]) => {
        childrenCont.appendChild(this._createNode(k, v, value));
      });
      wrapper.appendChild(childrenCont);

    } else {
      // Primitive Value Input
      const input = document.createElement('input');
      const valType = typeof value;
      input.className = `val-${valType}`;
      input.value = value === null ? 'null' : value;
      input.disabled = this._isReadonly;

      input.onchange = (e) => {
        let newVal = e.target.value;
        // Basic auto-type conversion
        if (newVal === 'true') newVal = true;
        else if (newVal === 'false') newVal = false;
        else if (newVal === 'null') newVal = null;
        else if (!isNaN(newVal) && newVal.trim() !== '') newVal = Number(newVal);
        
        if (Array.isArray(parentObj)) parentObj[key] = newVal;
        else parentObj[key] = newVal;
        
        this._dispatchChange();
        this._refreshTree();
      };
      row.appendChild(input);

      // Actions for primitives
      if (!this._isReadonly) {
        const actions = document.createElement('div');
        actions.className = 'actions';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn';
        copyBtn.textContent = '📋';
        copyBtn.title = 'Copy Value';
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(String(value))
            .then(() => {
              const originalText = copyBtn.textContent;
              copyBtn.textContent = '✅';
              setTimeout(() => copyBtn.textContent = originalText, 1000);
            })
            .catch(err => console.error('Failed to copy: ', err));
        };
        actions.appendChild(copyBtn);

        if (!isRoot) {
          const delBtn = document.createElement('button');
          delBtn.className = 'btn btn-del';
          delBtn.textContent = '×';
          delBtn.onclick = () => {
            Array.isArray(parentObj) ? parentObj.splice(key, 1) : delete parentObj[key];
            this._refreshTree();
            this._dispatchChange();
          };
          actions.appendChild(delBtn);
        }
        row.appendChild(actions);
      }
      wrapper.appendChild(row);
    }

    return wrapper;
  }

  // API getters/setters
  get value() { return this._data; }
  set value(val) {
    this._data = val;
    this._refreshTree();
  }
});

