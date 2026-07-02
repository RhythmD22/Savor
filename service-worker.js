const CACHE_NAME = 'savor-v1.0';

const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/css/index.css',
  '/css/recipes.css',
  '/css/recipe-detail.css',
  '/css/import.css',
  '/css/meal-log.css',
  '/css/health.css',
  '/css/conversions.css',
  '/js/bundle.js',
  '/manifest.json',
  '/icon.svg',
  '/icon-maskable.svg',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/apple-touch-icon-120x120.png',
  '/apple-touch-icon-152x152.png',
  '/apple-touch-icon-167x167.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/android-chrome-maskable-192x192.png',
  '/android-chrome-maskable-512x512.png',
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

function staleWhileRevalidate(request) {
  return caches.match(request).then(cached => {
    const fetchPromise = fetch(request).then(response => {
      if (response && response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
      }
      return response;
    }).catch(() => cached);
    return cached || fetchPromise;
  });
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com') || url.includes('cdn.jsdelivr.net')) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  if (url.includes('/api/')) return;

  event.respondWith(staleWhileRevalidate(event.request));
});