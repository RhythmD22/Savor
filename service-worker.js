const CACHE_NAME = 'savor-v2';
const ASSETS = [
  '/Savor/',
  '/Savor/index.html',
  '/Savor/css/styles.css',
  '/Savor/css/index.css',
  '/Savor/css/recipes.css',
  '/Savor/css/recipe-detail.css',
  '/Savor/css/import.css',
  '/Savor/css/meal-log.css',
  '/Savor/css/health.css',
  '/Savor/js/bundle.js',
  '/Savor/icon.svg',
  '/Savor/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
      return cached || fetched;
    })
  );
});
