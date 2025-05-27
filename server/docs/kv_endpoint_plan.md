# Plan to Implement `/v1/kv` Deno KV Endpoint

**Goal:** Create a new `/v1/kv` endpoint in the Deno server that provides a RESTful interface for storing and retrieving JSON data using `Deno.openKv()`, supporting nested keys.

**High-Level Architecture:**

```mermaid
graph TD
    A[Client Request] --> B[Deno Server (main.ts)]
    B --> C{Route Handler for /v1/kv}
    C --> D[New KV Handler (kv.ts)]
    D --> E[Deno.openKv()]
    E --> F[Deno KV Store]
```

**Detailed Steps:**

1.  **Create a New Module for KV Operations (`server/src/kv.ts`)**:
    *   This module will encapsulate all Deno KV interactions.
    *   It will export a function, e.g., `handleKvRequest`, which will take the `Request` object and handle the different HTTP methods (GET, POST, PUT, DELETE).
    *   It will import `Deno.openKv()`.
    *   The `Deno.openKv()` instance will be opened once and reused for all requests to ensure efficiency.

2.  **Implement Key Parsing Logic**:
    *   A helper function will be created to parse the URL path into a Deno KV key array.
    *   For example, a request to `/v1/kv/preferences/ada` will have its path `/preferences/ada` parsed into `["preferences", "ada"]`. The `/v1/kv` prefix will be removed.

3.  **Implement RESTful Handlers within `handleKvRequest`**:

    *   **`GET /v1/kv/:path*` (Read Data)**:
        *   If the path is empty (e.g., `/v1/kv`), it will list all top-level keys.
        *   If a specific path is provided (e.g., `/v1/kv/preferences/ada`), it will retrieve a single entry.
        *   It will support a `prefix` query parameter (e.g., `/v1/kv?prefix=preferences`) to list entries under a given prefix.
        *   Responses: `200 OK` with the JSON data, or `404 Not Found` if the key doesn't exist. For prefix queries, it will return an array of objects, each containing `key` (as an array) and `value`.

    *   **`POST /v1/kv/:path*` (Create Data)**:
        *   Expects a JSON body.
        *   The path will be used as the key.
        *   Uses `kv.set()` to store the data.
        *   Responses: `201 Created` on success. If the key already exists, it will overwrite the existing data.

    *   **`PUT /v1/kv/:path*` (Update/Replace Data)**:
        *   Expects a JSON body.
        *   The path will be the key.
        *   Uses `kv.set()` to update/replace the data.
        *   Responses: `200 OK` or `204 No Content` on success.

    *   **`DELETE /v1/kv/:path*` (Delete Data)**:
        *   The path will be the key.
        *   Uses `kv.delete()` to remove the entry.
        *   Responses: `204 No Content` on successful deletion, or `404 Not Found` if the key didn't exist.

    *   **Error Handling**:
        *   Implement robust error handling for invalid JSON payloads, missing keys, and Deno KV operation failures.
        *   Return appropriate HTTP status codes (e.g., `400 Bad Request` for invalid input, `500 Internal Server Error` for server-side issues).

4.  **Integrate into `server/src/main.ts`**:
    *   Import the new `handleKvRequest` function from `server/src/kv.ts`.
    *   Add a new `if` condition in the `handler` function to route requests starting with `/v1/kv` to `handleKvRequest`.
    *   Ensure the routing order is correct, placing the `/v1/kv` route before the general static file serving.

**Example API Interactions:**

*   **Set data (PUT):**
    ```http
    PUT /v1/kv/preferences/ada
    Content-Type: application/json

    {
      "username": "ada",
      "theme": "dark",
      "language": "en-US"
    }
    ```

*   **Get data (GET):**
    ```http
    GET /v1/kv/preferences/ada
    ```
    Response:
    ```json
    {
      "username": "ada",
      "theme": "dark",
      "language": "en-US"
    }
    ```

*   **List data with prefix (GET with query parameter):**
    ```http
    GET /v1/kv?prefix=preferences
    ```
    Response (array of objects, each with key and value):
    ```json
    [
      { "key": ["preferences", "ada"], "value": { "username": "ada", "theme": "dark", "language": "en-US" } },
      { "key": ["preferences", "grace"], "value": { "username": "grace", "theme": "light", "language": "en-GB" } }
    ]
    ```

*   **Delete data (DELETE):**
    ```http
    DELETE /v1/kv/preferences/ada
    ```

**Considerations:**

*   **Security**: The existing `REQUIRED_TOKEN` in `main.ts` will be enforced for all operations on the `/v1/kv` endpoint to maintain consistency with your current server security.
*   **Concurrency**: The `Deno.openKv()` instance will be managed to ensure it's opened once and reused across requests, optimizing performance.
*   **Error Messages**: API responses will include clear and informative error messages to aid debugging and client-side error handling.