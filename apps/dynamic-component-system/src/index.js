import { ComponentRegistry } from './component-registry.js';
import { initializeEventHandlers } from './event-handlers.js';
import { MIME_TYPES } from './mime-types.js';

/**
 * @class DynamicComponentSystem
 * @description Main class to initialize and manage the dynamic component system.
 */
export class DynamicComponentSystem {
    /**
     * @param {object} [options] - Configuration options for the system.
     */
    constructor(options = {}) {
        this.registry = new ComponentRegistry();
        this.options = options;
    }

    /**
     * Initializes the system by setting up event handlers.
     */
    init() {
        initializeEventHandlers(this.registry);
        console.log('Dynamic Component System initialized.');
    }

    /**
     * Provides access to the component registry.
     * @returns {ComponentRegistry} The component registry instance.
     */
    getRegistry() {
        return this.registry;
    }
}

// Export MIME_TYPES for easy access by consumers of the library.
export { MIME_TYPES };