export class MCPClient {
    constructor() {
        this.connected = false;
        this.server = null;
        this.messageId = 1;
    }

    connect(server) {
        this.server = server;
        this.connected = true;
        this.log("Connected to MCP server", "info");
    }

    disconnect() {
        this.server = null;
        this.connected = false;
        this.log("Disconnected from MCP server", "info");
    }

    async sendMessage(method, params = {}) {
        if (!this.connected || !this.server) {
            throw new Error("Not connected to server");
        }
        const message = {
            jsonrpc: "2.0",
            id: this.messageId++,
            method: method,
            params: params
        };
        
        const response = this.server.handleMessage(message);
        
        if (response.error) {
            throw new Error(JSON.stringify(response.error));
        }
        
        return response.result;
    }

    log(message, type = "info") {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
    }
}