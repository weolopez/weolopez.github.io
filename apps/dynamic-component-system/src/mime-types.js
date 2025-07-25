/**
 * @module MimeTypes
 * @description Defines constants for supported MIME types.
 */

export const MIME_TYPES = {
    JAVASCRIPT: 'application/javascript',
    MERMAID: 'text/x-mermaid',
    PLAIN_TEXT: 'text/plain',
    MARKDOWN: 'text/markdown',
    JSON: 'application/json',
    CSS: 'text/css',
    HTML: 'text/html',
};

/**
 * Validates if a given MIME type is supported.
 * @param {string} mimeType - The MIME type to validate.
 * @returns {boolean} True if the MIME type is supported, false otherwise.
 */
export function isValidMimeType(mimeType) {
    return Object.values(MIME_TYPES).includes(mimeType);
}