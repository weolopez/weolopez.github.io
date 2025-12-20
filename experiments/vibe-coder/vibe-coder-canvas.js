class VibeCoderCanvas extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css">
            <style>
                :host {
                    display: block;
                    height: 100%;
                }
                section {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background-color: #020617;
                }
                .canvas-header {
                    height: 3.5rem;
                    border-bottom: 1px solid #1e293b;
                    display: flex;
                    align-items: center;
                    padding: 0 1.5rem;
                    background-color: rgba(15, 23, 42, 0.9);
                    backdrop-filter: blur(8px);
                    gap: 1.5rem;
                    z-index: 20;
                }
                .selector-section {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .selector-label {
                    font-size: 0.7rem;
                    font-weight: 800;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                select {
                    background-color: #0f172a;
                    border: 1px solid #334155;
                    color: #f1f5f9;
                    font-size: 0.8rem;
                    font-weight: 600;
                    border-radius: 0.5rem;
                    padding: 0.4rem 2rem 0.4rem 0.75rem;
                    outline: none;
                    min-width: 200px;
                    cursor: pointer;
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 0.5rem center;
                    background-size: 1rem;
                    transition: all 0.2s;
                }
                select:hover {
                    border-color: #475569;
                    background-color: #1e293b;
                }
                select:focus {
                    border-color: #0ea5e9;
                    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
                }
                .divider {
                    height: 1.25rem;
                    width: 1px;
                    background-color: #1e293b;
                }
                .reset-btn {
                    font-size: 0.7rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #64748b;
                    transition: all 0.2s;
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid #334155;
                    padding: 0.4rem 0.75rem;
                    border-radius: 0.5rem;
                    cursor: pointer;
                }
                .reset-btn:hover {
                    color: #f1f5f9;
                    background: rgba(30, 41, 59, 0.8);
                    border-color: #475569;
                }
                .canvas-area {
                    flex: 1;
                    display: flex;
                    overflow: hidden;
                    position: relative;
                }
                .canvas-container {
                    background-image: radial-gradient(circle at 2px 2px, #1e293b 1px, transparent 0);
                    background-size: 24px 24px;
                    background-color: #020617;
                    flex-grow: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    overflow: auto;
                }
                .canvas-stage {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                }
                .empty-state {
                    color: #334155;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1.5rem;
                    user-select: none;
                }
                .empty-state i {
                    font-size: 3.5rem;
                    color: #0ea5e9;
                    opacity: 0.2;
                    animation: spin 12s linear infinite;
                }
                .empty-state p {
                    font-size: 0.75rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.25em;
                    color: #475569;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            </style>
            <section>
                <div class="canvas-header">
                    <div class="selector-section">
                        <label class="selector-label">Active Instance</label>
                        <select>
                            <option value="">(No Components)</option>
                        </select>
                    </div>
                    <div class="divider"></div>
                    <button class="reset-btn">
                        <i class="fas fa-sync-alt"></i> Redraw
                    </button>
                </div>
                <div class="canvas-area">
                    <div class="canvas-container">
                        <div class="canvas-stage">
                            <div class="empty-state">
                                <i class="fas fa-atom"></i>
                                <p>Canvas Ready</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;

        this.selector = this.shadowRoot.querySelector('select');
        this.resetBtn = this.shadowRoot.querySelector('.reset-btn');
        this.canvasStage = this.shadowRoot.querySelector('.canvas-stage');

        this.selector.addEventListener('change', (e) => {
            this.dispatchEvent(new CustomEvent('component-selected', { detail: { tag: e.target.value }, bubbles: true }));
        });
        this.resetBtn.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('reset-canvas', { bubbles: true }));
        });

        // Listen for play-code events to update the canvas
        document.addEventListener('vibe-coder-play-code', (e) => {
            const { code } = e.detail;
            // The actual registration and UI sync is handled in vibe-coder.js
            // but we can ensure the canvas is ready or perform local updates if needed.
            console.log('Canvas received play-code event');
        });
    }

    updateStage(tag) {
        this.canvasStage.innerHTML = '';
        if (tag) {
            const el = document.createElement(tag);
            el.id = 'active-component'; // Give it an ID so tools can find it easily
            this.canvasStage.appendChild(el);
        } else {
            this.canvasStage.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-atom"></i>
                    <p>Canvas Ready</p>
                </div>
            `;
        }
    }

    syncSelector(tags, active) {
        this.selector.innerHTML = '';
        if (tags.length === 0) {
            this.selector.innerHTML = '<option value="">(No Components)</option>';
            return;
        }
        tags.forEach(tag => {
            const opt = document.createElement('option');
            opt.value = tag;
            opt.textContent = tag;
            opt.selected = (tag === active);
            this.selector.appendChild(opt);
        });
    }
}

customElements.define('vibe-coder-canvas', VibeCoderCanvas);