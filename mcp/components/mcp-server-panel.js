const template = document.createElement('template');
template.innerHTML = `
  <style>
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
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
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
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
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
    .tools-list, .resources-list {
      background: #f8f9fa;
      border-radius: 10px;
      padding: 15px;
      margin-top: 15px;
    }
    .tool-item, .resource-item {
      background: white;
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 10px;
      border-left: 4px solid #e74c3c;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }
    .tool-item:last-child, .resource-item:last-child {
      margin-bottom: 0;
    }
    .item-name {
      font-weight: bold;
      color: #2c3e50;
    }
    .item-description {
      color: #7f8c8d;
      font-size: 0.9rem;
      margin-top: 5px;
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
  <div class="panel server">
    <div class="panel-header">
      🖥️ MCP Server
    </div>
    <div class="panel-content">
      <div class="status disconnected" id="serverStatus">Stopped</div>
      
      <div class="controls">
        <button id="startBtn">Start Server</button>
        <button id="stopBtn" disabled>Stop Server</button>
      </div>
      
      <div class="tools-list">
        <h4>Available Tools:</h4>
        <div id="toolsContainer"></div>
      </div>
      
      <div class="resources-list">
        <h4>Available Resources:</h4>
        <div id="resourcesContainer"></div>
      </div>
      
      <div class="controls">
        <button id="clearServerLogBtn">Clear Log</button>
      </div>
      
      <div class="log" id="serverLog"></div>
    </div>
  </div>
`;

class MCPServerPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    
    // UI element references
    this.statusEl = this.shadowRoot.getElementById('serverStatus');
    this.startBtn = this.shadowRoot.getElementById('startBtn');
    this.stopBtn = this.shadowRoot.getElementById('stopBtn');
    this.clearServerLogBtn = this.shadowRoot.getElementById('clearServerLogBtn');
    this.toolsContainer = this.shadowRoot.getElementById('toolsContainer');
    this.resourcesContainer = this.shadowRoot.getElementById('resourcesContainer');
    this.logEl = this.shadowRoot.getElementById('serverLog');
    
    // Bind event listeners
    this.startBtn.addEventListener('click', () => {
      console.log('DEBUG: Start Server button clicked!');
      this.dispatchEvent(new CustomEvent('server-start', { bubbles: true, composed: true }));
      console.log('DEBUG: server-start event dispatched');
    });
    this.stopBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('server-stop', { bubbles: true, composed: true }));
    });
    this.clearServerLogBtn.addEventListener('click', () => {
      this.clearLog();
    });
  }
  
  updateStatus(statusText, statusClass) {
    this.statusEl.textContent = statusText;
    this.statusEl.className = 'status ' + statusClass;
  }
  
  setButtons({ startDisabled, stopDisabled }) {
    this.startBtn.disabled = startDisabled;
    this.stopBtn.disabled = stopDisabled;
  }
  
  setTools(tools) {
    this.toolsContainer.innerHTML = '';
    tools.forEach(tool => {
      const div = document.createElement('div');
      div.classList.add('tool-item');
      div.innerHTML = `<div class="item-name">${tool.name}</div>
                       <div class="item-description">${tool.description}</div>`;
      this.toolsContainer.appendChild(div);
    });
  }
  
  setResources(resources) {
    this.resourcesContainer.innerHTML = '';
    resources.forEach(resource => {
      const div = document.createElement('div');
      div.classList.add('resource-item');
      div.innerHTML = `<div class="item-name">${resource.name}</div>
                       <div class="item-description">${resource.description}</div>`;
      this.resourcesContainer.appendChild(div);
    });
  }
  
  addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.classList.add('log-entry');
    entry.innerHTML = `<span class="timestamp">[${timestamp}]</span> <span class="message-type">[${type.toUpperCase()}]</span> <span class="message-content">${message}</span>`;
    this.logEl.appendChild(entry);
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }
  
  clearLog() {
    this.logEl.innerHTML = '';
  }
}

customElements.define('mcp-server-panel', MCPServerPanel);
export default MCPServerPanel;