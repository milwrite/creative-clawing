// Service Worker — Creative Clawing
// Caches static shell assets for offline browsing.
// Data files (manifest, feed) are ALWAYS fetched from network — never cached here.
const CACHE = 'cc-v4';
const SHELL = [
  '/',
  '/index.html',
  '/gallery.html',
  '/microblogs.html',
  '/styles/shared.css',
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

  // Shell assets: cache-first with network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && SHELL.includes(url.pathname)) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
