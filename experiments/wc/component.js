/**
 * <vibe-event-debugger>
 * A high-fidelity, real-time visualizer for window.eventLogs.
 * Features auto-refreshing, JSON inspection, and sleek developer-centric UI.
 */
class VibeEventDebugger extends HTMLElement {
  static get observedAttributes() {
    return [
      'accent-primary-color',
      'refresh-interval-ms',
      'max-visible-entries',
      'is-collapsed-initially'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._logs = [];
    this._expandedIndices = new Set();
    this._refreshTimer = null;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === 'refresh-interval-ms') {
        this._setupPolling();
      }
      this._render();
    }
  }

  connectedCallback() {
    this._setupPolling();
    this._render();
  }

  disconnectedCallback() {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
  }

  _setupPolling() {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
    const ms = parseInt(this.getAttribute('refresh-interval-ms')) || 1000;
    this._refreshTimer = setInterval(() => this._syncLogs(), ms);
  }

  _syncLogs() {
    const rawLogs = window.eventLogs || [];
    const limit = parseInt(this.getAttribute('max-visible-entries')) || 50;
    // We only re-render if the log length or content changed to save cycles
    if (rawLogs.length !== this._logs.length) {
      this._logs = [...rawLogs].reverse().slice(0, limit);
      this._render();
    }
  }

  _toggleExpand(index) {
    if (this._expandedIndices.has(index)) {
      this._expandedIndices.delete(index);
    } else {
      this._expandedIndices.add(index);
    }
    this._render();
  }

  _clearLogs() {
    window.eventLogs = [];
    this._logs = [];
    this._expandedIndices.clear();
    this._render();
  }

  _deleteLog(e, actualIndex) {
    e.stopPropagation();
    // Since we are viewing a reversed slice, we find the index in the actual window.eventLogs
    const targetIndex = (window.eventLogs.length - 1) - actualIndex;
    if (targetIndex > -1) {
      window.eventLogs.splice(targetIndex, 1);
    }
    this._syncLogs();
  }

  _render() {
    const accent = this.getAttribute('accent-primary-color') || '#00ff9d';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: 'SF Mono', 'Fira Code', monospace;
          background: #121212;
          color: #e0e0e0;
          border: 1px solid #333;
          border-radius: 8px;
          overflow: hidden;
          max-width: 100%;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          user-select: none;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          background: #1a1a1a;
          border-bottom: 1px solid #333;
        }

        .title {
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: ${accent};
        }

        .controls {
          display: flex;
          gap: 10px;
        }

        .btn {
          background: transparent;
          border: 1px solid #444;
          color: #ccc;
          padding: 4px 8px;
          font-size: 10px;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .btn:hover {
          background: #333;
          border-color: ${accent};
          color: white;
        }

        .log-container {
          max-height: 400px;
          overflow-y: auto;
        }

        .log-item {
          border-bottom: 1px solid #222;
          padding: 8px 12px;
          cursor: pointer;
          transition: background 0.1s ease;
        }

        .log-item:hover {
          background: #181818;
        }

        .log-summary {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 11px;
        }

        .timestamp {
          color: #666;
          min-width: 75px;
        }

        .event-type {
          color: white;
          font-weight: 600;
          flex-grow: 1;
        }

        .target-tag {
          background: #333;
          padding: 2px 5px;
          border-radius: 3px;
          font-size: 9px;
          color: ${accent};
        }

        .log-details {
          margin-top: 8px;
          padding: 8px;
          background: #080808;
          border-radius: 4px;
          font-size: 10px;
          color: #aaa;
          white-space: pre-wrap;
          word-break: break-all;
          border-left: 2px solid ${accent};
        }

        .empty-state {
          padding: 40px;
          text-align: center;
          color: #555;
          font-style: italic;
          font-size: 12px;
        }

        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 3px;
        }
      </style>

      <div class="header">
        <div class="title">Event Logs [${this._logs.length}]</div>
        <div class="controls">
          <button class="btn" id="refresh-btn">Sync</button>
          <button class="btn" id="clear-btn">Clear All</button>
        </div>
      </div>

      <div class="log-container">
        ${this._logs.length === 0 ? '<div class="empty-state">No events captured...</div>' : ''}
        ${this._logs.map((log, index) => {
          const isExpanded = this._expandedIndices.has(index);
          const time = new Date(log.time).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
          return `
            <div class="log-item" data-index="${index}">
              <div class="log-summary">
                <span class="timestamp">${time}</span>
                <span class="event-type">${log.type}</span>
                <span class="target-tag">&lt;${log.target.toLowerCase()}&gt;</span>
                <button class="btn delete-single" data-index="${index}">×</button>
              </div>
              ${isExpanded ? `
                <div class="log-details">${JSON.stringify(log.detail, null, 2)}</div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;

    this._attachEventListeners();
  }

  _attachEventListeners() {
    this.shadowRoot.getElementById('clear-btn').addEventListener('click', () => this._clearLogs());
    this.shadowRoot.getElementById('refresh-btn').addEventListener('click', () => this._syncLogs());
    
    this.shadowRoot.querySelectorAll('.log-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.getAttribute('data-index'));
        this._toggleExpand(index);
      });
    });

    this.shadowRoot.querySelectorAll('.delete-single').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(btn.getAttribute('data-index'));
        this._deleteLog(e, index);
      });
    });
  }
}

customElements.define('vibe-event-debugger', VibeEventDebugger);
