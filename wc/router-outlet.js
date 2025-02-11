class RouteOutlet extends HTMLElement {
    constructor() {
        super();
        this.updateHash = this.updateHash.bind(this);
    }

    connectedCallback() {
        window.addEventListener('hashchange', this.updateHash);
        // Initialize display with current hash value
        this.updateHash();
    }

    disconnectedCallback() {
        window.removeEventListener('hashchange', this.updateHash);
    }

    updateHash() {
        // Remove the '#' if it exists
        let hash = window.location.hash.replace(/^#/, '');
        // Update component content with hash text; if no hash provided, use a default text.
        // this.textContent = hash ? hash : 'No hash provided';
        if (hash) {
            this.loadPage(hash);
          } else {
            this.loadPage('wiki_ike');
          }
    }
    loadPage(hash) {
      // Clear the outlet before loading new content
      this.innerHTML = '';
      
      // Create and append the script tag for the page component
      const script = document.createElement('script');
      script.src = `../pages/${hash}-page.js`;
      script.type = 'module';
      
      script.onload = () => {
        // After the script loads, create the custom element tag and append it
        const pageElement = document.createElement(`${hash}-page`);
        this.appendChild(pageElement);
      };
      
      script.onerror = () => {
        this.loadPage('wiki-editor')
      };
      
      this.appendChild(script);
    }
}

customElements.define('router-outlet', RouteOutlet);