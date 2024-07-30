class ChatHeader extends HTMLElement {
    constructor() {
        super();
        const template = document.createElement('template');
        template.innerHTML = /*html*/ `
<style>
    .chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        background-color: #f1f1f1;
        border-bottom: 1px solid #ccc;
        position: relative;
        /* Ensure the element is positioned */
        z-index: 1000;
        /* High z-index to be on top of other components */
    }

    .hamburger-menu {
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        height: 24px;
        transition: transform 0.3s ease;
    }

    .hamburger-menu.active {
        transform: rotate(90deg);
    }

    .bar {
        width: 24px;
        height: 3px;
        background-color: #333;
        margin: 2px 0;
        transition: background-color 0.3s ease;
    }

    .hamburger-menu.active .bar {
        background-color: #ff0000;
    }
</style>
<div class="chat-header">
    <div>Chat</div>
    <button class="hamburger-menu">
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
    </button>
</div>
`;
        this.attachShadow({
            mode: 'open'
        }).appendChild(template.content.cloneNode(true));
    }

    connectedCallback() {
        this.shadowRoot.querySelector('.hamburger-menu').addEventListener('click', () => this._onHamburgerMenuClick());
    }

    disconnectedCallback() {
        this.shadowRoot.querySelector('.hamburger-menu').removeEventListener('click', this._onHamburgerMenuClick);
    }

    _onHamburgerMenuClick() {
        this.toggleHamburgerMenu();
    }

    toggleHamburgerMenu() {
        const button = this.shadowRoot.querySelector('.hamburger-menu');
        button.classList.toggle('active');

        const event = new CustomEvent('hamburger-menu-click', {
            bubbles: true,
            composed: true,
            detail: {
                active: button.classList.contains('active')
            }
        });
        this.dispatchEvent(event);
    }
}

// Define the custom element
customElements.define('chat-header', ChatHeader);