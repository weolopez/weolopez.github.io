/**
 * HocuspocusProvider module for creating collaborative document instances 
 * Provides a simplified API for different Yjs data types with modern reactive patterns
 */

import * as Y from "https://esm.sh/yjs";
import { HocuspocusProvider } from "https://esm.sh/@hocuspocus/provider";

// Provider cache to avoid duplicates
const providerCache = new Map();

// Shared utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Shared destroy utility for reactive classes
function createReactiveDestroy(listeners, boundElements) {
  return function destroy() {
    listeners.clear();
    if (boundElements) {
      boundElements.forEach((element, key) => {
        if (element._reactiveBinding) {
          element.removeEventListener('input', element._reactiveBinding);
          delete element._reactiveBinding;
        }
      });
      boundElements.clear();
    }
  };
}

// Export Y for use in applications that need to create new Yjs objects
export { Y };

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
      // Full replace for correctness and simplicity
      this._ytext.delete(0, this._ytext.length);
      if (newValue.length > 0) {
        this._ytext.insert(0, newValue);
      }
    }
  }

  // Bind to a DOM input/textarea element for automatic two-way sync
  bind(element, options = {}) {
    if (this._boundElements.has(element)) return;

    this._boundElements.add(element);
    element.value = this.value;

    const handler = options.debounceMs ?
      debounce(() => { this.value = element.value; }, options.debounceMs) :
      () => { this.value = element.value; };

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

  // Destroy method to clean up listeners and bindings
  destroy = createReactiveDestroy(this._listeners, this._boundElements);

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
        return target._ymap[prop];
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
          value: target._ymap[prop],
          writable: true
        };
      }
    });
  }

  // Bind a key to a DOM input element
  bind(key, element, options = {}) {
    if (this._boundElements.has(key)) {
      this.unbind(key);
    }

    this._boundElements.set(key, element);
    element.value = this._ymap.get(key) || '';

    const handler = options.debounceMs ?
      debounce(() => { this._ymap.set(key, element.value); }, options.debounceMs) :
      () => { this._ymap.set(key, element.value); };

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

  // Destroy method
  destroy = createReactiveDestroy(this._listeners, this._boundElements);

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
  bindRenderer(renderFn, options = {}) {
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


// Reactive wrapper for awareness
class ReactiveAwareness {
  constructor(provider) {
    this._provider = provider;
    this._awareness = provider.awareness;
    this._listeners = new Set();

    this._awareness.on('change', ({ added, updated, removed }) => {
      this._notifyListeners({ added, updated, removed });
    });
  }

  // Get all awareness states
  get states() {
    return this._awareness.getStates();
  }

  // Set local state field
  setLocalState(field, value) {
    this._awareness.setLocalStateField(field, value);
  }

  // Get local state
  get localState() {
    return this._awareness.getLocalState();
  }

  // Subscribe to awareness changes
  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  // Destroy method
  destroy = createReactiveDestroy(this._listeners);

  _notifyListeners(event) {
    this._listeners.forEach(callback => callback(event));
  }
}

// Export reactive classes for direct use
export { ReactiveYText, ReactiveYMap, ReactiveYArray, ReactiveAwareness };

// Signal-like API for reactive variables that sync across browsers
export class SyncedSignal {
  constructor(initialValue, name, key = 'value') {
    this._value = initialValue;
    this._listeners = new Set();

    // Always use map for simplicity and consistency
    const result = getDocumentType('map', name);
    this._doc = result.data;
    this._key = key;

    // Initialize the value in Yjs if it doesn't exist
    if (!this._doc.has(key)) {
      this._doc.set(key, initialValue);
    }
    this._value = this._doc.get(key);

    // Set up observation
    this._doc.observe((event, transaction) => {
      if (!transaction.local) {
        const newValue = this._doc.get(key);
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
      this._doc.set(this._key, newValue);
    }
  }

  // Subscribe to changes
  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  // Bind to DOM element
  bind(element, options = {}) {
    element.value = this.value;
    const handler = options.debounceMs ?
      debounce(() => { this.value = element.value; }, options.debounceMs) :
      () => { this.value = element.value; };
    element.addEventListener('input', handler);
    element._signalBinding = handler;
  }

  // Destroy method
  destroy = createReactiveDestroy(this._listeners);

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

export function createReactiveAwareness(name) {
  const result = getDocumentType("awareness", name);
  return new ReactiveAwareness(result.provider);
}

/**
 * Determines the appropriate WebSocket URL based on the current hostname
 * @param {string} [customUrl] - Optional custom WebSocket URL
 * @returns {string} WebSocket URL
 */
function getWebSocketUrl(customUrl) {
  if (customUrl) return customUrl;
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocalhost ? 'ws://localhost:8888' : 'wss://stream.weolopez.com';
}

/**
 * Creates a HocuspocusProvider instance with the specified data type
 * @param {string} typeString - The type of document: 'text', 'array', 'map', 'xml', or 'awareness'
 * @param {string} name - The document name for collaboration
 * @param {string} [url] - Optional custom WebSocket URL
 * @returns {Object} Provider instance with attached data structure and metadata
 */
export function getDocumentType(typeString, name, url) {
  if (!name || typeof name !== 'string') throw new Error('Document name must be a non-empty string');

  if (providerCache.has(name)) {
    return providerCache.get(name);
  }

  try {
    const provider = new HocuspocusProvider({
      url: getWebSocketUrl(url),
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
        dataKey = getDefaultDataKey('array', name);
        dataStructure = doc.getArray(dataKey);
        break;
  
      case 'map':
        dataKey = getDefaultDataKey('map', name);
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
    const result = {
      provider,
      document: doc,
      data: dataStructure,
      dataKey,
      type: typeString.toLowerCase(),
      name,
      // Convenience methods
      on: (event, callback) => provider.on(event, callback),
      destroy: () => {
        providerCache.delete(name);
        provider.destroy();
      },
      // For awareness type, expose awareness-specific methods
      ...(typeString.toLowerCase() === 'awareness' && {
        awareness: provider.awareness,
        setLocalState: (field, value) => provider.awareness.setLocalStateField(field, value),
        getStates: () => provider.awareness.getStates(),
        onAwarenessChange: (callback) => provider.awareness.on('change', callback)
      })
    };

    providerCache.set(name, result);
    return result;
  } catch (err) {
    throw new Error(`Failed to create ${typeString} document "${name}": ${err.message}`);
  }
}

/**
 * Utility function to create multiple document types at once
 * @param {Array} documentConfigs - Array of {type, name} objects
 * @param {string} [url] - Optional custom WebSocket URL
 * @returns {Object} Object with document names as keys and provider instances as values
 */
export async function createMultipleDocuments(documentConfigs, url) {
  const documents = {};

  documentConfigs.forEach(config => {
    if (!config.type || !config.name) {
      throw new Error('Each document config must have "type" and "name" properties');
    }
    documents[config.name] = getDocumentType(config.type, config.name, url);
  });

  // Connect all providers
  await Promise.all(Object.values(documents).map(doc => doc.provider.connect()));
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