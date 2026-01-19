const CACHE_NAME = 'stonefire-v1';
const OFFLINE_URL = '/offline.html';

const ASSETS = [
  '/',
  '/index.html',
  '/privacy.html',
  '/terms.html',
  '/css/main.css',
  '/css/board.css',
  '/css/cards.css',
  '/js/main.js',
  '/assets/icons/triassic.svg'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll([...ASSETS, OFFLINE_URL]))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request).then(fetchResp => {
      return caches.open(CACHE_NAME).then(cache => {
        cache.put(event.request, fetchResp.clone());
        return fetchResp;
      });
    })).catch(() => caches.match(OFFLINE_URL))
  );
});