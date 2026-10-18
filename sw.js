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
   - Navigatie (het opstarten van de app) -> K22: cache eerst. De app start
     altijd meteen vanaf de cache, ook op trage keukenwifi (eerst wachtte
     hij tot 3 s op het netwerk). Tegelijk haalt de worker op de achtergrond
     de nieuwste versie op; is die anders, dan bewaart hij hem en meldt hij
     het aan de app, die "Nieuwe versie" toont (niet tijdens een brouwsel).
     Een tik op "Vernieuwen" laadt hem. Zonder cache (de allereerste start)
     gaat het gewoon via het netwerk.
   - Al het overige -> cache eerst. In de praktijk is dat weinig, omdat
     de app één HTML-bestand met ingebedde assets is; het vangt het
     manifest, het icoon en later eventuele losse bestanden af.

   BEWUST GEEN skipWaiting()
   Een nieuwe worker neemt pas over bij een koude start, nooit midden in
   een lopende brouw. Een nieuwe HTML komt ook nooit vanzelf: alleen na een
   tik op "Vernieuwen", of bij de volgende start.

   CACHE_VERSION
   Staat op 4 sinds K22 (cache eerst voor het opstarten). Op 3 sinds de vijf roastfoto's weg zijn (VA-47): zo verdwijnt hun
   ±0,9 MB ook uit de cache van wie de app al had. Op 2 kwamen de foto's
   bij installatie in de cache (PHOTOS).
   Hoeft alleen omhoog als de strategie in DIT bestand verandert, of als
   je een oude cache geforceerd wilt weggooien. Voor gewone inhouds-
   wijzigingen aan index.html is ophogen niet nodig — die haalt de
   achtergrondverversing hierboven op.
   ============================================================ */

const CACHE_VERSION = 4;
const CACHE = 'brew-console-v' + CACHE_VERSION;

/* De app-shell is de scope-root zelf. Bij een manifest met
   "start_url": "./" is dit exact de URL waarmee de app vanaf het
   beginscherm wordt gestart, dus de cachesleutel komt altijd overeen. */
const APP_SHELL = './';

/* Hoe lang we op het netwerk wachten voordat we naar de cache vallen.
   Kort genoeg om niet te blijven hangen op wifi die wel verbonden is
   maar niets doorlaat, lang genoeg voor een normale mobiele verbinding. */
const NET_TIMEOUT_MS = 3000;

/* Alle foto's uit photos/, vooraf opgehaald bij installatie (±0,9 MB), zodat
   de app ook offline compleet is. Bonen en roastkaarten tonen sinds VA-47 een
   kleurstaal, geen foto. Een test bewaakt dat deze lijst gelijk blijft aan de
   map photos/. */
const PHOTOS = [
  'photos/brew-chemex-square.webp',
  'photos/brew-chemex-tall.webp',
  'photos/brew-v60-square.webp',
  'photos/brew-v60-tall.webp',
  'photos/home-hero.webp',
  'photos/koper-geborsteld-breed.webp',
  'photos/koper-geborsteld.webp',
  'photos/logbook-empty.webp',
  'photos/method-chemex.webp',
  'photos/method-v60.webp',
  'photos/splash-tall.webp',
  'photos/splash-wide.webp'
];

/* K4: het manifest en de app-iconen staan sinds de installeerbaarheidsfix als losse bestanden
   naast index.html (een data:-manifest kan geen start_url hebben). Ze horen bij de offline app. */
const SHELL_FILES = [
  'manifest.webmanifest',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
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
       cacheFirst() zodra hij een keer is opgevraagd. Ook hier
       cache:'reload' (R24): een opnieuw bewerkte foto met dezelfde naam
       komt zo bij de volgende installatie mee, niet een oude uit de
       HTTP-cache. */
    await Promise.allSettled(PHOTOS.concat(SHELL_FILES).map((url) => cache.add(new Request(url, { cache: 'reload' }))));
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
    event.respondWith(cacheFirstShell(event));
    return;
  }
  event.respondWith(cacheFirst(request));
});

/* K22: start vanaf de cache; ververs op de achtergrond. updateReady blijft staan tot een start
   de nieuwe versie uit de cache serveert, zodat een app die later vraagt het ook nog hoort. */
let updateReady = false;
async function cacheFirstShell(event) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(APP_SHELL);
  if (cached) {
    updateReady = false; // wat nu geserveerd wordt, is de nieuwste versie die de cache kent
    event.waitUntil(refreshShell(cache, event.request.url).catch(() => {}));
    return cached;
  }
  try {
    const response = await fetchWithTimeout(event.request, NET_TIMEOUT_MS);
    if (response && response.ok) cache.put(APP_SHELL, response.clone());
    return response;
  } catch (e) {
    const fallback = await cache.match(event.request);
    return fallback || Response.error();
  }
}
async function refreshShell(cache, url) {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response || !response.ok) return;
  const cached = await cache.match(APP_SHELL);
  const [oldText, newText] = await Promise.all([cached ? cached.text() : Promise.resolve(null), response.clone().text()]);
  if (oldText === newText) return;
  await cache.put(APP_SHELL, response);
  if (oldText === null) return;
  updateReady = true;
  await notifyUpdate();
}
async function notifyUpdate() {
  const all = await self.clients.matchAll({ type: 'window' });
  all.forEach((c) => c.postMessage({ type: 'brewconsole-update-ready' }));
}
// De app vraagt bij het opstarten of er al een nieuwe versie klaarstaat (het bericht hierboven kan
// eerder verstuurd zijn dan de app luisterde).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'brewconsole-ask-update' && updateReady && event.source) {
    event.source.postMessage({ type: 'brewconsole-update-ready' });
  }
});

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
