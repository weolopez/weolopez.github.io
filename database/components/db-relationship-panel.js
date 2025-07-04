import { eventBus, EVENTS } from '../event-bus.js';

class DbRelationshipPanel extends HTMLElement {
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
                .container {
                    display: grid;
                    grid-template-columns: 1fr 2fr;
                    gap: 20px;
                }
                .panel-section {
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    padding: 10px;
                    background-color: #f9f9f9;
                }
                h3 {
                    margin-top: 0;
                    color: #0056b3;
                }
                ul {
                    list-style: none;
                    padding: 0;
                }
                li {
                    padding: 5px 0;
                    cursor: pointer;
                    border-bottom: 1px dashed #eee;
                }
                li:last-child {
                    border-bottom: none;
                }
                li.selected {
                    background-color: #e0f7fa;
                    font-weight: bold;
                }
                .record-details {
                    margin-top: 10px;
                    background-color: #e9ecef;
                    padding: 10px;
                    border-radius: 4px;
                    font-family: monospace;
                    white-space: pre-wrap;
                    word-break: break-all;
                }
                .add-child-form {
                    margin-top: 15px;
                    padding-top: 10px;
                    border-top: 1px solid #eee;
                }
                .add-child-form label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: bold;
                }
                .add-child-form input[type="text"], .add-child-form textarea, .add-child-form select {
                    width: calc(100% - 22px);
                    padding: 8px;
                    margin-bottom: 10px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                }
                .add-child-form button {
                    background-color: #28a745;
                    color: white;
                    padding: 8px 12px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                .add-child-form button:hover {
                    background-color: #218838;
                }
                .status-message {
                    color: green;
                    margin-top: 10px;
                }
            </style>
            <div class="container">
                <div class="panel-section">
                    <h3>Parent Collections</h3>
                    <select id="parent-collection-select"></select>
                    <ul id="parent-records-list">
                        <li>No parent records.</li>
                    </ul>
                </div>
                <div class="panel-section">
                    <h3>Selected Parent Details</h3>
                    <div id="selected-parent-details" class="record-details">
                        Select a parent record to view details.
                    </div>

                    <div class="add-child-form">
                        <h3>Add Child Record</h3>
                        <label for="child-type-select">Child Type:</label>
                        <select id="child-type-select"></select>
                        <label for="child-data-json">Child Data (JSON):</label>
                        <textarea id="child-data-json" placeholder='{"title": "My Comment", "content": "..."}'></textarea>
                        <button id="add-child-button">Add Child</button>
                        <p id="child-status-message" class="status-message"></p>
                    </div>

                    <h3>Children Records</h3>
                    <ul id="child-records-list">
                        <li>No children.</li>
                    </ul>
                </div>
            </div>
        `;

        this.parentCollectionSelect = this.shadowRoot.getElementById('parent-collection-select');
        this.parentRecordsList = this.shadowRoot.getElementById('parent-records-list');
        this.selectedParentDetails = this.shadowRoot.getElementById('selected-parent-details');
        this.childTypeSelect = this.shadowRoot.getElementById('child-type-select');
        this.childDataJsonInput = this.shadowRoot.getElementById('child-data-json');
        this.addChildButton = this.shadowRoot.getElementById('add-child-button');
        this.childStatusMessage = this.shadowRoot.getElementById('child-status-message');
        this.childRecordsList = this.shadowRoot.getElementById('child-records-list');

        this.dbInstance = null;
        this.allCollectionNames = [];
        this.parentCollectionNames = [];
        this.selectedParentRecord = null;

        this.parentCollectionSelect.addEventListener('change', this.handleParentCollectionChange.bind(this));
        this.parentRecordsList.addEventListener('click', this.handleParentRecordSelect.bind(this));
        this.addChildButton.addEventListener('click', this.handleAddChild.bind(this));
        
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
        this.allCollectionNames = collectionNames;
        this.parentCollectionNames = collectionNames; // For now, all can be parents
        this.populateCollectionSelects();
        this.refreshParentRecords();
    }

    populateCollectionSelects() {
        this.parentCollectionSelect.innerHTML = '';
        this.childTypeSelect.innerHTML = '';

        if (this.parentCollectionNames.length === 0) {
            const option = document.createElement('option');
            option.textContent = 'No collections available';
            this.parentCollectionSelect.appendChild(option);
            this.childTypeSelect.appendChild(option.cloneNode(true));
            return;
        }

        this.parentCollectionNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            this.parentCollectionSelect.appendChild(option);
        });

        this.allCollectionNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            this.childTypeSelect.appendChild(option);
        });

        // Set initial selection
        if (this.parentCollectionNames.length > 0) {
            this.parentCollectionSelect.value = this.parentCollectionNames[0];
            this.handleParentCollectionChange();
        }
    }

    async handleParentCollectionChange() {
        this.refreshParentRecords();
    }

    async refreshParentRecords() {
        if (!this.dbInstance || !this.parentCollectionSelect.value) {
            console.log(`[DB-RELATIONSHIP-PANEL] Cannot refresh parent records - missing db instance or collection`);
            this.parentRecordsList.innerHTML = '<li>No parent records. Initialize DB.</li>';
            return;
        }

        const collectionName = this.parentCollectionSelect.value;
        console.log(`[DB-RELATIONSHIP-PANEL] Starting parent records refresh for collection: ${collectionName}`);
        this.parentRecordsList.innerHTML = '';
        this.selectedParentRecord = null;
        this.selectedParentDetails.textContent = 'Select a parent record to view details.';
        this.childRecordsList.innerHTML = '<li>No children.</li>';

        try {
            const records = [];
            console.log(`[DB-RELATIONSHIP-PANEL] Calling forEach on collection: ${collectionName}`);
            await this.dbInstance[collectionName].forEach(record => {
                records.push(record); // Keep proxy for direct interaction
            });

            console.log(`[DB-RELATIONSHIP-PANEL] Successfully loaded ${records.length} parent records`);
            if (records.length === 0) {
                this.parentRecordsList.innerHTML = '<li>No records in this collection.</li>';
                return;
            }

            records.forEach(record => {
                const li = document.createElement('li');
                li.textContent = `ID: ${record.id} - ${record.name || record.title || JSON.stringify(record.getFields())}`;
                li.dataset.recordId = record.id;
                li.dataset.collectionName = collectionName;
                li.record = record; // Store the proxy object
                this.parentRecordsList.appendChild(li);
            });
        } catch (error) {
            console.error(`[DB-RELATIONSHIP-PANEL] Error refreshing parent records for ${collectionName}:`, error);
            this.parentRecordsList.innerHTML = `<li>Error loading parents: ${error.message}</li>`;
        }
    }

    async handleParentRecordSelect(event) {
        const listItem = event.target.closest('li');
        if (!listItem || !listItem.record) return;

        // Remove 'selected' class from previously selected item
        const previouslySelected = this.shadowRoot.querySelector('li.selected');
        if (previouslySelected) {
            previouslySelected.classList.remove('selected');
        }
        listItem.classList.add('selected');

        this.selectedParentRecord = listItem.record;
        this.selectedParentDetails.textContent = this.selectedParentRecord.toString();
        this.refreshChildRecords();
    }

    async refreshChildRecords() {
        this.childRecordsList.innerHTML = '<li>Loading children...</li>';
        if (!this.selectedParentRecord) {
            this.childRecordsList.innerHTML = '<li>No parent selected.</li>';
            return;
        }

        try {
            const children = [];
            // Iterate through all possible child types defined in allCollectionNames
            for (const childType of this.allCollectionNames) {
                // Check if the parent record has an array property matching the childType
                // This assumes the parent stores an array of child IDs under a property named after the child type
                if (Array.isArray(this.selectedParentRecord[childType])) {
                    const childIds = this.selectedParentRecord[childType];
                    if (childIds.length > 0) {
                        // Use db.js's readAll to fetch multiple children by ID
                        const fetchedChildren = await this.dbInstance._postMessage({
                            action: 'readAll', // Direct worker action for readAll
                            storeName: childType,
                            keys: childIds
                        });
                        fetchedChildren.result.forEach(child => {
                            if (child) {
                                children.push(child);
                            }
                        });
                    }
                }
            }

            if (children.length === 0) {
                this.childRecordsList.innerHTML = '<li>No children found for this parent.</li>';
                return;
            }

            this.childRecordsList.innerHTML = '';
            children.forEach(child => {
                const li = document.createElement('li');
                li.textContent = `ID: ${child.id} - Type: ${child.type} - ${child.name || child.title || JSON.stringify(child)}`;
                this.childRecordsList.appendChild(li);
            });

        } catch (error) {
            console.error('Error refreshing child records:', error);
            this.childRecordsList.innerHTML = `<li>Error loading children: ${error.message}</li>`;
        }
    }

    async handleAddChild() {
        if (!this.selectedParentRecord) {
            this.updateChildStatus('Please select a parent record first.', 'red');
            return;
        }

        const childType = this.childTypeSelect.value;
        const jsonString = this.childDataJsonInput.value.trim();

        if (!childType || !jsonString) {
            this.updateChildStatus('Please select a child type and enter JSON data.', 'red');
            return;
        }

        try {
            const childData = JSON.parse(jsonString);
            childData.type = childType; // Ensure type is set for the child

            // Use the proxy's add method
            await this.selectedParentRecord.add(childData);
            this.updateChildStatus('Child record added successfully!', 'green');
            this.childDataJsonInput.value = ''; // Clear input
            this.refreshChildRecords(); // Refresh child list
            this.refreshParentRecords(); // Refresh parent list to show updated child IDs
        } catch (error) {
            this.updateChildStatus(`Error adding child: ${error.message}`, 'red');
            console.error('Error adding child record:', error);
        }
    }

    updateChildStatus(message, color = 'green') {
        this.childStatusMessage.textContent = message;
        this.childStatusMessage.style.color = color;
    }

    handleDbInitialized(data) {
        const { dbInstance, collectionNames } = data;
        this.setDbInstance(dbInstance);
        this.setCollections(collectionNames);
        console.log('[DB-RELATIONSHIP-PANEL] Database initialized, collections updated');
    }

    handleDbClosed() {
        this.dbInstance = null;
        this.setCollections([]);
        console.log('[DB-RELATIONSHIP-PANEL] Database closed, collections cleared');
    }

    handleDbDropped() {
        this.dbInstance = null;
        this.setCollections([]);
        console.log('[DB-RELATIONSHIP-PANEL] Database dropped, collections cleared');
    }
}

customElements.define('db-relationship-panel', DbRelationshipPanel);