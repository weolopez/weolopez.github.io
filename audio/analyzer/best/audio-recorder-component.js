class AudioRecorderComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // Define the HTML structure for the component
        this.shadowRoot.innerHTML = `
            <style>
                #controls { padding: 15px; background-color: #ddd; text-align: center; border-bottom: 1px solid #ccc; }
                #controls label, #controls input, #controls button { margin: 0 5px; font-size: 14px; }
                #controls input { width: 50px; padding: 5px; }
                #controls button { padding: 5px 10px; cursor: pointer; }
                #controls button:disabled { cursor: not-allowed; opacity: 0.6; }
                #status { margin-top: 5px; font-style: italic; color: #555; }
            </style>
            <div id="controls">
                <label for="duration">Record Duration (s):</label>
                <input type="number" id="duration" value="5" min="1" max="60">
                <button id="recordButton">Record</button>
                <button id="playButton" disabled>Play Recording</button>
                <button id="saveButton" disabled>Save Recording</button>
                <button id="loadButton">Load Recording</button>
                <input type="file" id="audioFile" accept="audio/*" style="display: none;">
                <div id="status">Ready to record.</div>
            </div>
        `;

        // Initialize state and audio variables
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioBlob = null;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioBuffer = null;
        this.state = 'idle'; // idle, recording, recorded, playing

        // Get references to the UI elements in the shadow DOM
        this.recordButton = this.shadowRoot.getElementById('recordButton');
        this.playButton = this.shadowRoot.getElementById('playButton');
        this.saveButton = this.shadowRoot.getElementById('saveButton');
        this.loadButton = this.shadowRoot.getElementById('loadButton');
        this.audioFile = this.shadowRoot.getElementById('audioFile');
        this.statusDiv = this.shadowRoot.getElementById('status');
        this.durationInput = this.shadowRoot.getElementById('duration');

        // Bind event listeners
        this.recordButton.addEventListener('click', () => this.toggleRecording());
        this.playButton.addEventListener('click', () => this.playRecording());
        this.saveButton.addEventListener('click', () => this.saveRecording());
        this.loadButton.addEventListener('click', () => this.audioFile.click());
        this.audioFile.addEventListener('change', (event) => this.handleFileSelect(event));

        // Initial UI update
        this.updateUI();
    }

    updateUI() {
        this.recordButton.disabled = this.state === 'recording' || this.state === 'playing';
        this.playButton.disabled = this.state !== 'recorded' && this.state !== 'playing';
        this.saveButton.disabled = this.state !== 'recorded';
        this.loadButton.disabled = this.state === 'recording';
        this.durationInput.disabled = this.state === 'recording' || this.state === 'playing';

        switch (this.state) {
            case 'idle':
                this.statusDiv.textContent = 'Ready to record.';
                break;
            case 'recording':
                this.statusDiv.textContent = 'Recording...';
                break;
            case 'recorded':
                this.statusDiv.textContent = 'Recording finished. Ready to play or save.';
                break;
            case 'playing':
                this.statusDiv.textContent = 'Playing recording...';
                break;
        }
    }

    async toggleRecording() {
        if (this.state === 'idle' || this.state === 'recorded') {
            // Start recording
            let duration = parseInt(this.durationInput.value);
            if (isNaN(duration) || duration <= 0) {
                alert("Please enter a valid duration.");
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.mediaRecorder = new MediaRecorder(stream);
                this.audioChunks = [];

                this.mediaRecorder.ondataavailable = event => {
                    this.audioChunks.push(event.data);
                };

                this.mediaRecorder.onstop = async () => {
                    this.audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' }); // Assuming WAV format
                    const arrayBuffer = await this.audioBlob.arrayBuffer();
                    this.audioContext.decodeAudioData(arrayBuffer, (buffer) => {
                        this.audioBuffer = buffer;
                        this.state = 'recorded';
                        this.updateUI();
                    }, (error) => {
                        console.error("Error decoding audio data:", error);
                        this.state = 'idle';
                        this.updateUI();
                    });

                    // Stop the microphone stream
                    stream.getTracks().forEach(track => track.stop());
                };

                this.mediaRecorder.start();
                this.state = 'recording';
                this.updateUI();

                // Stop recording after the specified duration
                setTimeout(() => {
                    if (this.state === 'recording') {
                        this.mediaRecorder.stop();
                    }
                }, duration * 1000);

            } catch (err) {
                console.error("Error accessing microphone:", err);
                this.state = 'idle';
                this.updateUI();
            }

        }
    }

    playRecording() {
        if (this.state === 'recorded' && this.audioBuffer) {
            const source = this.audioContext.createBufferSource();
            source.buffer = this.audioBuffer;
            source.connect(this.audioContext.destination);

            source.onended = () => {
                this.state = 'recorded';
                this.updateUI();
            };

            source.start();
            this.state = 'playing';
            this.updateUI();
        } else if (this.state === 'playing') {
             // Stop playback if currently playing
             // This requires keeping track of the current source node, which is more complex.
             // For simplicity, we'll just let it finish for now or refresh the page.
             console.log("Playback stop not fully implemented yet. Please wait for playback to finish or refresh.");
        }
    }

    saveRecording() {
        if (this.state === 'recorded' && this.audioBlob) {
            const url = URL.createObjectURL(this.audioBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'recording.wav'; // Suggest a filename
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            console.log("No recording to save.");
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            console.log("Selected file:", file.name);
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    this.audioContext.decodeAudioData(arrayBuffer, (buffer) => {
                        this.audioBuffer = buffer;
                        this.audioBlob = new Blob([arrayBuffer], { type: file.type }); // Store as blob for saving
                        this.state = 'recorded';
                        console.log("Sound file loaded successfully.");
                        this.updateUI();
                    }, (error) => {
                        console.error("Error decoding audio data:", error);
                        this.state = 'idle';
                        this.updateUI();
                    });
                } catch (error) {
                    console.error("Error reading file:", error);
                    this.state = 'idle';
                    this.updateUI();
                }
            };

            reader.onerror = (error) => {
                console.error("Error reading file:", error);
                this.state = 'idle';
                this.updateUI();
            };

            reader.readAsArrayBuffer(file);
        }
    }
}

customElements.define('audio-recorder', AudioRecorderComponent);