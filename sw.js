// Výdaje — offline režim. Při změně souborů zvedni číslo verze.
const VERSION = 'vydaje-v2-7';
const CORE = ['./', 'index.html', 'styles/app.css', 'src/app.js', 'src/cloud.js', 'src/vydaje-data.js', 'manifest.webmanifest',
  'assets/fonts/geist-latin-wght-normal.woff2', 'assets/fonts/geist-latin-ext-wght-normal.woff2',
  'assets/icon-192.png', 'assets/icon-512.png', 'assets/bg/kobalt.webp'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
// Nejdřív síť (aby se projevily nové verze), při výpadku mezipaměť.
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  event.respondWith(fetch(request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(VERSION).then(cache => cache.put(request, copy)); }
    return response;
  }).catch(() => caches.match(request).then(hit => hit || caches.match('index.html'))));
});
