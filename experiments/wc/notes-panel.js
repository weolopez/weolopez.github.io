export class NotesPanel extends HTMLElement {
  static observedAttributes = ['note'];
  attributeChangedCallback(_, __, v) { this.notes = this.notes || []; this.notes.push(v); this.render(); }
  connectedCallback() { this.notes = []; this.render(); }
  render() {
    this.innerHTML = `<div style="border:1px solid var(--border);border-radius:12px;padding:16px;"><h3>Notes</h3><ul>${this.notes.map(n => `<li>${n}</li>`).join('')}</ul></div>`;
  }
}

if (!customElements.get('notes-panel')) {
  customElements.define('notes-panel', NotesPanel);
}
