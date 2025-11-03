# Hocuspocus Google SSO Authentication Guide

This guide explains how to use Google SSO authentication with your Hocuspocus collaborative editing server.

## Overview

The authentication system secures your Hocuspocus server by requiring clients to authenticate with Google SSO before they can access collaborative documents. The system uses JWT tokens for stateless authentication.

## Architecture

```
┌─────────────────┐
│  Client Browser │
└────────┬────────┘
         │ 1. Login via google-login.js
         ▼
┌─────────────────┐
│  Google OAuth   │
└────────┬────────┘
         │ 2. JWT Token
         ▼
┌─────────────────┐
│ hocuspocus-     │
│ provider.js     │
└────────┬────────┘
         │ 3. Connect with token (WebSocket)
         ▼
┌─────────────────┐
│  server.ts      │
│  (Verifies JWT) │
└─────────────────┘
         │ 4. Allow/Deny
         ▼
┌─────────────────┐
│  Collaborative  │
│   Document      │
└─────────────────┘
```

## Components

### 1. Server (`server.ts`)

**Features:**
- Verifies Google JWT tokens using Google's public keys
- Caches JWKS for performance
- Falls back to anonymous access during development (configurable)
- Logs authentication events

**Key Functions:**
- `verifyGoogleJWT(token)`: Validates tokens against Google's public keys
- `Authentication` extension: Intercepts connection attempts and validates tokens

### 2. Client Provider (`js/hocuspocus-provider.js`)

**Already supports token parameter:**
```javascript
export function getDocumentType(typeString, name, url, token) {
  const provider = new HocuspocusProvider({
    url: getWebSocketUrl(url),
    name: name,
    token: token,  // Passed to server
  });
  // ...
}
```

### 3. Google Login Component (`wc/google-login.js`)

**Already provides:**
- `getToken()`: Returns the JWT token
- `getUserInfo()`: Returns decoded user info
- `isAuthenticated()`: Checks if user is logged in
- `authenticated` event: Dispatched when login succeeds

## Usage Examples

### Example 1: Basic Authentication Flow

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import { createReactiveText } from './js/hocuspocus-provider.js';

    // Wait for authentication
    const loginComponent = document.querySelector('google-login');
    
    loginComponent.addEventListener('authenticated', (event) => {
      const token = event.detail.token;
      const user = event.detail.user;
      
      console.log('User authenticated:', user.email);
      
      // Now create collaborative document with token
      const reactiveText = createReactiveText('my-doc', undefined, token);
      
      // Bind to textarea
      const textarea = document.getElementById('editor');
      reactiveText.bind(textarea);
    });
  </script>
</head>
<body>
  <google-login></google-login>
  <textarea id="editor" disabled>Login to start editing...</textarea>
</body>
</html>
```

### Example 2: Using SyncedSignal with Authentication

```javascript
import { SyncedSignal } from './js/hocuspocus-provider.js';

const loginComponent = document.querySelector('google-login');

loginComponent.addEventListener('authenticated', (event) => {
  const token = event.detail.token;
  
  // Create a synced signal with authentication
  const counter = new SyncedSignal(0, 'counter-doc', 'value', undefined, token);
  
  // Subscribe to changes
  counter.subscribe(value => {
    console.log('Counter updated:', value);
  });
  
  // Update value
  counter.value = counter.value + 1;
});
```

### Example 3: Multiple Documents with Shared Token

```javascript
import { createReactiveText, createReactiveMap, createReactiveArray } from './js/hocuspocus-provider.js';

const loginComponent = document.querySelector('google-login');

loginComponent.addEventListener('authenticated', async (event) => {
  const token = event.detail.token;
  
  // Create multiple collaborative structures
  const noteText = createReactiveText('notes', undefined, token);
  const userData = createReactiveMap('user-data', undefined, token);
  const todoList = createReactiveArray('todos', undefined, token);
  
  // All use the same authenticated token
  noteText.bind(document.getElementById('notes'));
  userData.bind('username', document.getElementById('username'));
  todoList.bindRenderer(todos => renderTodos(todos));
});
```

### Example 4: Handling Token Expiration

```javascript
const loginComponent = document.querySelector('google-login');
let currentToken = null;
let providers = [];

loginComponent.addEventListener('authenticated', (event) => {
  currentToken = event.detail.token;
  initializeCollaboration(currentToken);
});

function initializeCollaboration(token) {
  // Create providers
  const doc1 = createReactiveText('doc1', undefined, token);
  const doc2 = createReactiveMap('doc2', undefined, token);
  
  providers.push(doc1, doc2);
  
  // Listen for authentication errors
  doc1.provider.on('status', ({ status }) => {
    if (status === 'disconnected') {
      console.warn('Connection lost - may need to re-authenticate');
    }
  });
}

// Token refresh logic (Google tokens expire in ~1 hour)
setInterval(() => {
  if (loginComponent.isAuthenticated()) {
    // Re-prompt for login if needed
    google.accounts.id.prompt();
  }
}, 55 * 60 * 1000); // Refresh 5 minutes before expiration
```

## Server Configuration

### Development Mode

The server currently allows anonymous connections for development:

```typescript
if (!token) {
  console.warn(`Connection without token - allowing for development`);
  return { 
    userId: "anonymous",
    email: "anonymous@local",
    name: "Anonymous User"
  };
}
```

### Production Mode

**To require authentication in production**, remove the anonymous fallback:

```typescript
authenticate: async ({ token, connection, documentName }) => {
  if (!token) {
    throw new Error("Authentication required");
  }

  const userInfo = await verifyGoogleJWT(token);
  console.log(`Authenticated user: ${userInfo.email} for document: ${documentName}`);
  
  return userInfo;
}
```

### Environment Variables

Consider using environment variables for sensitive configuration:

```typescript
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "your-default-client-id";
const ALLOW_ANONYMOUS = Deno.env.get("ALLOW_ANONYMOUS") === "true";
```

## Security Best Practices

### 1. Always Use HTTPS in Production

```javascript
function getWebSocketUrl(customUrl) {
  if (customUrl) return customUrl;
  const isProduction = window.location.hostname !== 'localhost';
  return isProduction ? 'wss://your-domain.com' : 'ws://localhost:8888';
}
```

### 2. Validate Token on Every Connection

The server already does this - never trust client-side validation alone.

### 3. Implement Token Refresh

Google tokens expire after ~1 hour. Implement automatic refresh:

```javascript
class TokenManager {
  constructor(loginComponent) {
    this.loginComponent = loginComponent;
    this.setupRefresh();
  }
  
  setupRefresh() {
    // Check token every 50 minutes
    setInterval(() => {
      if (this.needsRefresh()) {
        this.refreshToken();
      }
    }, 50 * 60 * 1000);
  }
  
  needsRefresh() {
    const token = this.loginComponent.getToken();
    if (!token) return false;
    
    // Decode token and check expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = payload.exp * 1000;
    const now = Date.now();
    
    // Refresh if expiring in < 10 minutes
    return (expiresAt - now) < 10 * 60 * 1000;
  }
  
  async refreshToken() {
    // Trigger Google re-authentication
    google.accounts.id.prompt();
  }
}
```

### 4. Handle Authentication Failures

```javascript
provider.on('authenticationFailed', (error) => {
  console.error('Authentication failed:', error);
  
  // Show login UI
  document.getElementById('editor').disabled = true;
  document.getElementById('loginPrompt').style.display = 'block';
});
```

### 5. Store Client ID Securely

Never hardcode client IDs in production. Use environment variables or configuration files.

## Testing

### Test Anonymous Access (Development)

```bash
# Start server
deno run --allow-net --allow-read --allow-write server.ts

# In browser console (no token)
import { createReactiveText } from './js/hocuspocus-provider.js';
const doc = createReactiveText('test-doc', 'ws://localhost:8888');
// Should connect as anonymous
```

### Test Authenticated Access

```html
<!-- test-auth.html -->
<script type="module">
  const login = document.querySelector('google-login');
  
  login.addEventListener('authenticated', async (event) => {
    const { createReactiveText } = await import('./js/hocuspocus-provider.js');
    const doc = createReactiveText('test-doc', 'ws://localhost:8888', event.detail.token);
    
    doc.provider.on('authenticated', () => {
      console.log('✅ Successfully authenticated with server');
    });
    
    doc.provider.on('authenticationFailed', (error) => {
      console.error('❌ Authentication failed:', error);
    });
  });
</script>

<google-login></google-login>
```

## Troubleshooting

### Issue: "Cannot find module '@hocuspocus/extension-authentication'"

The TypeScript error is expected. Deno will resolve it at runtime via npm: specifier.

**Solution**: Run with Deno, not Node.js:
```bash
deno run --allow-net --allow-read --allow-write server.ts
```

### Issue: "JWT verification failed"

**Common causes:**
1. Token expired (Google tokens expire in 1 hour)
2. Wrong audience (client ID mismatch)
3. Network issues fetching Google public keys

**Solution**: Check server logs for specific error. Ensure client ID matches.

### Issue: Connection works without token

This is expected in development mode. See "Production Mode" section to require authentication.

### Issue: Token not being sent to server

Check browser network tab - token should appear in WebSocket connection request. Ensure you're passing it to `getDocumentType()`:

```javascript
// ❌ Wrong - no token
const doc = createReactiveText('my-doc');

// ✅ Correct - with token
const token = loginComponent.getToken();
const doc = createReactiveText('my-doc', undefined, token);
```

## API Reference

### Server Functions

#### `verifyGoogleJWT(token: string)`
Verifies a Google JWT token and returns user information.

**Returns:**
```typescript
{
  userId: string,    // Google user ID (sub claim)
  email: string,     // User's email
  name: string,      // User's full name
  picture: string    // Avatar URL
}
```

**Throws:** Error if token is invalid or expired

### Client Methods

#### `google-login` Component

- `getToken()`: Returns JWT token string
- `getUserInfo()`: Returns decoded user object
- `isAuthenticated()`: Returns boolean
- Event: `authenticated` - Dispatched on successful login

#### `getDocumentType(type, name, url, token)`

Creates a collaborative document with authentication.

**Parameters:**
- `type`: 'text' | 'map' | 'array' | 'xml' | 'awareness'
- `name`: Document name (string)
- `url`: WebSocket URL (optional)
- `token`: JWT token (optional)

## Migration Guide

### From Unauthenticated to Authenticated

**Before:**
```javascript
const doc = createReactiveText('my-doc');
```

**After:**
```javascript
const loginComponent = document.querySelector('google-login');

loginComponent.addEventListener('authenticated', (event) => {
  const doc = createReactiveText('my-doc', undefined, event.detail.token);
});
```

### Updating Existing Pages

1. Add `<google-login>` component to page
2. Wrap document creation in `authenticated` event listener
3. Pass token to document creation functions
4. Test authentication flow
5. Deploy server with authentication enabled

## Additional Resources

- [Google Identity Services](https://developers.google.com/identity/gsi/web)
- [Hocuspocus Documentation](https://tiptap.dev/hocuspocus)
- [JOSE Library (JWT)](https://github.com/panva/jose)
- [Deno Deploy Guide](https://deno.com/deploy)

## Support

For issues or questions:
1. Check server logs: `deno run --allow-net --allow-read --allow-write server.ts`
2. Check browser console for client errors
3. Verify token is being sent in WebSocket connection
4. Test with anonymous mode first, then enable authentication
