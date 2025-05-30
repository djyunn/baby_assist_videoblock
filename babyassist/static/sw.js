
const CACHE_NAME = 'baby-video-player-v1';
const urlsToCache = [
  '/',
  '/static/style.css',
  '/static/app.js',
  '/static/admin.js',
  '/static/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에 있으면 캐시에서 반환, 없으면 네트워크에서 가져오기
        return response || fetch(event.request);
      }
    )
  );
});
