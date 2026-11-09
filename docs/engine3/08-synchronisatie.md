# 08 · Synchronisatie (eerste bouwstap)

Besluit Jelle (5 nov 2026): de synchronisatie komt als eerste in het bouwplan.

De toestelcheck laat zien dat iOS de opslag van de app niet als blijvend aanmerkt (`persist` niet toegekend, ook niet vanaf het beginscherm). Het logboek mag dus nooit alleen op de iPhone staan. Rechtstreeks koppelen aan iCloud kan niet: CloudKit vraagt een betaald Apple-ontwikkelaarsaccount, en Safari laat een web-app niet zelf in iCloud Drive schrijven.

## Opzet

Twee lagen:

1. **Automatisch:** een eigen, gratis Cloudflare Worker die alleen versleutelde blokken bewaart.
2. **Reserve:** het back-upbestand via het deelmenu naar iCloud Drive, met een herinnering. Dit blijft zoals het nu is.

## Hoe het werkt

- **Sleutel:** uit een wachtwoordzin die alleen Jelle kent, via PBKDF2-SHA-256 (minstens 600.000 rondes) met een vaste zout per logboek. De sleutel verlaat het toestel nooit.
- **Versleutelen:** AES-GCM-256, een nieuwe willekeurige IV per blok. Toestel-id, blok-id en schemaversie gaan mee als 'additional data', zodat een blok niet ongemerkt verwisseld kan worden.
- **Blokken:** nieuwe gebeurtenissen sinds de laatste synchronisatie vormen één blok. De blok-id is deterministisch (toestel + volgnummer), zodat opnieuw versturen geen dubbelen geeft.
- **Samenvoegen:** blokken ophalen, ontsleutelen en `mergeLogs` gebruiken. Het logboek is alleen-aanvullen met vaste id's, dus de volgorde van binnenkomst maakt niet uit.
- **Compacteren:** af en toe één momentopname van het hele logboek, waarna oudere blokken weg mogen. Dat houdt het herstellen op een nieuw toestel snel.
- **Toegang:** de Worker kent een toegangstoken per toestel (als geheim opgeslagen, intrekbaar). Zonder geldig token komt er niets binnen en niets buiten.
- **Wat de Worker ziet:** alleen blok-id's, groottes en tijdstippen. Geen inhoud.

## Waar het staat

De engine zelf blijft zuiver (geen netwerk, geen opslag; zie 02). De synchronisatie wordt een aparte laag:

| Deel | Plaats | Inhoud |
|---|---|---|
| Versleuteling en blokken | `engine3/sync/crypto.ts`, `engine3/sync/blocks.ts` | sleutel afleiden, in- en uitpakken, blokken maken en samenvoegen; WebCrypto en toeval worden meegegeven |
| Server | `engine3/sync/server.ts` | `Request` → `Response`, opslag als interface; geheugenopslag voor tests, Cloudflare-opslag in de ingang |
| Client | `engine3/sync/client.ts` | push en pull; `fetch` en toestand worden meegegeven, dus testbaar zonder netwerk |

Routes: `POST /scan` (foto-herkenning, alleen met `ANTHROPIC_API_KEY`, zie 16), `GET/PUT /meta` (het zout, niet geheim), `PUT/GET/DELETE /blocks/:id`, `GET /photos` en `PUT/GET/DELETE /photos/:id` (foto's, zie hieronder), `GET /blocks?after=`. Een blok is onveranderlijk: hetzelfde id met andere inhoud geeft 409.

## Tests

- Versleutelen en ontsleutelen geven het origineel terug; een verkeerde wachtwoordzin, een gewijzigd blok of verwisselde additional data faalt.
- Eigenschapstest (fast-check): twee toestellen die in willekeurige volgorde pushen en pullen, komen op hetzelfde logboek uit.
- De Worker wordt in Node getest met een nep-opslag (standaard `Request`/`Response`), dus zonder Cloudflare-account.

## Grenzen van het gratis plan

| | Gratis | Verwacht gebruik |
|---|---|---|
| Verzoeken | 100.000 per dag | enkele tientallen per dag |
| KV-schrijfacties | 1.000 per dag | enkele per zetsel |
| Opslag | 1 GB (KV) / 10 GB (R2) | minder dan 10 MB per jaar |

## Wat Jelle moet doen (stap 0d) — via GitHub

Cloudflare is gekoppeld aan GitHub, dus de Worker wordt door Cloudflare zelf gebouwd en uitgerold zodra de code op de productiebranch staat (Workers Builds). Een terminal of `wrangler` op een computer is niet nodig.

1. **Worker koppelen.** In het Cloudflare-dashboard: *Workers & Pages* → *Create* → *Import a repository* → `VERHJE/BrewConsole`. Instellingen:
   - naam `brewconsole-sync`;
   - productiebranch `main` (de Worker staat pas op `main` als de PR is gemerged);
   - *Root directory* `engine3/sync`;
   - *Build command* leeg;
   - *Deploy command* `npx wrangler deploy` (de standaard). De wranglerversie komt uit `engine3/sync/package.json`.
2. **Opslag.** Gedaan: de KV-opslag `brewconsole-sync-blocks` (id `935776684dbd4127aa8fa6c739112d05`) is op 5 nov 2026 via de Cloudflare-connector in Claude aangemaakt en staat in `wrangler.toml`.
3. **Adres van de app.** Gedaan: `ALLOW_ORIGIN` staat op `https://dazzling-manatee-606398.netlify.app` (alleen de herkomst, zonder pad). Verhuist de app, pas het dan in `engine3/sync/wrangler.toml` aan.
4. **Toegangstoken per toestel.** Open `tokengenerator.html` op het adres van de app (dus ook op de iPhone), tik op *Nieuw token maken*. De pagina zit in de gebouwde map (`npm run build` zet `toestelcheck.html` en `tokengenerator.html` naast `index.html` in `dist/`) en de service worker laat hem met rust: alleen de hoofdmap en `index.html` komen uit de app-cache, andere pagina's gaan naar het netwerk. Het token bewaar je op dat toestel; de hash gaat naar Cloudflare. Alles gebeurt lokaal in de browser.
5. **Geheimen.** In het dashboard bij de Worker: *Settings* → *Variables & Secrets* → een geheim `TOKEN_HASHES` met de hash (meerdere toestellen: hashes achter elkaar, gescheiden door komma's). `ANTHROPIC_API_KEY` is niet nodig: AI-foto-herkenning staat voorlopig uit (besluit Jelle, zie 16).
6. **Controle.** `https://brewconsole-sync.<jouw-subdomein>.workers.dev/meta` in de browser geeft `401` (de Worker leeft en wil een token). Een echte rondgang kan pas met een app die synchroniseert (de frontend).
7. **Wachtwoordzin.** Kies in de app een wachtwoordzin en bewaar die veilig. Zonder die zin zijn de blokken ook voor jou onleesbaar; de back-up in iCloud Drive is dan de terugweg.

Een toestel kwijt of gestolen? Haal zijn hash uit `TOKEN_HASHES`. Het toestel kan dan niets meer ophalen of sturen.

Handmatig kan het ook: `node engine3/sync/make-token.mjs` in plaats van de tokengenerator, en `npx wrangler deploy` in `engine3/sync/`.

## Gebouwd (stap 0a–0c, 5 nov 2026)

- `engine3/sync/crypto.ts`, `blocks.ts`: PBKDF2 (600.000 rondes) + AES-GCM, blok-id als gebonden gegeven.
- `engine3/sync/server.ts`, `kv-store.ts`, `worker.ts`: routes, token (alleen de hash staat op de server, vergelijking zonder vroege exit), CORS, onveranderlijke blokken, geheugen- en KV-opslag.
- `engine3/sync/client.ts`: push, pull, `syncOnce` en opruimen met een momentopname. Een toestel dat zijn toestand kwijt is telt het volgnummer door en kan dus geen bestaand blok raken.
- Gecontroleerd in de echte Workers-runtime: de Worker is lokaal gestart met `wrangler dev` (workerd en een KV) en doorlopen met curl: zonder token 401; meta zetten 201; blok zetten 201; hetzelfde blok met andere inhoud 409; lijst en ophalen; `/scan` zonder sleutel 404. `wrangler deploy --dry-run` bundelt de Worker (31 KiB).
- Tests: `engine3/test/sync-blocks.test.ts` en `sync-server.test.ts`. Client en server draaien daarin in één proces, zonder Cloudflare.
- Bekend en bewust: een verkeerde wachtwoordzin geeft `unreadable` blokken in plaats van een fout, en het logboek blijft dan ongemoeid.

## Foto's (9 nov 2026)

Een foto per zak reist als eigen, versleuteld blok naast het logboek, via aparte routes (`/photos`) en een aparte KV-voorvoegsel (`p:`). Daardoor merken toestellen met een oudere app er niets van, en de server blijft dom: hij ziet alleen een blok-id en een envelop.

- **Blok-id:** `ph-<32 hex van SHA-256("brewconsole-photo|"+zak-id)>-<tijdstip van de wijziging in ms, 13 cijfers>`. Het id verraadt de zak niet, en uit de lijst met id's alleen is al af te leiden welke versie per zak de nieuwste is.
- **Inhoud (versleuteld met dezelfde sleutel, id als additional data):** `{v:1, beanId, at, deleted, type?, data?}`; `data` is de foto in base64 (hoogstens ± 150 kB per foto, ruim binnen de 900.000 tekens per blok).
- **Verwijderen is een nieuw blok** met `deleted:true` en een later tijdstip (een grafsteen). De nieuwste wijziging wint, ook bij tegelijk wijzigen op twee toestellen (op klokken van de toestellen; bij gelijk tijdstip wint wie eerst op de server staat).
- **Per toestel een markering per zak** (`brewconsole.fotosync` in localStorage): tijdstip, verwijderd ja/nee, nog niet verstuurd ja/nee. Alle schrijfacties in de app lopen via een omhulsel dat die markering bijhoudt (`core/photosync.ts`); het ophalen van een foto van de server schrijft er langs heen.
- **Volgorde:** eerst het logboek (zodat alle zakken bekend zijn), dan ophalen, dan versturen, dan oude versies op de server opruimen. Een foto zonder markering (van vóór deze functie) telt bij de eerste synchronisatie als eigen wijziging.
- **Oudere Worker zonder `/photos`:** de client merkt dat (404 op de lijst) en slaat foto's over; het logboek synchroniseert gewoon. Een mislukte fotosynchronisatie maakt die van het logboek niet ongedaan en verschijnt als regel op het scherm.
- **Grenzen:** een foto groter dan een blok of van een ander type dan webp/jpeg/png wordt overgeslagen en blijft op het toestel. Kinderen van een verwijderde zak bestaan niet; een zak die op dit toestel nog onbekend is, krijgt zijn foto bij een latere synchronisatie.
- Tests: `engine3/test/sync-server.test.ts` (routes, id's, onveranderlijkheid), `app3/test/photosync.test.ts` (twee toestellen, vervangen, verwijderen, tegelijk wijzigen, oudere Worker, kapotte blokken, markeringen) en `app3/test/fotosync.ui.test.mjs` (twee echte browsers tegen een lokale server).
