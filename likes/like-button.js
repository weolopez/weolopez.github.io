const TEMPLATE = document.createElement("template");
TEMPLATE.innerHTML = `
<style>
  :host {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    font-family: 'Segoe UI', system-ui, sans-serif;
    position: relative;
  }
  .count {
    font-size: 1.4rem;
    font-weight: 900;
    color: var(--like-color, #0052B4);
    line-height: 1;
    font-variant-numeric: tabular-nums;
    transition: transform 0.12s ease;
  }
  .count.bump { transform: scale(1.2); }
  .count-label {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #6B7280;
  }
  button {
    width: var(--like-size, 64px);
    height: var(--like-size, 64px);
    border-radius: 50%;
    border: none;
    cursor: pointer;
    background: linear-gradient(135deg, var(--like-color, #0052B4), #0066e0);
    color: #fff;
    font-size: calc(var(--like-size, 64px) * 0.45);
    line-height: 1;
    box-shadow: 0 6px 18px rgba(0,82,180,0.35), inset 0 -3px 8px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.1s ease, box-shadow 0.1s ease;
    -webkit-tap-highlight-color: transparent;
  }
  button:active { transform: scale(0.9); box-shadow: 0 3px 10px rgba(0,82,180,0.3); }
  button.liked {
    background: linear-gradient(135deg, #ff3b6b, #ff5e8a);
    box-shadow: 0 6px 18px rgba(255,59,107,0.4), inset 0 -3px 8px rgba(0,0,0,0.15);
  }
  .heart {
    position: fixed;
    pointer-events: none;
    animation: float-up 0.9s ease-out forwards;
  }
  @keyframes float-up {
    0%   { opacity: 1; transform: translateY(0) scale(0.6); }
    100% { opacity: 0; transform: translateY(-120px) scale(1.4); }
  }
</style>
<div class="count" part="count">0</div>
<div class="count-label" part="label">likes</div>
<button part="button" aria-label="Like">🤍</button>
`;

class LikeButton extends HTMLElement {
  static get observedAttributes() { return ["namespace", "api-base"]; }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this._count = 0;
    this._liked = false;
  }

  connectedCallback() {
    this.shadowRoot.querySelector("button").addEventListener("click", () => this._like());
    this._load();
  }

  attributeChangedCallback() {
    if (this.isConnected) this._load();
  }

  get namespace() {
    return this.getAttribute("namespace") || "default";
  }

  get apiBase() {
    return this.getAttribute("api-base") || "/likes/api";
  }

  _url(action) {
    return `${this.apiBase}/${action}?ns=${encodeURIComponent(this.namespace)}`;
  }

  async _load() {
    try {
      const res = await fetch(this._url("count"));
      if (res.ok) {
        const { count } = await res.json();
        this._count = count;
        this._render();
      }
    } catch {}
  }

  async _like() {
    this._count++;
    this._liked = true;
    this._render();
    this._burst();
    if (navigator.vibrate) navigator.vibrate(8);
    try {
      const res = await fetch(this._url("like"), { method: "POST" });
      if (res.ok) {
        const { count } = await res.json();
        this._count = count;
        this._render();
      }
    } catch {}
  }

  _render() {
    const countEl = this.shadowRoot.querySelector(".count");
    const btn = this.shadowRoot.querySelector("button");
    countEl.textContent = this._count.toLocaleString();
    btn.textContent = this._liked ? "❤️" : "🤍";
    btn.classList.toggle("liked", this._liked);
    countEl.classList.add("bump");
    clearTimeout(this._bumpTimer);
    this._bumpTimer = setTimeout(() => countEl.classList.remove("bump"), 130);
  }

  _burst() {
    const r = this.shadowRoot.querySelector("button").getBoundingClientRect();
    const fontSize = parseInt(getComputedStyle(this).getPropertyValue("--like-size") || "64");
    const h = document.createElement("div");
    h.className = "heart";
    h.textContent = "❤️";
    h.style.cssText = `
      font-size: ${Math.max(fontSize * 0.4, 16)}px;
      left: ${r.left + r.width / 2 - 10 + (Math.random() * 30 - 15)}px;
      top: ${r.top + 10}px;
    `;
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 900);
  }
}

customElements.define("like-button", LikeButton);
