// Service Worker — Creative Clawing
// Caches static shell assets for offline browsing.
// Data files (manifest, feed) are ALWAYS fetched from network — never cached here.
const CACHE = 'cc-v10';
const SHELL = [
  '/',
  '/index.html',
  '/gallery.html',
  '/microblogs.html',
  '/styles/shared.css',
  '/scripts/preview-cards.js',
  '/favicon.ico',
  '/favicon.png',
  '/apple-touch-icon.png',
];

// These paths are always served fresh from the network — never from cache.
const NEVER_CACHE = [
  '/data/feed.json',
  '/data/manifest-v2.json',
  '/data/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // Data files: always network-first, never serve from cache
  if (NEVER_CACHE.includes(url.pathname)) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }

  // Artifact preview images: cache after first request so card previews stay
  // fast across gallery filters, homepage cards, and repeat visits.
  if (url.pathname.startsWith('/assets/previews/')) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const fresh = fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || fresh;
        })
      )
    );
    return;
  }

  const isShell = SHELL.includes(url.pathname);

  if (isShell) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
