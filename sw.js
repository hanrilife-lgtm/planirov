const CACHE_VERSION = 'taskflow-v16';
const CACHE_NAME = `${CACHE_VERSION}-static`;

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icons/favicon.ico',
    './icons/favicon.svg',
    './icons/favicon-96x96.png',
    './icons/apple-touch-icon.png',
    './icons/web-app-manifest-192x192.png',
    './icons/web-app-manifest-512x512.png'
];

const EXTERNAL_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];

/* ---------- INSTALL ---------- */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            await cache.addAll(PRECACHE_ASSETS).catch(err => {
                console.warn('Precache failed for some assets:', err);
            });
            await Promise.all(
                EXTERNAL_ASSETS.map(url =>
                    cache.add(new Request(url, { mode: 'no-cors' })).catch(() => null)
                )
            );
        }).then(() => self.skipWaiting())
    );
});

/* ---------- ACTIVATE ---------- */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter(key => key.startsWith('taskflow-') && key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

/* ---------- FETCH: Network First ---------- */
self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (!url.protocol.startsWith('http')) return;
    if (url.pathname.includes('/api/')) return;

    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, copy).catch(() => null);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(request).then((cached) => {
                    if (cached) return cached;
                    if (request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    return new Response('', { status: 504, statusText: 'Offline' });
                });
            })
    );
});

/* ---------- MESSAGE ---------- */
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, options } = event.data;
        self.registration.showNotification(title, {
            icon: './icons/web-app-manifest-192x192.png',
            badge: './icons/web-app-manifest-192x192.png',
            ...options
        });
    }
});

/* ---------- PUSH (заготовка на будущее) ---------- */
self.addEventListener('push', (event) => {
    let data = { title: 'TaskFlow', body: 'Напоминание' };
    try {
        if (event.data) data = event.data.json();
    } catch (e) {}

    event.waitUntil(
        self.registration.showNotification(data.title || 'TaskFlow', {
            body: data.body || 'Напоминание',
            icon: './icons/web-app-manifest-192x192.png',
            badge: './icons/web-app-manifest-192x192.png',
            tag: data.tag || 'taskflow',
            requireInteraction: false
        })
    );
});

/* ---------- NOTIFICATION CLICK ---------- */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('./');
            }
        })
    );
});
