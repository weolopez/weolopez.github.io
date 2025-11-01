/**
 * Analytics Card Web Component
 * Displays frequency and scoring analytics for query results
 */

export class AnalyticsCard extends HTMLElement {
  constructor() {
    super();
    this.state = {
      keyStats: new Map(), // key -> {frequency, totalScore, avgScore, maxScore, lastSeen}
      totalQueries: 0,
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
        <h3>Result Analytics</h3>

        <div class="analytics-summary" style="margin-bottom: 16px; padding: 12px; background: var(--glass); border-radius: 8px;">
          <div class="small muted" style="margin-bottom: 8px;">Query History</div>
          <div style="display: flex; gap: 16px; flex-wrap: wrap;">
            <div><strong>${this.state.totalQueries}</strong> total queries</div>
            <div><strong>${this.state.keyStats.size}</strong> unique keys tracked</div>
          </div>
        </div>

        <div class="analytics-controls" style="margin-bottom: 12px;">
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="btn ghost small" id="sortFrequency">Sort by Frequency</button>
            <button class="btn ghost small" id="sortScore">Sort by Avg Score</button>
            <button class="btn ghost small" id="sortRelevance">Sort by Relevance</button>
            <button class="btn ghost small danger" id="clearAnalytics" style="margin-left: auto;">Clear</button>
          </div>
        </div>

        <div id="analyticsList" class="analytics-list">
          ${this.renderAnalyticsList()}
        </div>
      </div>
    `;
  }

  renderAnalyticsList() {
    if (this.state.keyStats.size === 0) {
      return '<div class="muted small" style="padding: 20px; text-align: center;">No analytics data yet. Execute queries to see frequency and scoring statistics.</div>';
    }

    const sortedStats = this.getSortedStats();
    const maxFrequency = Math.max(...sortedStats.map(stat => stat.frequency));

    return `
      <div class="analytics-header" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border); font-weight: 600; font-size: 13px; color: var(--muted);">
        <div>ID</div>
        <div style="text-align: center;">Frequency</div>
        <div style="text-align: center;">Avg Score</div>
        <div style="text-align: center;">Relevance</div>
      </div>
      ${sortedStats.slice(0, 20).map(stat => this.renderAnalyticsItem(stat, maxFrequency)).join('')}
    `;
  }

  renderAnalyticsItem(stat, maxFrequency) {
    const frequencyPercent = maxFrequency > 0 ? (stat.frequency / maxFrequency) * 100 : 0;

    return `
      <div class="analytics-item" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 8px; padding: 10px 0; border-bottom: 1px solid var(--border); align-items: center;">
        <div style="font-weight: 600; color: var(--text);" title="${stat.key}">
          ${this.escapeHtml(stat.key.length > 30 ? stat.key.substring(0, 27) + '...' : stat.key)}
        </div>
        <div style="text-align: center;">
          <div style="font-weight: 600;">${stat.frequency}</div>
          <div style="height: 4px; background: var(--glass); border-radius: 2px; margin-top: 4px; overflow: hidden;">
            <div style="height: 100%; background: var(--accent); width: ${frequencyPercent}%; transition: width 300ms ease;"></div>
          </div>
        </div>
        <div style="text-align: center;">
          <div style="font-weight: 600;">${stat.avgScore.toFixed(1)}%</div>
          <div class="small muted">max: ${stat.maxScore.toFixed(1)}%</div>
        </div>
        <div style="text-align: center;">
          <div style="font-weight: 600;">${stat.relevance.toFixed(1)}</div>
          <div class="small muted">score: ${(stat.relevance * 100).toFixed(0)}</div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const sortFrequencyBtn = this.$('#sortFrequency');
    const sortScoreBtn = this.$('#sortScore');
    const sortRelevanceBtn = this.$('#sortRelevance');
    const clearBtn = this.$('#clearAnalytics');

    this.attachEventListener(sortFrequencyBtn, 'click', () => this.sortBy('frequency'));
    this.attachEventListener(sortScoreBtn, 'click', () => this.sortBy('avgScore'));
    this.attachEventListener(sortRelevanceBtn, 'click', () => this.sortBy('relevance'));
    this.attachEventListener(clearBtn, 'click', () => this.clearAnalytics());

    // Listen for query results
    this.attachEventListener(window, 'query-results', this.handleQueryResults.bind(this));
  }

  handleQueryResults(event) {
    const { results } = event.detail;
    this.addQueryResults(results);
  }

  addQueryResults(results) {
    this.state.totalQueries++;

    // Update statistics for each result's individual IDs
    results.forEach(result => {
      // Parse the key field which contains comma-separated IDs
      const ids = this.parseIdsFromKey(result.key);
      const score = result.score * 100; // Convert to percentage

      ids.forEach(id => {
        id = id.trim(); // Clean up whitespace
        if (!id) return; // Skip empty IDs

        if (!this.state.keyStats.has(id)) {
          this.state.keyStats.set(id, {
            frequency: 0,
            totalScore: 0,
            avgScore: 0,
            maxScore: 0,
            lastSeen: Date.now()
          });
        }

        const stat = this.state.keyStats.get(id);
        stat.frequency++;
        stat.totalScore += score;
        stat.avgScore = stat.totalScore / stat.frequency;
        stat.maxScore = Math.max(stat.maxScore, score);
        stat.lastSeen = Date.now();

        // Calculate relevance score (frequency * average score / 100)
        stat.relevance = stat.frequency * (stat.avgScore / 100);
      });
    });

    this.render();
  }

  parseIdsFromKey(key) {
    // Handle keys like "BILL-010,ERP-004,ERP-014,CRM-008,BILL-007,ERP-011,CRM-004,BILL-004,MW-019,MW-004,MW-010,MW-027,ERP-019"
    return key.split(',').map(id => id.trim());
  }

  getSortedStats(sortBy = 'relevance') {
    const statsArray = Array.from(this.state.keyStats.entries()).map(([key, stat]) => ({
      key,
      ...stat
    }));

    switch (sortBy) {
      case 'frequency':
        return statsArray.sort((a, b) => b.frequency - a.frequency);
      case 'avgScore':
        return statsArray.sort((a, b) => b.avgScore - a.avgScore);
      case 'relevance':
      default:
        return statsArray.sort((a, b) => b.relevance - a.relevance);
    }
  }

  sortBy(criteria) {
    this.state.sortBy = criteria;
    this.render();
  }

  clearAnalytics() {
    if (confirm('Clear all analytics data? This will reset frequency and scoring statistics.')) {
      this.state.keyStats.clear();
      this.state.totalQueries = 0;
      this.render();
    }
  }

  // Public methods for external control
  getAnalyticsData() {
    return {
      totalQueries: this.state.totalQueries,
      uniqueKeys: this.state.keyStats.size,
      topKeys: this.getSortedStats().slice(0, 10)
    };
  }

  exportAnalytics() {
    const data = this.getSortedStats();
    return data.map(stat => ({
      key: stat.key,
      frequency: stat.frequency,
      averageScore: stat.avgScore.toFixed(2),
      maxScore: stat.maxScore.toFixed(2),
      relevance: stat.relevance.toFixed(2),
      lastSeen: new Date(stat.lastSeen).toISOString()
    }));
  }

  // Inline utility functions
  escapeHtml(s) {
    return String(s).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
  }
}

// Register the custom element
customElements.define('analytics-card', AnalyticsCard);