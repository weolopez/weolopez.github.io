/**
 * AudioStreamer Web Component
 * Provides real-time audio streaming capabilities using MediaRecorder and WebSocket
 * Follows the same patterns as other components in the project
 */
class AudioStreamer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Audio streaming state
    this.stream = null;
    this.recorder = null;
    this.ws = null;
    this.isStreaming = false;
    this.sessionId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    
    // Get attribute values or use defaults
    this._serverUrl = this.getAttribute('server-url') || 'ws://localhost:8081/stream/audio';
    this._theme = this.getAttribute('theme') || 'light';
    this._chunkInterval = parseInt(this.getAttribute('chunk-interval')) || 1000; // 1 second chunks
    this._showStatus = this.getAttribute('show-status') !== 'false'; // default true
    
    // Set up the component's inner HTML
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: Arial, sans-serif;
          max-width: 400px;
          margin: 0 auto;
        }
        
        .audio-streamer-container {
          background: ${this._theme === 'dark' ? '#333' : '#fff'};
          color: ${this._theme === 'dark' ? '#eee' : '#333'};
          border: 1px solid ${this._theme === 'dark' ? '#555' : '#ddd'};
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .header h3 {
          margin: 0 0 10px 0;
          font-size: 1.2em;
          color: ${this._theme === 'dark' ? '#eee' : '#333'};
        }
        
        .controls {
          display: flex;
          flex-direction: column;
          gap: 15px;
          align-items: center;
        }
        
        .main-button {
          background: ${this._theme === 'dark' ? '#555' : '#007bff'};
          color: ${this._theme === 'dark' ? '#eee' : '#fff'};
          border: none;
          padding: 12px 24px;
          font-size: 1.1em;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.3s, transform 0.1s;
          min-width: 160px;
        }
        
        .main-button:hover {
          background: ${this._theme === 'dark' ? '#666' : '#0056b3'};
          transform: translateY(-1px);
        }
        
        .main-button:active {
          transform: translateY(0);
        }
        
        .main-button:disabled {
          background: ${this._theme === 'dark' ? '#444' : '#ccc'};
          cursor: not-allowed;
          transform: none;
        }
        
        .streaming {
          background: #dc3545 !important;
        }
        
        .streaming:hover {
          background: #c82333 !important;
        }
        
        .status {
          display: ${this._showStatus ? 'block' : 'none'};
          text-align: center;
          padding: 10px;
          border-radius: 4px;
          font-size: 0.9em;
          margin-top: 15px;
        }
        
        .status.connected {
          background: ${this._theme === 'dark' ? '#1a4a1a' : '#d4edda'};
          color: ${this._theme === 'dark' ? '#4ac54a' : '#155724'};
          border: 1px solid ${this._theme === 'dark' ? '#4ac54a' : '#c3e6cb'};
        }
        
        .status.disconnected {
          background: ${this._theme === 'dark' ? '#4a1a1a' : '#f8d7da'};
          color: ${this._theme === 'dark' ? '#ff6b6b' : '#721c24'};
          border: 1px solid ${this._theme === 'dark' ? '#ff6b6b' : '#f5c6cb'};
        }
        
        .status.streaming {
          background: ${this._theme === 'dark' ? '#1a2a4a' : '#d1ecf1'};
          color: ${this._theme === 'dark' ? '#6bb3ff' : '#0c5460'};
          border: 1px solid ${this._theme === 'dark' ? '#6bb3ff' : '#bee5eb'};
        }
        
        .status.error {
          background: ${this._theme === 'dark' ? '#4a1a1a' : '#f8d7da'};
          color: ${this._theme === 'dark' ? '#ff6b6b' : '#721c24'};
          border: 1px solid ${this._theme === 'dark' ? '#ff6b6b' : '#f5c6cb'};
        }
        
        .session-info {
          display: ${this._showStatus ? 'block' : 'none'};
          font-size: 0.8em;
          color: ${this._theme === 'dark' ? '#aaa' : '#666'};
          text-align: center;
          margin-top: 10px;
        }
        
        .permission-notice {
          background: ${this._theme === 'dark' ? '#2a2a1a' : '#fff3cd'};
          color: ${this._theme === 'dark' ? '#ffeb3b' : '#856404'};
          border: 1px solid ${this._theme === 'dark' ? '#ffeb3b' : '#ffeaa7'};
          padding: 10px;
          border-radius: 4px;
          font-size: 0.9em;
          text-align: center;
          margin-top: 15px;
        }
        
        @media (max-width: 480px) {
          :host {
            max-width: 100%;
            margin: 0;
          }
          
          .audio-streamer-container {
            padding: 15px;
          }
        }
      </style>
      
      <div class="audio-streamer-container">
        <div class="header">
          <h3>Audio Streamer</h3>
        </div>
        
        <div class="controls">
          <button class="main-button" id="toggleBtn">Start Streaming</button>
        </div>
        
        <div class="status disconnected" id="status">
          Disconnected
        </div>
        
        <div class="session-info" id="sessionInfo">
          No active session
        </div>
        
        <div class="permission-notice" id="permissionNotice" style="display: none;">
          This component requires microphone access to function properly.
        </div>
      </div>
    `;
    
    // Cache references to elements
    this._container = this.shadowRoot.querySelector('.audio-streamer-container');
    this._toggleBtn = this.shadowRoot.querySelector('#toggleBtn');
    this._status = this.shadowRoot.querySelector('#status');
    this._sessionInfo = this.shadowRoot.querySelector('#sessionInfo');
    this._permissionNotice = this.shadowRoot.querySelector('#permissionNotice');
    
    // Bind methods
    this._toggleStreaming = this._toggleStreaming.bind(this);
    this._handleVisibilityChange = this._handleVisibilityChange.bind(this);
  }
  
  static get observedAttributes() {
    return ['server-url', 'theme', 'chunk-interval', 'show-status'];
  }
  
  connectedCallback() {
    this._toggleBtn.addEventListener('click', this._toggleStreaming);
    document.addEventListener('visibilitychange', this._handleVisibilityChange);
    this._updateStatus('disconnected', 'Ready to stream');
  }
  
  disconnectedCallback() {
    this._toggleBtn.removeEventListener('click', this._toggleStreaming);
    document.removeEventListener('visibilitychange', this._handleVisibilityChange);
    this._cleanup();
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'server-url':
        this._serverUrl = newValue;
        break;
      case 'theme':
        this._theme = newValue;
        this._refreshStyles();
        break;
      case 'chunk-interval':
        this._chunkInterval = parseInt(newValue) || 1000;
        break;
      case 'show-status':
        this._showStatus = newValue !== 'false';
        this._toggleStatusVisibility();
        break;
    }
  }
  
  async _toggleStreaming() {
    if (this.isStreaming) {
      await this._stopStreaming();
    } else {
      await this._startStreaming();
    }
  }
  
  async _startStreaming() {
    try {
      this._toggleBtn.disabled = true;
      this._updateStatus('connecting', 'Requesting microphone access...');
      
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      this._updateStatus('connecting', 'Connecting to server...');
      
      // Set up WebSocket connection
      this.ws = new WebSocket(this._serverUrl);
      
      this.ws.onopen = () => {
        console.log('Audio streaming WebSocket connected');
        this._updateStatus('connected', 'Connected - Setting up recorder...');
        this._setupRecorder();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._handleServerMessage(data);
        } catch (error) {
          console.warn('Received non-JSON message:', event.data);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log('Audio streaming WebSocket closed', event);
        if (this.isStreaming) {
          this._handleDisconnection();
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('Audio streaming WebSocket error:', error);
        this._updateStatus('error', 'Connection error');
        this._handleError('WebSocket connection failed');
      };
      
    } catch (error) {
      console.error('Error starting audio stream:', error);
      if (error.name === 'NotAllowedError') {
        this._updateStatus('error', 'Microphone access denied');
        this._permissionNotice.style.display = 'block';
      } else {
        this._updateStatus('error', 'Failed to start streaming');
      }
      this._handleError(error.message);
    }
  }
  
  _setupRecorder() {
    try {
      // Check if MediaRecorder supports the preferred format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      this.recorder = new MediaRecorder(this.stream, { mimeType });
      
      this.recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(event.data);
        }
      };
      
      this.recorder.onstart = () => {
        this.isStreaming = true;
        this._toggleBtn.textContent = 'Stop Streaming';
        this._toggleBtn.classList.add('streaming');
        this._toggleBtn.disabled = false;
        this._updateStatus('streaming', 'Streaming audio...');
        this._dispatchEvent('streaming-started');
      };
      
      this.recorder.onstop = () => {
        this.isStreaming = false;
        this._toggleBtn.textContent = 'Start Streaming';
        this._toggleBtn.classList.remove('streaming');
        this._toggleBtn.disabled = false;
        this._updateStatus('disconnected', 'Streaming stopped');
        this._dispatchEvent('streaming-stopped');
      };
      
      this.recorder.onerror = (error) => {
        console.error('MediaRecorder error:', error);
        this._handleError('Recording error occurred');
      };
      
      // Start recording with specified chunk interval
      this.recorder.start(this._chunkInterval);
      
    } catch (error) {
      console.error('Error setting up MediaRecorder:', error);
      this._handleError('Failed to setup audio recorder');
    }
  }
  
  async _stopStreaming() {
    this._cleanup();
    this._updateStatus('disconnected', 'Disconnected');
    this._sessionInfo.textContent = 'No active session';
  }
  
  _cleanup() {
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isStreaming = false;
    this.sessionId = null;
    this.reconnectAttempts = 0;
    this._toggleBtn.textContent = 'Start Streaming';
    this._toggleBtn.classList.remove('streaming');
    this._toggleBtn.disabled = false;
    this._permissionNotice.style.display = 'none';
  }
  
  _handleServerMessage(data) {
    switch (data.type) {
      case 'session_started':
        this.sessionId = data.sessionId;
        this._sessionInfo.textContent = `Session: ${this.sessionId}`;
        console.log('Audio streaming session started:', data);
        break;
        
      case 'pong':
        console.log('Received pong from server');
        break;
        
      case 'error':
        console.error('Server error:', data.message);
        this._handleError(data.message);
        break;
        
      default:
        console.log('Unknown server message:', data);
    }
  }
  
  _handleDisconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this._updateStatus('connecting', `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (!this.isStreaming) return; // User stopped streaming
        this._startStreaming();
      }, 2000 * this.reconnectAttempts); // Exponential backoff
    } else {
      this._handleError('Connection lost - max reconnect attempts reached');
    }
  }
  
  _handleError(message) {
    this._updateStatus('error', message);
    this._cleanup();
    this._dispatchEvent('streaming-error', { message });
  }
  
  _handleVisibilityChange() {
    if (document.hidden && this.isStreaming) {
      console.log('Page hidden, maintaining audio stream...');
      // Keep streaming even when page is hidden
    }
  }
  
  _updateStatus(type, message) {
    this._status.className = `status ${type}`;
    this._status.textContent = message;
  }
  
  _toggleStatusVisibility() {
    this._status.style.display = this._showStatus ? 'block' : 'none';
    this._sessionInfo.style.display = this._showStatus ? 'block' : 'none';
  }
  
  _refreshStyles() {
    // Re-render styles when theme changes
    const styleEl = this.shadowRoot.querySelector('style');
    // This would require rebuilding the entire style block
    // For simplicity, just update some key colors
    this._container.style.background = this._theme === 'dark' ? '#333' : '#fff';
    this._container.style.color = this._theme === 'dark' ? '#eee' : '#333';
  }
  
  _dispatchEvent(eventType, detail = {}) {
    this.dispatchEvent(new CustomEvent(eventType, {
      detail: {
        sessionId: this.sessionId,
        isStreaming: this.isStreaming,
        ...detail
      },
      bubbles: true
    }));
  }
  
  // Public API methods
  
  /**
   * Programmatically start streaming
   */
  async startStreaming() {
    if (!this.isStreaming) {
      await this._startStreaming();
    }
  }
  
  /**
   * Programmatically stop streaming
   */
  async stopStreaming() {
    if (this.isStreaming) {
      await this._stopStreaming();
    }
  }
  
  /**
   * Get current streaming status
   */
  getStatus() {
    return {
      isStreaming: this.isStreaming,
      sessionId: this.sessionId,
      serverUrl: this._serverUrl
    };
  }
  
  /**
   * Send a ping message to the server
   */
  ping() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }
  }
}

// Register the custom element
customElements.define('audio-streamer', AudioStreamer);