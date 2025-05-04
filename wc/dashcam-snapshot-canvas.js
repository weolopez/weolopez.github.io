class DashcamSnapshotCanvas extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        canvas {
          display: none; /* Keep canvas hidden */
        }
      </style>
      <canvas></canvas>
    `;
    this.canvasElement = this.shadowRoot.querySelector('canvas');
    this.context = this.canvasElement.getContext('2d');
  }

  takeSnapshot(videoElement) {
    console.log('takeSnapshot called with videoElement:', videoElement);
    if (!videoElement) {
      console.error('No video element provided for snapshot.');
      return null;
    }

    console.log('videoElement state - readyState:', videoElement.readyState, 'videoWidth:', videoElement.videoWidth, 'videoHeight:', videoElement.videoHeight);


    this.canvasElement.width = videoElement.videoWidth;
    this.canvasElement.height = videoElement.videoHeight;
    console.log('Canvas dimensions set to:', this.canvasElement.width, 'x', this.canvasElement.height);

    this.context.drawImage(videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
    console.log('Image drawn onto canvas.');


    // Return image data as a Blob
    return new Promise(resolve => {
      this.canvasElement.toBlob(blob => {
        console.log('Canvas toBlob result:', blob);
        resolve(blob);
      }, 'image/png');
    });
  }
}

customElements.define('dashcam-snapshot-canvas', DashcamSnapshotCanvas);