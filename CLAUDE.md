# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands
- Start local server: `deno task dev`
- Preview: Open `weolopez.com`
- Test chat component: `cd chat-component && npx http-server`
- Test chat: `cd chat && npm run start`
- Run tests: `cd chat && npm test`
- Run single test: `cd chat && npx jest tests/specificTest.test.js`
- Test finder app: `cd apps/finder && npx http-server`

## Debug and Logging Commands
- Toggle debug mode: `toggleDesktopDebug()` (in browser console)
- View log metrics: `getDesktopLogs()` (in browser console)
- Clear logs: `clearDesktopLogs()` (in browser console)
- Export logs: `exportDesktopLogs()` (in browser console)

## Repository Architecture

### Main Applications
- **Desktop Environment** (`/desktop/`): Complete desktop OS with window management, apps, and services
- **Finder Clone** (`/apps/finder/`): macOS Finder replica with git repository integration
- **Chat Component** (`/chat-component/`): Web component for chat interfaces
- **Chat App** (`/chat/`): Full chat application with testing
- **Database System** (`/database/`): IndexedDB management with event-driven architecture
- **Shared Logging** (`/shared/logger.js`): Centralized event-based logging system

### Database System Architecture
The database system uses:
- **`db.js`**: Core database client with SharedWorker communication
- **`db-controller.js`**: Business logic controller with event subscriptions
- **`event-bus.js`**: Centralized event system for component communication
- **`db-worker.js`**: SharedWorker handling IndexedDB operations

### Desktop Environment Structure
- **`desktop-component.js`**: Main desktop component with startup management and event handling
- **`startup-manager.js`**: Configurable component loading with dependency management
- **`app-service.js`**: Application launching and file content processing
- **`window-manager.js`**: Window lifecycle and state management
- **`system-preferences-webapp.js`**: Settings interface with debug logging controls

### Finder Application Structure
- **`git-filesystem-service.js`**: Git repository integration with LightningFS and isomorphic-git
- **`finder-webapp.js`**: Main UI component with file operations and content event dispatching
- **`plan.md`**: Detailed implementation roadmap and feature requirements

### Shared Logging System
- **`shared/logger.js`**: Event-based logging with debug mode controls
- **System Integration**: Used across desktop environment and finder application
- **Debug Controls**: Accessible via System Preferences → System → Enable debug logging
- **Features**: Metrics collection, log export, component-specific tagging

## Integration Patterns
- Use `../../database/db-controller.js` for database operations
- Subscribe to events via `../../database/event-bus.js`
- Services should extend or integrate with `../../database/db.js` for persistence
- Import shared logger: `import { Logger } from '../../../shared/logger.js'`
- Use component-specific logging tags for better debugging
- Finder publishes file content events for desktop environment consumption

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
- Use structured logging instead of console.log statements
- Log errors with appropriate context data and component tags

## Web Component Architecture
- Native Web Components (no framework dependencies)
- Mobile-first responsive design with flex/grid
- Support accessibility with proper ARIA attributes
- Use Web Workers for heavy processing to keep UI responsive