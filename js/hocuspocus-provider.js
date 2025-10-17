/**
 * HocuspocusProvider module for creating collaborative document instances
 * Provides a simplified API for different Yjs data types with modern reactive patterns
 */

import * as Y from "https://esm.sh/yjs";
import { HocuspocusProvider } from "https://esm.sh/@hocuspocus/provider";

// Export Y for use in applications that need to create new Yjs objects
export { Y };

// Export reactive classes for direct use
export { ReactiveYText, ReactiveYMap, ReactiveYArray };

// Reactive wrapper classes for modern JavaScript patterns
class ReactiveYText {
  constructor(ytext, provider) {
    this._ytext = ytext;
    this._provider = provider;
    this._listeners = new Set();
    this._boundElements = new Set();

    // Set up observation for reactive updates
    this._ytext.observe((event, transaction) => {
      if (!transaction.local) {
        this._notifyListeners();
        this._syncBoundElements();
      }
    });
  }

  // Get current text value
  get value() {
    return this._ytext.toString();
  }

  // Set text value
  set value(newValue) {
    const currentValue = this._ytext.toString();
    if (newValue !== currentValue) {
      // Calculate diff and apply changes
      const commonPrefix = this._findCommonPrefix(currentValue, newValue);
      const deleteCount = currentValue.length - commonPrefix;
      const insertText = newValue.slice(commonPrefix);

      if (deleteCount > 0) {
        this._ytext.delete(commonPrefix, deleteCount);
      }
      if (insertText.length > 0) {
        this._ytext.insert(commonPrefix, insertText);
      }
    }
  }

  // Bind to a DOM input/textarea element for automatic two-way sync
  bind(element) {
    if (this._boundElements.has(element)) return;

    this._boundElements.add(element);
    element.value = this.value;

    const handler = () => {
      this.value = element.value;
    };

    element.addEventListener('input', handler);
    element._reactiveBinding = handler;
  }

  // Unbind from DOM element
  unbind(element) {
    if (this._boundElements.has(element)) {
      this._boundElements.delete(element);
      if (element._reactiveBinding) {
        element.removeEventListener('input', element._reactiveBinding);
        delete element._reactiveBinding;
      }
    }
  }

  // Subscribe to changes
  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  // Insert text at position
  insert(index, text) {
    this._ytext.insert(index, text);
  }

  // Delete text range
  delete(index, length) {
    this._ytext.delete(index, length);
  }

  // Get length
  get length() {
    return this._ytext.length;
  }

  _findCommonPrefix(str1, str2) {
    let i = 0;
    while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
      i++;
    }
    return i;
  }

  _notifyListeners() {
    this._listeners.forEach(callback => callback(this.value));
  }

  _syncBoundElements() {
    const currentValue = this.value;
    this._boundElements.forEach(element => {
      if (element.value !== currentValue) {
        element.value = currentValue;
      }
    });
  }
}

class ReactiveYMap {
  constructor(ymap, provider) {
    this._ymap = ymap;
    this._provider = provider;
    this._listeners = new Map();
    this._boundElements = new Map();

    // Set up observation
    this._ymap.observe((event, transaction) => {
      if (!transaction.local) {
        this._notifyListeners(event.keysChanged);
        this._syncBoundElements(event.keysChanged);
      }
    });

    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) return target[prop];
        return target._ymap.get(prop);
      },
      set(target, prop, value) {
        if (prop in target) {
          target[prop] = value;
          return true;
        }
        target._ymap.set(prop, value);
        return true;
      },
      has(target, prop) {
        return prop in target || target._ymap.has(prop);
      },
      ownKeys(target) {
        return [...Object.getOwnPropertyNames(target), ...target._ymap.keys()];
      },
      getOwnPropertyDescriptor(target, prop) {
        if (prop in target) {
          return Object.getOwnPropertyDescriptor(target, prop);
        }
        return {
          configurable: true,
          enumerable: true,
          value: target._ymap.get(prop),
          writable: true
        };
      }
    });
  }

  // Bind a key to a DOM input element
  bind(key, element) {
    if (this._boundElements.has(key)) {
      this.unbind(key);
    }

    this._boundElements.set(key, element);
    element.value = this._ymap.get(key) || '';

    const handler = () => {
      this._ymap.set(key, element.value);
    };

    element.addEventListener('input', handler);
    element._reactiveBinding = handler;
  }

  // Unbind a key from its DOM element
  unbind(key) {
    const element = this._boundElements.get(key);
    if (element) {
      this._boundElements.delete(key);
      if (element._reactiveBinding) {
        element.removeEventListener('input', element._reactiveBinding);
        delete element._reactiveBinding;
      }
    }
  }

  // Subscribe to changes for a specific key
  subscribe(key, callback) {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Set());
    }
    this._listeners.get(key).add(callback);

    return () => {
      const listeners = this._listeners.get(key);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this._listeners.delete(key);
        }
      }
    };
  }

  // Get raw Y.Map
  get ymap() {
    return this._ymap;
  }

  _notifyListeners(changedKeys) {
    changedKeys.forEach(key => {
      const listeners = this._listeners.get(key);
      if (listeners) {
        const value = this._ymap.get(key);
        listeners.forEach(callback => callback(value, key));
      }
    });
  }

  _syncBoundElements(changedKeys) {
    changedKeys.forEach(key => {
      const element = this._boundElements.get(key);
      if (element) {
        const value = this._ymap.get(key) || '';
        if (element.value !== value) {
          element.value = value;
        }
      }
    });
  }
}

class ReactiveYArray {
  constructor(yarray, provider) {
    this._yarray = yarray;
    this._provider = provider;
    this._listeners = new Set();
    this._renderCallbacks = new Set();

    this._yarray.observe((event, transaction) => {
      if (!transaction.local) {
        this._notifyListeners();
        this._triggerRenders();
      }
    });
  }

  // Get current array
  get value() {
    return this._yarray.toArray();
  }

  // Set entire array (clears and replaces)
  set value(newArray) {
    this._yarray.delete(0, this._yarray.length);
    this._yarray.push(newArray);
  }

  // Add items to array
  push(...items) {
    this._yarray.push(items);
  }

  // Remove and return last item
  pop() {
    if (this._yarray.length > 0) {
      const lastItem = this._yarray.get(this._yarray.length - 1);
      this._yarray.delete(this._yarray.length - 1, 1);
      return lastItem;
    }
  }

  // Remove and return first item
  shift() {
    if (this._yarray.length > 0) {
      const firstItem = this._yarray.get(0);
      this._yarray.delete(0, 1);
      return firstItem;
    }
  }

  // Add items to beginning
  unshift(...items) {
    this._yarray.insert(0, items);
  }

  // Insert at index
  insert(index, items) {
    this._yarray.insert(index, items);
  }

  // Delete items at index
  delete(index, count = 1) {
    this._yarray.delete(index, count);
  }

  // Get item at index
  get(index) {
    return this._yarray.get(index);
  }

  // Get length
  get length() {
    return this._yarray.length;
  }

  // Subscribe to array changes
  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  // Bind to a render function for automatic UI updates
  bindRenderer(renderFn) {
    this._renderCallbacks.add(renderFn);
    // Initial render
    renderFn(this.value);
    return () => this._renderCallbacks.delete(renderFn);
  }

  _notifyListeners() {
    this._listeners.forEach(callback => callback(this.value));
  }

  _triggerRenders() {
    this._renderCallbacks.forEach(renderFn => renderFn(this.value));
  }
}

// Signal-like API for reactive variables that sync across browsers
export class SyncedSignal {
  constructor(initialValue, provider, documentType, name, key) {
    this._value = initialValue;
    this._listeners = new Set();
    this._provider = provider;

    // Create the appropriate Yjs type based on documentType
    const result = getDocumentType(documentType, name);
    this._doc = result.data;
    this._key = key;

    // Initialize the value in Yjs if it doesn't exist
    if (documentType === 'map') {
      if (!this._doc.has(key)) {
        this._doc.set(key, initialValue);
      }
      this._value = this._doc.get(key);
    } else if (documentType === 'array' && key === 'value') {
      // For primitive values in arrays, use index 0
      if (this._doc.length === 0) {
        this._doc.push([initialValue]);
      }
      this._value = this._doc.get(0);
    }

    // Set up observation
    this._doc.observe((event, transaction) => {
      if (!transaction.local) {
        let newValue;
        if (documentType === 'map') {
          newValue = this._doc.get(key);
        } else if (documentType === 'array' && key === 'value') {
          newValue = this._doc.get(0);
        }

        if (newValue !== this._value) {
          this._value = newValue;
          this._notifyListeners();
        }
      }
    });
  }

  // Get current value
  get value() {
    return this._value;
  }

  // Set new value
  set value(newValue) {
    if (newValue !== this._value) {
      this._value = newValue;
      this._notifyListeners();

      // Sync to Yjs
      if (this._doc instanceof Y.Map) {
        this._doc.set(this._key, newValue);
      } else if (this._doc instanceof Y.Array && this._key === 'value') {
        this._doc.delete(0, this._doc.length);
        this._doc.push([newValue]);
      }
    }
  }

  // Subscribe to changes
  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  // Bind to DOM element
  bind(element) {
    element.value = this.value;
    const handler = () => {
      this.value = element.value;
    };
    element.addEventListener('input', handler);
    element._signalBinding = handler;
  }

  _notifyListeners() {
    this._listeners.forEach(callback => callback(this._value));
  }
}

// Factory functions for creating reactive instances
export function createReactiveText(name) {
  const result = getDocumentType("text", name);
  return new ReactiveYText(result.data, result.provider);
}

export function createReactiveMap(name) {
  const result = getDocumentType("map", name);
  return new ReactiveYMap(result.data, result.provider);
}

export function createReactiveArray(name) {
  const result = getDocumentType("array", name);
  return new ReactiveYArray(result.data, result.provider);
}

export function createSyncedSignal(initialValue, documentType, name, key = 'value') {
  const result = getDocumentType(documentType, name);
  return new SyncedSignal(initialValue, result.provider, documentType, name, key);
}

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