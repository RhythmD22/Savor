const CACHE_NAME = 'savor-v1.0';

const urlsToCache = [
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
  '/Savor/manifest.json',
  '/Savor/icon.svg',
  '/Savor/icon-maskable.svg',
  '/Savor/favicon.ico',
  '/Savor/apple-touch-icon.png',
  '/Savor/apple-touch-icon-120x120.png',
  '/Savor/apple-touch-icon-152x152.png',
  '/Savor/apple-touch-icon-167x167.png',
  '/Savor/android-chrome-192x192.png',
  '/Savor/android-chrome-512x512.png',
  '/Savor/android-chrome-maskable-192x192.png',
  '/Savor/android-chrome-maskable-512x512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        urlsToCache.map(url => cache.add(url).catch(() => { }))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (event.request.url.includes('fonts.googleapis.com') || event.request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  if (event.request.url.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
      return cached || fetchPromise;
    })
  );
});
