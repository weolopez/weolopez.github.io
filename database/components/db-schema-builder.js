import { eventBus, EVENTS } from '../event-bus.js';
import { DbController } from '../db-controller.js';


class DbSchemaBuilder extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.dbController = new DbController();


        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    padding: 10px;
                    border: 1px solid #eee;
                    border-radius: 5px;
                    background-color: #fff;
                }
                label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: bold;
                }
                input[type="text"], input[type="number"] {
                    width: calc(100% - 22px);
                    padding: 8px;
                    margin-bottom: 10px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                }
                button {
                    background-color: #007bff;
                    color: white;
                    padding: 10px 15px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                    margin-top: 10px;
                }
                button:hover {
                    background-color: #0056b3;
                }
                .collection-item {
                    display: flex;
                    align-items: center;
                    margin-bottom: 5px;
                }
                .collection-item input {
                    flex-grow: 1;
                    margin-right: 5px;
                }
                .collection-item button {
                    background-color: #dc3545;
                    padding: 5px 10px;
                    font-size: 14px;
                    margin-top: 0;
                }
                .collection-item button:hover {
                    background-color: #c82333;
                }
            </style>
            <div>
                <label for="dbName">Database Name:</label>
                <input type="text" id="dbName" value="MyTestDB">

                <label for="dbVersion">Database Version:</label>
                <input type="number" id="dbVersion" value="1" min="1">

                <label>Collections (Object Stores):</label>
                <div id="collections-list">
                    <div class="collection-item">
                        <input type="text" value="users" class="collection-input">
                        <button class="remove-collection">Remove</button>
                    </div>
                    <div class="collection-item">
                        <input type="text" value="orders" class="collection-input">
                        <button class="remove-collection">Remove</button>
                    </div>
                </div>
                <button id="add-collection">Add Collection</button>
                <button id="init-db">Initialize Database</button>
                <p id="status-message" style="color: green;"></p>

                <hr style="margin: 20px 0;">

                <label for="existingDbSelect">Existing Databases:</label>
                <select id="existingDbSelect" style="width: calc(100% - 22px); padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px;"></select>
                <button id="init-selected-db">Initialize Selected Database</button>
            </div>
        `;

        this.dbNameInput = this.shadowRoot.getElementById('dbName');
        this.dbVersionInput = this.shadowRoot.getElementById('dbVersion');
        this.collectionsList = this.shadowRoot.getElementById('collections-list');
        this.addCollectionButton = this.shadowRoot.getElementById('add-collection');
        this.initDbButton = this.shadowRoot.getElementById('init-db');
        this.statusMessage = this.shadowRoot.getElementById('status-message');
        this.existingDbSelect = this.shadowRoot.getElementById('existingDbSelect');
        this.initSelectedDbButton = this.shadowRoot.getElementById('init-selected-db');

        this.availableDatabases = []; // To store the list of databases and their collections

        // Load database name from session storage on initialization
        this.loadDbNameFromStorage();

        // Set up event subscriptions
        this.setupEventSubscriptions();

        // Add blur event listener to save database name to session storage
        this.dbNameInput.addEventListener('blur', this.saveDbNameToStorage.bind(this));
        this.addCollectionButton.addEventListener('click', this.addCollectionInput.bind(this));
        this.initDbButton.addEventListener('click', this.initializeDatabase.bind(this));
        this.collectionsList.addEventListener('click', (event) => {
            if (event.target.classList.contains('remove-collection')) {
                event.target.closest('.collection-item').remove();
            }
        });
        this.initSelectedDbButton.addEventListener('click', this.initializeSelectedDatabase.bind(this));
    }

    setupEventSubscriptions() {
        this.unsubscribeFunctions = [
            eventBus.subscribe(EVENTS.DB_INITIALIZED, this.handleDbInitialized, this),
            eventBus.subscribe(EVENTS.DB_INIT_FAILED, this.handleDbInitFailed, this),
            eventBus.subscribe(EVENTS.DB_CLOSED, this.handleDbClosed, this),
            eventBus.subscribe(EVENTS.DB_DROPPED, this.handleDbDropped, this),
            eventBus.subscribe(EVENTS.DB_LIST_UPDATED, this.handleDbListUpdated, this)
        ];
    }

    connectedCallback() {
        // Initialize database controller
        this.dbController.init();
    }

    disconnectedCallback() {
        // Clean up database controller
        if (this.dbController) {
            this.dbController.cleanup();
        }

        // Clean up event subscriptions
        if (this.unsubscribeFunctions) {
            this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
        }
    }

    addCollectionInput() {
        const div = document.createElement('div');
        div.classList.add('collection-item');
        div.innerHTML = `
            <input type="text" class="collection-input" placeholder="Collection Name">
            <button class="remove-collection">Remove</button>
        `;
        this.collectionsList.appendChild(div);
    }

    getSchema() {
        const dbName = this.dbNameInput.value.trim();
        const dbVersion = parseInt(this.dbVersionInput.value, 10);
        const collectionInputs = this.shadowRoot.querySelectorAll('.collection-input');
        const collectionNames = Array.from(collectionInputs)
                                    .map(input => input.value.trim())
                                    .filter(name => name !== '');
        return { dbName, dbVersion, collectionNames };
    }

    async initializeDatabase() {
        const { dbName, dbVersion, collectionNames } = this.getSchema();

        if (!dbName || collectionNames.length === 0) {
            this.updateStatus('Please provide a database name and at least one collection.', 'red');
            return;
        }

        // Publish event via event bus
        eventBus.publish(EVENTS.DB_INIT_REQUESTED, { dbName, dbVersion, collectionNames });

        this.updateStatus(`Attempting to initialize database '${dbName}' v${dbVersion} with collections: ${collectionNames.join(', ')}`, 'orange');
    }

    async initializeSelectedDatabase() {
        const selectedDbName = this.existingDbSelect.value;
        if (!selectedDbName) {
            this.updateStatus('Please select a database from the list.', 'red');
            return;
        }

        const selectedDb = this.availableDatabases.find(db => db.name === selectedDbName);

        if (selectedDb) {
            // For existing databases, we need to open them to get the current version and collections.
            // The db-worker's init method will handle opening an existing database.
            // We pass the collections we retrieved from the listDatabases call.
            eventBus.publish(EVENTS.DB_INIT_REQUESTED, {
                dbName: selectedDb.name,
                dbVersion: selectedDb.version || 1, // Use version from dbInfo or default to 1
                collectionNames: selectedDb.collections
            });
            this.updateStatus(`Attempting to initialize selected database '${selectedDb.name}' with collections: ${selectedDb.collections.join(', ')}`, 'orange');
        } else {
            this.updateStatus(`Selected database '${selectedDbName}' not found in the available list.`, 'red');
        }
    }

    handleDbInitialized(data) {
        const { dbName, dbVersion, collectionNames } = data;
        this.updateStatus(`Database '${dbName}' v${dbVersion} initialized successfully with collections: ${collectionNames.join(', ')}`, 'green');
    }

    handleDbInitFailed(data) {
        const { error, dbName, dbVersion, collectionNames } = data;
        this.updateStatus(`Error initializing database '${dbName}': ${error}`, 'red');
    }

    handleDbClosed() {
        this.updateStatus('Database connection closed.', 'orange');
    }

    handleDbDropped() {
        this.updateStatus('Database dropped successfully.', 'orange');
    }

    handleDbListUpdated(data) {
        const { databases } = data;
        this.availableDatabases = databases;
        this.populateDatabaseDropdown(databases);
        this.updateStatus(`Available databases updated.`, 'blue');
    }

    populateDatabaseDropdown(databases) {
        this.existingDbSelect.innerHTML = '<option value="">--Select a Database--</option>';
        databases.forEach(db => {
            const option = document.createElement('option');
            option.value = db.name;
            option.textContent = `${db.name} (Collections: ${db.collections.join(', ') || 'None'})`;
            this.existingDbSelect.appendChild(option);
        });
    }

    updateStatus(message, color = 'green') {
        this.statusMessage.textContent = message;
        this.statusMessage.style.color = color;
    }

    saveDbNameToStorage() {
        const dbName = this.dbNameInput.value.trim();
        if (dbName) {
            sessionStorage.setItem('dbName', dbName);
            console.log(`[DB-SCHEMA-BUILDER] Database name saved to session storage: ${dbName}`);
        }
    }

    loadDbNameFromStorage() {
        const savedDbName = sessionStorage.getItem('dbName');
        if (savedDbName) {
            this.dbNameInput.value = savedDbName;
            console.log(`[DB-SCHEMA-BUILDER] Database name loaded from session storage: ${savedDbName}`);
        }
    }
}

customElements.define('db-schema-builder', DbSchemaBuilder);