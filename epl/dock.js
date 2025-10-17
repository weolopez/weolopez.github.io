export const APPS = [
    {
        id: 'soccer-prediction',
        name: 'EPL Prediction',
        icon: '⚽',
        sourceUrl: '/wc/prediction-table.js',
        tag: "prediction-table",
        onstartup: true
    }
];

    // { id: 'finder', name: 'Finder', icon: '📁', sourceUrl: 'https://weolopez.com/desktop/src/apps/finder/finder-webapp.js' },
    // { id: 'textedit', name: 'TextEdit', icon: '📝' },
    // { id: 'safari', name: 'Safari', icon: '🧭' },
    // { id: 'system-preferences', name: 'System Preferences', icon: '⚙️' },
    // { id: 'activity-monitor', name: 'Activity Monitor', icon: '📊' },
export const APP_URL_MAP = new Map(
    APPS.filter(app => app.sourceUrl).map(app => [`${app.id}-webapp`, app.sourceUrl])
);