/**
 * Results Card Web Component
 * Displays search results with semantic similarity scores
 */

export class ResultsCard extends HTMLElement {
  constructor() {
    super();
    this.state = {
      results: [],
      query: '',
      queryTime: 0,
      isVisible: true
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

  disconnectedCallback() {
    this.detachEventListeners();
  }

  render() {
    this.innerHTML = `
      <div class="card" style="display: ${this.state.isVisible ? 'block' : 'none'};">
        <h3>Results</h3>
        <div id="results" class="results" aria-live="polite">
          ${this.renderResults()}
        </div>
        ${this.renderQueryInfo()}
      </div>
    `;
  }

  renderResults() {
    if (!this.state.results.length) {
      return '<div class="muted">No results to display. Execute a query to see results.</div>';
    }

    return this.state.results
      .map((result, index) => this.renderResult(result, index))
      .join('');
  }

  renderResult(result, index) {
    const percentage = this.formatPercentage(result.score);
    const delay = index * 50; // Stagger animations

    return `
      <div class="result" style="animation-delay: ${delay}ms;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: 700; color: var(--text);">
            ${this.escapeHtml(result.key)}
          </div>
          <div class="score">${percentage}</div>
        </div>
        <div style="margin-top: 8px;" class="muted">
          ${this.escapeHtml(result.value)}
        </div>
        <div style="margin-top: 4px; font-size: 11px; color: var(--muted);">
          Similarity: ${result.score.toFixed(4)}
        </div>
      </div>
    `;
  }

  renderQueryInfo() {
    if (!this.state.results.length || !this.state.query) {
      return '';
    }

    return `
      <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border);">
        <div class="small muted">
          <strong>Query:</strong> "${this.escapeHtml(this.state.query)}"
          (${this.state.results.length} results in ${this.state.queryTime}ms)
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Listen for result clicks to enable interaction
    // Use native addEventListener for self-events
    const clickHandler = this.handleResultClick.bind(this);
    HTMLElement.prototype.addEventListener.call(this, 'click', clickHandler);

    // Store for cleanup
    this.eventListeners.set('self_click_handler', [this, 'click', clickHandler]);
  }

  handleResultClick(event) {
    const resultElement = event.target.closest('.result');
    if (!resultElement) return;

    const resultIndex = Array.from(this.$$('.result')).indexOf(resultElement);
    const result = this.state.results[resultIndex];

    if (result) {
      this.emit('result-selected', {
        result,
        index: resultIndex,
        element: resultElement
      });

      // Visual feedback
      resultElement.style.transform = 'scale(0.98)';
      setTimeout(() => {
        resultElement.style.transform = '';
      }, 150);
    }
  }

  // Public methods for external control
  setResults(results, query = '', queryTime = 0) {
    this.state.results = results || [];
    this.state.query = query;
    this.state.queryTime = queryTime;
    this.state.isVisible = true;
    this.render();
  }

  clearResults() {
    this.state.results = [];
    this.state.query = '';
    this.state.queryTime = 0;
    this.render();
  }

  hide() {
    this.state.isVisible = false;
    this.render();
  }

  show() {
    this.state.isVisible = true;
    this.render();
  }

  // Filter results by minimum score threshold
  filterByScore(minScore) {
    const filteredResults = this.state.results.filter(
      result => result.score >= minScore
    );

    this.state.results = filteredResults;
    this.render();
  }

  // Sort results by different criteria
  sortBy(criteria = 'score') {
    const sortedResults = [...this.state.results];

    switch (criteria) {
      case 'score':
        sortedResults.sort((a, b) => b.score - a.score);
        break;
      case 'key':
        sortedResults.sort((a, b) => a.key.localeCompare(b.key));
        break;
      case 'value':
        sortedResults.sort((a, b) => a.value.localeCompare(b.value));
        break;
      default:
        console.warn(`Unknown sort criteria: ${criteria}`);
        return;
    }

    this.state.results = sortedResults;
    this.render();
  }

  // Export results as JSON
  exportResults() {
    return {
      query: this.state.query,
      queryTime: this.state.queryTime,
      resultCount: this.state.results.length,
      results: this.state.results.map(result => ({
        key: result.key,
        value: result.value,
        score: result.score
      }))
    };
  }

  // Export results as CSV
  exportAsCSV() {
    const headers = ['Key', 'Value', 'Similarity Score'];
    const rows = this.state.results.map(result => [
      `"${result.key.replace(/"/g, '""')}"`,
      `"${result.value.replace(/"/g, '""')}"`,
      result.score.toFixed(4)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  // Inline utility functions (previously from helpers.js)
  escapeHtml(s) {
    return String(s).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
  }

  formatPercentage(score) {
    return `${Math.round(score * 1000) / 10}%`;
  }

  // Download results as CSV file
  downloadAsCSV(filename = 'search-results.csv') {
    const csvContent = this.exportAsCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // Highlight search terms in results
  highlightTerms(terms) {
    if (!terms || !terms.length) return;

    const resultsContainer = this.$('#results');
    if (!resultsContainer) return;

    const termRegex = new RegExp(
      `(${terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
      'gi'
    );

    const resultElements = this.$$('.result');
    resultElements.forEach(element => {
      const valueElement = element.querySelector('.muted');
      if (valueElement) {
        const originalText = valueElement.textContent;
        const highlightedText = originalText.replace(
          termRegex,
          '<mark style="background: var(--accent); color: white; padding: 1px 2px; border-radius: 2px;">$1</mark>'
        );
        valueElement.innerHTML = highlightedText;
      }
    });
  }

  // Getters for external access
  get resultCount() {
    return this.state.results.length;
  }

  get hasResults() {
    return this.state.results.length > 0;
  }

  get bestResult() {
    return this.state.results.length > 0 ? this.state.results[0] : null;
  }

  get averageScore() {
    if (!this.state.results.length) return 0;
    const sum = this.state.results.reduce((acc, result) => acc + result.score, 0);
    return sum / this.state.results.length;
  }
}

// Register the custom element
customElements.define('results-card', ResultsCard);
