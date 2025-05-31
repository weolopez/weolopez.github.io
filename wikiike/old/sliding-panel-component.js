class SlidingPanelComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({
            mode: 'open'
        });
        this.currentIndex = 0;
        this._prompts = [{
            prompt: '',
            response: ''
        }];
        this.render();
    }

    static get observedAttributes() {
        return ['direction'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'direction') {
            this.render();
        }
    }

    get prompts() {
        return this._prompts;
    }

    set prompts(value) {
        this._prompts = value;
        this.currentIndex = 0; // Reset to the first prompt
        this.render();
    }

    connectedCallback() {
        document.addEventListener('keydown', this.handleKeydown.bind(this));
        document.addEventListener('wheel', this.handleWheel.bind(this));
    }

    disconnectedCallback() {
        document.removeEventListener('keydown', this.handleKeydown.bind(this));
        document.removeEventListener('wheel', this.handleWheel.bind(this));
    }

    handleKeydown(event) {
        const direction = this.getAttribute('direction') || 'horizontal';
        if (direction === 'horizontal') {
            if (event.key === 'ArrowRight') {
                this.next();
            } else if (event.key === 'ArrowLeft') {
                this.previous();
            }
        } else if (direction === 'vertical') {
            if (event.key === 'ArrowDown') {
                this.next();
            } else if (event.key === 'ArrowUp') {
                this.previous();
            }
        }
    }

    handleWheel(event) {
        const direction = this.getAttribute('direction') || 'horizontal';
        if (direction === 'horizontal') {
            if (event.deltaY > 0) {
                this.next();
            } else if (event.deltaY < 0) {
                this.previous();
            }
        } else if (direction === 'vertical') {
            if (event.deltaY > 0) {
                this.next();
            } else if (event.deltaY < 0) {
                this.previous();
            }
        }
    }
    next() {
        if (this.currentIndex < this.prompts.length - 1) {
            this.currentIndex++;
            this.updateContent();
        } else {
            this.bounce();
        }
    }
    previous() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.updateContent();
        } else {
            this.bounce();
        }
    }

    updateContent() {
        const prompt = this.prompts[this.currentIndex];
        this.shadowRoot.querySelector('.content').innerHTML = `
        <prompt-editor-component prompt="${prompt.prompt}" response="${prompt.response}"></prompt-editor-component>
        `;
    }

    bounce() {
        const panel = this.shadowRoot.querySelector('.panel');
        const direction = this.getAttribute('direction') || 'horizontal';
        if (direction === 'horizontal') {
            panel.classList.add('bounce-horizontal');
        } else {
            panel.classList.add('bounce-vertical');
        }
        setTimeout(() => {
            panel.classList.remove('bounce-horizontal');
            panel.classList.remove('bounce-vertical');
        }, 300);
    }

    render() {
        const direction = this.getAttribute('direction') || 'horizontal';
        this.shadowRoot.innerHTML = /*html*/ `
                <style>
                    .container {
                        display: flex;
                        overflow: hidden;
                        width: 100%;
                        height: 100%;
                        position: relative;
        
                        flex-direction: $ {
                            direction==='horizontal' ? 'row': 'column'
                        }
        
                        ;
                    }
        
                    .panel {
                        flex: 1;
                        transition: transform 0.3s ease;
                    }
        
                    .bounce-horizontal {
                        animation: bounce-horizontal 0.3s;
                    }
        
                    .bounce-vertical {
                        animation: bounce-vertical 0.3s;
                    }
        
                    @keyframes bounce-horizontal {
        
                        0%,
                        100% {
                            transform: translateX(0);
                        }
        
                        50% {
                            transform: translateX(-10px);
                        }
                    }
        
                    @keyframes bounce-vertical {
        
                        0%,
                        100% {
                            transform: translateY(0);
                        }
        
                        50% {
                            transform: translateY(-10px);
                        }
                    }
        
                    prompt-editor-component {
                        width: 100%;
                        height: 90vh;
                    }
                </style>
                <div class="container">
                    <div class="panel">
                        <div class="content">
                            <prompt-editor-component prompt="${this.prompts[0]?.prompt}" response="${this.prompts[0]?.response}"></prompt-editor-component>
                        </div>
                    </div>
                </div>
                `;
    }
}

customElements.define('sliding-panel-component', SlidingPanelComponent);