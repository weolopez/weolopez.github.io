/**
 * Simple Event Bus for component communication
 * Allows components to publish and subscribe to events without direct coupling
 */
class EventBus {
    constructor() {
        this.events = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Name of the event to listen for
     * @param {Function} callback - Function to call when event is fired
     * @param {Object} context - Optional context to bind the callback to
     */
    subscribe(eventName, callback, context = null) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        
        const subscription = { callback, context };
        this.events.get(eventName).push(subscription);
        
        // Return unsubscribe function
        return () => {
            const subscribers = this.events.get(eventName);
            if (subscribers) {
                const index = subscribers.indexOf(subscription);
                if (index > -1) {
                    subscribers.splice(index, 1);
                }
            }
        };
    }

    /**
     * Publish an event
     * @param {string} eventName - Name of the event to publish
     * @param {any} data - Data to pass to subscribers
     */
    publish(eventName, data = null) {
        console.log(`[EVENT-BUS] Publishing event: ${eventName}`, data);
        
        const subscribers = this.events.get(eventName);
        if (!subscribers) {
            return;
        }

        subscribers.forEach(({ callback, context }) => {
            try {
                if (context) {
                    callback.call(context, data);
                } else {
                    callback(data);
                }
            } catch (error) {
                console.error(`[EVENT-BUS] Error in event handler for ${eventName}:`, error);
            }
        });
    }

    /**
     * Remove all subscribers for an event
     * @param {string} eventName - Name of the event to clear
     */
    clear(eventName) {
        this.events.delete(eventName);
    }

    /**
     * Remove all subscribers for all events
     */
    clearAll() {
        this.events.clear();
    }
}

// Create a global event bus instance
export const eventBus = new EventBus();

// Define standard event names
export const EVENTS = {
    DB_INIT_REQUESTED: 'db:init-requested',
    DB_INITIALIZED: 'db:initialized',
    DB_INIT_FAILED: 'db:init-failed',
    DB_CLOSE_REQUESTED: 'db:close-requested',
    DB_CLOSED: 'db:closed',
    DB_DROP_REQUESTED: 'db:drop-requested',
    DB_DROPPED: 'db:dropped',
    DB_WORKER_STATUS_CHANGED: 'db:worker-status-changed',
    COLLECTIONS_UPDATED: 'collections:updated',
    COLLECTION_DATA_CHANGED: 'collection:data-changed'
};