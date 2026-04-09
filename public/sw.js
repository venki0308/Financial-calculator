// FinCalix Service Worker — offline-first
// Strategy:
//  • HTML/index → network-first (so new deploys are picked up immediately)
//  • Hashed JS/CSS chunks → cache-first (immutable filenames, safe forever)
//  • Other static assets (icons, og-image, manifest) → cache-first
//  • Everything else → network-first with cache fallback
//
// IMPORTANT: bump CACHE_NAME on any release that fixes bugs users have
// already reported. The activate step deletes any cache whose name does
// NOT match the current value, forcing a clean re-fetch of every asset
// across every device. Without this, hashed chunks pinned by the SW
// could keep an old buggy build alive on a user's device for days even
// after a successful deploy.
const CACHE_NAME = 'fincalix-v14';
const APP_SHELL = [
    '/',
    '/index.html',
    '/manifest.json',
    '/og-image.png',
    '/icons/fincalix-logo.png',
];

// ── INSTALL: cache the app shell ──────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            // Best-effort: skip files that fail (e.g. 404)
            Promise.all(
                APP_SHELL.map((url) =>
                    cache.add(url).catch((err) =>
                        console.warn('[SW] Failed to cache', url, err)
                    )
                )
            )
        )
    );
    self.skipWaiting();
});

// ── ACTIVATE: drop old caches ─────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// ── FETCH: smart strategy per resource type ───────────────────
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (event.request.url.startsWith('chrome-extension')) return;

    const url = new URL(event.request.url);

    // Skip cross-origin (Firebase, GitHub config, fonts) — let network handle them
    if (url.origin !== self.location.origin) return;

    // ── Hashed JS/CSS chunks → cache-first (immutable) ──────
    const isHashedAsset = url.pathname.startsWith('/assets/') &&
        (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'));
    if (isHashedAsset) {
        event.respondWith(
            caches.match(event.request).then((cached) =>
                cached ||
                fetch(event.request).then((response) => {
                    if (response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                }).catch(() => caches.match('/index.html'))
            )
        );
        return;
    }

    // ── Static images / icons / fonts → cache-first ─────────
    const isStatic =
        url.pathname.startsWith('/icons/') ||
        url.pathname.startsWith('/screenshots/') ||
        url.pathname === '/og-image.png' ||
        url.pathname === '/manifest.json' ||
        /\.(png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname);
    if (isStatic) {
        event.respondWith(
            caches.match(event.request).then((cached) =>
                cached ||
                fetch(event.request).then((response) => {
                    if (response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                }).catch(() => undefined)
            )
        );
        return;
    }

    // ── HTML / everything else → network-first with cache fallback ──
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.status === 200 && event.request.headers.get('accept')?.includes('text/html')) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() =>
                caches.match(event.request).then((cached) => cached || caches.match('/index.html'))
            )
    );
});
