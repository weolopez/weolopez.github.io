# CLAUDE.md - Chat Component Guidelines

## Development Commands
- Start local server: `npx http-server`
- Test in browser: Navigate to `http://localhost:8080`
- Lint JS: `npx eslint chat-component.js`

## Architecture
- Use native Web Components API (no framework dependencies)
- Load WebLLM from CDN: `import * as webllm from "https://esm.run/@mlc-ai/web-llm"`
- Implement Web Workers for LLM processing to keep UI responsive
- Follow Shadow DOM encapsulation for styles and component structure

## Code Style Guidelines
- Use ES modules with `import/export`
- Leverage modern ES2022+ features (optional chaining, nullish coalescing)
- Prefer async/await over promises
- Use camelCase for methods and properties
- Define component lifecycle methods clearly

## Component Design
- Clean, minimalistic UI with subtle animations
- Support for light/dark mode via CSS variables
- Mobile-first responsive design with flex/grid
- Accessibility: proper ARIA attributes and keyboard navigation
- Custom styling options via CSS properties

## Error Handling
- Graceful degradation if WebGPU not available
- Clear user feedback for loading/processing states
- Friendly error messages for common failure points

## Performance
- Offload LLM processing to Web Worker
- Use IntersectionObserver for lazy-loading resources
- Implement debouncing for user input events
- Cache model data using IndexedDB or localStorage