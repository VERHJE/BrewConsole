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

Routes: `GET/PUT /meta` (het zout, niet geheim), `PUT/GET/DELETE /blocks/:id`, `GET /blocks?after=`. Een blok is onveranderlijk: hetzelfde id met andere inhoud geeft 409.

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

## Wat Jelle moet doen (stap 0d)

1. Een gratis Cloudflare-account aanmaken.
2. Op een computer met Node: in de map `engine3/sync/`
   - `npx wrangler login`
   - `npx wrangler kv namespace create BLOCKS` en het getoonde id in `wrangler.toml` zetten;
   - `ALLOW_ORIGIN` in `wrangler.toml` op het adres van de app zetten;
   - `node make-token.mjs` voor elk toestel; het token gaat naar het toestel, de hash gaat naar de Worker met `npx wrangler secret put TOKEN_HASHES` (meerdere hashes gescheiden door komma's);
   - `npx wrangler deploy`.
3. In de app een wachtwoordzin kiezen en ergens veilig bewaren. Zonder die zin zijn de blokken ook voor Jelle onleesbaar; de back-up in iCloud Drive is dan de terugweg.

Een toestel kwijt of gestolen? Haal zijn hash uit `TOKEN_HASHES` en zet het secret opnieuw. Het toestel kan dan niets meer ophalen of sturen.

## Gebouwd (stap 0a–0c, 5 nov 2026)

- `engine3/sync/crypto.ts`, `blocks.ts`: PBKDF2 (600.000 rondes) + AES-GCM, blok-id als gebonden gegeven.
- `engine3/sync/server.ts`, `kv-store.ts`, `worker.ts`: routes, token (alleen de hash staat op de server, vergelijking zonder vroege exit), CORS, onveranderlijke blokken, geheugen- en KV-opslag.
- `engine3/sync/client.ts`: push, pull, `syncOnce` en opruimen met een momentopname. Een toestel dat zijn toestand kwijt is telt het volgnummer door en kan dus geen bestaand blok raken.
- Tests: `engine3/test/sync-blocks.test.ts` en `sync-server.test.ts`. Client en server draaien daarin in één proces, zonder Cloudflare.
- Bekend en bewust: een verkeerde wachtwoordzin geeft `unreadable` blokken in plaats van een fout, en het logboek blijft dan ongemoeid.
