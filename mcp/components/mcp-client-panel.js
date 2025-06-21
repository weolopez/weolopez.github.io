const template = document.createElement('template');
template.innerHTML = `
  <style>
    /* Inherit global styles; additional local styles can be applied here if needed */
    :host {
      display: block;
    }
    .panel {
      background: white;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      transition: transform 0.3s ease;
    }
    .panel:hover {
      transform: translateY(-5px);
    }
    .panel-header {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      color: white;
      padding: 20px;
      font-size: 1.3rem;
      font-weight: bold;
    }
    .panel-content {
      padding: 20px;
    }
    .status {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: bold;
      margin-bottom: 20px;
    }
    .status.connected {
      background: #2ecc71;
      color: white;
    }
    .status.disconnected {
      background: #e74c3c;
      color: white;
    }
    .controls {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    button {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s ease;
      flex: 1;
      min-width: 120px;
    }
    button:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
    }
    .input-group {
      margin-bottom: 15px;
    }
    .input-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
      color: #2c3e50;
    }
    select, textarea {
      width: 100%;
      padding: 10px;
      border: 2px solid #ecf0f1;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.3s ease;
    }
    select:focus, textarea:focus {
      outline: none;
      border-color: #3498db;
    }
    .log {
      background: #2c3e50;
      color: #ecf0f1;
      border-radius: 10px;
      padding: 20px;
      height: 300px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      line-height: 1.4;
      border: 2px solid #34495e;
    }
  </style>
  <div class="panel client">
    <div class="panel-header">
      📱 MCP Client
    </div>
    <div class="panel-content">
      <div class="status disconnected" id="clientStatus">Disconnected</div>
      
      <div class="controls">
        <button id="connectBtn">Connect</button>
        <button id="disconnectBtn" disabled>Disconnect</button>
      </div>
      
      <div class="input-group">
        <label for="messageType">Message Type:</label>
        <select id="messageType">
          <option value="initialize">Initialize</option>
          <option value="tools/list">List Tools</option>
          <option value="tools/call">Call Tool</option>
          <option value="resources/list">List Resources</option>
          <option value="resources/read">Read Resource</option>
        </select>
      </div>
      
      <div class="input-group">
        <label for="messageParams">Parameters (JSON):</label>
        <textarea id="messageParams" placeholder='{"name": "example_tool", "arguments": {}}'></textarea>
      </div>
      
      <div class="controls">
        <button id="sendBtn" disabled>Send Message</button>
        <button id="clearBtn">Clear Log</button>
      </div>
      
      <div class="log" id="clientLog"></div>
    </div>
  </div>
`;

class MCPClientPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    
    // UI elements
    this.statusEl = this.shadowRoot.getElementById('clientStatus');
    this.connectBtn = this.shadowRoot.getElementById('connectBtn');
    this.disconnectBtn = this.shadowRoot.getElementById('disconnectBtn');
    this.sendBtn = this.shadowRoot.getElementById('sendBtn');
    this.clearBtn = this.shadowRoot.getElementById('clearBtn');
    this.messageTypeSelect = this.shadowRoot.getElementById('messageType');
    this.messageParamsText = this.shadowRoot.getElementById('messageParams');
    this.logEl = this.shadowRoot.getElementById('clientLog');
    
    // Bind event handlers
    this.connectBtn.addEventListener('click', () => {
      console.log('DEBUG: Client Connect button clicked!');
      this.dispatchEvent(new CustomEvent('client-connect', { bubbles: true, composed: true }));
      console.log('DEBUG: client-connect event dispatched');
    });
    this.disconnectBtn.addEventListener('click', () => {
      console.log('DEBUG: Client Disconnect button clicked!');
      this.dispatchEvent(new CustomEvent('client-disconnect', { bubbles: true, composed: true }));
      console.log('DEBUG: client-disconnect event dispatched');
    });
    this.sendBtn.addEventListener('click', () => {
      const messageType = this.messageTypeSelect.value;
      let params = {};
      try {
        if (this.messageParamsText.value.trim()) {
          params = JSON.parse(this.messageParamsText.value);
        }
      } catch (e) {
        alert('Invalid JSON in parameters');
        return;
      }
      this.dispatchEvent(new CustomEvent('client-send-message', { 
        detail: { messageType, params }, bubbles: true, composed: true 
      }));
    });
    this.clearBtn.addEventListener('click', () => {
      this.clearLog();
    });
    
    // Update default params on messageType change
    this.messageTypeSelect.addEventListener('change', () => {
      const type = this.messageTypeSelect.value;
      switch(type) {
        case 'initialize':
          this.messageParamsText.value = JSON.stringify({
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "Demo Client", version: "1.0.0" }
          }, null, 2);
          break;
        case 'tools/call':
          this.messageParamsText.value = JSON.stringify({
            name: "echo",
            arguments: { message: "Hello, MCP!" }
          }, null, 2);
          break;
        case 'resources/read':
          this.messageParamsText.value = JSON.stringify({
            uri: "config.json"
          }, null, 2);
          break;
        default:
          this.messageParamsText.value = '{}';
      }
    });
  }
  
  updateStatus(statusText, statusClass) {
    this.statusEl.textContent = statusText;
    this.statusEl.className = 'status ' + statusClass;
  }
  
  setButtons({ connectDisabled, disconnectDisabled, sendDisabled }) {
    this.connectBtn.disabled = connectDisabled;
    this.disconnectBtn.disabled = disconnectDisabled;
    this.sendBtn.disabled = sendDisabled;
  }
  
  // Private helper method to create a log entry safely
  _createLogEntry(contentEl, type) {
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    
    const timestampEl = document.createElement('span');
    timestampEl.className = 'timestamp';
    timestampEl.textContent = `[${timestamp}]`;
    
    const typeEl = document.createElement('span');
    typeEl.className = 'message-type';
    typeEl.textContent = `[${type.toUpperCase()}]`;
    
    entry.appendChild(timestampEl);
    entry.appendChild(typeEl);
    entry.appendChild(contentEl);
    
    this.logEl.appendChild(entry);
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }
  
  // Public method for informational messages
  logInfo(message) {
    const contentEl = document.createElement('span');
    contentEl.className = 'message-content';
    contentEl.textContent = message;
    this._createLogEntry(contentEl, 'info');
  }
  
  // Public method for adding log entries (compatible with server panel)
  addLog(message, type = 'info') {
    const contentEl = document.createElement('span');
    contentEl.className = 'message-content';
    contentEl.textContent = message;
    this._createLogEntry(contentEl, type);
  }
  
  // Public method for logging responses with formatted JSON
  logResponse(result) {
    const contentEl = document.createElement('pre');
    contentEl.className = 'message-content';
    contentEl.textContent = JSON.stringify(result, null, 2);
    this._createLogEntry(contentEl, 'response');
  }
  
  // Public method for logging errors
  logError(error) {
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    
    const errorMsg = document.createElement('div');
    errorMsg.textContent = `Error: ${error.message} (Code: ${error.code})`;
    contentEl.appendChild(errorMsg);
    
    if (error.data && Array.isArray(error.data)) {
      const detailsList = document.createElement('ul');
      error.data.forEach(detail => {
        const item = document.createElement('li');
        item.textContent = `${detail.instancePath || 'field'}: ${detail.message}`;
        detailsList.appendChild(item);
      });
      contentEl.appendChild(detailsList);
    }
    
    this._createLogEntry(contentEl, 'error');
  }
  
  clearLog() {
    this.logEl.innerHTML = '';
  }
}

customElements.define('mcp-client-panel', MCPClientPanel);
export default MCPClientPanel;