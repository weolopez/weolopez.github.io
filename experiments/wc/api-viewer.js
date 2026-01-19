import { getCanvasAPIs } from '../js/llm-tools.js';

export class ApiViewer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.apis = [];
  }

  static get observedAttributes() {
    return ['selector'];
  }

  connectedCallback() {
    this.render();
    // Delay slightly to ensure DOM is ready if placed immediately
    setTimeout(() => this.refresh(), 0);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'selector' && oldValue !== newValue) {
      this.refresh();
    }
  }

  refresh() {
    const selector = this.getAttribute('selector') || 'body';
    console.log('ApiViewer: Refreshing for:', selector);
    try {
      this.apis = getCanvasAPIs(selector, document);
      console.log('ApiViewer: APIs found:', this.apis);
      this.renderData();
    } catch (e) {
      console.error("Error fetching APIs", e);
      this.apis = [];
      this.renderData();
    }
  }

  groupApis(apis) {
    const groups = {};
    apis.forEach(api => {
      const id = api.id || '(no-id)';
      const key = `${api.tag}#${id}`;
      if (!groups[key]) {
        groups[key] = {
          tag: api.tag,
          id: id,
          items: []
        };
      }
      groups[key].items.push(api);
    });
    return Object.values(groups);
  }

  renderData() {
    const container = this.shadowRoot.querySelector('.api-container');
    if (!container) return;

    if (this.apis.length === 0) {
      container.innerHTML = '<div class="empty-state">No components found.</div>';
      return;
    }

    const groups = this.groupApis(this.apis);
    
    container.innerHTML = groups.map(group => `
      <div class="component-card">
        <div class="component-header">
          <span class="tag-name">&lt;${group.tag}&gt;</span>
          <span class="component-id">${group.id !== '(no-id)' ? '#' + group.id : '<i>No ID</i>'}</span>
        </div>
        <div class="api-list">
          ${group.items.map(item => `
            <div class="api-item">
              <div class="api-desc">${item.description}</div>
              <div class="api-attrs">
                ${item.attributes.map(attr => `<span class="attr-badge">${attr}</span>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #e9ecef;
          max-width: 800px;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        h2 {
          margin: 0;
          font-size: 1.25rem;
          color: #212529;
        }

        button {
          background: #007bff;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: background 0.2s;
        }

        button:hover {
          background: #0056b3;
        }

        .api-container {
          display: grid;
          gap: 1rem;
        }

        .component-card {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .component-header {
          background: #e9ecef;
          padding: 0.75rem 1rem;
          display: flex;
          gap: 0.5rem;
          align-items: center;
          border-bottom: 1px solid #dee2e6;
        }

        .tag-name {
          font-family: monospace;
          color: #d63384;
          font-weight: bold;
        }

        .component-id {
          font-family: monospace;
          color: #6c757d;
          background: #dee2e6; /* slight contrast against header bg? actually header is already this color */
          background: rgba(0,0,0,0.05);
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
        }

        .api-list {
          padding: 0.5rem 0;
        }

        .api-item {
          padding: 0.5rem 1rem;
          border-bottom: 1px solid #f1f3f5;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .api-item:last-child {
          border-bottom: none;
        }

        .api-desc {
          color: #495057;
          font-size: 0.9rem;
        }

        .attr-badge {
          background: #e7f5ff;
          color: #007bff;
          padding: 0.2rem 0.5rem;
          border-radius: 99px;
          font-size: 0.75rem;
          font-family: monospace;
          font-weight: 500;
        }

        .empty-state {
          text-align: center;
          color: #868e96;
          padding: 2rem;
        }
      </style>
      
      <div class="header">
        <h2>Component API Explorer</h2>
        <button id="refreshBtn">Refresh</button>
      </div>
      <div class="api-container">
        <!-- Content goes here -->
      </div>
    `;

    const refreshBtn = this.shadowRoot.querySelector('#refreshBtn');
    if (refreshBtn) {
      refreshBtn.onclick = () => this.refresh();
    }
  }
}

customElements.define('api-viewer', ApiViewer);
