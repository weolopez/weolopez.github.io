/**
 * @class ComponentRegistry
 * @description Central registry for managing MIME type to web component mappings.
 */
export class ComponentRegistry {
    constructor() {
        // Map to store component information, with mimeType as the key.
        this.components = new Map();
        // A set of accepted MIME types, initialized with default types.
        this.acceptedMimeTypes = new Set(['application/javascript', 'text/x-mermaid', 'text/plain']);
    }

    /**
     * Registers a new component with its MIME type.
     * @param {string} mimeType - The MIME type to associate with the component.
     * @param {object} componentInfo - Information about the component, including tagName and sourceUrl.
     */
    register(mimeType, componentInfo) {
        if (!mimeType || !componentInfo || !componentInfo.tagName) {
            console.error('Invalid component registration data.', { mimeType, componentInfo });
            return;
        }
        this.components.set(mimeType, componentInfo);
        if (!this.acceptedMimeTypes.has(mimeType)) {
            this.acceptedMimeTypes.add(mimeType);
        }
        console.log(`Component registered for MIME type: ${mimeType}`, componentInfo);
    }

    /**
     * Retrieves component information for a given MIME type.
     * @param {string} mimeType - The MIME type to look up.
     * @returns {object|undefined} The component information object or undefined if not found.
     */
    getComponent(mimeType) {
        return this.components.get(mimeType);
    }

    /**
     * Checks if a component is registered for a given MIME type.
     * @param {string} mimeType - The MIME type to check.
     * @returns {boolean} True if a component is registered, false otherwise.
     */
    hasComponent(mimeType) {
        return this.components.has(mimeType);
    }

    /**
     * Unregisters a component for a given MIME type.
     * @param {string} mimeType - The MIME type to unregister.
     */
    unregister(mimeType) {
        if (this.components.has(mimeType)) {
            this.components.delete(mimeType);
            // Note: We don't remove from acceptedMimeTypes to avoid issues if it's a default type.
            console.log(`Component for MIME type ${mimeType} unregistered.`);
        }
    }

    /**
     * Lists all registered components.
     * @returns {Map<string, object>} A map of all registered components.
     */
    listRegistered() {
        return this.components;
    }
}