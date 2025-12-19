export class ColorBox extends HTMLElement {
  static observedAttributes = ['color'];
  attributeChangedCallback(_, __, v) { this.color = v; this.render(); }
  connectedCallback() { this.render(); }
  render() {
    this.innerHTML = `<div style="border:1px solid var(--border);border-radius:12px;padding:16px;"><h3>Color Box</h3><div style="height:80px;border-radius:8px;background:${this.color}"></div></div>`;
  }
}

if (!customElements.get('color-box')) {
  customElements.define('color-box', ColorBox);
}
