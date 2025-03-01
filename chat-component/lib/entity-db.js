// import { openDB } from "idb";
import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8/+esm';

import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers";
import { env } from "https://cdn.jsdelivr.net/npm/@xenova/transformers";

// Specify a custom location for models (defaults to '/models/').
env.localModelPath = "./huggingface";

// Disable the loading of remote models from the Hugging Face Hub:
// env.allowRemoteModels = false;

// Set location of .wasm files. Defaults to use a CDN.
// env.backends.onnx.wasm.wasmPaths = '/path/to/files/';

// Default pipeline (Xenova/all-MiniLM-L6-v2)
const defaultModel = "Xenova/all-MiniLM-L6-v2";
const pipePromise = pipeline("feature-extraction", defaultModel);

// Cosine similarity function
const cosineSimilarity = (vecA, vecB) => {
  const dotProduct = vecA.reduce(
    (sum, val, index) => sum + val * vecB[index],
    0
  );
  const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

// Function to get embeddings from text using HuggingFace pipeline
const getEmbeddingFromText = async (text, model = defaultModel) => {
  const pipe = await pipePromise;
  const output = await pipe(text, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data);
};

// Binarizer function for dense vectors
const binarizeVector = (vector, threshold = null) => {
  if (threshold === null) {
    const sorted = [...vector].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    threshold =
      sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
  }
  return vector.map((val) => (val >= threshold ? 1 : 0));
};

// Function to calculate Hamming distance
const hammingDistance = (vectorA, vectorB) => {
  if (vectorA.length !== vectorB.length) {
    throw new Error("Vectors must be of the same length");
  }
  const length = vectorA.length;
  const bitsA = new BigUint64Array(vectorA.buffer);
  const bitsB = new BigUint64Array(vectorB.buffer);

  let distance = 0n;
  for (let i = 0; i < bitsA.length; i++) {
    const xorResult = bitsA[i] ^ bitsB[i];
    distance += BigInt(xorResult.toString(2).replace(/0/g, "").length); // Popcount equivalent
  }
  return Number(distance);
};

class EntityDB {
  constructor({ vectorPath, model = defaultModel }) {
    this.vectorPath = vectorPath;
    this.model = model;
    this.dbPromise = this._initDB();
  }

  // Initialize the IndexedDB
  async _initDB() {
    const db = await openDB("EntityDB", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("vectors")) {
          db.createObjectStore("vectors", {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      },
    });
    return db;
  }

  // Insert data by generating embeddings from text
  async insert(data) {
    try {
      // Generate embedding if text is provided
      let embedding = data[this.vectorPath];
      if (data.text) {
        embedding = await getEmbeddingFromText(data.text, this.model);
      }

      const db = await this.dbPromise;
      const transaction = db.transaction("vectors", "readwrite");
      const store = transaction.objectStore("vectors");
      const record = { vector: embedding, ...data };
      const key = await store.add(record);
      return key;
    } catch (error) {
      throw new Error(`Error inserting data: ${error}`);
    }
  }

  async insertBinary(data) {
    try {
      let embedding = data[this.vectorPath];
      if (data.text) {
        embedding = await getEmbeddingFromText(data.text, this.model);
      }

      // Binarize the embedding and pack into BigUint64Array
      const binaryEmbedding = binarizeVector(embedding);
      const packedEmbedding = new BigUint64Array(
        new ArrayBuffer(Math.ceil(binaryEmbedding.length / 64) * 8)
      );
      for (let i = 0; i < binaryEmbedding.length; i++) {
        const bitIndex = i % 64;
        const arrayIndex = Math.floor(i / 64);
        if (binaryEmbedding[i] === 1) {
          packedEmbedding[arrayIndex] |= 1n << BigInt(bitIndex);
        }
      }

      const db = await this.dbPromise;
      const transaction = db.transaction("vectors", "readwrite");
      const store = transaction.objectStore("vectors");
      const record = { vector: packedEmbedding, ...data };
      const key = await store.add(record);
      return key;
    } catch (error) {
      throw new Error(`Error inserting binary data: ${error}`);
    }
  }

  // Insert manual vectors (no embedding generation, just insert provided vectors)
  async insertManualVectors(data) {
    try {
      const db = await this.dbPromise;
      const transaction = db.transaction("vectors", "readwrite");
      const store = transaction.objectStore("vectors");
      const record = { vector: data[this.vectorPath], ...data };
      const key = await store.add(record);
      return key;
    } catch (error) {
      throw new Error(`Error inserting manual vectors: ${error}`);
    }
  }

  // Update an existing vector in the database
  async update(key, data) {
    const db = await this.dbPromise;
    const transaction = db.transaction("vectors", "readwrite");
    const store = transaction.objectStore("vectors");
    const vector = data[this.vectorPath];
    const updatedData = { ...data, [store.keyPath]: key, vector };
    await store.put(updatedData);
  }

  // Delete a vector by key
  async delete(key) {
    const db = await this.dbPromise;
    const transaction = db.transaction("vectors", "readwrite");
    const store = transaction.objectStore("vectors");
    await store.delete(key);
  }

  // Query vectors by cosine similarity (using a text input that will be converted into embeddings)
  async query(queryText, limit = 10) {
    try {
      // Get embeddings for the query text
      const queryVector = await getEmbeddingFromText(queryText, this.model);

      const db = await this.dbPromise;
      const transaction = db.transaction("vectors", "readonly");
      const store = transaction.objectStore("vectors");
      const vectors = await store.getAll(); // Retrieve all vectors

      // Calculate cosine similarity for each vector and sort by similarity
      const similarities = vectors.map((entry) => {
        const similarity = cosineSimilarity(queryVector, entry.vector);
        return { ...entry, similarity, score: similarity };
      });

      similarities.sort((a, b) => b.similarity - a.similarity); // Sort by similarity (descending)
      return similarities.slice(0, limit); // Return the top N results based on limit
    } catch (error) {
      throw new Error(`Error querying vectors: ${error}`);
    }
  }

  //Query binarized vectors using Hamming distance nstead of cosine similarity
  async queryBinary(queryText, limit = 10) {
    try {
      // Get embeddings and binarize them
      const queryVector = await getEmbeddingFromText(queryText, this.model);
      const binaryQueryVector = binarizeVector(queryVector);

      // Pack the query vector into BigUint64Array
      const packedQueryVector = new BigUint64Array(
        new ArrayBuffer(Math.ceil(binaryQueryVector.length / 64) * 8)
      );
      for (let i = 0; i < binaryQueryVector.length; i++) {
        const bitIndex = i % 64;
        const arrayIndex = Math.floor(i / 64);
        if (binaryQueryVector[i] === 1) {
          packedQueryVector[arrayIndex] |= 1n << BigInt(bitIndex);
        }
      }

      const db = await this.dbPromise;
      const transaction = db.transaction("vectors", "readonly");
      const store = transaction.objectStore("vectors");
      const vectors = await store.getAll();

      // Calculate Hamming distance and inverted score (closer to 1 is better)
      const distances = vectors.map((entry) => {
        const distance = hammingDistance(packedQueryVector, entry.vector);
        const invertedScore = 1 - (distance / binaryQueryVector.length);
        return { ...entry, distance, score: invertedScore };
      });

      // Sort by Hamming distance (ascending)
      distances.sort((a, b) => a.distance - b.distance);

      // Return the top N results based on limit
      return distances.slice(0, limit);
    } catch (error) {
      throw new Error(`Error querying binary vectors: ${error}`);
    }
  }

  // Get all items in the database
  async getAll() {
    const db = await this.dbPromise;
    const transaction = db.transaction("vectors", "readonly");
    const store = transaction.objectStore("vectors");
    return store.getAll();
  }
  
  // New method: Find an entry by its document id
  async findByDocumentId(documentId) {
    const db = await this.dbPromise;
    const transaction = db.transaction("vectors", "readonly");
    const store = transaction.objectStore("vectors");
    const records = await store.getAll();
    return records.find(record => record.document && record.document.id === documentId);
  }

  // Clear the entire database
  async clear() {
    const db = await this.dbPromise;
    const transaction = db.transaction("vectors", "readwrite");
    const store = transaction.objectStore("vectors");
    return store.clear();
  }
}

// Export EntityDB class
export { EntityDB, getEmbeddingFromText };