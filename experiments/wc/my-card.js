/**
 * Define your Web Component below!
 * The preview will automatically render the tag.
 */

export class MyCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { 
          display: block; 
          padding: 20px; 
          background: #f0f4ff; 
          border-radius: 12px;
          font-family: sans-serif;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        h2 { color: #007acc; margin-top: 0; }
        button { cursor: pointer; background: #007acc; color: white; border: none; padding: 8px 16px; border-radius: 4px; }
      </style>
      <h2>Hello Web Components!</h2>
      <p>Click the button to update state.</p>
      <button id='btn'>Clicks: 0</button>
    `;
    this.count = 0;
  }

  connectedCallback() {
    this.shadowRoot.querySelector('#btn').onclick = () => {
      this.count++;
      this.shadowRoot.querySelector('#btn').textContent = 'Clicks: ' + this.count;
    };
  }
}

if (!customElements.get('my-card')) {
  customElements.define('my-card', MyCard);
}
