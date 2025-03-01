# EntityDB Browser Demo

This is a browser-only demo of [EntityDB](https://github.com/babycommando/entity-db), an in-browser vector database that wraps IndexedDB and Transformers.js for storing and querying vector embeddings.

## Overview

EntityDB enables developers to:
- Store and query vector embeddings directly in the browser
- Perform semantic search using cosine similarity
- Utilize binary vectors and SIMD acceleration for extremely fast querying
- Integrate with Hugging Face models via Transformers.js

This demo showcases the capabilities of EntityDB without requiring any backend API. Everything runs completely in the browser!

## Features Demonstrated

- Creating and initializing an EntityDB instance
- Inserting text with automatic embedding generation
- Inserting binary vectors for faster searching
- Querying using various methods:
  - Standard cosine similarity search
  - Binary vector search (faster)
  - Binary vector search with SIMD acceleration (insanely fast)
- Comparing search performance across different methods

## Running the Demo

### Prerequisites

- [Deno](https://deno.com/) version 2.0 or newer

### Steps to Run

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/browser-rag.git
   cd browser-rag
   ```

2. Start the Deno server:
   ```bash
   deno task start
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

### Development Mode

To run the server with automatic reloading on file changes:

```bash
deno task dev
```

## Project Structure

```
browser-rag/
├── entity-db/              # The EntityDB library
│   └── dist/               # Bundled distribution files
│       ├── entity-db.bundled.esm.js  # ESM bundle (used in this demo)
│       └── entity-db.bundled.js      # UMD bundle
├── index.html              # Main HTML file for the demo
├── script.js               # JavaScript for the demo frontend
├── server.ts               # Deno TypeScript server to serve static files
├── deno.json               # Deno configuration
└── README.md               # This file
```

## Architecture

This demo consists of:

- A static HTML/JS/CSS frontend
- A Deno TypeScript server that serves the static files
- The EntityDB library (loaded from the bundled ESM file)
- No backend APIs or server-side processing

All computation, including embedding generation and vector searches, happens directly in the user's browser.

## Credits

This demo uses the EntityDB library, which wraps:
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) for persistent storage
- [Transformers.js](https://github.com/xenova/transformers) for embedding generation

## License

This project is licensed under the Apache License 2.0.# browserMemory
