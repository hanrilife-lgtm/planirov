/* ============================================
   TASKFLOW · SERVICE WORKER
   ============================================ */

const CACHE_VERSION = 'taskflow-v3';
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
    'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];

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

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (!url.protocol.startsWith('http')) return;

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;

            return fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, copy).catch(() => null);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    if (request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    return new Response('', { status: 504, statusText: 'Offline' });
                });
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});