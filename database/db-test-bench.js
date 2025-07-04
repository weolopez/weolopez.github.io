import './components/db-schema-builder.js';
import './components/db-management-panel.js';
import './components/db-collection-viewer.js';
import './components/db-relationship-panel.js';

/**
 * Database Test Bench Web Component
 * Focused on UI/HTML rendering and minimal JavaScript
 * Business logic is handled by DbController
 */
class DbTestBench extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.renderTemplate();
    }

    /**
     * Render the HTML template with styles
     */
    renderTemplate() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: Arial, sans-serif;
                }
                .container {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    padding: 20px;
                }
                .panel {
                    background-color: #f9f9f9;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    padding: 15px;
                }
                h2 {
                    color: #0056b3;
                    margin-top: 0;
                }
            </style>
            <div class="container">
                <div class="panel">
                    <h2>Schema Builder</h2>
                    <db-schema-builder></db-schema-builder>
                </div>
                <div class="panel">
                    <h2>Database Management</h2>
                    <db-management-panel></db-management-panel>
                </div>
                <div class="panel" style="grid-column: 1 / -1;">
                    <h2>Collection Viewer</h2>
                    <db-collection-viewer></db-collection-viewer>
                </div>
                <div class="panel" style="grid-column: 1 / -1;">
                    <h2>Relationship Visualizer</h2>
                    <db-relationship-panel></db-relationship-panel>
                </div>
            </div>
        `;
    }
}

customElements.define('db-test-bench', DbTestBench);