import { EntityDB } from './entity-db.js';

/**
 * IntentLoader class that loads intent examples from JSON files 
 * and adds them to the EntityDB for vector search and classification
 */
class IntentLoader {
  constructor({ 
    directoryPath = './intents/',
    model = 'Xenova/all-MiniLM-L6-v2'
  }) {
    this.directoryPath = directoryPath;
    this.model = model;
    
    // Initialize EntityDB for intent classification
    this.db = new EntityDB({
      vectorPath: 'intent_vectors',
      model: this.model
    });
    
    // Track loaded intent files
    this.loadedFiles = new Set();
  }
  
  /**
   * Process an intent file (Markdown with frontmatter) and add its examples to the database
   * @param {string} filePath - Path to intent Markdown file
   * @returns {Promise<Object>} - Processing result
   */
  async processIntentFile(filePath) {
    try {
      if (this.loadedFiles.has(filePath)) {
        return { success: true, file: filePath, status: 'already-loaded' };
      }
      
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch intent file: ${response.status}`);
      }
      
      const content = await response.text();
      const { metadata, content: mainContent } = this.parseMarkdownMetadata(content);
      
      const intent = metadata.name || metadata.intent;
      const description = metadata.description || '';
      
      if (!intent) {
        throw new Error('Invalid intent file format. Required: name (string) in frontmatter');
      }
      
      // Extract examples from the Markdown content
      // It looks for a section like "### Examples" or "# Examples" and then lists starting with - or *
      const examples = this.extractExamples(mainContent);
      
      if (examples.length === 0) {
        throw new Error('No examples found in the intent file. Use a list under an "Examples" heading.');
      }
      
      // Add each example to the intent database
      for (const example of examples) {
        const entry = {
          text: example,
          intent: intent,
          description: description,
          type: 'intent',
          timestamp: Date.now()
        };
        
        await this.db.insert(entry);
      }
      
      this.loadedFiles.add(filePath);
      
      return { 
        success: true, 
        file: filePath, 
        intent: intent,
        examples: examples.length 
      };
    } catch (error) {
      console.error(`Error processing intent file ${filePath}:`, error);
      return { success: false, file: filePath, error: error.message };
    }
  }
  
  /**
   * Load all intent files from the directory
   * @returns {Promise<Array>} - Results of processing each file
   */
  async loadIntents() {
    try {
      const response = await fetch(`${this.directoryPath}index.json`);
      let files = [];
      
      if (response.ok) {
        const data = await response.json();
        files = data.files || [];
      } else {
        console.warn(`Could not find index.json in ${this.directoryPath}.`);
        return [];
      }
      
      const results = await Promise.all(
        files.map(file => this.processIntentFile(`${this.directoryPath}${file}`))
      );
      
      return results;
    } catch (error) {
      console.error('Error loading intent base:', error);
      throw error;
    }
  }
  
  /**
   * Classify a query by finding the most similar intent example
   * @param {string} query - The user query
   * @param {number} threshold - Minimum similarity score (0 to 1)
   * @returns {Promise<Object|null>} - The detected intent or null
   */
  async classify(query, threshold = 0.7) {
    try {
      const results = await this.db.query(query, 3);
      
      if (results.length > 0 && results[0].score >= threshold) {
        // Return the top result which contains the intent
        return {
          intent: results[0].intent,
          score: results[0].score,
          match: results[0].text
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error classifying query intent:', error);
      return null;
    }
  }
  
  /**
   * Clear the intent database
   */
  async clear() {
    try {
      await this.db.clear();
      this.loadedFiles.clear();
    } catch (error) {
      console.error('Error clearing intent database:', error);
    }
  }
  
  /**
   * Parse metadata from markdown frontmatter
   * @param {string} content - Markdown content
   * @returns {Object} - Extracted metadata and content without frontmatter
   */
  parseMarkdownMetadata(content) {
    const metadata = {};
    let contentWithoutFrontmatter = content.trim();
    
    if (contentWithoutFrontmatter.startsWith('---')) {
      const endOfFrontmatter = contentWithoutFrontmatter.indexOf('---', 3);
      if (endOfFrontmatter !== -1) {
        const frontmatter = contentWithoutFrontmatter.substring(3, endOfFrontmatter).trim();
        
        frontmatter.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length) {
            metadata[key.trim().toLowerCase()] = valueParts.join(':').trim();
          }
        });
        
        contentWithoutFrontmatter = contentWithoutFrontmatter.substring(endOfFrontmatter + 3).trim();
      }
    }
    
    // Mapping name/title to intent for compatibility
    if (metadata.name) metadata.intent = metadata.name;
    
    return {
      metadata,
      content: contentWithoutFrontmatter
    };
  }

  /**
   * Extract examples from the Markdown content
   * Looks for a list of items under an "Examples" heading
   * @param {string} content - Markdown content
   * @returns {string[]} - Array of example phrases
   */
  extractExamples(content) {
    const examples = [];
    // Split by newline, handling both \n and \r\n
    const lines = content.split(/\r?\n/);
    let inExamplesSection = false;
    
    for (let line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Check if we found the Examples header 
      // Matches: "# Examples", "## Examples", "# Examples:", "## Examples :" case-insensitive
      if (trimmedLine.match(/^#+\s*(?:Examples|examples):?\s*$/i)) {
        inExamplesSection = true;
        continue;
      }
      
      // If we hit another header while in the section, stop
      if (inExamplesSection && trimmedLine.startsWith('#')) {
        break;
      }
      
      if (inExamplesSection) {
        // Match list items or just the line content
        const listMatch = trimmedLine.match(/^[*-+]\s+(.+)$/);
        if (listMatch) {
          examples.push(listMatch[1].trim());
        } else {
          // Fallback: take the whole line if it's not a header and we are in the section
          examples.push(trimmedLine);
        }
      }
    }
    
    return examples;
  }
}

export { IntentLoader };
