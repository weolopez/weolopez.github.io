// Code for google-component.js
/**
 * VibeGoogleSearch - A high-vibe, modern search component that facilitates
 * Google searches with a customizable UI.
 * 
 * Attributes:
 * - search-placeholder-text: The text shown in the empty input.
 * - action-button-label: The text on the search button.
 * - accent-brand-color: The primary color for borders and focus states.
 * - open-in-new-tab: Boolean string ("true"/"false") to control target behavior.
 */
class VibeGoogleSearch extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return [
      'search-placeholder-text',
      'action-button-label',
      'accent-brand-color',
      'open-in-new-tab'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  handleSearch() {
    const input = this.shadowRoot.querySelector('input');
    const query = input.value.trim();
    if (query) {
      const isNewTab = this.getAttribute('open-in-new-tab') !== 'false';
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      window.open(searchUrl, isNewTab ? '_blank' : '_self');
    }
  }

  render() {
    const placeholder = this.getAttribute('search-placeholder-text') || 'Search the universe...';
    const buttonLabel = this.getAttribute('action-button-label') || 'Search';
    const accentColor = this.getAttribute('accent-brand-color') || '#4285f4';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          --vibe-accent: ${accentColor};
          --vibe-bg: #ffffff;
          --vibe-text: #202124;
          --vibe-border: #dfe1e5;
          --vibe-shadow: 0 1px 6px rgba(32,33,36,0.28);
        }

        .search-container {
          display: flex;
          align-items: center;
          background: var(--vibe-bg);
          border: 1px solid var(--vibe-border);
          border-radius: 24px;
          padding: 6px 16px;
          transition: box-shadow 0.2s ease-in-out, border-color 0.2s;
          max-width: 100%;
        }

        .search-container:hover, .search-container:focus-within {
          box-shadow: var(--vibe-shadow);
          border-color: rgba(223, 225, 229, 0);
        }

        .search-icon {
          color: #9aa0a6;
          margin-right: 12px;
          display: flex;
          align-items: center;
        }

        input {
          flex: 1;
          border: none;
          outline: none;
          padding: 8px 0;
          font-size: 16px;
          color: var(--vibe-text);
          background: transparent;
        }

        button {
          background: var(--vibe-accent);
          color: white;
          border: none;
          border-radius: 18px;
          padding: 8px 20px;
          margin-left: 10px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: filter 0.2s;
          white-space: nowrap;
        }

        button:hover {
          filter: brightness(0.9);
        }

        button:active {
          transform: scale(0.98);
        }

        svg {
          width: 20px;
          height: 20px;
          fill: currentColor;
        }
      </style>
      <div class="search-container">
        <div class="search-icon">
          <svg focusable="false" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path></svg>
        </div>
        <input type="text" placeholder="${placeholder}" aria-label="Search" />
        <button type="button">${buttonLabel}</button>
      </div>
    `;

    this.shadowRoot.querySelector('button').addEventListener('click', () => this.handleSearch());
    this.shadowRoot.querySelector('input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSearch();
    });
  }
}

customElements.define('vibe-google-search', VibeGoogleSearch);