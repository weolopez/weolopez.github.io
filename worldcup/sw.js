self.addEventListener('push', e => {
    if (!e.data) return;
    const data = e.data.json();
    e.waitUntil(
        self.registration.showNotification(data.title || 'WC 2026', {
            body: data.body || '',
            icon: '/worldcup/icons/icon-192.png',
            badge: '/worldcup/icons/icon-192.png',
            image: data.image || '/worldcup/icons/icon-192.png',
            data: { url: data.url || '/worldcup/' },
            vibrate: [300, 100, 300, 100, 600],
            requireInteraction: true,
            tag: data.tag || 'wc2026',
            renotify: true,
        })
    );
});

self.addEventListener('notificationclick', e => {
    e.notification.close();
    const url = e.notification.data?.url || '/worldcup/';
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
            const existing = cs.find(c => c.url.includes('/worldcup/'));
            if (existing) { existing.focus(); existing.navigate(url); }
            else clients.openWindow(url);
        })
    );
});
