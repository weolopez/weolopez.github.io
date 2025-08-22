# Test Markdown File

This is a **test markdown file** to verify that the finder can read and dispatch content events for `.md` files.

## Features to Test

- File content reading
- MIME type detection (`text/markdown`)
- Event dispatching with full content
- Decoupled architecture

## Code Example

```javascript
console.log('Testing markdown file opening');
```

> This file should trigger a `finder-file-content` event with the full markdown content.