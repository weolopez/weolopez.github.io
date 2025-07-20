# Desktop Environment Project

A complete browser-based desktop operating system with integrated applications and file management.

## 🚀 **Latest Updates**

### **Shared Logging System Integration** (Latest Session)
- **Centralized Logging**: Implemented event-based logging across the entire desktop environment
- **Debug Controls**: Integrated debug mode toggle in System Preferences
- **Metrics Collection**: Real-time log tracking with export capabilities  
- **Console Replacement**: Replaced console.log statements with structured logging
- **Component Tagging**: Organized logs by component for better debugging

### **Enhanced Finder Integration**
- **Git Repository Support**: Complete isomorphic-git and LightningFS integration
- **File Content Events**: Rich file content dispatching for desktop consumption
- **MIME Type Detection**: 60+ file extensions with smart content categorization
- **Decoupled Architecture**: Removed direct desktop dependencies from Finder
- **Multi-Repository Management**: Support for multiple git repositories with isolation

## 🏗️ **Project Structure**

### **Desktop Environment** (`/desktop/`)
Complete desktop OS implementation with:
- **Window Management**: Draggable, resizable windows with lifecycle management
- **Application Launcher**: Dynamic app loading and state management  
- **System Preferences**: Comprehensive settings with debug logging controls
- **Startup Manager**: Configurable component loading with dependency management
- **Event System**: Global event bus for component communication

### **Finder Application** (`/apps/finder/`)
macOS Finder replica with git integration:
- **File Operations**: Create, read, update, delete files and folders
- **Git Integration**: Clone, browse, and manage git repositories
- **Content Reading**: Smart file content detection with binary/text handling
- **Event Publishing**: Rich file content events for desktop integration
- **Multiple Views**: Icon, list, and column view modes

### **Shared Components** (`/shared/`)
- **Logger**: Centralized event-based logging system
- **Utilities**: Common functions and helpers

### **Applications**
- **TextEdit**: Rich text editor with file content integration
- **Chat**: Real-time chat application with web components
- **System Preferences**: Settings interface with debug controls

## 🛠️ **Development**

### **Getting Started**
```bash
# Start local development server
npx http-server
# or
python -m http.server

# Open in browser
open http://localhost:8080
```

### **Debug and Logging**
```javascript
// Browser console commands
toggleDesktopDebug()    // Toggle debug mode
getDesktopLogs()        // View log metrics  
clearDesktopLogs()      // Clear log data
exportDesktopLogs()     // Download logs as JSON
```

### **System Preferences Integration**
Access debug controls via: **System Preferences → System → Enable debug logging**

## 🎯 **Key Features**

### **Desktop Environment**
- ✅ Complete window management system
- ✅ Application launching and lifecycle management
- ✅ System preferences with real-time settings
- ✅ Event-driven architecture with global bus
- ✅ Configurable startup with dependency management
- ✅ Shared logging system with debug controls

### **Finder Application**  
- ✅ Git repository integration (isomorphic-git + LightningFS)
- ✅ File content reading with MIME type detection
- ✅ Event-driven file opening (decoupled from desktop)
- ✅ Multiple repository support with unique directories
- ✅ Comprehensive file operations (CRUD)
- ✅ Context menus and keyboard shortcuts

### **Logging System**
- ✅ Event-based structured logging
- ✅ Component-specific tagging
- ✅ Debug mode with localStorage persistence  
- ✅ Metrics collection and export
- ✅ System Preferences integration
- ✅ Console.log replacement across codebase

## 🔧 **Technical Architecture**

### **Event-Driven Communication**
- **Desktop Events**: Window lifecycle, app launching, system events
- **File Events**: `finder-file-content`, `finder-file-reference` for file operations
- **Log Events**: `desktop-log` for centralized logging

### **Component Integration**
- **Shared Logger**: Used across all components with consistent tagging
- **Event Publishing**: Finder publishes file events consumed by desktop
- **Decoupled Design**: Components communicate via events, not direct dependencies

### **State Management**
- **localStorage**: User preferences, debug mode, component settings
- **Event Bus**: Real-time state synchronization between components
- **Window State**: Automatic save/restore of window positions and sizes

## 📊 **Current Status**

### **✅ Completed**
- Shared logging system with System Preferences integration
- Git-based file system with multi-repository support
- Event-driven file content handling
- Desktop environment with window management
- Application service with file type detection
- Console.log replacement in key components

### **🔄 In Progress**
- Complete console.log replacement in remaining components
- Enhanced file preview and Quick Look functionality
- Additional desktop applications and utilities

### **📋 Planned**
- File search and filtering capabilities
- Enhanced git operations (commit, push, pull)
- Application store and dynamic component loading
- Performance optimizations and virtual scrolling

## 🎨 **Design Principles**

- **Native Web Components**: No framework dependencies
- **Event-Driven Architecture**: Loose coupling between components
- **Progressive Enhancement**: Graceful degradation for unsupported features
- **Accessibility First**: Keyboard navigation and screen reader support
- **Mobile Responsive**: Adaptive design for different screen sizes

## 🐛 **Debugging**

### **Enable Debug Logging**
1. Open System Preferences
2. Navigate to System panel  
3. Check "Enable debug logging"
4. View real-time metrics and export logs

### **Component Tags**
- `'finder'` - Finder application events
- `'git-fs'` - Git filesystem operations
- `'desktop'` - Desktop component events  
- `'app-service'` - Application service operations
- `'startup'` - Startup manager events
- `'system-preferences'` - Settings interface
- `'textedit'` - TextEdit application

### **Log Export**
Debug logs can be exported as JSON files containing:
- Complete event history with timestamps
- Error tracking and metrics
- Component-specific event filtering
- Performance and usage analytics

## 📝 **Documentation**

- **`CLAUDE.md`**: Development guidance and architecture overview
- **`apps/finder/plan.md`**: Finder implementation roadmap and features
- **`shared/README.md`**: Comprehensive logging system documentation

---

**This project represents a complete browser-based desktop environment with integrated file management, git support, and comprehensive debugging capabilities.**