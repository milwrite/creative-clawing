// Service Worker — Creative Clawing
// Caches shell assets for offline browsing.
const CACHE = 'cc-v2';
const SHELL = [
  '/',
  '/index.html',
  '/gallery.html',
  '/styles/shared.css',
  '/data/feed.json',
  '/favicon.ico',
  '/favicon.png',
  '/apple-touch-icon.png',
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
  // Only cache GET requests; pass through everything else
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Don't cache cross-origin requests
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // Cache successful responses for shell assets only
        if (res.ok && SHELL.includes(url.pathname)) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached); // offline fallback
    })
  );
});
