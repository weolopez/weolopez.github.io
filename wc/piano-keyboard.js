class VirtualKeyboard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Basic synth settings
    this.octave = 4;
    this.oscillatorType = 'sine';
    this.volume = 0.5;
    this.detune = 0;
    // ADSR envelope settings (in seconds and sustain as ratio)
    this.attack = 0.05;
    this.decay = 0.1;
    this.sustainLevel = 0.7;
    this.releaseTime = 0.3;
    // Sustain pedal state
    this.sustainActive = false;
    // Recording state
    this.isRecording = false;
    this.recordedEvents = [];
    this.recordStartTime = 0;
    this.isPlayback = false;

    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.activeNotes = {}; // will store objects: { osc, gain, sustained: bool }
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #333;
          max-width: 800px;
          margin: auto;
        }
        .synth-container {
          background: #f0f0f0;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .controls, .advanced-controls, .recording-controls {
          display: flex;
          justify-content: space-around;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .controls label, 
        .advanced-controls label, 
        .recording-controls label {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 14px;
          margin: 5px;
        }
        .controls select,
        .controls input,
        .advanced-controls input {
          margin-top: 5px;
          padding: 2px 4px;
        }
        .keyboard {
          position: relative;
          width: 100%;
          user-select: none;
          margin-bottom: 20px;
        }
        .white-keys {
          display: flex;
        }
        .white-keys .key {
          background: white;
          border: 1px solid #ccc;
          border-radius: 0 0 5px 5px;
          flex: 1;
          height: 150px;
          position: relative;
          margin: 0 2px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 5px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          cursor: pointer;
          transition: background 0.1s;
        }
        .white-keys .key.active {
          background: #ddd;
        }
        .black-keys {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100px;
          display: flex;
          justify-content: space-between;
          padding: 0 10px;
          pointer-events: none;
        }
        .black-keys .key {
          background: #333;
          width: 40px;
          height: 100px;
          border: 1px solid #222;
          border-radius: 5px;
          position: relative;
          margin: 0 -20px;
          pointer-events: auto;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 5px;
          color: white;
          cursor: pointer;
          transition: background 0.1s;
        }
        .black-keys .key.active {
          background: #555;
        }
        button {
          padding: 6px 12px;
          font-size: 14px;
          margin: 5px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          background: #4CAF50;
          color: white;
          transition: background 0.2s;
        }
        button:hover {
          background: #45a049;
        }
        input[type="range"] {
          width: 100px;
        }
      </style>
      <div class="synth-container">
        <div class="controls">
          <label>
            Oscillator:
            <select id="oscillator-type">
              <option value="sine">Sine</option>
              <option value="square">Square</option>
              <option value="triangle">Triangle</option>
              <option value="sawtooth">Sawtooth</option>
            </select>
          </label>
          <label>
            Volume:
            <input type="range" id="volume" min="0" max="1" step="0.01" value="0.5">
          </label>
          <label>
            Octave:
            <input type="range" id="octave" min="2" max="6" step="1" value="4">
          </label>
        </div>
        <div class="advanced-controls">
          <label>
            Attack (s):
            <input type="range" id="attack" min="0" max="2" step="0.01" value="0.05">
          </label>
          <label>
            Decay (s):
            <input type="range" id="decay" min="0" max="2" step="0.01" value="0.1">
          </label>
          <label>
            Sustain (lvl):
            <input type="range" id="sustain" min="0" max="1" step="0.01" value="0.7">
          </label>
          <label>
            Release (s):
            <input type="range" id="release" min="0" max="3" step="0.01" value="0.3">
          </label>
          <label>
            Detune (cents):
            <input type="range" id="detune" min="-100" max="100" step="1" value="0">
          </label>
          <label>
            Sustain Pedal:
            <input type="checkbox" id="sustain-pedal">
          </label>
        </div>
        <div class="recording-controls">
          <button id="record-btn">Record</button>
          <button id="stop-record-btn" disabled>Stop</button>
          <button id="play-record-btn" disabled>Play</button>
        </div>
        <div class="keyboard">
          <!-- Keys will be generated dynamically -->
        </div>
      </div>
    `;
    // Set up key mappings:
    // White keys: 7 white keys (C, D, E, F, G, A, B) mapped to A, S, D, F, J, K, L
    this.whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    this.whiteKeyMapping = ['a', 's', 'd', 'f', 'j', 'k', 'l'];
    // Black keys: C#, D#, (none between E & F), F#, G#, A#
    // We'll create an array with empty slots where needed.
    this.blackNotes = ['C#', 'D#', '', 'F#', 'G#', 'A#', ''];
    this.blackKeyMapping = ['w', 'e', '', 'r', 'u', 'i', ''];

    // Generate the keyboard
    this.generateKeys();

    // Basic control listeners
    this.shadowRoot.getElementById('oscillator-type')
      .addEventListener('change', (e) => { this.oscillatorType = e.target.value; });
    this.shadowRoot.getElementById('volume')
      .addEventListener('input', (e) => { this.volume = parseFloat(e.target.value); });
    this.shadowRoot.getElementById('octave')
      .addEventListener('input', (e) => { 
        this.octave = parseInt(e.target.value);
        this.updateKeys();
      });

    // Advanced control listeners
    this.shadowRoot.getElementById('attack')
      .addEventListener('input', (e) => { this.attack = parseFloat(e.target.value); });
    this.shadowRoot.getElementById('decay')
      .addEventListener('input', (e) => { this.decay = parseFloat(e.target.value); });
    this.shadowRoot.getElementById('sustain')
      .addEventListener('input', (e) => { this.sustainLevel = parseFloat(e.target.value); });
    this.shadowRoot.getElementById('release')
      .addEventListener('input', (e) => { this.releaseTime = parseFloat(e.target.value); });
    this.shadowRoot.getElementById('detune')
      .addEventListener('input', (e) => { this.detune = parseFloat(e.target.value); });
    this.shadowRoot.getElementById('sustain-pedal')
      .addEventListener('change', (e) => { 
        this.sustainActive = e.target.checked; 
        if (!this.sustainActive) {
          // When releasing sustain, stop all notes that are held only by sustain.
          Object.keys(this.activeNotes).forEach(note => {
            if (this.activeNotes[note].sustained) {
              this.releaseNote(note);
            }
          });
        }
      });

    // Recording controls
    this.shadowRoot.getElementById('record-btn')
      .addEventListener('click', () => this.startRecording());
    this.shadowRoot.getElementById('stop-record-btn')
      .addEventListener('click', () => this.stopRecording());
    this.shadowRoot.getElementById('play-record-btn')
      .addEventListener('click', () => this.playRecording());

    // Listen for physical keyboard events
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  generateKeys() {
    const keyboard = this.shadowRoot.querySelector('.keyboard');
    keyboard.innerHTML = ''; // Clear any previous content

    // Create containers for white and black keys
    const whiteKeysContainer = document.createElement('div');
    whiteKeysContainer.classList.add('white-keys');
    const blackKeysContainer = document.createElement('div');
    blackKeysContainer.classList.add('black-keys');

    // Create white keys
    this.whiteNotes.forEach((note, i) => {
      const key = document.createElement('div');
      key.classList.add('key', 'white');
      key.dataset.note = note + this.octave;
      key.dataset.keyMapping = this.whiteKeyMapping[i];
      key.innerText = note + this.octave + ` (${this.whiteKeyMapping[i].toUpperCase()})`;
      key.addEventListener('mousedown', this.handleMouseDown.bind(this));
      key.addEventListener('mouseup', this.handleMouseUp.bind(this));
      key.addEventListener('mouseleave', this.handleMouseUp.bind(this));
      whiteKeysContainer.appendChild(key);
    });

    // Create black keys (using the same index positions as white keys)
    this.blackNotes.forEach((note, i) => {
      if (note !== '') {
        const key = document.createElement('div');
        key.classList.add('key', 'black');
        key.dataset.note = note + this.octave;
        key.dataset.keyMapping = this.blackKeyMapping[i];
        key.innerText = note + this.octave + ` (${this.blackKeyMapping[i].toUpperCase()})`;
        key.addEventListener('mousedown', this.handleMouseDown.bind(this));
        key.addEventListener('mouseup', this.handleMouseUp.bind(this));
        key.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        blackKeysContainer.appendChild(key);
      }
    });

    keyboard.appendChild(whiteKeysContainer);
    keyboard.appendChild(blackKeysContainer);
  }

  updateKeys() {
    // Update note labels for all keys when octave changes
    const keys = this.shadowRoot.querySelectorAll('.key');
    keys.forEach(key => {
      const baseNote = key.dataset.note.slice(0, key.dataset.note.length - 1);
      key.dataset.note = baseNote + this.octave;
      key.innerText = baseNote + this.octave + ` (${key.dataset.keyMapping.toUpperCase()})`;
    });
  }

  // Convert note (e.g., "C4" or "C#4") to frequency (Hz)
  getFrequency(note) {
    const noteFreqMap = {
      'C': 261.63,
      'C#': 277.18,
      'D': 293.66,
      'D#': 311.13,
      'E': 329.63,
      'F': 349.23,
      'F#': 369.99,
      'G': 392.00,
      'G#': 415.30,
      'A': 440.00,
      'A#': 466.16,
      'B': 493.88
    };
    let letter = note[0];
    let accidental = '';
    let octave = 0;
    if (note.length === 3) {
      accidental = note[1];
      octave = parseInt(note[2]);
      letter = letter + accidental;
    } else {
      octave = parseInt(note[1]);
    }
    let freq = noteFreqMap[letter];
    let octaveDiff = octave - 4;
    return freq * Math.pow(2, octaveDiff);
  }

  // Physical keyboard event handlers
  handleKeyDown(e) {
    if (e.repeat) return;
    const key = e.key.toLowerCase();
    // Space bar toggles sustain pedal
    if (key === ' ') {
      this.sustainActive = true;
      this.shadowRoot.getElementById('sustain-pedal').checked = true;
      return;
    }
    // Check white keys
    let keyElement = this.shadowRoot.querySelector(`.key[data-key-mapping="${key}"]`);
    if (keyElement) {
      keyElement.classList.add('active');
      this.playNote(keyElement.dataset.note, /*record=*/true);
    }
  }

  handleKeyUp(e) {
    const key = e.key.toLowerCase();
    if (key === ' ') {
      this.sustainActive = false;
      this.shadowRoot.getElementById('sustain-pedal').checked = false;
      // Release all sustained notes
      Object.keys(this.activeNotes).forEach(note => {
        if (this.activeNotes[note].sustained) {
          this.releaseNote(note);
        }
      });
      return;
    }
    let keyElement = this.shadowRoot.querySelector(`.key[data-key-mapping="${key}"]`);
    if (keyElement) {
      keyElement.classList.remove('active');
      this.stopNote(keyElement.dataset.note, /*record=*/true);
    }
  }

  // Mouse event handlers on keys
  handleMouseDown(e) {
    const keyElement = e.currentTarget;
    keyElement.classList.add('active');
    this.playNote(keyElement.dataset.note, /*record=*/true);
  }

  handleMouseUp(e) {
    const keyElement = e.currentTarget;
    keyElement.classList.remove('active');
    this.stopNote(keyElement.dataset.note, /*record=*/true);
  }

  // Play a note using Web Audio with ADSR envelope
  playNote(note, record = false) {
    // Prevent duplicate triggering
    if (this.activeNotes[note]) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    osc.type = this.oscillatorType;
    osc.frequency.value = this.getFrequency(note);
    osc.detune.value = this.detune;
    // Start with 0 gain and apply envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.volume, now + this.attack);
    gainNode.gain.linearRampToValueAtTime(this.volume * this.sustainLevel, now + this.attack + this.decay);
    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    osc.start();
    // Mark as active; note that if sustain pedal is active, we'll delay releasing
    this.activeNotes[note] = { osc, gain: gainNode, sustained: false };
    if (record && this.isRecording && !this.isPlayback) {
      this.recordedEvents.push({ type: 'on', note, time: now - this.recordStartTime });
    }
  }

  // Stop a note (apply release envelope unless sustain is active)
  stopNote(note, record = false) {
    if (!this.activeNotes[note]) return;
    // If sustain pedal is active, mark note as sustained (and do not release immediately)
    if (this.sustainActive) {
      this.activeNotes[note].sustained = true;
      return;
    }
    this.releaseNote(note, record);
  }

  releaseNote(note, record = true) {
    if (!this.activeNotes[note]) return;
    const now = this.audioCtx.currentTime;
    const { osc, gain } = this.activeNotes[note];
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + this.releaseTime);
    // Stop oscillator after release time
    osc.stop(now + this.releaseTime);
    if (record && this.isRecording && !this.isPlayback) {
      this.recordedEvents.push({ type: 'off', note, time: now - this.recordStartTime });
    }
    delete this.activeNotes[note];
  }

  // Recording functionality
  startRecording() {
    this.recordedEvents = [];
    this.isRecording = true;
    this.recordStartTime = this.audioCtx.currentTime;
    // Disable record button and enable stop
    this.shadowRoot.getElementById('record-btn').disabled = true;
    this.shadowRoot.getElementById('stop-record-btn').disabled = false;
    this.shadowRoot.getElementById('play-record-btn').disabled = true;
  }

  stopRecording() {
    this.isRecording = false;
    this.shadowRoot.getElementById('record-btn').disabled = false;
    this.shadowRoot.getElementById('stop-record-btn').disabled = true;
    if (this.recordedEvents.length > 0) {
      this.shadowRoot.getElementById('play-record-btn').disabled = false;
    }
  }

  playRecording() {
    if (this.recordedEvents.length === 0) return;
    this.isPlayback = true;
    // Disable controls during playback if desired
    const playbackStart = this.audioCtx.currentTime;
    this.recordedEvents.forEach(event => {
      setTimeout(() => {
        if (event.type === 'on') {
          this.playNote(event.note, false);
        } else if (event.type === 'off') {
          this.stopNote(event.note, false);
        }
      }, event.time * 1000);
    });
    // Estimate total playback duration to re-enable playback mode
    const totalDuration = this.recordedEvents[this.recordedEvents.length - 1].time * 1000 + 1000;
    setTimeout(() => {
      this.isPlayback = false;
    }, totalDuration);
  }
}

customElements.define('virtual-keyboard', VirtualKeyboard);