// Play Padel · Service Worker
const CACHE = 'playpadel-v2';
const PRECACHE = [
  '/playpadelcoop/',
  '/playpadelcoop/index.html',
  '/playpadelcoop/calendario.html',
  '/playpadelcoop/classificacoes.html',
  '/playpadelcoop/fasefinal.html',
  '/playpadelcoop/jogadores.html',
  '/playpadelcoop/regulamento.html',
  '/playpadelcoop/manifest.json',
  '/playpadelcoop/icon-192.png',
  '/playpadelcoop/icon-512.png',
  '/playpadelcoop/css/style.css',
  '/playpadelcoop/css/pages.css',
  '/playpadelcoop/js/data.js',
  '/playpadelcoop/js/app.js',
  '/playpadelcoop/playpadellogo.jpg',
];

// Install: pre-cache shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for data.json (live results), cache-first for everything else
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always fetch data.json live (tournament results)
  if (url.pathname.endsWith('data.json')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
