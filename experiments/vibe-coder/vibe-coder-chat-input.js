import './vibe-coder-mode-selector.js';

class VibeCoderChatInput extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css">
            <style>
                :host {
                    display: block;
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
                    display: flex;
                    align-items: flex-end;
                    gap: 0.5rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .input-container:focus-within {
                    border-color: #0ea5e9;
                    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
                    transform: translateY(-2px);
                }
                textarea {
                    flex: 1;
                    background: transparent;
                    border: none;
                    padding: 0.75rem;
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
                    position: static;
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
            </style>
            <div class="input-container">
                <vibe-coder-mode-selector></vibe-coder-mode-selector>
                <textarea rows="1" placeholder="Vibe code something..."></textarea>
                <button type="button" class="send-btn">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `;

        this.textarea = this.shadowRoot.querySelector('textarea');
        this.sendBtn = this.shadowRoot.querySelector('.send-btn');

        this.textarea.addEventListener('input', () => {
            this.textarea.style.height = 'auto';
            this.textarea.style.height = (this.textarea.scrollHeight) + 'px';
        });

        this.textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });

        this.sendBtn.addEventListener('click', () => this.handleSend());
    }

    handleSend() {
        const text = this.textarea.value.trim();
        if (!text || this.sendBtn.disabled) return;
        
        this.dispatchEvent(new CustomEvent('send', { 
            detail: { text },
            bubbles: true,
            composed: true
        }));
        
        this.textarea.value = '';
        this.textarea.style.height = 'auto';
    }

    set disabled(val) {
        this.sendBtn.disabled = val;
        this.textarea.disabled = val;
    }

    get disabled() {
        return this.sendBtn.disabled;
    }
}

customElements.define('vibe-coder-chat-input', VibeCoderChatInput);
