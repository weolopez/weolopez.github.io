// Code for wikipedia-search.js
/**
 * WikipediaSearch component
 * A very modern, self-contained web component that fetches and displays Wikipedia search results.
 * 
 * Attributes:
 * - data-search-term-value: The initial or current search query.
 * - data-max-results-count: Limit the number of results returned (default: 5).
 * - data-accent-color-theme: Hex or CSS color for the UI highlights (default: #0066cc).
 */
class WikipediaSearch extends HTMLElement {
  static get observedAttributes() {
    return [
      'data-search-term-value',
      'data-max-results-count',
      'data-accent-color-theme'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._results = [];
    this._isSearching = false;
  }

  connectedCallback() {
    this._render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === 'data-search-term-value' && newValue) {
        this._fetchWikipediaData(newValue);
      }
      this._render();
    }
  }

  async _fetchWikipediaData(query) {
    if (!query) return;
    
    const limit = this.getAttribute('data-max-results-count') || 5;
    const endpoint = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&format=json&origin=*`;

    this._isSearching = true;
    this._render();

    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      this._results = data.query?.search || [];
    } catch (error) {
      console.error('Wikipedia Fetch Error:', error);
      this._results = [];
    } finally {
      this._isSearching = false;
      this._render();
    }
  }

  _handleSearch(e) {
    e.preventDefault();
    const input = this.shadowRoot.querySelector('input');
    const query = input.value.trim();
    if (query) {
      this.setAttribute('data-search-term-value', query);
    }
  }

  _render() {
    const accentColor = this.getAttribute('data-accent-color-theme') || '#0066cc';
    const searchTerm = this.getAttribute('data-search-term-value') || '';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 600px;
          margin: 1rem auto;
          color: #333;
        }
        .search-container {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
        }
        input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
          outline: none;
          transition: border-color 0.2s;
        }
        input:focus {
          border-color: ${accentColor};
        }
        button {
          padding: 12px 24px;
          background: ${accentColor};
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        button:hover {
          opacity: 0.9;
        }
        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .results-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .result-item {
          padding: 16px;
          border-bottom: 1px solid #eee;
          transition: background 0.2s;
        }
        .result-item:hover {
          background: #f9f9f9;
        }
        .result-title {
          font-size: 18px;
          margin: 0 0 8px 0;
          color: ${accentColor};
          text-decoration: none;
          display: block;
          font-weight: bold;
        }
        .result-snippet {
          font-size: 14px;
          line-height: 1.5;
          color: #666;
        }
        .result-snippet b {
          color: #000;
          background: rgba(255, 255, 0, 0.2);
        }
        .loader {
          text-align: center;
          padding: 20px;
          color: #666;
          font-style: italic;
        }
        .empty-state {
          text-align: center;
          padding: 40px;
          color: #999;
        }
      </style>

      <form class="search-container" id="search-form">
        <input 
          type="text" 
          placeholder="Search Wikipedia..." 
          value="${searchTerm}"
          aria-label="Search Query"
        />
        <button type="submit" ${this._isSearching ? 'disabled' : ''}>
          ${this._isSearching ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div class="results-wrapper">
        ${this._isSearching ? '<div class="loader">Querying the knowledge of the world...</div>' : ''}
        
        ${!this._isSearching && this._results.length > 0 ? `
          <ul class="results-list">
            ${this._results.map(item => `
              <li class="result-item">
                <a class="result-title" href="https://en.wikipedia.org/?curid=${item.pageid}" target="_blank" rel="noopener">
                  ${item.title}
                </a>
                <div class="result-snippet">${item.snippet}...</div>
              </li>
            `).join('')}
          </ul>
        ` : ''}

        ${!this._isSearching && this._results.length === 0 && searchTerm ? `
          <div class="empty-state">No results found for "${searchTerm}"</div>
        ` : ''}
      </div>
    `;

    this.shadowRoot.querySelector('#search-form').addEventListener('submit', (e) => this._handleSearch(e));
  }
}

customElements.define('wikipedia-search-widget', WikipediaSearch);