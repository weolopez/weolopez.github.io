export class CounterCard extends HTMLElement {
  static observedAttributes = ['value'];
  attributeChangedCallback(_, __, v) { this.value = v; this.render(); }
  connectedCallback() { this.render(); }
  render() {
    this.innerHTML = `<div style="border:1px solid var(--border);border-radius:12px;padding:16px;"><h3>Counter</h3><div style="font-size:32px;font-weight:600;">${this.value}</div></div>`;
  }
}

if (!customElements.get('counter-card')) {
  customElements.define('counter-card', CounterCard);
}
