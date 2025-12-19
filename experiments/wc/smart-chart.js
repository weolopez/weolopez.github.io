class SmartChart extends HTMLElement {
  static get observedAttributes() {
    return ['chart-data-values', 'chart-display-label'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._data = [10, 20, 30, 40];
    this._label = "Sales";
  }

  get chartDataValues() {
    const attr = this.getAttribute('chart-data-values');
    try {
      return attr ? JSON.parse(attr) : this._data;
    } catch (e) {
      return this._data;
    }
  }

  set chartDataValues(value) {
    this.setAttribute('chart-data-values', JSON.stringify(value));
  }

  get chartDisplayLabel() {
    return this.getAttribute('chart-display-label') || this._label;
  }

  set chartDisplayLabel(value) {
    this.setAttribute('chart-display-label', value);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  update_chart({ values, label }) {
    if (values) this.chartDataValues = values;
    if (label) this.chartDisplayLabel = label;
    return `Chart updated with ${values ? values.length : 0} data points.`;
  }

  connectedCallback() { this.render(); }

  render() {
    const data = this.chartDataValues;
    const label = this.chartDisplayLabel;
    const max = Math.max(...data, 1);
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; background: #1e1e1e; border: 1px solid #333; padding: 15px; border-radius: 12px; min-width: 250px; color: white; }
        .bars { display: flex; align-items: flex-end; gap: 8px; height: 100px; margin-top: 10px; }
        .bar { background: #3b82f6; flex: 1; transition: height 0.5s ease; border-radius: 4px 4px 0 0; }
        .label { font-size: 0.8rem; color: #888; text-transform: uppercase; margin-bottom: 5px; }
      </style>
      <div class="label">${label}</div>
      <div class="bars">
        ${data.map(v => `<div class="bar" style="height: ${(v / max) * 100}%"></div>`).join('')}
      </div>
    `;
  }
}
customElements.define('smart-chart', SmartChart);
