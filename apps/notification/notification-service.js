class Notification {
    constructor({
        sourceAppId,        // REQUIRED: 'finder', 'system', etc.
        title,             // REQUIRED: Main heading
        body,              // REQUIRED: Detailed message
        icon = null,       // Optional: URL or emoji. Falls back to app icon
        priority = 'medium', // 'low', 'medium', 'high', 'critical'
        actions = [],      // [{ label: 'Reply', actionId: 'reply-to-message' }]
        isSilent = false,  // If true, goes to history only, no banner
        canCoalesce = true, // If false, must be shown separately
        coalesceId = null, // Grouping key for similar notifications
        sound = true,      // Whether to play notification sound
        persistent = false // If true, requires manual dismissal
    }) {
        this.id = crypto.randomUUID();
        this.timestamp = Date.now();
        this.sourceAppId = sourceAppId;
        this.title = title;
        this.body = body;
        this.icon = icon;
        this.priority = priority;
        this.actions = actions;
        this.isSilent = isSilent;
        this.canCoalesce = canCoalesce;
        this.coalesceId = coalesceId || `${sourceAppId}-${title}`;
        this.sound = sound;
        this.persistent = persistent;
        this.isRead = false;
        this.isDismissed = false;
    }
}

class NotificationService {
    constructor() {
        this.registeredApps = new Map(); // appId -> { name, icon }
        this.activeNotifications = new Map(); // id -> Notification
        this.preferences = this.loadPreferences();
        this.isDoNotDisturb = false;
        this.cooldownMap = new Map(); // coalesceId -> timestamp
        
        this.initializeEventListeners();
        this.initializeErrorHandling();
    }

    initializeEventListeners() {
        document.addEventListener('create-notification', (e) => this.handleCreateNotification(e));
        document.addEventListener('app-launched', (e) => this.handleAppLaunched(e));
        //add generic custom 'run-code'
        document.addEventListener('PUBLISH_TEXT', (e) => this.handleAppLaunched(e));

    }

    initializeErrorHandling() {
        const originalConsoleError = console.error;
        console.error = (...args) => {
            originalConsoleError(...args);
            const errorMessage = args.map(arg => {
                if (arg instanceof Error) {
                    return arg.message;
                }
                return String(arg);
            }).join(' ');
            //if errorMessage is an object, stringify it
            if (typeof errorMessage === 'object') {
                errorMessage = JSON.stringify(errorMessage);
            }
            document.dispatchEvent(new CustomEvent('create-notification', {
                detail: {
                    sourceAppId: 'system',
                    title: 'System Error',
                    body: errorMessage,
                    priority: 'critical',
                }
            }));
        };
    }
    
    handleCreateNotification(event) {
        const notification = new Notification(event.detail);
        if (this.evaluateNotificationCriteria(notification)) {
            this.displayNotification(notification);
        }
        this.saveToHistory(notification);
    }

    handleAppLaunched(event) {
        const { appName, appIcon } = event.detail;
        if (appName && !this.registeredApps.has(appName)) {
            this.registeredApps.set(appName, { name: appName, icon: appIcon || '📄' });
            console.log(`NotificationService: Registered app "${appName}"`);
        }
        this.displayNotification(new Notification({
            sourceAppId: 'system',
            title: `App Launched: ${appName}`,
            body: `The app "${appName}" has been launched successfully.`,
            icon: appIcon || '📄',
            priority: 'low',
            isSilent: true,
            canCoalesce: false,
            coalesceId: `app-launch-${appName}`
        }));
    }

    evaluateNotificationCriteria(notification) {
        if (this.isDoNotDisturb) return false;
        if (notification.isSilent) return false;

        const appPrefs = this.preferences.appSettings[notification.sourceAppId];
        if (appPrefs && !appPrefs.enabled) return false;

        // Cooldown logic (e.g., 5 seconds)
        const now = Date.now();
        const lastTime = this.cooldownMap.get(notification.coalesceId);
        if (lastTime && (now - lastTime) < 5000) {
            console.log(`Cooldown active for: ${notification.coalesceId}`);
            return false;
        }
        this.cooldownMap.set(notification.coalesceId, now);

        return true;
    }

    displayNotification(notification) {
        console.log(`Displaying notification: "${notification.title}"`);
        document.dispatchEvent(new CustomEvent('show-notification-ui', {
            detail: { notification }
        }));
    }

    saveToHistory(notification) {
        // Placeholder for IndexedDB logic
        console.log(`Saving to history: "${notification.title}"`);
    }

    loadPreferences() {
        try {
            const prefs = localStorage.getItem('notification-preferences');
            return prefs ? JSON.parse(prefs) : this.getDefaultPreferences();
        } catch (e) {
            console.error("Failed to load notification preferences:", e);
            return this.getDefaultPreferences();
        }
    }

    savePreferences() {
        try {
            localStorage.setItem('notification-preferences', JSON.stringify(this.preferences));
        } catch (e) {
            console.error("Failed to save notification preferences:", e);
        }
    }

    getDefaultPreferences() {
        return {
            globalSettings: {
                doNotDisturb: false,
                globalSound: true,
            },
            appSettings: {
                system: { enabled: true, sound: true, priority: 'high' }
            }
        };
    }

    setDoNotDisturb(enabled) {
        this.isDoNotDisturb = enabled;
        this.preferences.globalSettings.doNotDisturb = enabled;
        this.savePreferences();
    }

    updateAppPreferences(appId, settings) {
        if (!this.preferences.appSettings[appId]) {
            this.preferences.appSettings[appId] = {};
        }
        Object.assign(this.preferences.appSettings[appId], settings);
        this.savePreferences();
    }
}

// Instantiate the service globally
window.notificationService = new NotificationService();