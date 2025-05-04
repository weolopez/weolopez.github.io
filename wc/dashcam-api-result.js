class DashcamApiResult extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex; /* Use flexbox for layout */
          flex-direction: column; /* Stack elements vertically */
          align-items: center; /* Center items horizontally */
          margin-top: 10px;
          padding: 10px;
          border: 1px solid #ccc;
          background-color: rgba(0, 0, 0, 0.7); /* Semi-transparent background */
          color: white;
          border-radius: 5px;
        }
        #previewContainer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px; /* Space between image and button */
        }
        #snapshotPreview {
          max-width: 100%; /* Ensure image fits within container */
          max-height: 300px; /* Limit preview height */
          object-fit: contain; /* Maintain aspect ratio */
        }
        #getDescriptionButton {
          padding: 10px 20px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 1em;
        }
        #getDescriptionButton:hover {
          background-color: #0056b3;
        }
        #result {
          margin-top: 10px;
          white-space: pre-wrap; /* Preserve whitespace and line breaks */
          word-break: break-word; /* Break long words */
        }
        .hidden {
          display: none;
        }
      </style>
      <div id="previewContainer" class="hidden">
        <img id="snapshotPreview" src="#" alt="Snapshot Preview">
        <button id="getDescriptionButton">Get Description</button>
      </div>
      <div id="result" class="hidden"></div>
    `;
    this.previewContainer = this.shadowRoot.getElementById('previewContainer');
    this.snapshotPreviewElement = this.shadowRoot.getElementById('snapshotPreview');
    this.getDescriptionButton = this.shadowRoot.getElementById('getDescriptionButton');
    this.resultElement = this.shadowRoot.getElementById('result');

    this.getDescriptionButton.addEventListener('click', () => {
      // Dispatch a custom event with the image blob
      this.dispatchEvent(new CustomEvent('get-description', {
        detail: { imageBlob: this.currentImageBlob }
      }));
      // Optionally hide the button or show a loading indicator
      this.getDescriptionButton.disabled = true;
      this.getDescriptionButton.textContent = 'Getting Description...';
    });
  }

  setSnapshotPreview(imageBlob) {
    if (this.currentImageBlob) {
      // Clean up previous object URL to free memory
      URL.revokeObjectURL(this.snapshotPreviewElement.src);
    }
    this.currentImageBlob = imageBlob;
    const imageUrl = URL.createObjectURL(imageBlob);
    this.snapshotPreviewElement.src = imageUrl;

    // Show preview and button, hide result
    this.previewContainer.classList.remove('hidden');
    this.resultElement.classList.add('hidden');
    this.getDescriptionButton.disabled = false;
    this.getDescriptionButton.textContent = 'Get Description';
  }

  setResult(text) {
    this.resultElement.textContent = text;
    // Show result, hide preview and button
    this.resultElement.classList.remove('hidden');
    this.previewContainer.classList.add('hidden');
    // Clean up the object URL after the result is shown
    if (this.currentImageBlob) {
       URL.revokeObjectURL(this.snapshotPreviewElement.src);
       this.currentImageBlob = null;
    }
  }
}

customElements.define('dashcam-api-result', DashcamApiResult);