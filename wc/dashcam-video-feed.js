class DashcamVideoFeed extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          max-width: 100%;
        }
        video {
          display: block;
          width: 100%;
          max-width: 100%;
        }
      </style>
      <video autoplay playsinline></video>
    `;
    this.videoElement = this.shadowRoot.querySelector('video');
  }

  connectedCallback() {
    this.startCamera();
  }

  async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.videoElement.srcObject = stream;
    const event = new CustomEvent('video-ready', { bubbles: true, composed: true });
    this.dispatchEvent(event);
    } catch (err) {
      console.error('Error accessing camera:', err);
      // Optionally dispatch an event or display an error message
    }
  }

  getVideoElement() {
    return this.videoElement;
  }
}

customElements.define('dashcam-video-feed', DashcamVideoFeed);