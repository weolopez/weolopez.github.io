class ExtensionSidePane extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
  
      // Create template content
      const template = document.createElement('template');
      template.innerHTML = `
        <style>
          :host {
            display: block;
            width: 250px;
            font-family: Arial, sans-serif;
            background-color: #f1f1f1;
            height: 100vh;
            overflow-y: auto;
          }
          h2 {
            text-align: center;
            background-color: #673AB7;
            color: white;
            margin: 0;
            padding: 15px 0;
          }
          .content {
            padding: 15px;
          }
          .item {
            background-color: white;
            margin-bottom: 10px;
            padding: 10px;
            border-radius: 5px;
          }
          .item h3 {
            margin-top: 0;
          }
        </style>
        <h2>Side Pane</h2>
        <div class="content" id="contentArea">
          <!-- Dynamic content will be loaded here -->
        </div>
      `;
  
      this.shadowRoot.appendChild(template.content.cloneNode(true));
    }
  
    connectedCallback() {
      this.loadContent();
    }
  
    // Load content dynamically
    loadContent() {
      // Simulate fetching data
      const data = [
        { title: 'Item 1', description: 'Description for item 1.' },
        { title: 'Item 2', description: 'Description for item 2.' },
        { title: 'Item 3', description: 'Description for item 3.' },
      ];
  
      const contentArea = this.shadowRoot.getElementById('contentArea');
  
      data.forEach((item) => {
        const itemElement = document.createElement('div');
        itemElement.classList.add('item');
        itemElement.innerHTML = `
          <h3>${item.title}</h3>
          <p>${item.description}</p>
        `;
        contentArea.appendChild(itemElement);
      });
    }
  }
  
  customElements.define('extension-side-pane', ExtensionSidePane);
  