class VibeCoderChat extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
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

                .message {
                    background-color: rgba(30, 41, 59, 0.4);
                    padding: 1.25rem;
                    border-radius: 1rem;
                    border: 1px solid #1e293b;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .message p {
                    font-size: 0.9375rem;
                    line-height: 1.6;
                    color: #cbd5e1;
                    margin: 0;
                }
                .message code {
                    background: #0f172a;
                    padding: 0.2rem 0.4rem;
                    border-radius: 0.25rem;
                    color: #38bdf8;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.85rem;
                }
                .message pre {
                    background: #020617;
                    padding: 1rem;
                    border-radius: 0.75rem;
                    overflow-x: auto;
                    margin: 0.75rem 0;
                    border: 1px solid #1e293b;
                }
                .message pre code {
                    background: transparent;
                    padding: 0;
                    color: #e2e8f0;
                    font-size: 0.8rem;
                    line-height: 1.5;
                }
                .input-section {
                    padding: 1.5rem;
                    background-color: #0f172a;
                    border-top: 1px solid #1e293b;
                    box-shadow: 0 -10px 15px -3px rgba(0, 0, 0, 0.1);
                }
                .input-container {
                    position: relative;
                    background: #020617;
                    border: 1px solid #334155;
                    border-radius: 1rem;
                    padding: 0.5rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .input-container:focus-within {
                    border-color: #0ea5e9;
                    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
                    transform: translateY(-2px);
                }
                textarea {
                    width: 100%;
                    background: transparent;
                    border: none;
                    padding: 0.75rem;
                    padding-right: 3.5rem;
                    font-size: 0.9375rem;
                    color: #f1f5f9;
                    resize: none;
                    outline: none;
                    min-height: 60px;
                    font-family: inherit;
                }
                textarea::placeholder {
                    color: #475569;
                }
                .send-btn {
                    position: absolute;
                    bottom: 0.75rem;
                    right: 0.75rem;
                    width: 2.5rem;
                    height: 2.5rem;
                    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                    color: white;
                    border-radius: 0.75rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
                }
                .send-btn:hover {
                    transform: scale(1.05);
                    box-shadow: 0 6px 16px rgba(14, 165, 233, 0.4);
                }
                .send-btn:active {
                    transform: scale(0.95);
                }
                .send-btn:disabled {
                    background: #1e293b;
                    color: #475569;
                    box-shadow: none;
                    cursor: not-allowed;
                }
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
            </style>
            <section>
                <div class="header">
                    <span class="header-title"><i class="fas fa-sparkles"></i> Architectural Input</span>
                    <button class="clear-btn">Reset Session</button>
                </div>
                <div class="messages">
                    <div class="ai-message">
                        <div class="message-label ai-label">Vibe Coder</div>
                        <div class="ai-bubble">
                            Describe a <strong>Standalone Web Component</strong>. I'll code it with descriptive <code>observedAttributes</code> that you can control instantly in the Canvas.
                            Create an xeyes web component with a custom attribute to change the eye color
                        </div>
                    </div>
                </div>
                <div class="input-section">
                    <div class="input-container">
                        <textarea rows="1" placeholder="Vibe code something..."></textarea>
                        <button type="button" class="send-btn">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </section>
        `;

        this.messagesContainer = this.shadowRoot.querySelector('.messages');
        this.textarea = this.shadowRoot.querySelector('textarea');
        this.sendBtn = this.shadowRoot.querySelector('.send-btn');
        this.clearBtn = this.shadowRoot.querySelector('.clear-btn');

        console.log('sendBtn count:', this.shadowRoot.querySelectorAll('.send-btn').length, 'sendBtn found:', this.sendBtn, 'tagName:', this.sendBtn.tagName, 'disabled:', this.sendBtn.disabled, 'hasAttribute disabled:', this.sendBtn.hasAttribute('disabled'));

        // Event listener on send button
        this.sendBtn.addEventListener('click', () => {
            console.log('sendBtn clicked');
            this.handleSend();
        });
        console.log('event listener added to sendBtn');
        this.textarea.addEventListener('input', () => {
            this.textarea.style.height = 'auto';
            this.textarea.style.height = (this.textarea.scrollHeight) + 'px';
        });

        this.textarea.addEventListener('keydown', (e) => {
            console.log('keydown', e.key);
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });
        this.clearBtn.addEventListener('click', () => this.handleClear());
    }

    handleSend() {
        const text = this.textarea.value.trim();
        console.log('handleSend called, text:', text);
        if (!text) return;
        this.getRootNode().host.dispatchEvent(new CustomEvent('send-message', { detail: { text }, bubbles: true }));
        this.textarea.value = '';
        this.textarea.style.height = 'auto';
        this.sendBtn.disabled = true;
    }

    handleClear() {
        this.dispatchEvent(new CustomEvent('clear-chat', { bubbles: true }));
    }

    addMessage(role, text, isLoading = false) {
        const div = document.createElement('div');
        div.className = role === 'user' ? 'user-message' : 'ai-message';
        
        const label = document.createElement('div');
        label.className = `message-label ${role === 'user' ? 'user-label' : 'ai-label'}`;
        label.textContent = role === 'user' ? 'You' : 'Vibe Coder';
        div.appendChild(label);

        const bubble = document.createElement('div');
        bubble.className = role === 'user' ? 'user-bubble' : `ai-bubble ${isLoading ? 'pulse' : ''}`;
        bubble.innerHTML = text;
        div.appendChild(bubble);
        
        this.messagesContainer.appendChild(div);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        return div;
    }

    clearMessages() {
        this.messagesContainer.innerHTML = `
            <div class="ai-message">
                <div class="message-label ai-label">Vibe Coder</div>
                <div class="ai-bubble">
                    Describe a <strong>Standalone Web Component</strong>. I'll code it with descriptive <code>observedAttributes</code> that you can control instantly in the Canvas.
                </div>
            </div>
        `;
    }

    setSendDisabled(disabled) {
        console.log('setSendDisabled called with', disabled);
        this.sendBtn.disabled = disabled;
    }
}

customElements.define('vibe-coder-chat', VibeCoderChat);