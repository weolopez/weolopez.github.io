# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands
- Test finder app: `../../deno task dev` ` (serves on http://localhost:8081)
- Test with database integration: Navigate to `../../database/index.html` for database testing
- Test with desktop integration: Navigate to `../../desktop/index.html` for desktop environment

## Finder Application Architecture

### Core Components
- **`finder-webapp.js`**: Main web component implementing macOS Finder UI with drag-drop, context menus, and file operations
- **`git-filesystem-service.js`**: Real filesystem service using LightningFS and isomorphic-git for persistent file operations
- **`finder-service.js`**: Legacy mock file system service (fallback when LightningFS unavailable)
- **`index.html`**: Simple entry point that loads the finder-webapp component
- **`plan.md`**: Comprehensive implementation roadmap detailing current features and missing functionality

### Current Implementation Status

#### ✅ Implemented Features
- **Real filesystem persistence** using LightningFS (browser-based file operations)
- **Dynamic dependency loading** via ES modules (no HTML script dependencies)
- **Graceful fallback** to mock filesystem if LightningFS unavailable
- Basic UI structure (toolbar, sidebar, content area, status bar)
- View modes: Icon view, List view (Column view is placeholder)
- File operations: Delete, Rename, Duplicate, Move to Trash
- Navigation: Directory browsing, path bar, sidebar shortcuts
- Context menus with right-click file operations
- Get Info modal with editable metadata
- Drag & drop file/folder moving between directories
- Keyboard shortcuts (Cmd+I, Delete, Enter, F2, Escape)
- Basic filename search functionality
- Mobile responsive design
- **File persistence** across browser sessions
- **Application metadata** storage via JSON files

#### 🚨 Critical Missing Features (see plan.md for details)
- Column view mode (currently placeholder only)
- Navigation history (back/forward buttons)
- File/folder creation UI (backend exists, no UI)
- macOS menu bar system
- Copy/cut/paste operations
- Enhanced multi-select (shift+click, rubber band selection)
- Advanced view options and sorting
- Quick Look preview system
- Advanced search with filters

### Component Architecture

#### FinderWebApp Class Structure
```javascript
class FinderWebApp extends HTMLElement {
  // Core state management
  currentPath: string          // Current directory path
  selectedItems: Set          // Currently selected files/folders
  viewMode: string           // 'icon', 'list', 'column'
  
  // UI state
  contextMenuVisible: boolean
  infoModalVisible: boolean
  renameMode: boolean
  
  // Drag & drop
  draggedItems: Set
  dropZone: HTMLElement
}
```

#### FinderService Class Structure
```javascript
class FinderService {
  fileSystem: Object         // Mock file system structure
  
  // Core CRUD operations
  getDirectoryContents(path)
  createFolder(path, name)
  deleteItem(path)
  renameItem(oldPath, newName)
  duplicateItem(path)
  moveItem(fromPath, toPath)
}
```

### Integration Patterns

#### Filesystem Service Architecture
- **Primary**: `GitFileSystemService` using LightningFS for real file operations
- **Fallback**: `FinderService` (legacy mock) when LightningFS unavailable
- **Factory Pattern**: `FileSystemServiceFactory.createService()` handles selection
- **ES Module Loading**: Dynamic imports for dependencies (no HTML script tags needed)
- **Metadata Storage**: Application configs stored as `.metadata.json` files

#### Desktop Environment Integration
- Supports optional desktop event system integration
- Can launch applications via `createLaunchAppMessage()` events
- Graceful fallback when desktop system is unavailable
- Uses `/desktop/src/events/message-types.js` for event communication

#### LightningFS Integration
- **Persistent storage**: Files persist across browser sessions using IndexedDB
- **Real filesystem API**: Standard Node.js-like filesystem operations
- **Recursive operations**: Full directory tree copy/delete support
- **Error handling**: Proper ENOENT, EEXIST error codes

### File System Structure
The mock file system includes:
- Root directory with Desktop folder
- Desktop contains applications (Finder, Chat, Notification)
- Config folder with sample HTML/CSS/JS files
- Each item has metadata: name, type, path, size, modified date
- Applications have launch configuration (sourceUrl, tag, onstartup)

### View Modes Implementation

#### Icon View
- CSS Grid layout with responsive breakpoints
- File icons with labels below
- Drag & drop support for file operations
- Multi-select via Cmd+click

#### List View  
- Table-style layout with columns (Name, Date Modified, Size)
- Sortable columns (partially implemented)
- Compact display for large directories

#### Column View (Placeholder)
- Three-column navigation hierarchy planned
- Parent → Current → Preview/Children columns
- Horizontal scrolling for deep hierarchies

### Event Handling Architecture

#### Keyboard Shortcuts
- `Cmd+I` / `F2`: Get Info modal
- `Delete`: Move to trash
- `Enter`: Open/rename selected item
- `Escape`: Cancel operations
- Multi-select with `Cmd+click`

#### Mouse Interactions
- Single click: Select item
- Double click: Open folder/file
- Right click: Context menu
- Drag & drop: Move files between folders

#### Context Menu System
- Dynamic menu based on selection type
- File operations: Open, Get Info, Rename, Duplicate, Move to Trash
- Empty space: Create new folder (planned)

### Styling and Responsive Design

#### CSS Architecture
- Shadow DOM encapsulation for component isolation
- CSS Grid and Flexbox for responsive layouts
- Mobile-first design with touch-friendly interactions
- macOS-inspired color scheme and typography

#### Responsive Breakpoints
- Mobile: Simplified single-column layout
- Tablet: Two-panel layout (sidebar + content)
- Desktop: Full three-panel layout with all features

### Performance Considerations
- Virtual scrolling needed for large directories (planned)
- Thumbnail caching for image files (planned)
- Debounced search to prevent excessive queries
- Lazy loading for folder contents (planned)

### Code Style Guidelines
- ES6+ modules with import/export
- Web Components with Shadow DOM
- Modern JavaScript features (optional chaining, async/await)
- Event-driven architecture for component communication
- Clear separation between UI logic and file system operations

### Testing Strategy
- Manual testing via `npx http-server`
- Integration testing with database system via `../../database/index.html`
- Desktop environment testing via `../../desktop/index.html`
- Mobile responsive testing across different viewport sizes

### Next Development Priorities
1. **Column View Implementation**: Three-column navigation hierarchy
2. **Navigation History**: Back/forward button functionality
3. **Copy/Cut/Paste**: Clipboard operations with visual feedback
4. **Menu Bar System**: macOS-style application menu
5. **Enhanced Multi-Select**: Shift+click ranges and rubber band selection

See `plan.md` for detailed implementation roadmap and technical specifications.