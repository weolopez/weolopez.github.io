# Deno KV REST API

This server provides a RESTful API for interacting with Deno's built-in Key-Value store at the `/v1/kv` endpoint.

## Features

- **RESTful Interface**: Standard HTTP methods (GET, POST, PUT, DELETE)
- **Nested Keys**: Support for hierarchical key structures
- **JSON Storage**: Store and retrieve complex JSON objects
- **Prefix Queries**: List entries by key prefix
- **CORS Support**: Cross-origin requests enabled
- **Error Handling**: Comprehensive error responses

## API Endpoints

### Base URL
```
http://localhost:8081/v1/kv
```

### Authentication
All requests require the `TOKEN` environment variable to be set on the server.

## HTTP Methods

### GET - Retrieve Data

#### Get a specific entry
```http
GET /v1/kv/preferences/ada
```

**Response (200 OK):**
```json
{
  "key": ["preferences", "ada"],
  "value": {
    "username": "ada",
    "theme": "dark",
    "language": "en-US"
  },
  "versionstamp": "00000000000000010000"
}
```

#### List entries with prefix
```http
GET /v1/kv?prefix=preferences
```

**Response (200 OK):**
```json
[
  {
    "key": ["preferences", "ada"],
    "value": { "username": "ada", "theme": "dark", "language": "en-US" },
    "versionstamp": "00000000000000010000"
  },
  {
    "key": ["preferences", "grace"],
    "value": { "username": "grace", "theme": "light", "language": "en-GB" },
    "versionstamp": "00000000000000020000"
  }
]
```

#### List all entries
```http
GET /v1/kv
```

### POST - Create Data

```http
POST /v1/kv/preferences/ada
Content-Type: application/json

{
  "username": "ada",
  "theme": "dark",
  "language": "en-US"
}
```

**Response (201 Created):**
```json
{
  "key": ["preferences", "ada"],
  "value": {
    "username": "ada",
    "theme": "dark",
    "language": "en-US"
  },
  "versionstamp": "00000000000000010000"
}
```

### PUT - Update/Replace Data

```http
PUT /v1/kv/preferences/ada
Content-Type: application/json

{
  "username": "ada",
  "theme": "light",
  "language": "en-US",
  "notifications": true
}
```

**Response (200 OK):**
```json
{
  "key": ["preferences", "ada"],
  "value": {
    "username": "ada",
    "theme": "light",
    "language": "en-US",
    "notifications": true
  },
  "versionstamp": "00000000000000030000"
}
```

### DELETE - Remove Data

```http
DELETE /v1/kv/preferences/ada
```

**Response (204 No Content):**
```
(empty body)
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid JSON in request body"
}
```

### 404 Not Found
```json
{
  "error": "Key not found"
}
```

### 405 Method Not Allowed
```json
{
  "error": "Method PATCH not allowed"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Key Structure

Keys are automatically parsed from the URL path:
- `/v1/kv/users/123` → `["users", "123"]`
- `/v1/kv/config/app/theme` → `["config", "app", "theme"]`
- `/v1/kv/simple` → `["simple"]`

## Usage Examples

### JavaScript/TypeScript Client

```typescript
const BASE_URL = 'http://localhost:8081/v1/kv';

// Create or update data
async function setUserPreferences(userId: string, prefs: any) {
  const response = await fetch(`${BASE_URL}/preferences/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs)
  });
  return response.json();
}

// Get data
async function getUserPreferences(userId: string) {
  const response = await fetch(`${BASE_URL}/preferences/${userId}`);
  if (response.ok) {
    return response.json();
  }
  return null;
}

// List all user preferences
async function getAllUserPreferences() {
  const response = await fetch(`${BASE_URL}?prefix=preferences`);
  return response.json();
}

// Delete data
async function deleteUserPreferences(userId: string) {
  const response = await fetch(`${BASE_URL}/preferences/${userId}`, {
    method: 'DELETE'
  });
  return response.ok;
}
```

### cURL Examples

```bash
# Set data
curl -X PUT http://localhost:8081/v1/kv/preferences/ada \
  -H "Content-Type: application/json" \
  -d '{"username":"ada","theme":"dark","language":"en-US"}'

# Get data
curl http://localhost:8081/v1/kv/preferences/ada

# List with prefix
curl "http://localhost:8081/v1/kv?prefix=preferences"

# Delete data
curl -X DELETE http://localhost:8081/v1/kv/preferences/ada
```

## Testing

Run the test script to verify the API functionality:

```bash
# Make sure the server is running first
deno run --allow-net --allow-env server/test_kv_endpoint.ts
```

## Notes

- The KV store persists data across server restarts
- Keys are case-sensitive
- Values must be valid JSON
- The API supports CORS for cross-origin requests
- All operations are atomic at the individual key level