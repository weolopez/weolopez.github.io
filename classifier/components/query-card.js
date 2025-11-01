/**
 * Query Card Web Component
 * Handles query input and semantic search execution
 */

import { embeddingService } from '../modules/embedding-service.js';
import { vectorDB } from '../modules/database.js';

export class QueryCard extends HTMLElement {
  constructor() {
    super();
    this.state = {
      isQuerying: false,
      query: '',
      topK: 5,
      lastQueryTime: 0
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
  }

  render() {
    this.innerHTML = `
      <div class="card">
        <h3>Query Input</h3>
        <textarea 
          id="query" 
          placeholder="Enter a query to find semantically similar entries..." 
          aria-label="Query input"
        >${this.state.query}</textarea>
        
        <div style="display: flex; gap: 8px; align-items: center; margin-top: 8px;">
          <button class="btn" id="classify">Classify &amp; Match</button>
          <input 
            id="topK" 
            type="number" 
            min="1" 
            max="20" 
            value="${this.state.topK}"
            style="width: 72px; padding: 8px; border-radius: 8px; border: 1px solid var(--border);" 
            aria-label="Top K results"
          />
          <button class="btn ghost" id="clearResults">Clear Results</button>
          <div id="querySpinner" style="display: none;" class="spinner" role="status" aria-hidden="true"></div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const queryTextarea = this.$('#query');
    const classifyBtn = this.$('#classify');
    const topKInput = this.$('#topK');
    const clearResultsBtn = this.$('#clearResults');

    this.attachEventListener(queryTextarea, 'input', this.handleQueryInput.bind(this));
    this.attachEventListener(classifyBtn, 'click', this.handleClassify.bind(this));
    this.attachEventListener(topKInput, 'input', this.handleTopKChange.bind(this));
    this.attachEventListener(clearResultsBtn, 'click', this.handleClearResults.bind(this));

    // Keyboard shortcuts
    this.attachEventListener(queryTextarea, 'keydown', this.handleKeydown.bind(this));
  }

  handleQueryInput(event) {
    this.state.query = event.target.value;
  }

  handleTopKChange(event) {
    const value = parseInt(event.target.value) || 5;
    this.state.topK = Math.max(1, Math.min(20, value));
  }

  handleKeydown(event) {
    // Ctrl/Cmd + Enter to execute query
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.handleClassify();
    }
  }

  async handleClassify() {
    const query = this.state.query.trim();
    
    if (!query) {
      alert('Please enter a query.');
      return;
    }

    try {
      // Check if data is available
      const storedData = await vectorDB.getAll();
      if (!storedData.length) {
        alert('No data loaded. Please upload a CSV first.');
        return;
      }

      this.state.isQuerying = true;
      this.showSpinner(true);
      this.clearResults();

      const startTime = performance.now();

      // Generate query embedding
      const queryEmbedding = await embeddingService.embedSingle(query);

      // Calculate similarities
      const candidates = storedData.map(item => ({
        key: item.key,
        value: item.value,
        embedding: embeddingService.embeddingFromJSON(item.embedding)
      }));

      const scored = candidates.map(candidate => ({
        ...candidate,
        score: embeddingService.cosineSimilarity(queryEmbedding, candidate.embedding)
      }));

      // Sort by similarity score (descending)
      scored.sort((a, b) => b.score - a.score);

      // Get top K results
      const topResults = scored.slice(0, this.state.topK);

      const endTime = performance.now();
      const queryTime = Math.round(endTime - startTime);

      this.state.lastQueryTime = queryTime;

      // Emit results
      this.emit('query-results', {
        query,
        results: topResults,
        queryTime,
        totalResults: scored.length
      });

    } catch (error) {
      console.error('Query execution error:', error);
      this.emit('query-error', { error: error.message });
    } finally {
      this.state.isQuerying = false;
      this.showSpinner(false);
    }
  }

  handleClearResults() {
    this.emit('clear-results');
  }

  showSpinner(show) {
    const spinner = this.$('#querySpinner');
    if (spinner) {
      spinner.style.display = show ? 'inline-block' : 'none';
    }
  }

  clearResults() {
    this.emit('clear-results');
  }

  // Public methods for external control
  setQuery(query) {
    this.state.query = query;
    const queryTextarea = this.$('#query');
    if (queryTextarea) {
      queryTextarea.value = query;
    }
  }

  setTopK(topK) {
    this.state.topK = Math.max(1, Math.min(20, topK));
    const topKInput = this.$('#topK');
    if (topKInput) {
      topKInput.value = this.state.topK;
    }
  }

  executeQuery() {
    this.handleClassify();
  }

  // Getter for external access
  get queryTime() {
    return this.state.lastQueryTime;
  }

  get currentQuery() {
    return this.state.query;
  }

  get currentTopK() {
    return this.state.topK;
  }

  get isExecuting() {
    return this.state.isQuerying;
  }
}

// Register the custom element
customElements.define('query-card', QueryCard);
