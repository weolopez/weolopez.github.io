/**
 * HocuspocusProvider module for creating collaborative document instances
 * Provides a simplified API for different Yjs data types
 */

import * as Y from "https://esm.sh/yjs";
import { HocuspocusProvider } from "https://esm.sh/@hocuspocus/provider";

// Export Y for use in applications that need to create new Yjs objects
export { Y };

/**
 * Determines the appropriate WebSocket URL based on the current hostname
 * @returns {string} WebSocket URL
 */
function getWebSocketUrl() {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocalhost ? 'ws://localhost:8888' : 'wss://stream.weolopez.com';
}

/**
 * Creates a HocuspocusProvider instance with the specified data type
 * @param {string} typeString - The type of document: 'text', 'array', 'map', 'xml', or 'awareness'
 * @param {string} name - The document name for collaboration
 * @returns {Object} Provider instance with attached data structure and metadata
 */
export function getDocumentType(typeString, name) {
  const provider = new HocuspocusProvider({
    url: getWebSocketUrl(),
    name: name,
  });

  const doc = provider.document;
  let dataStructure;
  let dataKey;

  switch (typeString.toLowerCase()) {
    case 'text':
      dataKey = 'content';
      dataStructure = doc.getText(dataKey);
      break;
    
    case 'array':
      dataKey = typeString === 'counter' ? 'votes' : 'tasks';
      dataStructure = doc.getArray(dataKey);
      break;
    
    case 'map':
      dataKey = name.includes('form') ? 'formData' : 
                name.includes('canvas') ? 'canvas' : 
                name.includes('nested') ? 'nestedData' : 'data';
      dataStructure = doc.getMap(dataKey);
      break;
    
    case 'xml':
      dataKey = 'content';
      dataStructure = doc.getXmlFragment(dataKey);
      break;
    
    case 'awareness':
      // Awareness is accessed directly from the provider, not the document
      dataStructure = provider.awareness;
      dataKey = 'awareness';
      break;
    
    default:
      throw new Error(`Unsupported document type: ${typeString}. Supported types: text, array, map, xml, awareness`);
  }

  // Return an enhanced provider object with easy access to the data structure
  return {
    provider,
    document: doc,
    data: dataStructure,
    dataKey,
    type: typeString.toLowerCase(),
    name,
    // Convenience methods
    on: (event, callback) => provider.on(event, callback),
    destroy: () => provider.destroy(),
    // For awareness type, expose awareness-specific methods
    ...(typeString.toLowerCase() === 'awareness' && {
      awareness: provider.awareness,
      setLocalState: (field, value) => provider.awareness.setLocalStateField(field, value),
      getStates: () => provider.awareness.getStates(),
      onAwarenessChange: (callback) => provider.awareness.on('change', callback)
    })
  };
}

/**
 * Utility function to create multiple document types at once
 * @param {Array} documentConfigs - Array of {type, name} objects
 * @returns {Object} Object with document names as keys and provider instances as values
 */
export function createMultipleDocuments(documentConfigs) {
  const documents = {};
  
  documentConfigs.forEach(config => {
    if (!config.type || !config.name) {
      throw new Error('Each document config must have "type" and "name" properties');
    }
    documents[config.name] = getDocumentType(config.type, config.name);
  });
  
  return documents;
}

/**
 * Helper function to get the appropriate data key for common use cases
 * @param {string} type - Document type
 * @param {string} name - Document name
 * @returns {string} Suggested data key
 */
export function getDefaultDataKey(type, name) {
  switch (type.toLowerCase()) {
    case 'text':
      return 'content';
    case 'array':
      return name.includes('vote') || name.includes('counter') ? 'votes' : 'tasks';
    case 'map':
      if (name.includes('form')) return 'formData';
      if (name.includes('canvas')) return 'canvas';
      if (name.includes('nested')) return 'nestedData';
      return 'data';
    case 'xml':
      return 'content';
    case 'awareness':
      return 'awareness';
    default:
      return 'data';
  }
}