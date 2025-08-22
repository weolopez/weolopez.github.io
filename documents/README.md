# Shared Logging System

A centralized, event-based logging system for the entire desktop environment and applications.

## Overview

The shared logger provides structured logging with debug mode controls, metrics collection, and real-time log management across the desktop environment and finder application.

## Features

- **Event-Based Logging**: Uses custom `desktop-log` events for component communication
- **Debug Mode Toggle**: Controlled via localStorage with real-time updates
- **Component Tagging**: Organized logs by component (e.g., 'finder', 'git-fs', 'desktop', 'app-service')
- **Multiple Log Levels**: debug, info, warn, error, success with emoji prefixes
- **Metrics Collection**: Total logs, by level, by component, error tracking
- **Log Export**: Download logs as JSON for debugging and analysis
- **System Integration**: Accessible via System Preferences interface

## Usage

### Basic Logging

```javascript
import { Logger } from '../../../shared/logger.js';

class MyComponent extends HTMLElement {
    constructor() {
        super();
        this.logger = Logger.getInstance();
    }
    
    someMethod() {
        this.logger.debug('Method called', { param: 'value' }, 'my-component');
        this.logger.info('Operation completed', null, 'my-component');
        this.logger.warn('Warning condition', { issue: 'details' }, 'my-component');
        this.logger.error('Error occurred', error, 'my-component');
        this.logger.success('Operation successful', { result: 'data' }, 'my-component');
    }
}
```

### Debug Mode Control

```javascript
// Via System Preferences UI
// System → Enable debug logging checkbox

// Via browser console
toggleDesktopDebug()     // Toggle debug mode
getDesktopLogs()         // Get current metrics
clearDesktopLogs()       // Clear log metrics
exportDesktopLogs()      // Download logs as JSON
```

### Component Tags

Use consistent component tags for better log organization:

- `'finder'` - Finder application events
- `'git-fs'` - Git filesystem service operations  
- `'desktop'` - Desktop component events
- `'app-service'` - Application service operations
- `'startup'` - Startup manager events
- `'system-preferences'` - System preferences actions
- `'textedit'` - TextEdit application events

## Architecture

### Event System

All logs are dispatched as `desktop-log` custom events:

```javascript
const logEvent = new CustomEvent('desktop-log', {
    detail: {
        level: 'info',
        message: 'Operation completed',
        data: { key: 'value' },
        component: 'my-component',
        timestamp: '2024-01-20T10:30:00.000Z',
        debugMode: true
    },
    bubbles: true,
    composed: true
});
```

### Metrics Collection

The logger automatically collects metrics in `window.desktopLogMetrics`:

```javascript
{
    total: 150,
    byLevel: { 
        debug: 100, 
        info: 30, 
        warn: 15, 
        error: 5 
    },
    byComponent: { 
        'finder': 80, 
        'desktop': 40, 
        'git-fs': 30 
    },
    errors: [...], // Last 50 errors with full context
    startTime: 1705740000000,
    uptime: 120000,
    averageLogsPerMinute: 75
}
```

### Debug Mode

Debug mode controls log visibility:

- **Enabled**: All log levels shown in console and events dispatched
- **Disabled**: Only warnings and errors shown in console, but all events still dispatched

State persisted in `localStorage['desktop-debug-mode']`.

## System Preferences Integration

The logging system is integrated with System Preferences:

**Location**: System Preferences → System → Debug Logging

**Controls**:
- **Enable debug logging** checkbox
- **Debug mode status** (Enabled/Disabled)
- **Total logs** count
- **Errors logged** count  
- **Export Logs** button
- **Clear Logs** button

**Real-time Updates**: Status updates immediately when debug mode changes.

## Migration from console.log

The shared logger replaces `console.log` statements throughout the codebase:

### Before
```javascript
console.log('Operation completed:', data);
console.warn('Warning:', issue);
console.error('Error:', error);
```

### After
```javascript
this.logger.info('Operation completed', data, 'component-name');
this.logger.warn('Warning condition', issue, 'component-name');  
this.logger.error('Error occurred', error, 'component-name');
```

## Global Functions

Convenience functions available in browser console:

```javascript
window.toggleDesktopDebug()  // Toggle debug mode
window.getDesktopLogs()      // Get metrics object
window.clearDesktopLogs()    // Clear all metrics
window.exportDesktopLogs()   // Download logs as JSON
```

## Integration Status

### ✅ Integrated Components
- **Shared Logger** (`/shared/logger.js`)
- **Git Filesystem Service** (`/apps/finder/git-filesystem-service.js`)
- **Finder Webapp** (`/apps/finder/finder-webapp.js`)
- **Desktop Component** (`/desktop/src/components/desktop-component.js`)
- **App Service** (`/desktop/src/services/app-service.js`)
- **Startup Manager** (`/desktop/src/services/startup-manager.js`)
- **System Preferences** (`/desktop/src/apps/system-preferences-webapp.js`)
- **TextEdit App** (`/desktop/src/apps/textedit-webapp.js`)

### 🔄 Remaining Components
- Other desktop service files
- Remaining finder components
- Additional applications

## Best Practices

1. **Use Appropriate Log Levels**:
   - `debug`: Detailed debugging information
   - `info`: General information and flow
   - `warn`: Warning conditions that don't break functionality
   - `error`: Error conditions that may break functionality
   - `success`: Successful completion of significant operations

2. **Include Context Data**: Always provide relevant data objects for debugging

3. **Use Consistent Component Tags**: Stick to established naming conventions

4. **Don't Log Sensitive Data**: Avoid logging passwords, tokens, or personal data

5. **Performance Considerations**: The logger is optimized but avoid excessive debug logging in tight loops

## Troubleshooting

### Debug Mode Not Working
- Check localStorage: `localStorage.getItem('desktop-debug-mode')`
- Verify logger initialization: `Logger.getInstance()`
- Check System Preferences checkbox state

### Missing Logs
- Verify component tag spelling
- Check if logger is properly imported and initialized
- Confirm event listeners are set up correctly

### Performance Issues
- Reduce debug logging frequency in performance-critical code
- Use `getDesktopLogs()` to check metrics and optimize logging patterns