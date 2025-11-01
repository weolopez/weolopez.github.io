/**
 * Embedding Service Module
 * Handles ML model loading and text embedding generation using Transformers.js
 */

class EmbeddingService {
  constructor() {
    this.embedder = null;
    this.modelName = 'Xenova/all-MiniLM-L6-v2';
    this.isLoading = false;
    this.isLoaded = false;
  }

  /**
   * Ensure the model is loaded and ready
   * @returns {Promise<object>} The embedding pipeline
   */
  async ensureModel() {
    if (this.embedder) {
      return this.embedder;
    }

    if (this.isLoading) {
      // Wait for current loading to complete
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.embedder;
    }

    this.isLoading = true;

    try {
      // Check if transformers library is available
      if (!window.transformers) {
        console.error('Transformers.js not found on window object');
        // Wait a bit and try again in case it's still loading
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!window.transformers) {
          throw new Error('Transformers.js library not loaded. Check CDN reference.');
        }
      }

      console.log('Loading Transformers.js model:', this.modelName);
      console.log('Available transformers methods:', Object.keys(window.transformers));

      // Load the feature extraction pipeline
      this.embedder = await window.transformers.pipeline('feature-extraction', this.modelName, {
        quantized: false,
        progress_callback: (progress) => {
          console.log('Model loading progress:', progress);
        }
      });
      
      this.isLoaded = true;
      console.log('Model loaded successfully:', this.modelName);
      
      return this.embedder;
    } catch (error) {
      console.error('Model load error:', error);
      throw new Error(`Failed to load model ${this.modelName}: ${error.message}`);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Convert embedding result to Float32Array
   * @param {*} result - Raw embedding result from the model
   * @returns {Float32Array}
   */
  normalizeEmbedding(result) {
    if (!result) return new Float32Array();

    // Handle tensor-like objects from newer transformers.js
    if (result && typeof result === 'object' && result.data) {
      return new Float32Array(result.data);
    }

    // Handle token-level embeddings by averaging
    if (Array.isArray(result) && Array.isArray(result[0])) {
      const length = result.length;
      const dimension = result[0].length;
      const accumulated = new Float32Array(dimension);
      
      for (let i = 0; i < length; i++) {
        for (let j = 0; j < dimension; j++) {
          accumulated[j] += (result[i][j] || 0);
        }
      }
      
      for (let j = 0; j < dimension; j++) {
        accumulated[j] /= length;
      }
      
      return accumulated;
    }

    // Handle flat numeric arrays
    if (Array.isArray(result)) {
      return new Float32Array(result.map(v => +v || 0));
    }

    // Handle already typed arrays
    if (result instanceof Float32Array) {
      return result;
    }

    // Fallback: try to coerce
    return new Float32Array(Array.from(result));
  }

  /**
   * Generate embeddings for a batch of texts
   * @param {string[]} texts - Array of text strings to embed
   * @returns {Promise<Float32Array[]>} Array of embeddings
   */
  async embedBatch(texts) {
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return [];
    }

    await this.ensureModel();

    try {
      // Get embeddings from the model
      const results = await this.embedder(texts);

      // Handle different result formats
      let embeddings = results;
      
      // The newer transformers.js returns tensor-like objects
      if (results && typeof results === 'object') {
        if (results.data && Array.isArray(results.data)) {
          embeddings = results.data;
        } else if (results.tolist && typeof results.tolist === 'function') {
          embeddings = results.tolist();
        } else if (Array.isArray(results)) {
          embeddings = results;
        }
      }

      if (!Array.isArray(embeddings)) {
        throw new Error('Unexpected embedding result format');
      }

      // Normalize each embedding
      return embeddings.map(embedding => this.normalizeEmbedding(embedding));
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  /**
   * Generate embedding for a single text
   * @param {string} text - Text to embed
   * @returns {Promise<Float32Array>} Single embedding
   */
  async embedSingle(text) {
    const embeddings = await this.embedBatch([text]);
    return embeddings[0] || new Float32Array();
  }

  /**
   * Convert Float32Array to plain array for JSON storage
   * @param {Float32Array} embedding
   * @returns {number[]}
   */
  embeddingToJSON(embedding) {
    if (embedding instanceof Float32Array) {
      return Array.from(embedding);
    }
    if (Array.isArray(embedding)) {
      return embedding;
    }
    return Array.from(new Float32Array(embedding));
  }

  /**
   * Convert plain array back to Float32Array
   * @param {number[]} jsonArray
   * @returns {Float32Array}
   */
  embeddingFromJSON(jsonArray) {
    return new Float32Array(jsonArray);
  }

  /**
   * Calculate cosine similarity between two embeddings
   * @param {Float32Array|number[]} a - First embedding
   * @param {Float32Array|number[]} b - Second embedding
   * @returns {number} Similarity score (0-1)
   */
  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const valueA = +a[i] || 0;
      const valueB = +b[i] || 0;
      
      dotProduct += valueA * valueB;
      normA += valueA * valueA;
      normB += valueB * valueB;
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get model status
   * @returns {object} Status object
   */
  getStatus() {
    return {
      isLoaded: this.isLoaded,
      isLoading: this.isLoading,
      modelName: this.modelName
    };
  }

  /**
   * Cleanup resources
   */
  dispose() {
    this.embedder = null;
    this.isLoaded = false;
    this.isLoading = false;
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
export default embeddingService;
