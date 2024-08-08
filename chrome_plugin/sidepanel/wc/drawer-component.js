// drawer-component.js
class DrawerComponent extends HTMLElement {
    constructor() {
        super();
        const template = document.createElement('template');

        // Create the structure of the component
        const wrapper = document.createElement('div');
        wrapper.className = 'drawer-wrapper';

        const header = document.createElement('div');
        header.className = 'drawer-header';

        const content = document.createElement('div');
        content.className = 'drawer-content';

        // Append header and content to the wrapper
        wrapper.appendChild(header);
        wrapper.appendChild(content);
        template.innerHTML = /*html*/ `
<style>
    .drawer {
        position: fixed;
        left: 0;
        width: 100%;
        height: -400px;
        background-color: white;
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
        transition: transform 0.6s ease-in-out;
        /* Slower animation */
        z-index: 500;
    }

    .drawer.bottom {
        transform: translateY(0);
    }

    .drawer.bottom.open {
        transform: translateY(-122%);
    }

    .drawer.top.open {
        transform: translateY(400px);
    }

    .drawer-header {
        padding: 10px;
        background-color: #f1f1f1;
        border-bottom: 1px solid #ccc;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .drawer-content {
        padding: 20px;
        overflow-y: auto;
        height: auto;
    }

    .drawer.top {
        transform: translateY(0);
    }
</style>
<div class="drawer">
    <div class="drawer-header">
        <span id="title">Header</span>
        <button class="close-button">Close</button>
    </div>
    <div class="drawer-content">
        <slot></slot>
    </div>
</div>
`;

        // Append the wrapper to the shadow root

        this.attachShadow({
            mode: 'open'
        });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.shadowRoot.appendChild(wrapper);
    }

    connectedCallback() {

        // Set the header text from the <title> tag
        //console.log html from inside this
        // console.log('html:' + this.shadowRoot.innerHTML)
        const titleElement = this.shadowRoot.querySelector('#drawer-title');
        const header = this.shadowRoot.querySelector('#title');
        if (titleElement) {
            header.textContent = titleElement.textContent;
        } else {
            header.textContent = 'Drawer Header';
        }

        // Move the rest of the content to the drawer content area
        const content = this.shadowRoot.querySelector('.drawer-content');
        while (this.firstChild) {
            if (this.firstChild !== titleElement) {
                content.appendChild(this.firstChild);
            } else {
                this.removeChild(this.firstChild);
            }
        }
        this.shadowRoot.querySelector('.close-button').addEventListener('click', () => this.toggle());
        this.updateDrawerPosition();
    }

    static get observedAttributes() {
        return ['position'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'position') {
            this.updateDrawerPosition();
        }
    }

    updateDrawerPosition() {
        const drawer = this.shadowRoot.querySelector('.drawer');
        const position = this.getAttribute('position') || 'bottom';
        drawer.classList.remove('top', 'bottom');
        drawer.classList.add(position);
        if (position === 'top') {
            drawer.style.bottom = 'unset';
            drawer.style.top = '-400px';
        } else {
            drawer.style.top = 'unset';
            drawer.style.bottom = '-420px';
        }
    }

    toggle() {
        const drawer = this.shadowRoot.querySelector('.drawer');
        drawer.classList.toggle('open');
    }
}

customElements.define('drawer-component', DrawerComponent);