class NotificationDisplayComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.activeNotifications = new Map();
        this.render();
        document.addEventListener('show-notification-ui', (e) => this.showNotification(e.detail.notification));
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    top: 40px; /* Below menu bar */
                    right: 20px;
                    z-index: 10000;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    align-items: flex-end;
                }
                .notification-item {
                    width: 320px;
                    background-color: rgba(240, 240, 240, 0.8);
                    backdrop-filter: blur(10px);
                    border-radius: 12px;
                    padding: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    display: flex;
                    gap: 10px;
                    animation: slideIn 0.3s ease-out;
                    transform-origin: top right;
                }
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                .notification-item.closing {
                    animation: slideOut 0.3s ease-in forwards;
                }
                @keyframes slideOut {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                }
                .icon {
                    font-size: 24px;
                    flex-shrink: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .content {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    flex-grow: 1;
                }
                .title {
                    font-weight: bold;
                    font-size: 14px;
                    color: #333;
                }
                .body {
                    font-size: 13px;
                    color: #555;
                }
                .actions {
                    margin-top: 8px;
                    display: flex;
                    gap: 8px;
                    justify-content: flex-end;
                }
                .action-button {
                    background-color: rgba(200, 200, 200, 0.7);
                    border: none;
                    border-radius: 6px;
                    padding: 4px 10px;
                    font-size: 12px;
                    cursor: pointer;
                }
                .action-button:hover {
                    background-color: rgba(180, 180, 180, 0.9);
                }
            </style>
        `;
    }

    showNotification(notification) {
        const item = this.createNotificationItem(notification);
        this.shadowRoot.appendChild(item);
        this.activeNotifications.set(notification.id, item);

        if (!notification.persistent) {
            setTimeout(() => this.dismissNotification(notification.id), 5000);
        }
    }

    createNotificationItem(notification) {
        const item = document.createElement('div');
        item.className = 'notification-item';
        item.dataset.id = notification.id;

        const iconHtml = `<div class="icon">${notification.icon || '🔔'}</div>`;
        
        let actionsHtml = '';
        if (notification.actions && notification.actions.length > 0) {
            actionsHtml = '<div class="actions">';
            notification.actions.forEach(action => {
                actionsHtml += `<button class="action-button" data-action-id="${action.actionId}">${action.label}</button>`;
            });
            actionsHtml += '</div>';
        }

        item.innerHTML = `
            ${iconHtml}
            <div class="content">
                <div class="title">${notification.title}</div>
                <div class="body">${notification.body}</div>
                ${actionsHtml}
            </div>
        `;

        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('action-button')) {
                // Handle action click
                console.log(`Action clicked: ${e.target.dataset.actionId}`);
            } else {
                // Handle notification click
                console.log(`Notification clicked: ${notification.id}`);
            }
            this.dismissNotification(notification.id);
        });

        return item;
    }

    dismissNotification(id) {
        const item = this.activeNotifications.get(id);
        if (item && !item.classList.contains('closing')) {
            item.classList.add('closing');
            item.addEventListener('animationend', () => {
                item.remove();
                this.activeNotifications.delete(id);
            });
        }
    }
}

customElements.define('notification-display-component', NotificationDisplayComponent);