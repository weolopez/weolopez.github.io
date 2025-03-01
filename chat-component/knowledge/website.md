# Website Information

## Architecture
- This website is built using native Web Components without any frontend frameworks
- The site leverages Shadow DOM for style encapsulation and component isolation
- ES modules with import/export syntax are used for code organization
- Web Workers handle the WebLLM model processing to keep the UI responsive
- The chat component runs entirely in the browser with no server dependencies

## Technologies
- JavaScript (Modern ES2022+ features)
- Native Web Components API
- Web Workers for concurrent processing
- WebLLM for browser-based AI inference
- Shadow DOM for style encapsulation
- CSS custom properties for theming
- LocalStorage for persistent chat history
- Service Workers for offline capability

## Development Approach
- Built incrementally as a personal portfolio project
- Used vanilla JavaScript to avoid framework dependencies
- Implemented modern browser features for performance
- Focused on creating reusable web components
- Used responsive design principles for mobile and desktop support

## Deployment
- Hosted on GitHub Pages for static site delivery
- Continuous integration through GitHub Actions
- No server-side processing required
- Files served directly from the repository