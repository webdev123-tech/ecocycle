/* EcoCycle service worker — auto-updating shell, offline-capable
   Strategy:
   - App shell (HTML) + app code (js/, css/): NETWORK-FIRST so a returning user
     always gets the latest deployed build when online, and the cache is only a
     fallback for offline. This prevents devices getting stuck on an old build.
   - Heavy, rarely-changing assets (vendor libs, AI model, icons, images):
     CACHE-FIRST for speed and offline.
   - /api + /uploads: never handled here (always live network).
   Bump CACHE on every release to evict the previous build everywhere. */
const CACHE = 'ecocycle-v6';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './css/styles.css',
  './js/app.js', './js/store.js', './js/ui.js', './js/maps.js', './js/charts.js',
  './js/views-core.js', './js/views-more.js', './js/api.js', './js/ai.js',
  './vendor/leaflet.css', './vendor/leaflet.js', './vendor/chart.umd.min.js',
  './vendor/marker-icon.png', './vendor/marker-icon-2x.png', './vendor/marker-shadow.png',
  './vendor/tf.min.js', './vendor/mobilenet.min.js',
  './vendor/mobilenet-model/model.json',
  './vendor/mobilenet-model/group1-shard1of4', './vendor/mobilenet-model/group1-shard2of4',
  './vendor/mobilenet-model/group1-shard3of4', './vendor/mobilenet-model/group1-shard4of4',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Let the page tell a waiting worker to take over immediately.
self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

function networkFirst(req) {
  return fetch(req).then(resp => {
    if (req.method === 'GET' && resp && resp.ok) {
      const clone = resp.clone();
      caches.open(CACHE).then(c => c.put(req, clone));
    }
    return resp;
  }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')));
}

function cacheFirst(req) {
  return caches.match(req).then(r => r || fetch(req).then(resp => {
    if (req.method === 'GET' && resp.ok && new URL(req.url).origin === location.origin) {
      const clone = resp.clone();
      caches.open(CACHE).then(c => c.put(req, clone));
    }
    return resp;
  }));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // API + uploads: always live network (never cached here)
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/uploads')) return;
  // Map tiles: network-first with cache fallback
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    e.respondWith(
      caches.open(CACHE + '-tiles').then(c =>
        fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => c.match(req))
      )
    );
    return;
  }
  const isAppCode = url.origin === location.origin &&
    (req.mode === 'navigate' || /\.(?:js|css)$/.test(url.pathname) ||
     url.pathname === '/' || url.pathname.endsWith('/index.html'));
  // App shell & code: network-first so updates always land. Everything else: cache-first.
  e.respondWith(isAppCode ? networkFirst(req) : cacheFirst(req));
});
