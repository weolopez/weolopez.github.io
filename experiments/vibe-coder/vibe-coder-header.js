class VibeCoderHeader extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css">
            <style>
                header {
                    height: 3.5rem;
                    border-bottom: 1px solid #334155;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding-left: 1.5rem;
                    padding-right: 1.5rem;
                    background-color: #0f172a;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    z-index: 50;
                }
                .logo-section {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .logo, .chat-toggle {
                    width: 2rem;
                    height: 2rem;
                    background-color: #0ea5e9;
                    border-radius: 0.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 10px 15px -3px rgba(14, 165, 233, 0.1), 0 4px 6px -2px rgba(14, 165, 233, 0.05);
                    cursor: pointer;
                    transition: transform 0.1s;
                }
                .logo:active, .chat-toggle:active {
                    transform: scale(0.95);
                }
                .logo i, .chat-toggle i {
                    color: white;
                    font-size: 0.875rem;
                }
                h1 {
                    font-weight: 700;
                    font-size: 1.125rem;
                    letter-spacing: -0.025em;
                }
                .sky-text {
                    color: #0ea5e9;
                }
                .status-badge {
                    padding-left: 0.75rem;
                    padding-right: 0.75rem;
                    padding-top: 0.25rem;
                    padding-bottom: 0.25rem;
                    border-radius: 9999px;
                    background-color: #1e293b;
                    font-size: 0.625rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    border: 1px solid #334155;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .status-dot {
                    width: 0.5rem;
                    height: 0.5rem;
                    border-radius: 9999px;
                    background-color: #22c55e;
                    box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
                }
            </style>
            <header>
                <div class="logo-section">
                    <div id="toggle-sidebar" class="logo">
                        <i class="fas fa-terminal"></i>
                    </div>
                    <h1>Vibe<span class="sky-text">Coder</span></h1>
                </div>
                <div class="flex items-center gap-3">
                    <div id="toggle-chat" class="chat-toggle">
                        <i class="fas fa-comment-dots"></i>
                    </div>
                    <div class="status-badge">
                        <span class="status-dot"></span>
                        Canvas Live
                    </div>
                </div>
            </header>
        `;

                const toggleSidebarBtn = this.shadowRoot.querySelector('#toggle-sidebar');
                const sidePanel = document.querySelector('side-panel');

                if (toggleSidebarBtn) {
                    toggleSidebarBtn.onclick = () => sidePanel.toggle();
                }

                const toggleChatBtn = this.shadowRoot.querySelector('#toggle-chat');
                if (toggleChatBtn) {
                    toggleChatBtn.onclick = () => {
                        this.dispatchEvent(new CustomEvent('toggle-chat', {
                            bubbles: true,
                            composed: true
                        }));
                    };
                }
    }
}

customElements.define('vibe-coder-header', VibeCoderHeader);