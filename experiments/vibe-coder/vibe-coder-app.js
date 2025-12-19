class VibeCoderApp extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    background-color: #020617;
                    color: #f1f5f9;
                    overflow: hidden;
                    font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
                }
                main {
                    flex: 1;
                    display: flex;
                    overflow: hidden;
                }
                .right-section {
                    width: 50vw;
                    display: flex;
                    flex-direction: row;
                    background-color: #020617;
                    border-left: 1px solid #1e293b;
                }
                .canvas-area {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
            </style>
            <vibe-coder-header></vibe-coder-header>
            <main>
                <vibe-coder-chat></vibe-coder-chat>
                <div class="right-section">
                    <div class="canvas-area">
                        <vibe-coder-canvas></vibe-coder-canvas>
                    </div>
                    <vibe-coder-controls></vibe-coder-controls>
                </div>
            </main>
        `;

        this.chat = this.shadowRoot.querySelector('vibe-coder-chat');
        this.canvas = this.shadowRoot.querySelector('vibe-coder-canvas');
        this.controls = this.shadowRoot.querySelector('vibe-coder-controls');

        // Event listeners will be set up in the main script
    }
}

customElements.define('vibe-coder-app', VibeCoderApp);