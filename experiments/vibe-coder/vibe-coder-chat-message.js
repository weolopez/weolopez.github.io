class VibeCoderChatMessage extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['role', 'text', 'is-loading'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        this.render();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        const role = this.getAttribute('role') || 'ai';
        const text = decodeURIComponent(this.getAttribute('text') || '');
        const isLoading = (this.getAttribute('is-loading') === 'true');

        this.shadowRoot.innerHTML = `
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css">
            <style>
                :host {
                    display: block;
                    width: 100%;
                }
                .message-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .message-label {
                    font-size: 0.65rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                    margin-bottom: 0.25rem;
                }
                .user-label { color: #0ea5e9; text-align: right; }
                .ai-label { color: #94a3b8; }

                .user-message {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                }
                .ai-message {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                }
                .user-bubble {
                    background: linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%);
                    border: 1px solid rgba(14, 165, 233, 0.3);
                    padding: 1rem 1.25rem;
                    border-radius: 1.25rem;
                    border-bottom-right-radius: 0.25rem;
                    font-size: 0.9375rem;
                    color: #e0f2fe;
                    max-width: 90%;
                    box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.2);
                    word-break: break-word;
                }
                .ai-bubble {
                    background-color: #1e293b;
                    border: 1px solid #334155;
                    padding: 1rem 1.25rem;
                    border-radius: 1.25rem;
                    border-bottom-left-radius: 0.25rem;
                    font-size: 0.9375rem;
                    color: #f1f5f9;
                    max-width: 40vw;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
                    word-break: break-word;
                }
                .ai-bubble.pulse {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                    border-color: #0ea5e9;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(0.99); }
                }
                code {
                    background: #0f172a;
                    padding: 0.2rem 0.4rem;
                    border-radius: 0.25rem;
                    color: #38bdf8;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.85rem;
                }
                pre {
                    background: #020617;
                    padding: 1rem;
                    border-radius: 0.75rem;
                    overflow-x: auto;
                    margin: 0.75rem 0;
                    border: 1px solid #1e293b;
                }
                pre code {
                    background: transparent;
                    padding: 0;
                    color: #e2e8f0;
                    font-size: 0.8rem;
                    line-height: 1.5;
                }
                .code-container {
                    position: relative;
                    margin: 0.75rem 0;
                }
                .code-toolbar {
                    position: absolute;
                    top: 0.5rem;
                    right: 0.5rem;
                    display: flex;
                    gap: 0.5rem;
                    opacity: 0;
                    transition: opacity 0.2s;
                    z-index: 10;
                }
                .code-container:hover .code-toolbar {
                    opacity: 1;
                }
                .toolbar-btn {
                    background: rgba(30, 41, 59, 0.8);
                    border: 1px solid #334155;
                    color: #94a3b8;
                    padding: 0.3rem;
                    border-radius: 0.4rem;
                    cursor: pointer;
                    font-size: 0.75rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 1.75rem;
                    height: 1.75rem;
                    transition: all 0.2s;
                }
                .toolbar-btn:hover {
                    color: #f1f5f9;
                    background: #334155;
                    border-color: #475569;
                }
                .toolbar-btn.play-btn:hover {
                    color: #22c55e;
                    border-color: #22c55e;
                }

                /* Message Actions Toolbar */
                .message-content-wrapper {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: inherit;
                    width: 100%;
                }
                .message-actions {
                    display: flex;
                    gap: 0.5rem;
                    margin-top: 0.25rem;
                    opacity: 0;
                    transition: opacity 0.2s;
                    padding: 0 0.5rem;
                }
                .message-content-wrapper:hover .message-actions {
                    opacity: 1;
                }
                .action-btn {
                    background: none;
                    border: none;
                    color: #64748b;
                    cursor: pointer;
                    padding: 0.25rem;
                    font-size: 0.85rem;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .action-btn:hover {
                    color: #f1f5f9;
                }
                .action-btn.delete-msg-btn:hover {
                    color: #ef4444;
                }
                .action-btn.active {
                    color: #0ea5e9;
                }
            </style>
            <div class="${role === 'user' ? 'user-message' : 'ai-message'}">
                <div class="message-label ${role === 'user' ? 'user-label' : 'ai-label'}">
                    ${role === 'user' ? 'You' : 'Vibe Coder'}
                </div>
                <div class="message-content-wrapper">
                    <div class="${role === 'user' ? 'user-bubble' : 'ai-bubble'} ${isLoading ? 'pulse' : ''}">
                        ${(isLoading) ? text : this.processText(text)}
                    </div>
                    <div class="message-actions">
                        <button class="action-btn copy-msg-btn" title="Copy message">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="action-btn thumbs-up-btn" title="Thumbs up">
                            <i class="fas fa-thumbs-up"></i>
                        </button>
                        <button class="action-btn thumbs-down-btn" title="Thumbs down">
                            <i class="fas fa-thumbs-down"></i>
                        </button>
                        <button class="action-btn delete-msg-btn" title="Delete message">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        this.attachToolbars();
    }

    processText(text) {
        // Wrap pre blocks in a container for the toolbar
        let processText = (text.includes('code')) ?  `
                <div class="code-container">
                    <div class="code-toolbar">
                        <button class="toolbar-btn copy-btn" title="Copy to clipboard">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="toolbar-btn play-btn" title="Run in Canvas">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="toolbar-btn download-btn" title="Download as JS">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                    <pre>
                        <code>
                            ${encodeURIComponent(text.replace(/<\/?pre>/g, '').replace(/<\/?code>/g, ''))} 
                        </code>
                    </pre>
                </div>
            ` : text;
        return processText;
    }

    attachToolbars() {
        const containers = this.shadowRoot.querySelectorAll('.code-container');
        containers.forEach(container => {
            let code = container.querySelector('code')
            code = decodeURIComponent(code.textContent);
            //replace code content with decoded version
            container.querySelector('code').innerText = code;

            container.querySelector('.copy-btn').onclick = () => {
                navigator.clipboard.writeText(code);
                const icon = container.querySelector('.copy-btn i');
                icon.className = 'fas fa-check';
                setTimeout(() => icon.className = 'fas fa-copy', 2000);
            };

            container.querySelector('.play-btn').onclick = () => {
                this.dispatchEvent(new CustomEvent('vibe-coder-play-code', {
                    detail: { code },
                    bubbles: true,
                    composed: true
                }));
            };

            container.querySelector('.download-btn').onclick = () => {
                const blob = new Blob([code], { type: 'text/javascript' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'component.js';
                a.click();
                URL.revokeObjectURL(url);
            };
        });

        // Message actions toolbar
        const text = decodeURIComponent(this.getAttribute('text') || '');

        this.shadowRoot.querySelector('.copy-msg-btn').onclick = () => {
            navigator.clipboard.writeText(text);
            const icon = this.shadowRoot.querySelector('.copy-msg-btn i');
            icon.className = 'fas fa-check';
            setTimeout(() => icon.className = 'fas fa-copy', 2000);
        };

        this.shadowRoot.querySelector('.thumbs-up-btn').onclick = (e) => {
            e.currentTarget.classList.toggle('active');
            this.shadowRoot.querySelector('.thumbs-down-btn').classList.remove('active');
            this.dispatchEvent(new CustomEvent('vibe-coder-feedback', {
                detail: { type: 'up', text },
                bubbles: true,
                composed: true
            }));
        };

        this.shadowRoot.querySelector('.thumbs-down-btn').onclick = (e) => {
            e.currentTarget.classList.toggle('active');
            this.shadowRoot.querySelector('.thumbs-up-btn').classList.remove('active');
            this.dispatchEvent(new CustomEvent('vibe-coder-feedback', {
                detail: { type: 'down', text },
                bubbles: true,
                composed: true
            }));
        };

        this.shadowRoot.querySelector('.delete-msg-btn').onclick = () => {
            if (confirm('Are you sure you want to delete this message?')) {
                this.dispatchEvent(new CustomEvent('vibe-coder-delete-message', {
                    detail: { text },
                    bubbles: true,
                    composed: true
                }));
                this.remove();
            }
        };
    }
}

customElements.define('vibe-coder-chat-message', VibeCoderChatMessage);
