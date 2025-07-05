# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands
- Start local server: `npx http-server` or `python -m http.server`
- Preview GitHub Pages: Open `https://weolopez.github.io`
- Test chat component: `cd chat-component && npx http-server`
- Test chat: `cd chat && npm run start`
- Run tests: `cd chat && npm test`
- Run single test: `cd chat && npx jest tests/specificTest.test.js`
- Test finder app: `cd apps/finder && npx http-server`

## Repository Architecture

### Main Applications
- **Finder Clone** (`/apps/finder/`): macOS Finder replica with file management UI
- **Chat Component** (`/chat-component/`): Web component for chat interfaces
- **Chat App** (`/chat/`): Full chat application with testing
- **Database System** (`/database/`): IndexedDB management with event-driven architecture

### Database System Architecture
The database system uses:
- **`db.js`**: Core database client with SharedWorker communication
- **`db-controller.js`**: Business logic controller with event subscriptions
- **`event-bus.js`**: Centralized event system for component communication
- **`db-worker.js`**: SharedWorker handling IndexedDB operations

### Finder Application Structure
- **`finder-service.js`**: Mock file system service with CRUD operations
- **`finder-webapp.js`**: Main UI component with drag-drop, context menus, and file operations
- **`plan.md`**: Detailed implementation roadmap and feature requirements

## Integration Patterns
- Use `../../database/db-controller.js` for database operations
- Subscribe to events via `../../database/event-bus.js`
- Services should extend or integrate with `../../database/db.js` for persistence

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