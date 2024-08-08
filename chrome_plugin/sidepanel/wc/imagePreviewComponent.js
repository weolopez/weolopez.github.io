class ImagePreview extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({
            mode: 'open'
        });

        // Create the template
        const template = document.createElement('template');
        template.innerHTML = /*html*/ `
<style>
    .image-preview {
        display: flex;
        min-width: 10px;
        max-width: 100%;
        max-height: 200px;
        margin: auto;
    }

    .image-preview[src=""] {
        display: none;
        /* Hide when src is empty */
    }

    .image-label {
        max-height: 200px;
        overflow: auto;
        /* Ensure overflow is handled */
        margin: 0;
        /* Remove margin */
        padding: 0;
        /* Remove padding */
        flex: 1;
        /* Ensure it takes available space */
    }

    .image-preview-group {
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0;
        /* Remove margin */
        padding: 0;
        /* Remove padding */
    }

    .resizable {
        display: flex;
        width: 100%;
        position: relative;
        margin: 0;
        /* Remove margin */
        padding: 0;
        /* Remove padding */
    }

    .divider {
        min-width: 10px;
        /* Increase width for visibility */
        background-color: #888;
        /* Darker color for visibility */
        cursor: col-resize;
        position: relative;
        z-index: 1;
        margin: 0;
        /* Remove margin */
        padding: 0;
        /* Remove padding */
    }
</style>
<div class="image-preview-group">
    <div class="resizable">
        <img id="image-preview" src="" alt="Image preview..." class="image-preview">
        <div class="divider"></div>
        <label id="image-description" for="image-preview" class="image-label"></label>
    </div>
</div>
`;

        // Append the template content to the shadow root
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // Add event listeners for resizing
        this.addResizeListeners();
    }

    addResizeListeners() {
        const divider = this.shadowRoot.querySelector('.divider');
        const resizable = this.shadowRoot.querySelector('.resizable');
        const imagePreview = this.shadowRoot.querySelector('#image-preview');
        const imageDescription = this.shadowRoot.querySelector('#image-description');

        let isResizing = false;

        divider.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        const onMouseMove = (e) => {
            if (!isResizing) return;
            const resizableRect = resizable.getBoundingClientRect();
            const offset = e.clientX - resizableRect.left;
            const percentage = (offset / resizableRect.width) * 100;
            imagePreview.style.flex = `0 0 ${percentage}%`;
            imageDescription.style.flex = `0 0 ${100 - percentage}%`;
        };

        const onMouseUp = () => {
            isResizing = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

    }
    // Method to update the image src
    async updateImageSrc(src) {
        const imagePreview = this.shadowRoot.querySelector('#image-preview');
        imagePreview.src = src;
        const base64Image = src.split(',')[1];
        await llava("provide a very brief description of this image", base64Image, "PREVIEW_IMAGE")
    }

    // Method to update the label text
    updateLabelText(text) {
        const imageDescription = this.shadowRoot.querySelector('#image-description');
        imageDescription.textContent += text;
        // Update image-preview width to 50%
        const imagePreview = this.shadowRoot.querySelector('#image-preview');
        imagePreview.style.flex = '0 0 50%';
    }
}

// Define the custom element
customElements.define('image-preview', ImagePreview);