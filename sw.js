// Keeps the app working with no signal. Pages load from the phone's cache instantly,
// then quietly refresh in the background so updates show up on the next open.
const CACHE = 'budget-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './budget-sans.woff2',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;                       // syncing with the Sheet is a POST: never cached
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // only this app's own files

  const network = fetch(req)
    .then(async res => {
      if (res && res.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(req, res.clone());
      }
      return res;
    })
    .catch(() => null);
  event.waitUntil(network);

  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    const res = await network;
    if (res) return res;
    if (req.mode === 'navigate') {
      const shell = (await caches.match('./index.html')) || (await caches.match('./'));
      if (shell) return shell;
    }
    return Response.error();
  })());
});
