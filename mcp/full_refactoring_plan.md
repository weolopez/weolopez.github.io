# Plan: Full MCP Refactoring for Compliance and Robustness

This document outlines the complete plan to refactor the MCP client and server to be fully compliant with the JSON-RPC 2.0 specification, add robust schema validation, and improve overall code quality.

---

### 1. Introduce JSON Schema Validator (`ajv`)

To enable server-side validation of tool inputs, we will add the `ajv` library to the project.

-   **File to Modify**: `mcp/mcp.html`
-   **Action**: Add a `<script>` tag to include `ajv` from a CDN. This should be placed in the `<head>` section.
    ```html
    <script src="https://cdnjs.cloudflare.com/ajax/libs/ajv/8.12.0/ajv.min.js"></script>
    ```

---

### 2. Enhance `MCPClient` for JSON-RPC 2.0 Compliance

The client will be updated to manage message IDs correctly and to simplify its responsibilities.

-   **File to Modify**: `mcp/mcp-client.js`
-   **Logic Changes**:
    1.  **Add Message ID Counter**: In the `constructor`, initialize a message counter: `this.messageId = 1;`.
    2.  **Use Incrementing ID**: In the `sendMessage` method, replace the random ID generation with an incrementing integer: `id: this.messageId++`.
    3.  **Simplify `sendMessage`**: The method's responsibility is to send a message and return a response or throw an error. All logging of the response should be removed from this class and handled by the application layer (`mcp-app.js`).

---

### 3. Enhance `MCPServer` for Validation and Compliance

The server will be significantly refactored to handle input validation, manage errors, and produce compliant JSON-RPC 2.0 responses.

-   **File to Modify**: `mcp/mcp-server.js`
-   **Logic Changes**:
    1.  **Initialize `ajv`**: In the `constructor`, create an instance of the validator: `this.ajv = new Ajv();`.
    2.  **Centralize Response Wrapping in `handleMessage`**:
        -   This method will now be responsible for constructing the final JSON-RPC 2.0 response object.
        -   It will call the appropriate `handle...` method to get a `result` or an `error` object.
        -   It will then wrap this object into the final structure, including `jsonrpc: '2.0'` and the original message `id`.
    3.  **Implement Schema Validation in `handleToolCall`**:
        -   Before executing a tool, compile the tool's `inputSchema` using `this.ajv.compile()`.
        -   Validate the incoming `params.arguments` against the compiled schema.
        -   **On Validation Failure**: Return a structured error object: `{ code: -32602, message: 'Invalid params', data: validationErrors }`.
        -   **On Tool Execution Failure**: Catch any errors from the tool and return a structured error: `{ code: -32603, message: 'Internal error', data: error.message }`.
    4.  **Simplify All `handle...` Methods**:
        -   All handler methods (e.g., `handleInitialize`, `handleToolsList`) will be simplified. They will no longer wrap their own responses. They will return either a `result` object on success or an `error` object on failure. The `handleMessage` method will handle the final JSON-RPC wrapping.
    5.  **Standardize Error Codes**:
        -   `Method not found`: Return error with code `-32601`.
        -   `Invalid params`: Return error with code `-32602`.
        -   `Internal error`: Return error with code `-32603`.

---

### 4. Architecture Diagram

This diagram illustrates the final, compliant data flow from client to server and back.

```mermaid
sequenceDiagram
    participant App as mcp-app.js
    participant Client as MCPClient
    participant Server as MCPServer
    participant Ajv as Ajv Validator

    App->>Client: client.sendMessage('tools/call', params)
    Client->>Client: id = this.messageId++
    Client->>Server: handleMessage({jsonrpc, id, method, params})

    Server->>Server: route to handleToolCall(params)
    Server->>Ajv: validate(tool.inputSchema, params.arguments)
    
    alt Validation Fails
        Ajv-->>Server: returns validationErrors
        Server-->>Server: error = { code: -32602, message: 'Invalid params', data: validationErrors }
    else Validation Succeeds
        Server->>Server: Execute tool logic
        alt Tool Execution Error
            Server-->>Server: error = { code: -32603, message: 'Internal error', data: '...' }
        else Tool Execution Succeeds
            Server-->>Server: result = { ... }
        end
    end

    Server->>Client: returns {jsonrpc, result/error, id}
    Client-->>App: returns response
    
    App->>App: if response.error, logError(response.error)
    App->>App: else, logResponse(response.result)