/**
 * @module ComponentLoader
 * @description Handles secure loading and processing of web component code.
 */

const WEB_COMPONENT_TAG_REGEX = /customElements\.define\s*\(\s*['"`]([^'"`]+)['"`]/;

/**
 * Processes relative imports in the component source code, converting them to absolute URLs.
 * @param {string} componentSource - The source code of the component.
 * @param {string} sourceUrl - The URL from which the component was loaded.
 * @returns {string} The processed source code with absolute import paths.
 */
function processRelativeImports(componentSource, sourceUrl) {
    if (sourceUrl && componentSource.includes("from './")) {
        const baseUrl = sourceUrl.substring(0, sourceUrl.lastIndexOf("/") + 1);
        return componentSource.replace(
            /from\s+['"`]\.\/([^'"`]+)['"`]/g,
            (match, relativePath) => {
                const absoluteUrl = new URL(relativePath, baseUrl).href;
                return `from '${absoluteUrl}'`;
            },
        );
    } else if (sourceUrl && componentSource.includes("from '/")) {
        const baseUrl = sourceUrl.substring(0, sourceUrl.lastIndexOf("/") + 1);
        return componentSource.replace(
            /from\s+['"`]\/([^'"`]+)['"`]/g,
            (match, relativePath) => {
                const absoluteUrl = new URL(relativePath, baseUrl).href;
                return `from '${absoluteUrl}'`;
            },
        );
    }

}

/**
 * Loads a web component from a string of code.
 * @param {string} componentSource - The source code of the component.
 * @param {string|null} sourceUrl - The original URL of the component, if available.
 * @returns {Promise<string|null>} A promise that resolves with the component's tag name, or null on failure.
 */
export async function loadComponentFromString(componentSource, sourceUrl = null) {
    if (!sourceUrl) {
        sourceUrl = window.location.origin + "/"  ;
    }
    const processedSource = processRelativeImports(componentSource, sourceUrl);
    const blob = new Blob([processedSource], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);

    try {
        await import(url);
        const match = processedSource.match(WEB_COMPONENT_TAG_REGEX);
        return match ? match[1] : null;
    } catch (error) {
        if (error.message.includes('already been used with this registry')) {
            console.warn(`Component with tag name already registered: ${error.message}`);
            const match = processedSource.match(WEB_COMPONENT_TAG_REGEX);
            return match ? match[1] : null;
        }
        console.error("Error loading web component from string:", error);
        return null;
    } finally {
        URL.revokeObjectURL(url);
    }
}

/**
 * Fetches component source from a URL and loads it.
 * @param {string} url - The URL to fetch the component from.
 * @returns {Promise<string|null>} A promise that resolves with the component's tag name, or null on failure.
 */
export async function loadComponentFromUrl(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const componentSource = await response.text();
        return await loadComponentFromString(componentSource, url);
    } catch (error) {
        console.error(`Failed to load component from ${url}:`, error);
        return null;
    }
}