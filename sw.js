/* EcoCycle service worker — offline-first app shell */
const CACHE = 'ecocycle-v4';
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

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // API + uploads: always go to network (never cache dynamic data)
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/uploads')) return;
  // Map tiles: network-first, fall back gracefully (offline = blank tiles, app still works)
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    e.respondWith(
      caches.open(CACHE + '-tiles').then(c =>
        fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; }).catch(() => c.match(e.request))
      )
    );
    return;
  }
  // App assets: cache-first, then network
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      if (e.request.method === 'GET' && resp.ok && url.origin === location.origin) {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
