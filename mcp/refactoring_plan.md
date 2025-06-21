# Plan: Enhance MCP Implementation Robustness and Compliance

The goal is to make the existing client-side MCP implementation more robust by adding schema validation for tool inputs, improving compliance with the JSON-RPC 2.0 specification, and displaying detailed validation errors in the client UI.

---

### 1. Introduce a JSON Schema Validator

To handle schema validation, we'll need a lightweight, client-side JSON schema validation library. `ajv` (Another JSON Schema Validator) is a popular and powerful choice that works well in the browser.

- **Action**: Add the `ajv` library to our project. Since we don't have a package manager like npm set up, we'll include it via a CDN in `mcp/mcp.html`.

### 2. Implement Schema Validation in `MCPServer`

The `MCPServer`'s `handleToolCall` method will be the core of this change. Before executing a tool, it will validate the incoming `arguments` against the tool's `inputSchema`.

- **File to Modify**: `mcp/mcp-server.js`
- **Logic Change**:
    1. In the `MCPServer` class, initialize an `Ajv` instance in the constructor.
    2. In `handleToolCall`, before the `try...catch` block, retrieve the `inputSchema` for the requested tool.
    3. Use `ajv` to compile the schema and validate the `params.arguments` against it.
    4. If validation fails, return a standard JSON-RPC error object with `code: -32602` (Invalid Params). The `error.data` field will contain the array of validation errors from `ajv`.
    5. If validation succeeds, proceed with the tool execution as normal.

### 3. Enhance JSON-RPC 2.0 Compliance

We will improve several aspects of the client and server to align more closely with the JSON-RPC 2.0 specification.

#### A. Message ID Management (`MCPClient`)

The client currently uses a simple random string for the `id`. We'll make this a more robust incrementing integer.

- **File to Modify**: `mcp/mcp-client.js`
- **Logic Change**:
    1. Add a `messageId` counter to the `MCPClient` constructor, initialized to `1`.
    2. In `sendMessage`, use this counter for the message `id` and increment it after each message.

#### B. Structured JSON-RPC Responses (`MCPServer`)

The server should consistently return valid JSON-RPC 2.0 response objects.

- **File to Modify**: `mcp/mcp-server.js`
- **Logic Change**:
    1. The `handleMessage` function in `MCPServer` should accept the entire message object to get access to the `id`.
    2. Every `return` statement from the `handle...` methods should be wrapped into a full JSON-RPC response object with the correct `id` and `result`/`error` structure.

#### C. Standardized Error Codes (`MCPServer`)

We will implement standard JSON-RPC 2.0 error codes for different error conditions.

- **File to Modify**: `mcp/mcp-server.js`
- **Logic Change**:
    - `Method not found (-32601)`: When the `message.method` is unknown.
    - `Invalid params (-32602)`: For schema validation failures.
    - `Internal error (-32603)`: For errors during tool execution.

### 4. Display Validation Errors in the Client UI

We will update the client-side code to specifically look for and display validation errors.

- **Files to Modify**: `mcp/mcp-app.js` and `mcp/components/mcp-client-panel.js`.
- **Logic Change**:
    1. In `mcp/mcp-app.js`, when a response is received, check if `response.error` exists.
    2. If `response.error` exists, pass the entire `error` object to the `clientPanel.addLog` method.
    3. In `mcp/components/mcp-client-panel.js`, update the `addLog` method. If the error object contains a `data` field, it should iterate through the `data` array and display each validation error message.

---

### Architecture Diagram

This diagram illustrates the updated `handleToolCall` flow with schema validation and detailed error reporting.

```mermaid
sequenceDiagram
    participant ClientPanel as mcp-client-panel
    participant App as mcp-app.js
    participant Client as MCPClient
    participant Server as MCPServer
    participant Ajv as Ajv Validator

    ClientPanel->>App: User clicks "Send Message" (tools/call)
    App->>Client: client.sendMessage('tools/call', params)
    Client->>Server: handleMessage({id, method, params})
    Server->>Server: Retrieve tool's inputSchema
    Server->>Ajv: validate(schema, params.arguments)
    alt Validation Fails
        Ajv-->>Server: returns validationErrors
        Server-->>Client: returns JSON-RPC Error { code: -32602, data: validationErrors }
    else Validation Succeeds
        Ajv-->>Server: returns true
        Server->>Server: Execute tool logic
        alt Tool Execution Error
            Server-->>Client: returns JSON-RPC Error Response (code: -32603)
        else Tool Execution Succeeds
            Server-->>Client: returns JSON-RPC Success Response
        end
    end
    Client-->>App: returns response
    alt Error Response
        App->>ClientPanel: clientPanel.addLog(response.error, 'error')
        ClientPanel->>ClientPanel: Format and display detailed errors from error.data
    else Success Response
        App->>ClientPanel: clientPanel.addLog(response.result, 'response')
    end