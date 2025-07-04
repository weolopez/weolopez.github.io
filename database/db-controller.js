import { DB } from './db.js';
import { eventBus, EVENTS } from './event-bus.js';

/**
 * Database Controller - Handles all database operations and event bus subscriptions
 * Separates business logic from UI components
 */
export class DbController {
    constructor() {
        this.db = new DB(true); // Initialize DB with debug mode
        this.unsubscribeFunctions = [];
    }

    /**
     * Initialize the controller and set up event subscriptions
     */
    init() {
        this.setupEventSubscriptions();
        this.checkWorkerStatus();
    }

    /**
     * Set up event bus subscriptions for database operations
     */
    setupEventSubscriptions() {
        this.unsubscribeFunctions = [
            eventBus.subscribe(EVENTS.DB_INIT_REQUESTED, this.handleInitDb, this),
            eventBus.subscribe(EVENTS.DB_CLOSE_REQUESTED, this.handleCloseDb, this),
            eventBus.subscribe(EVENTS.DB_DROP_REQUESTED, this.handleDropDb, this)
        ];
    }

    /**
     * Clean up event subscriptions
     */
    cleanup() {
        if (this.unsubscribeFunctions) {
            this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
            this.unsubscribeFunctions = [];
        }
    }

    /**
     * Get the database instance
     */
    getDbInstance() {
        return this.db;
    }

    /**
     * Handle database initialization request
     */
    async handleInitDb(data) {
        const { dbName, dbVersion, collectionNames } = data;
        console.log(`[DB-CONTROLLER] Starting database initialization:`, { dbName, dbVersion, collectionNames });
        try {
            console.log(`[DB-CONTROLLER] Calling db.init()...`);
            await this.db.init(dbName, collectionNames, dbVersion);
            console.log(`[DB-CONTROLLER] Database initialization completed successfully`);
            
            console.log(`[DB-CONTROLLER] Updating worker status...`);
            this.checkWorkerStatus(); // Update worker status after init
            
            // Add a small delay to ensure database connection is fully stable
            console.log(`[DB-CONTROLLER] Waiting for database connection to stabilize...`);
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Publish success event with database instance and collections
            eventBus.publish(EVENTS.DB_INITIALIZED, {
                dbInstance: this.db,
                dbName,
                dbVersion,
                collectionNames
            });
            
            console.log(`[DB-CONTROLLER] All post-initialization tasks completed`);
        } catch (error) {
            console.error(`[DB-CONTROLLER] Error during database initialization:`, error);
            eventBus.publish(EVENTS.DB_INIT_FAILED, {
                error: error.message,
                dbName,
                dbVersion,
                collectionNames
            });
        }
    }

    /**
     * Handle database close request
     */
    async handleCloseDb() {
        try {
            await this.db.close();
            this.checkWorkerStatus();
            eventBus.publish(EVENTS.DB_CLOSED);
            console.log('Database connection closed.');
        } catch (error) {
            console.error('Error closing database connection:', error);
        }
    }

    /**
     * Handle database drop request
     */
    async handleDropDb() {
        try {
            await this.db.drop();
            this.checkWorkerStatus();
            eventBus.publish(EVENTS.DB_DROPPED);
            console.log('Database dropped successfully.');
        } catch (error) {
            console.error('Error dropping database:', error);
        }
    }

    /**
     * Check worker status and publish status change event
     */
    async checkWorkerStatus() {
        const isRunning = await this.db.isWorkerRunning();
        eventBus.publish(EVENTS.DB_WORKER_STATUS_CHANGED, { isRunning });
    }
}