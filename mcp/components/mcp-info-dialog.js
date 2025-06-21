const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      position: fixed;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    :host(.open) {
      display: flex;
    }
    .dialog-overlay {
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
    }
    .dialog-content {
      position: relative;
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
      max-width: 700px;
      max-height: 80%;
      overflow-y: auto;
      width: 90%;
    }
    .dialog-content h2 {
      color: #2c3e50;
      margin-bottom: 20px;
      font-size: 1.8rem;
      border-bottom: 2px solid #eee;
      padding-bottom: 10px;
    }
    .dialog-content h3 {
      color: #3498db;
      margin-top: 20px;
      margin-bottom: 10px;
      font-size: 1.4rem;
    }
    .dialog-content h4 {
      color: #e74c3c;
      margin-top: 15px;
      margin-bottom: 8px;
      font-size: 1.2rem;
    }
    .dialog-content p, .dialog-content li {
      color: #555;
      line-height: 1.6;
      margin-bottom: 10px;
    }
    .dialog-content ul, .dialog-content ol {
      margin-left: 25px;
      margin-bottom: 15px;
    }
    .dialog-content code {
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      color: #c0392b;
    }
    .close-button {
      position: absolute;
      top: 15px;
      right: 15px;
      background: none;
      border: none;
      font-size: 2rem;
      color: #aaa;
      cursor: pointer;
      transition: color 0.3s ease;
      z-index: 1001;
    }
    .close-button:hover {
      color: #555;
    }
  </style>
  <div class="dialog-overlay"></div>
  <div class="dialog-content">
    <button class="close-button" id="closeBtn">&times;</button>
    <h2>About Model Context Protocol (MCP)</h2>
    <p>This is a demonstration of a Model Context Protocol (MCP) implementation, showcasing bidirectional communication between a client and a server.</p>
    <h3>Key Features:</h3>
    <h4>MCP Server:</h4>
    <ul>
      <li>Tool management (calculate, get_time, echo tools)</li>
      <li>Resource management (config.json, status.txt)</li>
      <li>Message handling for all MCP protocol methods</li>
      <li>Proper JSON-RPC 2.0 message format support</li>
    </ul>
    <h4>MCP Client:</h4>
    <ul>
      <li>Connection management to the server</li>
      <li>Message sending with various MCP methods</li>
      <li>Interactive parameter input with JSON validation</li>
      <li>Real-time logging of all communications</li>
    </ul>
    <h3>Supported MCP Methods:</h3>
    <ul>
      <li><code>initialize</code> - Protocol handshake</li>
      <li><code>tools/list</code> - List available tools</li>
      <li><code>tools/call</code> - Execute tools with parameters</li>
      <li><code>resources/list</code> - List available resources</li>
      <li><code>resources/read</code> - Read resource content</li>
    </ul>
    <h3>How to Use:</h3>
    <ol>
      <li><strong>Start the Server</strong> - Click "Start Server" to initialize the MCP server</li>
      <li><strong>Connect Client</strong> - Click "Connect" to establish client-server connection</li>
      <li><strong>Send Messages</strong> - Select message type, edit parameters, and send MCP requests</li>
      <li><strong>Monitor Logs</strong> - Both panels show real-time communication logs</li>
    </ol>
    <p>The interface features a modern, responsive design with:</p>
    <ul>
      <li>Real-time status indicators</li>
      <li>Interactive controls for both client and server</li>
      <li>Comprehensive logging for debugging</li>
      <li>JSON parameter editing with syntax highlighting</li>
      <li>Example tools and resources for testing</li>
    </ul>
    <p>This implementation demonstrates the core MCP protocol concepts including bidirectional communication, tool execution, resource access, and proper error handling.</p>
  </div>
`;

class MCPInfoDialog extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.closeBtn = this.shadowRoot.getElementById('closeBtn');
    this.overlay = this.shadowRoot.querySelector('.dialog-overlay');

    // Close button event
    this.closeBtn.addEventListener('click', () => {
      this.close();
    });

    // Close dialog when clicking on the overlay
    this.overlay.addEventListener('click', () => {
      this.close();
    });
  }

  open() {
    this.classList.add('open');
  }

  close() {
    this.classList.remove('open');
  }
}

customElements.define('mcp-info-dialog', MCPInfoDialog);
export default MCPInfoDialog;