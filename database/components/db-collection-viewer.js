import { eventBus, EVENTS } from '../event-bus.js';

class DbCollectionViewer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    padding: 10px;
                    border: 1px solid #eee;
                    border-radius: 5px;
                    background-color: #fff;
                }
                select, input[type="text"] {
                    padding: 8px;
                    margin-bottom: 10px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    width: calc(100% - 22px);
                }
                button {
                    background-color: #28a745;
                    color: white;
                    padding: 8px 12px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    margin-right: 5px;
                }
                button:hover {
                    background-color: #218838;
                }
                .delete-btn {
                    background-color: #dc3545;
                }
                .delete-btn:hover {
                    background-color: #c82333;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 15px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                }
                .add-record-form {
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #eee;
                }
                .add-record-form label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: bold;
                }
                .add-record-form textarea {
                    width: calc(100% - 22px);
                    padding: 8px;
                    margin-bottom: 10px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    min-height: 80px;
                }
            </style>
            <div>
                <label for="collection-select">Select Collection:</label>
                <select id="collection-select"></select>

                <button id="refresh-data">Refresh Data</button>

                <div id="data-table-container">
                    <table>
                        <thead>
                            <tr id="table-headers"></tr>
                        </thead>
                        <tbody id="table-body">
                            <tr><td colspan="100%">No data available. Initialize DB and add records.</td></tr>
                        </tbody>
                    </table>
                </div>

                <div class="add-record-form">
                    <h3>Add/Update Record</h3>
                    <label for="new-record-json">Record Data (JSON):</label>
                    <textarea id="new-record-json" placeholder='{"name": "New Item", "value": 123}'></textarea>
                    <button id="add-record">Add/Update Record</button>
                    <p id="add-status-message" style="color: green;"></p>
                </div>
            </div>
        `;

        this.collectionSelect = this.shadowRoot.getElementById('collection-select');
        this.refreshButton = this.shadowRoot.getElementById('refresh-data');
        this.tableHeaders = this.shadowRoot.getElementById('table-headers');
        this.tableBody = this.shadowRoot.getElementById('table-body');
        this.newRecordJsonInput = this.shadowRoot.getElementById('new-record-json');
        this.addRecordButton = this.shadowRoot.getElementById('add-record');
        this.addStatusMessage = this.shadowRoot.getElementById('add-status-message');

        this.dbInstance = null; // Will be set by parent component
        this.currentCollection = null;

        this.collectionSelect.addEventListener('change', this.handleCollectionChange.bind(this));
        this.refreshButton.addEventListener('click', this.refreshData.bind(this));
        this.addRecordButton.addEventListener('click', this.handleAddRecord.bind(this));
        
        // Set up event subscriptions
        this.setupEventSubscriptions();
    }

    setupEventSubscriptions() {
        this.unsubscribeFunctions = [
            eventBus.subscribe(EVENTS.DB_INITIALIZED, this.handleDbInitialized, this),
            eventBus.subscribe(EVENTS.DB_CLOSED, this.handleDbClosed, this),
            eventBus.subscribe(EVENTS.DB_DROPPED, this.handleDbDropped, this)
        ];
    }

    disconnectedCallback() {
        // Clean up event subscriptions
        if (this.unsubscribeFunctions) {
            this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
        }
    }

    setDbInstance(db) {
        this.dbInstance = db;
    }

    setCollections(collectionNames) {
        this.collectionSelect.innerHTML = '';
        if (collectionNames && collectionNames.length > 0) {
            collectionNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                this.collectionSelect.appendChild(option);
            });
            this.currentCollection = collectionNames[0];
            this.refreshData();
        } else {
            this.currentCollection = null;
            this.tableHeaders.innerHTML = '';
            this.tableBody.innerHTML = '<tr><td colspan="100%">No collections available.</td></tr>';
        }
    }

    handleCollectionChange() {
        this.currentCollection = this.collectionSelect.value;
        this.refreshData();
    }

    async refreshData() {
        // Update currentCollection to match the dropdown selection
        this.currentCollection = this.collectionSelect.value;
        
        if (!this.dbInstance || !this.currentCollection) {
            console.log(`[DB-COLLECTION-VIEWER] Cannot refresh data - missing db instance or collection`);
            this.tableBody.innerHTML = '<tr><td colspan="100%">Database not initialized or no collection selected.</td></tr>';
            return;
        }

        console.log(`[DB-COLLECTION-VIEWER] Starting data refresh for collection: ${this.currentCollection}`);
        try {
            const records = [];
            console.log(`[DB-COLLECTION-VIEWER] Calling forEach on collection: ${this.currentCollection}`);
            await this.dbInstance[this.currentCollection].forEach(record => {
                records.push(record.getFields()); // Get raw fields from proxy
            });
            console.log(`[DB-COLLECTION-VIEWER] Successfully loaded ${records.length} records`);
            this.renderTable(records);
        } catch (error) {
            console.error(`[DB-COLLECTION-VIEWER] Error refreshing data for ${this.currentCollection}:`, error);
            this.tableBody.innerHTML = `<tr><td colspan="100%" style="color: red;">Error loading data: ${error.message}</td></tr>`;
        }
    }

    renderTable(records) {
        this.tableHeaders.innerHTML = '';
        this.tableBody.innerHTML = '';

        if (records.length === 0) {
            this.tableBody.innerHTML = '<tr><td colspan="100%">No records in this collection.</td></tr>';
            return;
        }

        // Determine all unique headers
        const allKeys = new Set();
        records.forEach(record => {
            Object.keys(record).forEach(key => allKeys.add(key));
        });
        const headers = Array.from(allKeys).sort(); // Sort headers alphabetically

        // Render headers
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            this.tableHeaders.appendChild(th);
        });
        // Add actions header
        const actionsTh = document.createElement('th');
        actionsTh.textContent = 'Actions';
        this.tableHeaders.appendChild(actionsTh);

        // Render rows
        records.forEach(record => {
            const row = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                const value = record[header];
                td.textContent = (typeof value === 'object' && value !== null) ? JSON.stringify(value) : value;
                row.appendChild(td);
            });

            // Add action buttons
            const actionsTd = document.createElement('td');
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => this.handleEditRecord(record));
            actionsTd.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.classList.add('delete-btn');
            deleteButton.addEventListener('click', () => this.handleDeleteRecord(record));
            actionsTd.appendChild(deleteButton);

            row.appendChild(actionsTd);
            this.tableBody.appendChild(row);
        });
    }

    async handleAddRecord() {
        if (!this.dbInstance || !this.currentCollection) {
            this.updateAddStatus('Database not initialized or no collection selected.', 'red');
            return;
        }

        const jsonString = this.newRecordJsonInput.value.trim();
        if (!jsonString) {
            this.updateAddStatus('Please enter JSON data for the record.', 'red');
            return;
        }

        try {
            const recordData = JSON.parse(jsonString);
            // Ensure the record has a 'type' property for the worker to route it correctly
            if (!recordData.type) {
                recordData.type = this.currentCollection;
            }
            
            // Check if this is an update (has an id) or a new record
            if (recordData.id) {
                // Update existing record
                await this.dbInstance[this.currentCollection].update(recordData);
                this.updateAddStatus('Record updated successfully!', 'green');
            } else {
                // Add new record
                await this.dbInstance[this.currentCollection].add(recordData);
                this.updateAddStatus('Record added successfully!', 'green');
            }
            
            this.newRecordJsonInput.value = ''; // Clear input
            this.refreshData(); // Refresh table
        } catch (error) {
            this.updateAddStatus(`Error saving record: ${error.message}`, 'red');
            console.error('Error saving record:', error);
        }
    }

    handleEditRecord(record) {
        // Populate the textarea with the record data for editing
        const recordData = { ...record };
        // Remove any proxy-specific properties that aren't data fields
        delete recordData.getFields;
        
        this.newRecordJsonInput.value = JSON.stringify(recordData, null, 2);
        this.updateAddStatus('Record loaded for editing. Modify the JSON and click "Add Record" to update.', 'blue');
        
        // Scroll to the edit form
        this.newRecordJsonInput.scrollIntoView({ behavior: 'smooth' });
        this.newRecordJsonInput.focus();
    }

    async handleDeleteRecord(record) {
        if (!this.dbInstance || !this.currentCollection) {
            this.updateAddStatus('Database not initialized or no collection selected.', 'red');
            return;
        }
        if (confirm(`Are you sure you want to delete record with ID: ${record.id}?`)) {
            try {
                // Use the collection's remove method instead of proxy
                await this.dbInstance[this.currentCollection].remove(record.id);
                this.updateAddStatus('Record deleted successfully!', 'green');
                this.refreshData(); // Refresh table
            } catch (error) {
                this.updateAddStatus(`Error deleting record: ${error.message}`, 'red');
                console.error('Error deleting record:', error);
            }
        }
    }

    updateAddStatus(message, color = 'green') {
        this.addStatusMessage.textContent = message;
        this.addStatusMessage.style.color = color;
    }

    handleDbInitialized(data) {
        const { dbInstance, collectionNames } = data;
        this.setDbInstance(dbInstance);
        this.setCollections(collectionNames);
        console.log('[DB-COLLECTION-VIEWER] Database initialized, collections updated');
    }

    handleDbClosed() {
        this.dbInstance = null;
        this.setCollections([]);
        console.log('[DB-COLLECTION-VIEWER] Database closed, collections cleared');
    }

    handleDbDropped() {
        this.dbInstance = null;
        this.setCollections([]);
        console.log('[DB-COLLECTION-VIEWER] Database dropped, collections cleared');
    }
}

customElements.define('db-collection-viewer', DbCollectionViewer);