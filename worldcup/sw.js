const CACHE = 'wc-v1';

self.addEventListener('install', e => {
    self.skipWaiting();
    e.waitUntil(Promise.resolve());
});

self.addEventListener('activate', e => {
    e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    if (e.request.url.includes('/worldcup/api/') || e.request.url.includes('/api/')) return;
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

self.addEventListener('push', e => {
    if (!e.data) return;
    const d = e.data.json();
    e.waitUntil(
        self.registration.showNotification(d.title || 'World Cup Alert', {
            body:  d.body,
            icon:  '/worldcup/icons/icon-192.svg',
            badge: '/worldcup/icons/icon-192.svg',
            tag:   d.tag || 'wc-alert',
            data:  { url: d.url || '/worldcup/' },
        })
    );
});

self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(clients.openWindow(e.notification.data?.url || '/worldcup/'));
});
