// Play Padel · Service Worker
const CACHE = 'playpadel-v37';
const PRECACHE = [
  '/playpadelcoop/',
  '/playpadelcoop/index.html',
  '/playpadelcoop/calendario.html',
  '/playpadelcoop/classificacoes.html',
  '/playpadelcoop/fasefinal.html',
  '/playpadelcoop/jogadores.html',
  '/playpadelcoop/inscricoes.html',
  '/playpadelcoop/inscritos.html',
  '/playpadelcoop/estatisticas.html',
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

// Assets that rarely change — cache-first is fine
const STATIC_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.ico', '.woff', '.woff2', '.ttf'];

// Install: pre-cache shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches + claim all clients immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
//   • data.json          → network-first (live results, no stale)
//   • HTML / CSS / JS    → network-first with cache fallback (always latest code)
//   • images/fonts       → cache-first (stable assets)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const path = url.pathname;
  const ext  = path.substring(path.lastIndexOf('.'));

  // Skip non-GET and cross-origin requests
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Admin must always be fresh (avoid stale sidebar/features from cache)
  const isAdminRequest =
    path === '/playpadelcoop/admin' ||
    path === '/playpadelcoop/admin.html' ||
    path.endsWith('/js/data.js') ||
    path.endsWith('/js/admin.js') ||
    path.endsWith('/js/auth.js');
  if (isAdminRequest) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Network-first: data.json + HTML + CSS + JS
  const isNetworkFirst =
    path.endsWith('data.json') ||
    path.endsWith('.html') || path === '/playpadelcoop/' ||
    path.endsWith('.css') ||
    path.endsWith('.js');

  if (isNetworkFirst) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first: images, fonts, other static assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
