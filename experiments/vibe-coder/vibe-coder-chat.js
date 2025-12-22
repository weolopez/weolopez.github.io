class VibeCoderChat extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css">
            <style>
                :host {
                    display: block;
                    height: 100%;
                    flex: 1;
                }
                section {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background-color: #020617;
                    position: relative;
                }
                .header {
                    padding: 1.25rem 1.5rem;
                    border-bottom: 1px solid #1e293b;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background-color: rgba(15, 23, 42, 0.9);
                    backdrop-filter: blur(8px);
                    z-index: 10;
                }
                .header-title {
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .header-title i {
                    color: #0ea5e9;
                }
                .clear-btn {
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: #64748b;
                    transition: all 0.2s;
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid #334155;
                    padding: 0.4rem 0.75rem;
                    border-radius: 0.5rem;
                    cursor: pointer;
                }
                .clear-btn:hover {
                    color: #f1f5f9;
                    background: rgba(30, 41, 59, 0.8);
                    border-color: #475569;
                }
                .messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                    background-image: radial-gradient(circle at 2px 2px, #1e293b 1px, transparent 0);
                    background-size: 24px 24px;
                }
                .messages::-webkit-scrollbar {
                    width: 4px;
                }
                .messages::-webkit-scrollbar-thumb {
                    background: #334155;
                    border-radius: 10px;
                }
            </style>
            <section>
                <div class="header">
                    <span class="header-title"><i class="fas fa-sparkles"></i> Architectural Input</span>
                    <button class="clear-btn">Reset Session</button>
                </div>
                <div class="messages"></div>
                <vibe-coder-chat-input></vibe-coder-chat-input>
            </section>
        `;

        this.messagesContainer = this.shadowRoot.querySelector('.messages');
        this.chatInput = this.shadowRoot.querySelector('vibe-coder-chat-input');
        this.clearBtn = this.shadowRoot.querySelector('.clear-btn');

        this.chatInput.addEventListener('send', (e) => {
            this.handleSend(e.detail.text);
        });

        this.clearBtn.addEventListener('click', () => this.handleClear());

        this.messagesContainer.addEventListener('vibe-coder-delete-message', (e) => {
            const { text } = e.detail;
            this.history = this.history.filter(msg => msg.text !== text);
            this.saveHistory();
        });

        this.history = [];
        this.loadHistory();
    }

    connectedCallback() {
        this.renderHistory();
    }

    loadHistory() {
        const saved = localStorage.getItem('vibe-coder-chat-history');
        if (saved) {
            try {
                this.history = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse chat history', e);
                this.history = [];
            }
        }
    }

    saveHistory() {
        localStorage.setItem('vibe-coder-chat-history', JSON.stringify(this.history));
    }

    renderHistory() {
        this.messagesContainer.innerHTML = '';
        if (this.history.length === 0) {
            this.addInitialMessage();
        } else {
            this.history.forEach(msg => {
                this.addMessage(msg.role, msg.text, false, true);
            });
            // Notify app that history was restored so it can re-register components
            this.dispatchEvent(new CustomEvent('chat-restored', { 
                detail: { history: this.history },
                bubbles: true 
            }));
        }
    }

    addInitialMessage() {
        this.addMessage('ai', `
            Describe a <strong>Standalone Web Component</strong>. I'll code it with descriptive <code>observedAttributes</code> that you can control instantly in the Canvas.
            Create an xeyes web component with a custom attribute to change the eye color
        `, false, true);
    }

    handleSend(text) {
        console.log('handleSend called, text:', text);
        if (!text) return;
        this.getRootNode().host.dispatchEvent(new CustomEvent('send-message', { detail: { text }, bubbles: true }));
        this.chatInput.disabled = true;
    }

    handleClear() {
        // this.history = [];
        // this.saveHistory();
        // this.renderHistory();
        // this.dispatchEvent(new CustomEvent('clear-chat', { bubbles: true }));
    }

    addMessage(role, text, isLoading = false, skipSave = false) {
        if (!isLoading && !skipSave) {
            this.history.push({ role, text });
            this.saveHistory();
        }

        const msgEl = document.createElement('vibe-coder-chat-message');
        if (isLoading) msgEl.setAttribute('is-loading', 'true');
        else msgEl.setAttribute('is-loading', 'false');
        
        msgEl.setAttribute('role', role);
        msgEl.setAttribute('text', (isLoading) ? text : encodeURIComponent(text));
        
        
        this.messagesContainer.appendChild(msgEl);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        return msgEl;
    }

    clearMessages() {
        this.messagesContainer.innerHTML = '';
    }

    setSendDisabled(disabled) {
        this.chatInput.disabled = disabled;
    }
}

customElements.define('vibe-coder-chat', VibeCoderChat);