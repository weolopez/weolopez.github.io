# CLAUDE.md - Repository Guidelines

## Development Commands
- Start local server: `npx http-server` or `python -m http.server`
- Preview GitHub Pages: Open `https://weolopez.github.io`
- Test chat component: `cd chat-component && npx http-server`
- Test chat: `cd chat && npm run start`
- Run tests: `cd chat && npm test`
- Run single test: `cd chat && npx jest tests/specificTest.test.js`

## Code Style Guidelines
- Use ES modules with `import/export` syntax
- Leverage modern ES2022+ features (optional chaining, nullish coalescing)
- Prefer async/await over promises
- Use camelCase for variables and functions, PascalCase for classes
- Components use Shadow DOM for style encapsulation
- Web Components follow lifecycle method patterns (connectedCallback, etc.)

## Error Handling
- Use try/catch blocks for async operations
- Provide clear user feedback for loading/error states
- Implement graceful degradation for unsupported features

## Web Component Architecture
- Native Web Components (no framework dependencies)
- Mobile-first responsive design with flex/grid
- Support accessibility with proper ARIA attributes
- Use Web Workers for heavy processing to keep UI responsive