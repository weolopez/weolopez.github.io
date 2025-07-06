class NotificationPreferencesComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.notificationService = window.notificationService;
        this.render();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        if (!this.notificationService) {
            this.shadowRoot.innerHTML = `<p>Error: NotificationService not found.</p>`;
            return;
        }

        const { globalSettings } = this.notificationService.preferences;
        const registeredApps = this.notificationService.registeredApps;

        let appSettingsHtml = '';
        registeredApps.forEach((app, appId) => {
            const appPrefs = this.notificationService.preferences.appSettings[appId] || { enabled: true, sound: true };
            appSettingsHtml += `
                <div class="app-row">
                    <span class="app-name">${app.name}</span>
                    <div class="app-controls">
                        <label class="switch">
                            <input type="checkbox" data-app-id="${appId}" data-setting="enabled" ${appPrefs.enabled ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            `;
        });

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    padding: 20px;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                h2 {
                    font-size: 18px;
                    margin-top: 0;
                }
                .section {
                    margin-bottom: 20px;
                }
                .setting-row, .app-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                    border-bottom: 1px solid #e0e0e0;
                }
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 40px;
                    height: 24px;
                }
                .switch input { 
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #ccc;
                    transition: .4s;
                    border-radius: 24px;
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }
                input:checked + .slider {
                    background-color: #2196F3;
                }
                input:checked + .slider:before {
                    transform: translateX(16px);
                }
            </style>
            <div class="container">
                <h2>Notifications</h2>
                <div class="section">
                    <h3>Global Settings</h3>
                    <div class="setting-row">
                        <span>Do Not Disturb</span>
                        <label class="switch">
                            <input type="checkbox" id="dnd-toggle" ${globalSettings.doNotDisturb ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                <div class="section">
                    <h3>Application Settings</h3>
                    ${appSettingsHtml}
                </div>
            </div>
        `;

        this.addEventListeners();
    }

    addEventListeners() {
        this.shadowRoot.querySelector('#dnd-toggle').addEventListener('change', (e) => {
            this.notificationService.setDoNotDisturb(e.target.checked);
        });

        this.shadowRoot.querySelectorAll('.app-controls input[type="checkbox"]').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const { appId, setting } = e.target.dataset;
                this.notificationService.updateAppPreferences(appId, { [setting]: e.target.checked });
            });
        });
    }
}

customElements.define('notification-preferences-component', NotificationPreferencesComponent);