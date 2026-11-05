/* Brew Console (app3) · service worker.
   Alleen voor /app3/ (eigen scope; de oude app houdt zijn eigen worker).
   - Bij installatie gaat de hele app in een cache met een versie die uit de inhoud van de bestanden komt.
   - Navigaties binnen de scope krijgen index.html uit de cache (de app start dus ook zonder netwerk).
   - Overige verzoeken: cache eerst, anders netwerk; wat van een andere herkomst komt, blijft buiten beeld.
   - Een nieuwe versie wacht tot de gebruiker vernieuwt (nooit midden in een zetsel): de pagina stuurt dan 'activate'. */
const VERSION = '__VERSION__';
const CACHE = `brewconsole-app3-${VERSION}`;
const PRECACHE = __PRECACHE__;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('brewconsole-app3-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'activate') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (req.mode === 'navigate') return (await cache.match('index.html')) ?? fetch(req);
    return (await cache.match(req, { ignoreSearch: true })) ?? fetch(req);
  })());
});
