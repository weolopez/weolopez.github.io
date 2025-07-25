import { ComponentRegistry } from './component-registry.js';
import { loadComponentFromUrl, loadComponentFromString } from './component-loader.js';

/**
 * Initializes the dynamic component system by setting up event listeners.
 * @param {ComponentRegistry} registry - An instance of the ComponentRegistry.
 */
export function initializeEventHandlers(registry) {
    if (!(registry instanceof ComponentRegistry)) {
        throw new Error('A valid ComponentRegistry instance is required.');
    }

    /** http://localhost:8000/wc/dynamic-component-system/src/event-handlers.js:43:23)'
     * Handles the PUBLISH_COMPONENT event to register new components.
     */
    document.addEventListener('PUBLISH_COMPONENT', async (e) => {
        const { url, code, mimeType } = e.detail || {};
        if (!mimeType) {
            console.error('PUBLISH_COMPONENT event requires a mimeType.');
            return;
        }

        let tagName = null;
        let sourceUrl = url || null;

        try {
            if (url) {
                tagName = await loadComponentFromUrl(url);
            } else if (code) {
                tagName = await loadComponentFromString(code);
            } else {
                throw new Error('Either url or code must be provided.');
            }

            if (tagName) {
                registry.register(mimeType, { tagName, sourceUrl });
                document.dispatchEvent(new CustomEvent('COMPONENT_REGISTERED', {
                    bubbles: true,
                    composed: true,
                    detail: { mimeType, success: true, tagName }
                }));
            } else {
                throw new Error('Failed to load or define component.');
            }
        } catch (error) {
            console.error(`Failed to register component for ${mimeType}:`, error);
            document.dispatchEvent(new CustomEvent('COMPONENT_REGISTERED', {
                bubbles: true,
                composed: true,
                detail: { mimeType, success: false, error: error.message }
            }));
        }
    });

    /**
     * Handles the PUBLISH_TEXT event to render content using a registered component.
     */
    document.addEventListener('PUBLISH_TEXT', (e) => {
        const { mimeType, texts } = e.detail || {};
        const content = (Array.isArray(texts) ? texts[0] : texts) || '';

        let html;
        let element;
        if (registry.hasComponent(mimeType)) {
            const componentInfo = registry.getComponent(mimeType);
            element = document.createElement(componentInfo.tagName);
            element.textContent = content;
            html = element.outerHTML;
        } else {
            // Fallback for unregistered MIME types
            const pre = document.createElement('pre');
            pre.textContent = content;
            html = `<div style="background:#f0f0f0;color:#333;padding:10px;border:1px solid #ccc;">${pre.outerHTML}</div>`;
        }

        document.dispatchEvent(new CustomEvent('INNER_HTML', {
            bubbles: true,
            composed: true,
            detail: { element }
        }));
    });
}