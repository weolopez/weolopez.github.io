# API Viewer Component

The `<api-viewer>` component introspects the current page (or a specific container) to discover Web Components and their APIs using `llm-tools.js`.

## Usage

```html
<script type="module" src="./api-viewer.js"></script>

<!-- Monitor specific container -->
<api-viewer selector=".my-component-container"></api-viewer>

<!-- Monitor body (default) -->
<api-viewer></api-viewer>
```

## Features

- Scans for custom elements (tags with hyphens).
- Identifies attributes and events based on `observedAttributes` and introspection.
- Groups APIs by component instance.
- Updates automatically when `selector` changes.
- Manual refresh button.

## Dependencies

- `../js/llm-tools.js`: Must handle `getCanvasAPIs`.
