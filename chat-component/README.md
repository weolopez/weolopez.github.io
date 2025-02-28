# WebLLM Chat Component

A modern, sleek web component for AI chat interactions powered by WebLLM.

## Features

- Native Web Component with no build step required
- Web Worker-based processing for smooth UI
- Modern, responsive design with light/dark mode
- Streaming responses with visual typing indication
- Built on WebLLM for in-browser AI inference
- Loads dependencies from CDN - no npm install needed

## Demo

To run the demo locally:

```bash
# Install http-server if you don't have it
npm install -g http-server

# Start the server in the project directory
http-server

# Navigate to http://localhost:8080 in your browser
```

## Browser Requirements

- Modern browser with Web Components support
- WebGPU support for optimal performance (Chrome/Edge 113+, Firefox 113+ with flags)

## Usage

### Basic Usage

Add the component to your HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Chat Component Demo</title>
  <style>
    body, html {
      height: 100%;
      margin: 0;
    }
  </style>
</head>
<body>
  <chat-component></chat-component>
  
  <script type="module" src="path/to/chat-component.js"></script>
</body>
</html>
```

### Advanced Usage

The component supports customization via CSS variables:

```html
<style>
  chat-component {
    --primary-color: #4a90e2;
    --background-color: #f9f9f9;
    --message-user-bg: #e3f2fd;
    --message-assistant-bg: #f5f5f7;
  }
</style>
```

## API

### Attributes

- `dark` - Enable dark mode

### CSS Variables

- `--primary-color` - Accent color for UI elements
- `--secondary-color` - Secondary background color
- `--text-color` - Text color
- `--background-color` - Background color
- `--input-background` - Background for input field
- `--shadow-color` - Color for shadows
- `--message-user-bg` - Background for user messages
- `--message-assistant-bg` - Background for assistant messages
- `--font-family` - Font family

## Technical Details

- Uses WebLLM for in-browser LLM inference 
- Implements Shadow DOM for style encapsulation
- Follows modern ES module patterns
- Offloads model processing to web workers for UI responsiveness

## License

MIT