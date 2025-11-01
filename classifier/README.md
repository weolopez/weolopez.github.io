# Classifier - Modular Web Components Version

A browser-powered semantic search application decomposed into modern web components and ES6 modules. This application allows users to upload CSV data, generate embeddings on-device using Transformers.js, and perform semantic search queries.

## 🏗️ Architecture

The application has been completely refactored from a single HTML file into a modular, component-based architecture:

```
classifier/
├── index.html              # Main entry point
├── app.js                  # Main application orchestrator
├── components/             # Web Components
│   ├── base-component.js   # Base component class
│   ├── upload-card.js      # File upload component
│   ├── query-card.js       # Query input component
│   ├── results-card.js     # Results display component
│   └── sidebar-card.js     # Info sidebar component
├── modules/                # Business logic modules
│   ├── database.js         # IndexedDB wrapper
│   └── embedding-service.js # ML model handling
├── styles/                 # CSS modules
│   └── main.css           # Main stylesheet
└── utils/                  # Utility functions
    └── helpers.js         # Common utilities
```

## 🚀 Features

- **Modern Web Components**: Custom elements with Shadow DOM support
- **ES6 Modules**: Clean module separation and imports
- **Async/Await**: Modern JavaScript patterns throughout
- **IndexedDB**: Local vector database for embeddings
- **Transformers.js**: On-device ML model execution
- **Theme Support**: Light/dark mode with system preference detection
- **Keyboard Shortcuts**: Full keyboard navigation support
- **Error Handling**: Comprehensive error boundaries and reporting
- **Progressive Enhancement**: Graceful degradation for older browsers

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript, Web Components, CSS Custom Properties
- **ML**: Transformers.js (Xenova/all-MiniLM-L6-v2)
- **Storage**: IndexedDB
- **CSV Parsing**: PapaParse
- **Build**: No build step required - runs directly in browser

## 📁 Component Structure

### Base Component (`base-component.js`)
- Abstract base class for all custom elements
- Lifecycle management (connected/disconnected callbacks)
- State management with automatic re-rendering
- Event handling with automatic cleanup
- Utility methods for DOM manipulation

### Upload Card (`upload-card.js`)
- Handles CSV file upload and validation
- Processes data in batches for embedding generation
- Progress tracking and user feedback
- Sample data loading functionality
- Database management (clear operations)

### Query Card (`query-card.js`)
- Query input and validation
- Semantic search execution
- Results filtering (top-K selection)
- Keyboard shortcuts (Ctrl+Enter for execution)

### Results Card (`results-card.js`)
- Results display with similarity scores
- Interactive result selection
- Export functionality (CSV download)
- Results filtering and sorting
- Search term highlighting

### Sidebar Card (`sidebar-card.js`)
- Application statistics and info
- Theme toggle functionality
- Performance metrics
- External links and documentation
- Keyboard shortcuts help

## 🔧 Core Modules

### Database Module (`database.js`)
- Modern IndexedDB wrapper with async/await
- Vector storage and retrieval
- Batch operations for performance
- Error handling and connection management

### Embedding Service (`embedding-service.js`)
- Transformers.js model management
- Batch embedding generation
- Vector normalization and conversion
- Cosine similarity calculations
- Model lifecycle management

### Utilities (`helpers.js`)
- HTML escaping and security
- Event bus for component communication
- Progress tracking utilities
- File validation helpers
- Common formatting functions

## 🎯 Usage

1. **Open `index.html`** in a modern browser
2. **Upload CSV data** with `key,value` columns or load sample data
3. **Enter a query** in natural language
4. **View results** ranked by semantic similarity
5. **Export results** as CSV if needed

## ⌨️ Keyboard Shortcuts

- `Ctrl+K` - Focus search input
- `Ctrl+Enter` - Execute query
- `Ctrl+Shift+T` - Toggle theme
- `Ctrl+Shift+C` - Clear all data
- `Esc` - Clear focus and results

## 🎨 Styling

The application uses CSS Custom Properties for theming:

```css
:root {
  --bg: #f5f7fb;
  --card: #ffffff;
  --text: #0b1220;
  --accent: #0066ff;
  /* ... */
}
```

Themes are automatically applied based on:
1. User preference (localStorage)
2. System preference (prefers-color-scheme)
3. Manual toggle

## 🔒 Security

- All user input is escaped to prevent XSS
- No external dependencies beyond CDN libraries
- Local-only data processing (no server required)
- IndexedDB provides origin-based data isolation

## 🌐 Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers with ES6 module support

## 📈 Performance

- **Lazy Loading**: Components load only when needed
- **Batch Processing**: Large datasets processed in chunks
- **Memory Management**: Automatic cleanup of event listeners
- **Efficient Updates**: State-based re-rendering only when needed

## 🧪 Development

No build process required. Simply:

1. Serve the directory with a local HTTP server
2. Open `index.html` in your browser
3. Components auto-register on page load

For development with modules, you may need to serve over HTTP (not file://) due to CORS restrictions.

## 🔮 Future Enhancements

- Service Worker for offline support
- Web Workers for background processing
- Streaming embeddings for large datasets
- Custom model selection
- Advanced filtering and search options
- Data visualization components

## 📄 License

This project maintains the same license as the original classifier implementation.

## 🤝 Contributing

The modular architecture makes it easy to:
- Add new components
- Extend existing functionality
- Swap out modules (e.g., different ML backends)
- Customize styling and themes

Each component is self-contained with clear APIs for interaction.
