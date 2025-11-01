/**
 * Sidebar Card Web Component
 * Displays application info, statistics, and controls
 */

export class SidebarCard extends HTMLElement {
  constructor() {
    super();
    this.state = {
      embedCount: 0,
      lastEmbedTime: 0,
      lastQueryTime: 0,
      modelName: 'Xenova/all-MiniLM-L6-v2',
      theme: 'light'
    };
    this.eventListeners = new Map();
  }

  // Utility methods (previously from BaseComponent)
  $(selector) {
    return this.querySelector(selector);
  }

  $$(selector) {
    return this.querySelectorAll(selector);
  }

  emit(eventName, detail = null, options = {}) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true,
      ...options
    });
    this.dispatchEvent(event);
  }

  attachEventListener(element, event, handler, options = {}) {
    if (!element || typeof element.addEventListener !== 'function') {
      console.warn('Invalid element passed to attachEventListener:', element);
      return;
    }

    const key = `${element.tagName || 'unknown'}_${element.id || 'noid'}_${event}_${handler.name || 'anonymous'}_${Date.now()}`;

    // Remove existing listener if it exists
    if (this.eventListeners.has(key)) {
      const [el, evt, oldHandler] = this.eventListeners.get(key);
      el.removeEventListener(evt, oldHandler, options);
    }

    element.addEventListener(event, handler, options);
    this.eventListeners.set(key, [element, event, handler, options]);
  }

  detachEventListeners() {
    for (const [element, event, handler, options] of this.eventListeners.values()) {
      element.removeEventListener(event, handler, options);
    }
    this.eventListeners.clear();
  }

  // Lifecycle methods
  connectedCallback() {
    this.render();
    this.attachEventListeners();
    this.onConnected();
  }

  disconnectedCallback() {
    this.detachEventListeners();
  }

  render() {
    this.innerHTML = `
      <aside class="card sidebar" style="height: fit-content;">
        <h4>Tech Spotlight</h4>
        <div class="meta">
          Embeddings computed on-device with Transformers.js. Stored locally with IndexedDB.
        </div>
        
        <hr style="margin: 12px 0; border: none; border-top: 1px solid var(--border);">
        
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div>
            <strong id="embedCount">${this.state.embedCount}</strong> entries stored
          </div>
          <div class="small muted">
            Last embed time: <span id="embedTime">${this.state.lastEmbedTime}</span> ms
          </div>
          <div class="small muted">
            Last query time: <span id="queryTime">${this.state.lastQueryTime}</span> ms
          </div>
        </div>
        
        <hr style="margin: 12px 0; border: none; border-top: 1px solid var(--border);">
        
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div class="small">
            Model: <strong>${this.state.modelName}</strong>
          </div>
          <div class="small">
            Keyboard: <span class="kbd">Tab</span> navigation supported
          </div>
          <div class="small">
            Quick search: <span class="kbd">Ctrl</span> + <span class="kbd">Enter</span>
          </div>
          <div class="small">
            Try sample: "fruit" or "fast vehicle"
          </div>
        </div>
        
        <hr style="margin: 12px 0; border: none; border-top: 1px solid var(--border);">
        
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div class="controls">
            <button class="toggle" id="themeToggle" title="Toggle theme">
              ${this.state.theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button class="btn ghost small" id="exportResults" title="Export current results">
              Export
            </button>
          </div>
        </div>
        
        <footer style="margin-top: 16px;">
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <a class="badge" href="https://huggingface.co/Xenova/all-MiniLM-L6-v2" target="_blank" rel="noopener">
              Model
            </a>
            <a class="badge" href="https://xenova.ai/transformers.js" target="_blank" rel="noopener">
              Transformers.js
            </a>
            <a class="badge" href="https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API" target="_blank" rel="noopener">
              IndexedDB
            </a>
          </div>
        </footer>
        
        <div id="performanceStats" style="margin-top: 12px; display: none;">
          <div class="small muted">Performance Details:</div>
          <div class="small" style="margin-top: 4px;">
            <div>Memory usage: <span id="memoryUsage">—</span></div>
            <div>Embeddings/sec: <span id="embeddingRate">—</span></div>
            <div>Storage used: <span id="storageUsed">—</span></div>
          </div>
        </div>
      </aside>
    `;
  }

  attachEventListeners() {
    const themeToggle = this.$('#themeToggle');
    const exportButton = this.$('#exportResults');

    this.attachEventListener(themeToggle, 'click', this.handleThemeToggle.bind(this));
    this.attachEventListener(exportButton, 'click', this.handleExportResults.bind(this));

    // Listen for double-click to show performance stats
    // Use native addEventListener for self-events
    const dblclickHandler = this.togglePerformanceStats.bind(this);
    HTMLElement.prototype.addEventListener.call(this, 'dblclick', dblclickHandler);

    // Store for cleanup
    this.eventListeners.set('self_dblclick_handler', [this, 'dblclick', dblclickHandler]);
  }

  handleThemeToggle() {
    const currentTheme = document.body.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.body.setAttribute('data-theme', newTheme);
    this.state.theme = newTheme;

    const themeToggle = this.$('#themeToggle');
    if (themeToggle) {
      themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
      themeToggle.setAttribute('aria-pressed', String(newTheme === 'dark'));
    }

    // Emit theme change event
    this.emit('theme-changed', { theme: newTheme });
  }

  handleExportResults() {
    this.emit('export-requested');
  }

  togglePerformanceStats() {
    const statsEl = this.$('#performanceStats');
    if (statsEl) {
      const isVisible = statsEl.style.display !== 'none';
      statsEl.style.display = isVisible ? 'none' : 'block';
      
      if (!isVisible) {
        this.updatePerformanceStats();
      }
    }
  }

  updatePerformanceStats() {
    // Update memory usage
    if ('memory' in performance) {
      const memory = performance.memory;
      const memoryUsage = `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`;
      this.updateElement('#memoryUsage', memoryUsage);
    }

    // Calculate embedding rate
    if (this.state.lastEmbedTime > 0 && this.state.embedCount > 0) {
      const rate = Math.round((this.state.embedCount / this.state.lastEmbedTime) * 1000);
      this.updateElement('#embeddingRate', `${rate}/sec`);
    }

    // Estimate storage used (approximate)
    if (this.state.embedCount > 0) {
      const approxSize = this.state.embedCount * 1.5; // Rough estimate in KB
      this.updateElement('#storageUsed', `~${Math.round(approxSize)}KB`);
    }
  }

  updateElement(selector, text) {
    const element = this.$(selector);
    if (element) {
      element.textContent = text;
    }
  }

  // Public methods for updating statistics
  updateEmbedCount(count) {
    this.state.embedCount = count;
    this.updateElement('#embedCount', count.toString());
  }

  updateEmbedTime(time) {
    this.state.lastEmbedTime = time;
    this.updateElement('#embedTime', time.toString());
  }

  updateQueryTime(time) {
    this.state.lastQueryTime = time;
    this.updateElement('#queryTime', time.toString());
  }

  updateStats({ embedCount, embedTime, queryTime }) {
    if (embedCount !== undefined) this.updateEmbedCount(embedCount);
    if (embedTime !== undefined) this.updateEmbedTime(embedTime);
    if (queryTime !== undefined) this.updateQueryTime(queryTime);
  }


  // Get current theme
  getCurrentTheme() {
    return document.body.getAttribute('data-theme') || 'light';
  }

  // Set theme programmatically
  setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;

    document.body.setAttribute('data-theme', theme);
    this.state.theme = theme;

    const themeToggle = this.$('#themeToggle');
    if (themeToggle) {
      themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
      themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
    }
  }

  // Initialize theme from localStorage or system preference
  initializeTheme() {
    let savedTheme = localStorage.getItem('classifier-theme');
    
    if (!savedTheme) {
      // Check system preference
      savedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    this.setTheme(savedTheme);
  }

  onConnected() {
    this.initializeTheme();

    // Save theme changes to localStorage
    this.attachEventListener(this, 'theme-changed', (event) => {
      localStorage.setItem('classifier-theme', event.detail.theme);
    });

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.attachEventListener(mediaQuery, 'change', (event) => {
      if (!localStorage.getItem('classifier-theme')) {
        this.setTheme(event.matches ? 'dark' : 'light');
      }
    });
  }

  // Getters for external access
  get stats() {
    return {
      embedCount: this.state.embedCount,
      lastEmbedTime: this.state.lastEmbedTime,
      lastQueryTime: this.state.lastQueryTime
    };
  }
}

// Register the custom element
customElements.define('sidebar-card', SidebarCard);
