
                            class VibeTimerAlarm extends HTMLElement {
  static get observedAttributes() {
    return [
      'countdown-duration-seconds',
      'is-timer-running',
      'alarm-sound-enabled',
      'accent-color-hex'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._secondsRemaining = 0;
    this._intervalId = null;
    this._audioContext = null;
  }

  connectedCallback() {
    this._secondsRemaining = parseInt(this.getAttribute('countdown-duration-seconds')) || 60;
    this.render();
    this._updateDisplay();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'countdown-duration-seconds' && !this.hasAttribute('is-timer-running')) {
      this._secondsRemaining = parseInt(newValue) || 0;
      this._updateDisplay();
    }

    if (name === 'is-timer-running') {
      newValue !== null ? this._startTick() : this._stopTick();
    }

    if (name === 'accent-color-hex') {
      this.style.setProperty('--vibe-accent', newValue);
    }
  }

  _startTick() {
    if (this._intervalId) return;
    this._intervalId = setInterval(() => {
      if (this._secondsRemaining > 0) {
        this._secondsRemaining--;
        this._updateDisplay();
      } else {
        this._stopTick();
        this._triggerAlarm();
      }
    }, 1000);
  }

  _stopTick() {
    clearInterval(this._intervalId);
    this._intervalId = null;
    this.removeAttribute('is-timer-running');
  }

  _triggerAlarm() {
    if (this.getAttribute('alarm-sound-enabled') !== 'false') {
      this._playBeep();
    }
    this.shadowRoot.querySelector('.timer-container').classList.add('alarm-active');
    this.dispatchEvent(new CustomEvent('alarm-triggered', { bubbles: true }));
  }

  _playBeep() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 1);
    osc.stop(ctx.currentTime + 1);
  }

  _updateDisplay() {
    const mins = Math.floor(this._secondsRemaining / 60);
    const secs = this._secondsRemaining % 60;
    const display = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const el = this.shadowRoot.querySelector('.time-display');
    if (el) el.textContent = display;
    
    const progress = this.shadowRoot.querySelector('.progress-ring__circle');
    if (progress) {
      const total = parseInt(this.getAttribute('countdown-duration-seconds')) || 60;
      const offset = 283 - (this._secondsRemaining / total) * 283;
      progress.style.strokeDashoffset = offset;
    }
  }

  _handleToggle() {
    if (this.hasAttribute('is-timer-running')) {
      this.removeAttribute('is-timer-running');
    } else {
      if (this._secondsRemaining <= 0) {
        this._secondsRemaining = parseInt(this.getAttribute('countdown-duration-seconds')) || 60;
      }
      this.setAttribute('is-timer-running', 'true');
      this.shadowRoot.querySelector('.timer-container').classList.remove('alarm-active');
    }
  }

  _handleReset() {
    this.removeAttribute('is-timer-running');
    this._secondsRemaining = parseInt(this.getAttribute('countdown-duration-seconds')) || 60;
    this.shadowRoot.querySelector('.timer-container').classList.remove('alarm-active');
    this._updateDisplay();
  }

  render() {
    const accent = this.getAttribute('accent-color-hex') || '#00ff88';
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --vibe-accent: ${accent};
          --vibe-bg: #121212;
          --vibe-text: #ffffff;
          display: inline-block;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        .timer-container {
          background: var(--vibe-bg);
          color: var(--vibe-text);
          padding: 2rem;
          border-radius: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.1);
          transition: transform 0.3s ease;
        }
        .alarm-active {
          animation: shake 0.5s infinite;
          border-color: #ff4444;
          box-shadow: 0 0 20px #ff444455;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .visualizer {
          position: relative;
          width: 120px;
          height: 120px;
        }
        svg {
          transform: rotate(-90deg);
        }
        .progress-ring__circle {
          transition: stroke-dashoffset 0.35s;
          transform-origin: 50% 50%;
          stroke-dasharray: 283;
          stroke-dashoffset: 0;
          stroke: var(--vibe-accent);
        }
        .time-display {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.05em;
        }
        .controls {
          display: flex;
          gap: 0.75rem;
        }
        button {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          padding: 0.6rem 1.2rem;
          border-radius: 1rem;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }
        button:hover {
          background: var(--vibe-accent);
          color: black;
          border-color: transparent;
        }
        .reset-btn:hover {
          background: #ff4444;
          color: white;
        }
      </style>
      <div class="timer-container">
        <div class="visualizer">
          <svg width="120" height="120">
            <circle stroke="rgba(255,255,255,0.1)" stroke-width="8" fill="transparent" r="45" cx="60" cy="60"/>
            <circle class="progress-ring__circle" stroke-width="8" stroke-linecap="round" fill="transparent" r="45" cx="60" cy="60"/>
          </svg>
          <div class="time-display">00:00</div>
        </div>
        <div class="controls">
          <button class="toggle-btn">Start / Pause</button>
          <button class="reset-btn">Reset</button>
        </div>
      </div>
    `;

    this.shadowRoot.querySelector('.toggle-btn').addEventListener('click', () => this._handleToggle());
    this.shadowRoot.querySelector('.reset-btn').addEventListener('click', () => this._handleReset());
  }
}

customElements.define('vibe-timer-alarm', VibeTimerAlarm); 
                        


