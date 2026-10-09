/* ============================================================
   BREW CONSOLE — OFFLINE SERVICE WORKER
   ============================================================

   WAAROM DIT EEN APART BESTAND IS
   De vorige opzet registreerde de worker vanaf een blob:-URL, om de app
   één zelfstandig HTML-bestand te houden. Dat kan niet: volgens de
   Service Worker-spec moet het script een http:- of https:-URL zijn, en
   een blob:-URL levert gegarandeerd een TypeError op. De registratie
   faalde daardoor stil (alleen een console.warn) en er is nooit iets
   gecachet. Dit bestand hoort naast index.html in de Netlify-map te
   staan; dat kost het single-file-principe niets, want zonder webserver
   (file://) is een service worker sowieso onmogelijk.

   STRATEGIE
   - Navigatie (het opstarten van de app) -> netwerk eerst, met een korte
     time-out, en anders de cache. Online krijg je dus altijd meteen de
     nieuwste deploy; offline of op trage keukenwifi start de app door
     vanaf de cache in plaats van te blijven hangen.
   - Al het overige -> cache eerst. In de praktijk is dat weinig, omdat
     de app één HTML-bestand met ingebedde assets is; het vangt het
     manifest, het icoon en later eventuele losse bestanden af.

   BEWUST GEEN skipWaiting()
   Een nieuwe worker neemt pas over bij een koude start, nooit midden in
   een lopende brouw. Voor de inhoud maakt dat niets uit: de HTML komt
   online toch al vers van het netwerk.

   CACHE_VERSION
   Staat op 2 sinds de foto's bij installatie worden voorgeladen (PHOTOS).
   Hoeft alleen omhoog als de strategie in DIT bestand verandert, of als
   je een oude cache geforceerd wilt weggooien. Voor gewone inhouds-
   wijzigingen aan index.html is ophogen niet nodig — die worden door de
   netwerk-eerst-regel hierboven al opgehaald.
   ============================================================ */

const CACHE_VERSION = 2;
const CACHE = 'brew-console-v' + CACHE_VERSION;

/* De app-shell is de scope-root zelf. Bij een manifest met
   "start_url": "./" is dit exact de URL waarmee de app vanaf het
   beginscherm wordt gestart, dus de cachesleutel komt altijd overeen. */
const APP_SHELL = './';

/* Hoe lang we op het netwerk wachten voordat we naar de cache vallen.
   Kort genoeg om niet te blijven hangen op wifi die wel verbonden is
   maar niets doorlaat, lang genoeg voor een normale mobiele verbinding. */
const NET_TIMEOUT_MS = 3000;

/* Alle foto's uit photos/, vooraf opgehaald bij installatie (±1,7 MB), zodat
   de app ook offline compleet is: de brandingsfoto van een boon die je nog
   niet had geopend zit er dan al in. Een test bewaakt dat deze lijst gelijk
   blijft aan de map photos/. */
const PHOTOS = [
  'photos/brew-chemex-square.webp',
  'photos/brew-chemex-tall.webp',
  'photos/brew-v60-square.webp',
  'photos/brew-v60-tall.webp',
  'photos/home-hero.webp',
  'photos/logbook-empty.webp',
  'photos/method-chemex.webp',
  'photos/method-v60.webp',
  'photos/roast-dark.webp',
  'photos/roast-light.webp',
  'photos/roast-light_medium.webp',
  'photos/roast-medium.webp',
  'photos/roast-medium_dark.webp',
  'photos/splash-tall.webp',
  'photos/splash-wide.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    /* cache:'reload' omzeilt de HTTP-cache, zodat we bij install
       gegarandeerd de zojuist gedeployde versie opslaan. De app-shell
       moet lukken; lukt dat niet, dan mislukt de installatie. */
    await cache.add(new Request(APP_SHELL, { cache: 'reload' }));
    /* De foto's halen we er best-effort bij: een foto die even niet
       laadt mag de installatie niet breken, die komt dan alsnog via
       cacheFirst() zodra hij een keer is opgevraagd. */
    await Promise.allSettled(PHOTOS.map((url) => cache.add(url)));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      ))
      /* claim() zorgt dat de allereerste installatie de huidige pagina
         meteen beschermt; zonder skipWaiting gebeurt dit alleen wanneer
         er nog geen andere worker de controle heeft. */
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  /* Alleen eigen origin. Mocht er ooit iets extern geladen worden, dan
     laten we dat bewust langs de worker gaan in plaats van het stil in
     een offline cache te trekken. */
  let sameOrigin = false;
  try {
    sameOrigin = new URL(request.url).origin === self.location.origin;
  } catch (e) {
    sameOrigin = false;
  }
  if (!sameOrigin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetchWithTimeout(request, NET_TIMEOUT_MS);
    if (response && response.ok) {
      /* Altijd onder de vaste APP_SHELL-sleutel opslaan, zodat een start
         met bijvoorbeeld een query-parameter dezelfde cache vult en
         leest in plaats van een tweede kopie aan te maken. */
      cache.put(APP_SHELL, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await cache.match(APP_SHELL);
    if (cached) return cached;
    const fallback = await cache.match(request);
    if (fallback) return fallback;
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

function fetchWithTimeout(request, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(request, { signal: controller.signal })
    .finally(() => clearTimeout(timer));
}
