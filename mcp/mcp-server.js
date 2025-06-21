export class MCPServer {
    constructor() {
        console.log('DEBUG: MCPServer constructor called');
        this.ajv = new Ajv();
        this.running = false;
        console.log('DEBUG: MCPServer constructor completed, running =', this.running);
        this.tools = {
            calculate: {
                name: "calculate",
                description: "Performs basic mathematical calculations",
                inputSchema: {
                    type: "object",
                    properties: {
                        expression: { type: "string", description: "Mathematical expression to evaluate" }
                    },
                    required: ["expression"]
                }
            },
            get_time: {
                name: "get_time",
                description: "Returns current date and time",
                inputSchema: { type: "object", properties: {} }
            },
            echo: {
                name: "echo",
                description: "Echoes back the provided message",
                inputSchema: {
                    type: "object",
                    properties: {
                        message: { type: "string", description: "Message to echo back" }
                    },
                    required: ["message"]
                }
            }
        };

        this.resources = {
            "config.json": {
                uri: "config.json",
                name: "Server Configuration",
                description: "Server configuration data",
                mimeType: "application/json"
            },
            "status.txt": {
                uri: "status.txt",
                name: "Server Status",
                description: "Current server status information",
                mimeType: "text/plain"
            }
        };
    }

    start() {
        console.log('DEBUG: MCPServer.start() called');
        this.running = true;
        console.log('DEBUG: MCPServer.start() - running set to', this.running);
        this.log("Server started", "info");
        console.log('DEBUG: MCPServer.start() completed');
    }

    stop() {
        console.log('DEBUG: MCPServer.stop() called');
        this.running = false;
        console.log('DEBUG: MCPServer.stop() - running set to', this.running);
        this.log("Server stopped", "info");
        console.log('DEBUG: MCPServer.stop() completed');
    }

    handleMessage(message) {
        const { jsonrpc, id, method, params } = message;

        if (jsonrpc !== "2.0") {
            return {
                jsonrpc: "2.0",
                id: id || null,
                error: { code: -32600, message: "Invalid Request" }
            };
        }

        if (!this.running) {
            return {
                jsonrpc: "2.0",
                id: id,
                error: { code: -32000, message: "Server not running" }
            };
        }

        this.log(`Received: ${method}`, "request");

        let result;
        try {
            switch (method) {
                case "initialize":
                    result = this.handleInitialize(params);
                    break;
                case "tools/list":
                    result = this.handleToolsList();
                    break;
                case "tools/call":
                    result = this.handleToolCall(params);
                    break;
                case "resources/list":
                    result = this.handleResourcesList();
                    break;
                case "resources/read":
                    result = this.handleResourceRead(params);
                    break;
                default:
                    return {
                        jsonrpc: "2.0",
                        id: id,
                        error: { code: -32601, message: `Method not found: ${method}` }
                    };
            }

            if (result && result.error) {
                return { jsonrpc: "2.0", id: id, error: result.error };
            }

            return { jsonrpc: "2.0", id: id, result: result };

        } catch (error) {
            this.log(`Internal error: ${error.message}`, "error");
            return {
                jsonrpc: "2.0",
                id: id,
                error: { code: -32603, message: "Internal error", data: error.message }
            };
        }
    }

    handleInitialize(params) {
        this.log("Initialized", "success");
        return {
            protocolVersion: "2024-11-05",
            capabilities: {
                tools: {},
                resources: {}
            },
            serverInfo: {
                name: "Demo MCP Server",
                version: "1.0.0"
            }
        };
    }

    handleToolsList() {
        this.log(`Listed ${Object.keys(this.tools).length} tools`, "success");
        return {
            tools: Object.values(this.tools)
        };
    }

    handleToolCall(params) {
        const { name, arguments: args } = params;

        const tool = this.tools[name];
        if (!tool) {
            return { error: { code: -32601, message: `Tool not found: ${name}` } };
        }

        const validate = this.ajv.compile(tool.inputSchema);
        if (!validate(args)) {
            return {
                error: {
                    code: -32602,
                    message: "Invalid params",
                    data: validate.errors.map(err => `${err.instancePath} ${err.message}`).join(', ')
                }
            };
        }

        try {
            let result;
            switch (name) {
                case "calculate":
                    result = this.calculateTool(args.expression);
                    break;
                case "get_time":
                    result = this.getTimeTool();
                    break;
                case "echo":
                    result = this.echoTool(args.message);
                    break;
                default:
                    return { error: { code: -32601, message: `Tool implementation not found: ${name}` } };
            }
            
            this.log(`Executed tool: ${name}`, "success");
            return { content: [{ type: "text", text: result }] };
        } catch (error) {
            this.log(`Tool error: ${error.message}`, "error");
            return { error: { code: -32603, message: "Internal error", data: error.message } };
        }
    }

    handleResourcesList() {
        this.log(`Listed ${Object.keys(this.resources).length} resources`, "success");
        return {
            resources: Object.values(this.resources)
        };
    }

    handleResourceRead(params) {
        const { uri } = params;
        
        let content;
        let mimeType = "text/plain";
        
        switch (uri) {
            case "config.json":
            case "config://server":
                content = JSON.stringify({
                    server: "Demo MCP Server",
                    version: "1.0.0",
                    started: new Date().toISOString(),
                    running: this.running
                }, null, 2);
                mimeType = "application/json";
                break;
            case "status.txt":
            case "status://server":
                content = `Server Status: ${this.running ? 'Running' : 'Stopped'}\nUptime: ${new Date().toLocaleString()}`;
                mimeType = "text/plain";
                break;
            default:
                return { error: { code: -32001, message: `Resource not found: ${uri}` } };
        }
        
        this.log(`Read resource: ${uri}`, "success");
        return {
            contents: [{
                uri: uri,
                mimeType: mimeType,
                text: content
            }]
        };
    }

    calculateTool(expression) {
        // Simple calculator - only allow basic operations for security
        const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
        if (sanitized !== expression) {
            throw new Error("Invalid characters in expression");
        }
        const result = eval(expression);
        return {
            expression: expression,
            result: result,
            text: `${expression} = ${result}`
        };
    }

    getTimeTool() {
        const now = new Date();
        return {
            time: now.toISOString(),
            timestamp: now.getTime(),
            text: `Current time: ${now.toLocaleString()}`
        };
    }

    echoTool(message) {
        return {
            message: message,
            text: `Echo: ${message}`
        };
    }

    log(message, type = "info") {
        // Logging output to the console in the refactored client-side implementation.
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
    }
}