// Service worker aplikacji "Wizja lokalna".
// UWAGA: po KAŻDEJ zmianie w index.html podbij numer w CACHE_NAME.
// Bez tego tablet zostanie na starej wersji i będziesz szukał błędu,
// którego dawno nie ma w kodzie.
const CACHE_NAME = 'wizja-v1';

const PLIKI = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c =>
    Promise.all(PLIKI.map(u => c.add(u).catch(() => null)))));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(x => x !== CACHE_NAME).map(x => caches.delete(x))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;          // zapytania inne niż GET przepuszczamy
  e.respondWith(
    fetch(e.request).then(odp => {
      if (odp && odp.ok && e.request.url.startsWith(self.location.origin)) {
        const kopia = odp.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, kopia)).catch(() => {});
      }
      return odp;
    }).catch(() => caches.match(e.request).then(x => x || caches.match('./index.html')))
  );
});
