/* ===============================================
   THRONG-WALLET // service worker (v1.3)
   - Network-first para HTML/CSS/JS (updates instantáneos)
   - Cache-first para sprites/fonts (raramente cambian)
   - Funciona offline con cache de fallback
   =============================================== */

const CACHE = 'thrungs-money-v1.3';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './sprites/A_think.gif',
  './sprites/A_happy.gif',
  './sprites/A_explain.gif',
  './sprites/A_skeptical.gif',
  './sprites/A_talk.gif',
  './sprites/C_talk.gif',
  './sprites/D_talk.gif',
  'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(err => console.warn('SW cache partial:', err)))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      ),
      self.clients.claim()
    ])
  );
});

function isCoreAsset(url) {
  return url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.html') ||
         url.pathname.endsWith('/') ||
         url.pathname === '';
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isHTMLNav = e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html');
  const isCore = isHTMLNav || isCoreAsset(url);

  if (isCore) {
    // NETWORK-FIRST para HTML/CSS/JS → updates instantáneos cuando hay internet
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // CACHE-FIRST para sprites/fonts → más rápidos y rara vez cambian
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }))
    );
  }
});

// El cliente puede pedirle al SW que se actualice
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
