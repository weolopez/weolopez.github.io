class ChatHeader extends HTMLElement {
    constructor() {
        super();
        const template = document.createElement('template');
        template.innerHTML = /*html*/ `
<style>
    :host {
        position: sticky;
    }

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

    .edit-chat-button {
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        padding: 5px 10px;
    }

    #title {
        padding: 5px;
    }
</style>
<div class="chat-header">
    <button id="action-chat-button" class="edit-chat-button">Add</button>
    <div id="title" contenteditable>Chat</div>
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
        //listen to document.dispatchEvent(new CustomEvent('DB_UPDATED', {detail: {type: type, entity: entity}})); and if it is a groups
        // update id="title" with the entity.title
        document.addEventListener('DB_UPDATED', e => {
            if (e.detail.type === 'groups') {
                this.updateTitle(e.detail.entity.title)
            }
        })

    }

    connectedCallback() {
        this.shadowRoot.querySelector('.hamburger-menu').addEventListener('click', () => this._onHamburgerMenuClick());
        this.shadowRoot.querySelector('#action-chat-button').addEventListener('click', (e) => this._onActionChatButtonClick(e.currentTarget.innerText))
    }

    disconnectedCallback() {
        this.shadowRoot.querySelector('.hamburger-menu').removeEventListener('click', this._onHamburgerMenuClick);
        this.shadowRoot.querySelector('#action-chat-button').removeEventListener('click', this._onActionChatButtonClick);
    }

    _onHamburgerMenuClick() {
        this.toggleHamburgerMenu();
    }

    _onActionChatButtonClick(action) {
        const event = new CustomEvent('group-action', {
            bubbles: true,
            composed: true,
            detail: {
                action: action
            }
        });
        this.dispatchEvent(event);
    }
    setAction(action) {
        this.shadowRoot.querySelector('#action-chat-button').innerText = action;
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
    updateTitle(title) {
        this.shadowRoot.querySelector('#title').innerText = title
    }
}

// Define the custom element
customElements.define('chat-header', ChatHeader);