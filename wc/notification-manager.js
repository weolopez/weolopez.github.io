/**
 * NotificationManagerComponent
 * Handles browser native notifications based on a custom event 'show-notification'
 */
class NotificationManager extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.permission = Notification.permission;
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for custom event to show notification
        window.addEventListener('show-notification', (e) => {
            if (e.detail) {
                this.showNotification(e.detail);
            }
        });
    }

    async requestPermission() {
        const permission = await Notification.requestPermission();
        this.permission = permission;
        this.render();
        return permission;
    }

    async showNotification(data) {
        if (this.permission !== 'granted') {
            const permission = await this.requestPermission();
            if (permission !== 'granted') return;
        }

        const { title, body, icon, tag, data: extraData } = data;
        
        try {
            const notification = new Notification(title || 'Notification', {
                body: body || '',
                icon: icon || '/favicon.ico',
                tag: tag || 'default',
                data: extraData
            });

            notification.onclick = () => {
                window.focus();
                this.dispatchEvent(new CustomEvent('notification-clicked', {
                    detail: { notification, data: extraData },
                    bubbles: true,
                    composed: true
                }));
                notification.close();
            };

            
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: inline-block;
                font-family: system-ui, -apple-system, sans-serif;
            }
            .status-badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .granted { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
            .denied { background: #ffeeb; color: #c62828; border: 1px solid #ef9a9a; }
            .default { background: #e3f2fd; color: #1565c0; border: 1px solid #90caf9; }
            
            .dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
            }
            .granted .dot { background: #4caf50; }
            .denied .dot { background: #f44336; }
            .default .dot { background: #2196f3; }
        </style>
        `;

        // <div class="status-badge ${this.permission}" id="permission-btn">
        //     <span class="dot"></span>
        //     Notifications: ${this.permission.charAt(0).toUpperCase() + this.permission.slice(1)}
        // </div>
        // this.shadowRoot.getElementById('permission-btn').addEventListener('click', () => {
        //     if (this.permission === 'default') {
        //         this.requestPermission();
        //     }
        // });
    }
}

customElements.define('notification-manager', NotificationManager);
