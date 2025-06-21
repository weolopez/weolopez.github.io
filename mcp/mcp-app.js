import { MCPServer } from './mcp-server.js';
import { MCPClient } from './mcp-client.js';
import MCPClientPanel from './components/mcp-client-panel.js';
import MCPServerPanel from './components/mcp-server-panel.js';
import MCPInfoDialog from './components/mcp-info-dialog.js';

// Global instances for the MCP server and client
console.log('DEBUG: Creating MCP Server and Client instances...');
const server = new MCPServer();
const client = new MCPClient();
console.log('DEBUG: MCP Server and Client instances created successfully');

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DEBUG: DOM Content Loaded - Starting application initialization');
  
  // Retrieve web component elements from the DOM
  const clientPanel = document.querySelector('mcp-client-panel');
  const serverPanel = document.querySelector('mcp-server-panel');
  const infoDialog = document.querySelector('mcp-info-dialog');
  const infoButton = document.getElementById('infoButton');
  
  console.log('DEBUG: Web components found:', {
    clientPanel: !!clientPanel,
    serverPanel: !!serverPanel,
    infoDialog: !!infoDialog,
    infoButton: !!infoButton
  });

  // ------------------------
  // Setup MCP Client Panel
  // ------------------------

  // Handle client connect event
  clientPanel.addEventListener('client-connect', () => {
    console.log('DEBUG: Client connect event triggered');
    console.log('DEBUG: Server running status:', server.running);
    
    if (!server.running) {
      console.log('DEBUG: Server not running - showing alert');
      alert('Please start the server first');
      return;
    }
    
    console.log('DEBUG: Attempting to connect client to server...');
    client.connect(server);
    clientPanel.updateStatus('Connected', 'connected');
    clientPanel.setButtons({ connectDisabled: true, disconnectDisabled: false, sendDisabled: false });
    clientPanel.addLog('Client connected to server', 'info');
    console.log('DEBUG: Client connection completed');
  });

  // Handle client disconnect event
  clientPanel.addEventListener('client-disconnect', () => {
    console.log('DEBUG: Client disconnect event triggered');
    client.disconnect();
    clientPanel.updateStatus('Disconnected', 'disconnected');
    clientPanel.setButtons({ connectDisabled: false, disconnectDisabled: true, sendDisabled: true });
    clientPanel.addLog('Client disconnected from server', 'info');
    console.log('DEBUG: Client disconnection completed');
  });

  // Handle sending message event from client panel
  clientPanel.addEventListener('client-send-message', async (e) => {
    const { messageType, params } = e.detail;
    try {
      const response = await client.sendMessage(messageType, params);
      clientPanel.logInfo('Message sent: ' + messageType);
      if (response.error) {
        clientPanel.logError(response.error);
      } else {
        clientPanel.logResponse(response.result);
      }
    } catch (error) {
      clientPanel.logError({ message: 'Failed to send message: ' + error.message, code: 'unknown' });
    }
  });

  // ------------------------
  // Setup MCP Server Panel
  // ------------------------
  console.log('DEBUG: Setting up server panel event listeners...');

  // Handle server start event
  serverPanel.addEventListener('server-start', () => {
    console.log('DEBUG: server-start event received!');
    console.log('DEBUG: Calling server.start()...');
    
    try {
      server.start();
      console.log('DEBUG: server.start() completed, server.running =', server.running);
      
      serverPanel.updateStatus('Running', 'connected');
      serverPanel.setButtons({ startDisabled: true, stopDisabled: false });
      
      // Display the available tools and resources
      console.log('DEBUG: Setting tools and resources...');
      console.log('DEBUG: Available tools:', Object.values(server.tools));
      console.log('DEBUG: Available resources:', Object.values(server.resources));
      
      serverPanel.setTools(Object.values(server.tools));
      serverPanel.setResources(Object.values(server.resources));
      serverPanel.addLog('Server started', 'info');
      console.log('DEBUG: Server start process completed successfully');
    } catch (error) {
      console.log('DEBUG: Server start failed:', error);
      serverPanel.addLog('Server start failed: ' + error.message, 'error');
    }
  });

  // Handle server stop event
  serverPanel.addEventListener('server-stop', () => {
    console.log('DEBUG: server-stop event received!');
    
    try {
      server.stop();
      console.log('DEBUG: server.stop() completed, server.running =', server.running);
      
      // Disconnect client if still connected
      if (client.connected) {
        console.log('DEBUG: Disconnecting client...');
        client.disconnect();
        clientPanel.updateStatus('Disconnected', 'disconnected');
        clientPanel.setButtons({ connectDisabled: false, disconnectDisabled: true, sendDisabled: true });
        clientPanel.addLog('Client disconnected due to server stop', 'info');
      }
      
      serverPanel.updateStatus('Stopped', 'disconnected');
      serverPanel.setButtons({ startDisabled: false, stopDisabled: true });
      serverPanel.addLog('Server stopped', 'info');
      console.log('DEBUG: Server stop process completed');
    } catch (error) {
      console.log('DEBUG: Server stop failed:', error);
      serverPanel.addLog('Server stop failed: ' + error.message, 'error');
    }
  });

  // ------------------------
  // Setup Info Dialog
  // ------------------------

  // Open info dialog when infoButton is clicked
  infoButton.addEventListener('click', () => {
    console.log('DEBUG: Info button clicked');
    infoDialog.open();
  });

  // ------------------------
  // Additional Initialization
  // ------------------------

  // Optionally, initialize default parameters in the client panel by simulating a change event
  const event = new Event('change');
  clientPanel.shadowRoot.getElementById('messageType').dispatchEvent(event);
  
  // Log initialization complete
  console.log('DEBUG: All event listeners attached successfully');
  console.log('DEBUG: Application initialization complete');
  console.log('MCP Application initialized');

  // End of DOMContentLoaded event listener
});

// End of file: mcp/mcp-app.js