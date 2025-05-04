class DashcamControls extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }
        button {
          padding: 10px 15px;
          font-size: 1em;
          cursor: pointer;
        }
      </style>
      <select id="cameraSelect"></select>
      <button id="startButton">Start Recording</button>
      <button id="stopButton" disabled>Stop Recording</button>
      <button id="snapshotButton">Take Snapshot</button>
    `;

    this.cameraSelect = this.shadowRoot.getElementById('cameraSelect');
    this.startButton = this.shadowRoot.getElementById('startButton');
    this.stopButton = this.shadowRoot.getElementById('stopButton');
    this.snapshotButton = this.shadowRoot.getElementById('snapshotButton');

    this.startButton.addEventListener('click', () => this.dispatchEvent(new CustomEvent('start-recording', { detail: { deviceId: this.cameraSelect.value } })));
    this.stopButton.addEventListener('click', () => this.dispatchEvent(new CustomEvent('stop-recording')));
    this.snapshotButton.addEventListener('click', () => this.dispatchEvent(new CustomEvent('take-snapshot')));

    this.populateCameraSelect();
  }

  async populateCameraSelect() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      this.cameraSelect.innerHTML = ''; // Clear existing options

      videoDevices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `Camera ${this.cameraSelect.options.length + 1}`;
        this.cameraSelect.appendChild(option);
      });
    } catch (err) {
      console.error('Error enumerating devices:', err);
    }
  }

  setRecording(isRecording) {
    this.startButton.disabled = isRecording;
    this.stopButton.disabled = !isRecording;
    this.cameraSelect.disabled = isRecording;
  }
}

customElements.define('dashcam-controls', DashcamControls);