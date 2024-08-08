class CopyPopover extends HTMLElement {
    constructor() {
        super();
        // const shadow = this.attachShadow({ mode: 'open' });

        // Create the popover container
        const container = document.createElement('div');
        container.innerText = 'Copied!';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.padding = '10px';
        container.style.backgroundColor = 'black';
        container.style.color = 'white';
        container.style.borderRadius = '5px';
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s';

        // shadow.appendChild(container);
        this.container = container;
        this.attachShadow({
            mode: 'open'
        }).appendChild(this.container.cloneNode(true));
    }

    show() {
        this.container.style.opacity = '1';
        setTimeout(() => {
            this.container.style.opacity = '0';
        }, 2000); // Hide after 2 seconds
    }
}

// Define the new element
customElements.define('copy-popover', CopyPopover);