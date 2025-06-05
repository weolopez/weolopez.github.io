# Entity-DB Refactoring Plan: Swappable Embedder Architecture

## Overview

This document outlines a refactoring plan for [`entity-db.js`](lib/entity-db.js) to remove direct dependencies on external libraries (specifically `xenova/transformers`) and make the embedding generation process swappable. This will improve modularity, flexibility, and reduce external dependencies within the core database functionality.

## Current State Analysis

### Dependencies in [`entity-db.js`](lib/entity-db.js)

The file currently has tight coupling with `xenova/transformers`:

- **Line 4:** `import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers";`
- **Line 5:** `import { env } from "https://cdn.jsdelivr.net/npm/@xenova/transformers";`
- **Lines 8-11:** `env.localModelPath` and `env.allowRemoteModels` configuration
- **Line 18:** `const pipePromise = pipeline("feature-extraction", defaultModel);`
- **Lines 32-37:** `getEmbeddingFromText` function directly uses `pipe` from `xenova`
- **Lines 99, 117, 180, 204:** Calls to `getEmbeddingFromText`

### Problems with Current Architecture

1. **Tight Coupling:** Direct dependency on `xenova/transformers` makes it difficult to swap embedding providers
2. **External Downloads:** Client-side downloads of large AI models and libraries
3. **Limited Flexibility:** Cannot easily switch between local and remote embedding services
4. **Testing Challenges:** Difficult to mock embedding functionality for testing

## Proposed Solution: Swappable Embedder Pattern

### 1. Define Embedder Interface

Create a common contract that all embedders must implement:

```javascript
// embedder-interface.js (Conceptual)
class Embedder {
  async getEmbedding(text) {
    throw new Error("getEmbedding method must be implemented by subclasses");
  }
}
```

### 2. Create Concrete Embedder Implementations

#### A) XenovaEmbedder (Local/Web-based)

```javascript
// xenova-embedder.js
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@xenova/transformers";

// Configure Xenova environment
env.localModelPath = "./huggingface";
// env.allowRemoteModels = false; // Uncomment to disable remote downloads

const defaultModel = "Xenova/all-MiniLM-L6-v2";
const pipePromise = pipeline("feature-extraction", defaultModel);

class XenovaEmbedder {
  constructor(model = defaultModel) {
    this.model = model;
  }

  async getEmbedding(text) {
    const pipe = await pipePromise;
    const output = await pipe(text, {
      pooling: "mean",
      normalize: true,
    });
    return Array.from(output.data);
  }
}

export { XenovaEmbedder };
```

#### B) RemoteEmbedder (API-based)

```javascript
// remote-embedder.js
class RemoteEmbedder {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }

  async getEmbedding(text) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      // Assuming the API returns an object like { embedding: [...] }
      return data.embedding;
    } catch (error) {
      console.error("Error fetching embedding from API:", error);
      throw new Error(`Failed to get embedding from remote service: ${error.message}`);
    }
  }
}

export { RemoteEmbedder };
```

### 3. Refactor EntityDB Class

Modify [`EntityDB`](lib/entity-db.js) to accept an embedder instance via dependency injection:

```javascript
// lib/entity-db.js (Modified)
import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8/+esm';
// No direct Xenova imports here anymore!

class EntityDB {
  // Accept an embedder instance in the constructor
  constructor({ vectorPath, embedder }) {
    this.vectorPath = vectorPath;
    if (!embedder || typeof embedder.getEmbedding !== 'function') {
      throw new Error("An 'embedder' instance with a 'getEmbedding' method is required.");
    }
    this.embedder = embedder;
    this.dbPromise = this._initDB();
  }

  // Insert data by generating embeddings from text
  async insert(data) {
    try {
      let embedding = data[this.vectorPath];
      if (data.text) {
        // Use the injected embedder
        embedding = await this.embedder.getEmbedding(data.text);
      }
      // ... rest of the insert logic ...
    } catch (error) {
      throw new Error(`Error inserting data: ${error}`);
    }
  }

  // Similar changes for insertBinary, query, queryBinary methods
  // Replace all calls to getEmbeddingFromText with this.embedder.getEmbedding
}
```

### 4. Usage Examples

```javascript
// Option 1: Using Xenova (local/web-based)
import { XenovaEmbedder } from './xenova-embedder.js';
import { EntityDB } from './lib/entity-db.js';

const xenovaEmbedder = new XenovaEmbedder();
const entityDbWithXenova = new EntityDB({
  vectorPath: 'vector',
  embedder: xenovaEmbedder
});

// Option 2: Using a Remote API
import { RemoteEmbedder } from './remote-embedder.js';
import { EntityDB } from './lib/entity-db.js';

const remoteEmbedder = new RemoteEmbedder('https://your-api.com/get-embedding');
const entityDbWithRemote = new EntityDB({
  vectorPath: 'vector',
  embedder: remoteEmbedder
});
```

## Architecture Diagram

```mermaid
graph TD
    A[Your Application] --> B(EntityDB)
    B --> C(Embedder Interface)
    C <|-- D[XenovaEmbedder]
    C <|-- E[RemoteEmbedder]
    D --> F(Xenova/Transformers Library)
    E --> G(Your Backend API)
    F --> H(Hugging Face Models)
    G --> I(Backend Embedding Service)

    subgraph Client-Side
        A
        B
        C
        D
        E
        F
    end

    subgraph Server-Side
        G
        I
        H
    end

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#ccf,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5
    style D fill:#bfb,stroke:#333,stroke-width:2px
    style E fill:#bfb,stroke:#333,stroke-width:2px
    style F fill:#fbb,stroke:#333,stroke-width:2px
    style G fill:#fbb,stroke:#333,stroke-width:2px
    style H fill:#ddd,stroke:#333,stroke-width:1px
    style I fill:#ddd,stroke:#333,stroke-width:1px
```

## Benefits of This Refactoring

1. **Decoupling:** [`entity-db.js`](lib/entity-db.js) no longer directly depends on `xenova/transformers`
2. **Swappability:** Easy to switch between different embedding providers without modifying EntityDB
3. **Testability:** Each component can be tested independently; embedders can be mocked for EntityDB tests
4. **Maintainability:** Changes to embedding logic are isolated within respective embedder classes
5. **Reduced Client-Side Downloads:** Using RemoteEmbedder eliminates need to download large models client-side
6. **Flexibility:** Can easily add new embedder implementations (WebAssembly, different APIs, etc.)

## Implementation Steps

1. **Create embedder implementations:**
   - `xenova-embedder.js` - Move all Xenova-specific code here
   - `remote-embedder.js` - Create API-based embedder

2. **Refactor EntityDB:**
   - Remove direct Xenova imports
   - Accept embedder in constructor
   - Replace all `getEmbeddingFromText` calls with `this.embedder.getEmbedding`

3. **Update application code:**
   - Instantiate appropriate embedder
   - Pass embedder to EntityDB constructor

4. **Testing:**
   - Create mock embedder for unit tests
   - Test both XenovaEmbedder and RemoteEmbedder implementations

5. **Documentation:**
   - Update README with new usage patterns
   - Document embedder interface for future implementations

## Future Extensibility

This architecture makes it easy to add new embedder types:

- **WebAssembly Embedder:** For high-performance local processing
- **Cached Embedder:** Wrapper that caches results to reduce API calls
- **Fallback Embedder:** Tries multiple embedders in sequence
- **Batch Embedder:** Optimizes multiple embedding requests

## Migration Strategy

1. Implement new embedder classes alongside existing code
2. Gradually migrate EntityDB to use dependency injection
3. Update application instantiation code
4. Remove old direct Xenova dependencies
5. Test thoroughly with both local and remote embedders

This refactoring provides a clean separation of concerns and makes the codebase more robust and adaptable to future changes in embedding technologies.