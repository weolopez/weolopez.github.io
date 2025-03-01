import { EntityDB, getEmbeddingFromText } from './entity-db.js';

/**
 * KnowledgeLoader class that loads knowledge from markdown files 
 * and adds them to the EntityDB for vector search
 */
class KnowledgeLoader {
  constructor({ 
    directoryPath = './knowledge/',
    model = 'Xenova/all-MiniLM-L6-v2',
    binarize = false
  }) {
    this.directoryPath = directoryPath;
    this.model = model;
    this.binarize = binarize;
    
    // Initialize EntityDB
    this.db = new EntityDB({
      vectorPath: 'knowledge_vectors',
      model: this.model
    });
    
    // Track loaded files
    this.loadedFiles = new Set();
  }
  
  /**
   * Split text into chunks
   * @param {string} text - The text to chunk
   * @param {number} maxChunkSize - Maximum chunk size (characters)
   * @param {number} overlap - Number of characters to overlap between chunks
   * @returns {string[]} - Array of text chunks
   */
  chunkText(text, maxChunkSize = 512, overlap = 100) {
    const chunks = [];
    
    if (text.length <= maxChunkSize) {
      chunks.push(text);
    } else {
      let startIndex = 0;
      
      while (startIndex+overlap < text.length) {
        // Find a good break point that's close to maxChunkSize
        let endIndex = Math.min(startIndex + maxChunkSize, text.length);
        
        // Try to find a paragraph or sentence break
        if (endIndex < text.length) {
          // Look for paragraph break
          const paragraphBreak = text.lastIndexOf('\n\n', endIndex);
          if (paragraphBreak > startIndex && paragraphBreak > endIndex - 200) {
            endIndex = paragraphBreak;
          } else {
            // Look for sentence break (period followed by space or newline)
            const sentenceBreak = text.lastIndexOf('. ', endIndex);
            if (sentenceBreak > startIndex && sentenceBreak > endIndex - 100) {
              endIndex = sentenceBreak + 1; // Include the period
            }
          }
        }
        
        chunks.push(text.substring(startIndex, endIndex));
        startIndex = endIndex - overlap; // Add overlap
      }
    }
    
    return chunks;
  }
  
  /**
   * Parse metadata from markdown frontmatter
   * @param {string} content - Markdown content
   * @returns {Object} - Extracted metadata and content without frontmatter
   */
  parseMarkdownMetadata(content) {
    const metadata = {};
    let contentWithoutFrontmatter = content;
    
    // Check for frontmatter (---) at the start
    if (content.startsWith('---')) {
      const endOfFrontmatter = content.indexOf('---', 3);
      if (endOfFrontmatter !== -1) {
        const frontmatter = content.substring(3, endOfFrontmatter).trim();
        
        // Parse each line in frontmatter
        frontmatter.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length) {
            metadata[key.trim()] = valueParts.join(':').trim();
          }
        });
        
        contentWithoutFrontmatter = content.substring(endOfFrontmatter + 3).trim();
      }
    }
    
    // Extract title from first heading if not in metadata
    if (!metadata.title) {
      const titleMatch = contentWithoutFrontmatter.match(/^#\s+(.+)$/m);
      if (titleMatch && titleMatch[1]) {
        metadata.title = titleMatch[1].trim();
      }
    }
    
    return {
      metadata,
      content: contentWithoutFrontmatter
    };
  }
  
  /**
   * Process a markdown file and add it to the knowledge base
   * @param {string} filePath - Path to markdown file
   * @returns {Promise<Object>} - Processing result
   */
    async processMarkdownFile(filePath) {
    try {
      // Check if file already loaded in this session
      if (this.loadedFiles.has(filePath)) {
        console.log(`File already loaded: ${filePath}`);
        return { success: true, file: filePath, status: 'already-loaded' };
      }
      
      // Fetch file content
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      
      const content = await response.text();
      
      // Parse metadata
      const { metadata, content: contentWithoutFrontmatter } = this.parseMarkdownMetadata(content);
      
      // Get filename without path
      const fileName = filePath.split('/').pop();
      
      // Create document object
      const document = {
        id: fileName,
        title: metadata.title || fileName,
        path: filePath,
        ...metadata
      };
  
      // Check if document already exists in DB
      // (Assumes EntityDB has a method 'findByDocumentId' that returns the document if it exists)
      const exists = await this.db.findByDocumentId(document.id);
      if (exists) {
        console.log(`Document already exists in DB: ${document.id}`);
        this.loadedFiles.add(filePath);
        return { success: true, file: filePath, status: 'already-loaded' };
      }
      
      // Chunk the content
      const chunks = this.chunkText(contentWithoutFrontmatter);
      
      // Add each chunk to the knowledge base
      let chunkCount = 0;
      for (const chunk of chunks) {
        const chunkData = {
          text: chunk,
          document,
          chunkIndex: chunkCount,
          type: 'knowledge',
          timestamp: Date.now()
        };
        
        // Insert into DB
        if (this.binarize) {
          await this.db.insertBinary(chunkData);
        } else {
          await this.db.insert(chunkData);
        }
        
        chunkCount++;
      }
      
      // Mark file as loaded
      this.loadedFiles.add(filePath);
      
      return { 
        success: true, 
        file: filePath, 
        chunks: chunkCount, 
        status: 'loaded' 
      };
    } catch (error) {
      console.error(`Error processing markdown file ${filePath}:`, error);
      return { 
        success: false, 
        file: filePath, 
        error: error.message 
      };
    }
  }
  
  /**
   * Load all markdown files from the knowledge directory
   * @returns {Promise<Array>} - Results of processing each file
   */
  async loadKnowledgeBase() {
    try {
      // Load list of markdown files
      const response = await fetch(`${this.directoryPath}index.json`);
      let files = [];
      
      if (response.ok) {
        const data = await response.json();
        files = data.files || [];
      } else {
        console.warn(`Could not find index.json in ${this.directoryPath}. Attempting to discover markdown files.`);
        // Fallback to loading any .md files found in the directory
        const directoryResponse = await fetch(this.directoryPath);
        if (directoryResponse.ok) {
          const html = await directoryResponse.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const links = doc.querySelectorAll('a');
          
          files = Array.from(links)
            .map(link => link.getAttribute('href'))
            .filter(href => href && href.endsWith('.md'))
            .map(href => `${this.directoryPath}${href}`);
        }
      }
      
      if (files.length === 0) {
        console.warn('No knowledge files found to load.');
        return [];
      }
      
      // Process each markdown file
      const results = await Promise.all(
        files.map(file => this.processMarkdownFile(file))
      );
      
      console.log(`Loaded ${results.filter(r => r.success).length} knowledge files.`);
      return results;
    } catch (error) {
      console.error('Error loading knowledge base:', error);
      throw error;
    }
  }
  
  /**
   * Query the knowledge base for relevant information
   * @param {string} query - Query text
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} - Relevant chunks from the knowledge base
   */
  async query(query, limit = 5) {
    try {
      let results;
      
      // Use binary or standard query based on configuration
      if (this.binarize) {
        results = await this.db.queryBinary(query, limit);
      } else {
        results = await this.db.query(query, limit);
      }
      
      return results;
    } catch (error) {
      console.error('Error querying knowledge base:', error);
      return [];
    }
  }
  
  /**
   * Clear the knowledge base
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      await this.db.clear();
      this.loadedFiles.clear();
      console.log('Knowledge base cleared.');
    } catch (error) {
      console.error('Error clearing knowledge base:', error);
    }
  }
}

export { KnowledgeLoader };