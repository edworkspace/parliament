const CACHE_NAME = 'pulse-check-v1';
const urlsToCache = [
  '/parliament/',
  '/parliament/index.html',
  '/parliament/style.css',
  '/parliament/script.js',
  '/parliament/manifest.json',
  '/parliament/icon-192.png',
  '/parliament/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
});