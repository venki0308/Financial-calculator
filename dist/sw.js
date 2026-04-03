const CACHE_NAME = 'fincalix-v4';
const STATIC_ASSETS = [
    '/',
    '/index.html',
];

// Install: cache app shell, activate immediately
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate: clean ALL old caches so stale chunks are purged
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: network-first, but NEVER cache JS/CSS chunks (they have hashed names)
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension')) return;

    const url = new URL(event.request.url);
    const isChunk = url.pathname.startsWith('/assets/') &&
        (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'));

    if (isChunk) {
        // JS/CSS chunks: network-only, no caching (hashed filenames change on each build)
        event.respondWith(fetch(event.request));
        return;
    }

    // Everything else: network-first with cache fallback
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
