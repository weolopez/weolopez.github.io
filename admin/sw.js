const CACHE = 'admin-v3';

self.addEventListener('install', e => {
    self.skipWaiting();
    // No mandatory cache — don't block activation on a failed fetch
    e.waitUntil(Promise.resolve());
});

self.addEventListener('activate', e => {
    e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    if (e.request.url.includes('/admin/api/')) return;
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});

self.addEventListener('push', e => {
    if (!e.data) return;
    const d = e.data.json();
    e.waitUntil(
        self.registration.showNotification(d.title || 'Admin Alert', {
            body: d.body,
            icon: '/worldcup/icons/admin-icon-192.svg',
            badge: '/worldcup/icons/admin-icon-192.svg',
            tag: d.tag || 'admin-alert',
            data: { url: d.url || '/' },
        })
    );
});

self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(clients.openWindow(e.notification.data?.url || '/'));
});
