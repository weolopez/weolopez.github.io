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
      <button id="startButton">Start Recording</button>
      <button id="stopButton" disabled>Stop Recording</button>
      <button id="snapshotButton">Take Snapshot</button>
    `;

    this.startButton = this.shadowRoot.getElementById('startButton');
    this.stopButton = this.shadowRoot.getElementById('stopButton');
    this.snapshotButton = this.shadowRoot.getElementById('snapshotButton');

    this.startButton.addEventListener('click', () => this.dispatchEvent(new CustomEvent('start-recording')));
    this.stopButton.addEventListener('click', () => this.dispatchEvent(new CustomEvent('stop-recording')));
    this.snapshotButton.addEventListener('click', () => this.dispatchEvent(new CustomEvent('take-snapshot')));
  }

  setRecording(isRecording) {
    this.startButton.disabled = isRecording;
    this.stopButton.disabled = !isRecording;
  }
}

customElements.define('dashcam-controls', DashcamControls);