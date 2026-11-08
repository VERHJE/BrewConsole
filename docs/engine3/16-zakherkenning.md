# 16 · Zakherkenning (bouwstap 6)

Code: `engine3/src/bean/` (`text.ts`, `scan.ts`, `qr.ts`, `ai.ts`), `engine3/qr/decode.ts`, `engine3/sync/ai.ts` · data: `engine3/src/data/bean-scan-data.ts` (gegenereerd) · tests: `bean-text`, `bean-scan`, `bean-ai`

Drie manieren om een zak in te lezen, alle drie met dezelfde uitkomst: boonvelden volgens het datamodel (03), met per veld de bron (`paste`, `ocr`, `qr`, `ai`).

| Weg | Wat de engine doet | Waar het gebeurt |
|---|---|---|
| Tekst (geplakt of OCR) | `scanBeanText(tekst, { source, nowMs })` | in de engine, zuiver |
| QR-code | pixels lezen met jsQR, inhoud met `readQrPayload()` | pixels in `engine3/qr`, inhoud in de engine |
| Foto naar AI | `POST /scan` op de Worker, antwoord met `validateAiScan()` | Worker; de engine alleen het contract en de schoonmaak |

## 1. Tekst: `parseBeanText` uit de app, overgezet

De herkenning uit de huidige app (PR #40) is letterlijk overgezet naar strikte TypeScript: velden eerst (Origin, Process, Variety, Notes …), dan woorden; semi-washed als niet-eenduidig; cafeïnevrij; gedeelde hoofdwoorden ('gedroogd & tropisch fruit'); naam, brander, zakgrootte en branddatum met de regels voor logo-ruis en webshops.

- De woordenlijsten komen uit `bean-scan-data.ts`, dat `node engine3/scripts/gen-bean-scan-data.mjs` uit de app genereert. Een test faalt zodra ze uit elkaar lopen.
- **Poort:** een differentiële test eist dat `parseBeanText` voor dezelfde tekst dezelfde uitkomst geeft als de app. Dat is getoetst op alle teksten uit de bestaande app-tests (inclusief de 8 voorbeeldzakken), op een reeks vreemde invoer en op 600 willekeurige etiketten uit regels van echte zakken, de woordenlijsten en ruis.
- **Eén verschil:** geen `Date.now()`. De branddatum-controle krijgt het huidige moment als `nowMs` mee.
- **Poort uit het plan, aangepast:** 'dezelfde 35 van 45 trefwoorden als de huidige app' was een meting op de foto's van de acht zakken. Die foto's staan niet in de repo (en twee ervan zijn nooit als bestand aangekomen), dus die meting is niet te herhalen. In plaats daarvan staat de zekerheid dat alles wat de app uit getypte tekst haalt hier ook uit komt. De OCR zelf (Tesseract, voorbewerking van het beeld) blijft bij de frontend.

### Van herkenning naar boonvelden (`scan.ts`)

- **Proces in drie assen:** `anaerobic natural` wordt basis natural met fermentatie anaerobic; 'lactic fermented honey' wordt honey met lactic; `semi-washed` blijft een `ambiguousTerm` met basis onbekend (niet geraden); cafeïnevrij krijgt de methode (swiss water, sugarcane/ethyl acetate, CO2, anders 'other').
- **Hoogte als bereik:** '1580 - 1680' blijft 1580–1680 (de app middelde dat tot één getal); een los getal wordt min = max.
- **Notities in drie lijsten:** `raw` zoals op de zak, `tags` van het smaakwiel, `unmapped` voor wat geen tag heeft (niet geraden, wel bewaard).
- **Niets verzinnen:** een veld dat niet herkend is ontbreekt. Een branddatum ouder dan ~13 maanden of in de toekomst telt niet. Meerdere zakmaten (webshop) betekent geen zakgrootte.
- **Markeringen:** `flags` meldt fuzzy treffers (land, regio, variëteit), webshoptekst en een onduidelijke procesterm, zodat de frontend die apart kan tonen.

## 2. QR

- **Pixels:** de iPhone heeft geen ingebouwde QR-lezer (`BarcodeDetector`, zie de toestelcheck). `engine3/qr/decode.ts` gebruikt daarom [jsQR](https://github.com/cozmo/jsQR) 1.4.0 (Apache-2.0, pure JavaScript, dus geen WebAssembly nodig). Dat is een bestaand, beproefd pakket in plaats van een eigen decoder; de eigen versie die de toestelcheck noemde is dus niet gebouwd. De decoder zit buiten de engine (die kent geen camera) en wordt als aparte bundel gebouwd (`engine3/dist/qr.mjs`, ~375 kB, ongeminimaliseerd). Hij probeert ook omgekeerde codes.
- **Inhoud:** `readQrPayload()` begrijpt een webadres (merk uit de domeinnaam, woorden uit het pad, bijvoorbeeld `…/products/colombia-el-diviso-natural`), JSON of 'sleutel: waarde'-regels met boonvelden, en gewone tekst. Alles gaat door dezelfde tekstherkenning, met bron `qr`. Er wordt niets opgehaald (de engine heeft geen netwerk); bij een webadres geeft het resultaat het adres terug, zodat de frontend de pagina kan tonen of de tekst ervan laten plakken.
- Getest met codes die in de test zelf worden gemaakt (`qrcode`, alleen voor tests): normaal, klein, omgekeerd, met hoge foutcorrectie, en zonder code.

## 3. AI: alleen met toestemming, via de Worker

> **Besluit Jelle (5 nov 2026): AI-foto-herkenning staat voorlopig uit.** Het is het enige onderdeel dat geld kost (betaalde Anthropic-API), en dat doen we niet, of in ieder geval nog niet. Er wordt geen sleutel gezet; zonder `ANTHROPIC_API_KEY` geeft `/scan` op de Worker 404 en gaat er niets naar buiten. Tekst, OCR, geplakte tekst en QR blijven werken en kosten niets. De code en de tests blijven staan, zodat het later met één geheim aan te zetten is.

Besluit Jelle: de veiligste optie.

- **Toestemming per scan:** het verzoek moet `consent: true` hebben; zonder dat geeft de Worker 403 en gaat er niets naar buiten.
- **Sleutel:** de Anthropic-sleutel is alleen een geheim van de Worker (`ANTHROPIC_API_KEY`), nooit in de app en nooit in het antwoord. Zonder dat geheim staat `/scan` uit (404).
- **Toegang:** dezelfde toestel-tokens als de synchronisatie.
- **Vast model** (`claude-opus-5-5`), een tool met een strikt schema, een dagelijkse limiet van 30 scans (ook een mislukte poging telt), en een maximum van 5 MB per foto (jpeg, png of webp).
- **Geen foto bewaard:** de foto gaat door de Worker naar de API en niet in de opslag, niet in een teller en niet in het antwoord. Fouten van de API worden niet doorgegeven.
- **Een voorstel, geen feit:** het antwoord wordt door `validateAiScan()` schoongemaakt. Onbekende sleutels, opsommingen buiten de lijst, onmogelijke getallen en datums vallen af en staan in `dropped`; elk veld krijgt bron `ai`. De frontend toont het ter controle en gebruikt het pas na bevestiging.

## Wat jij moet doen

Voorlopig niets: AI-foto-herkenning staat uit (zie het besluit hierboven). Alleen als je het later toch wilt: een Anthropic Console-account met betaling per gebruik, een eigen werkruimte met sleutel en een uitgavenlimiet, en dan `npx wrangler secret put ANTHROPIC_API_KEY`. De limiet van 30 scans per dag zit al in de Worker; de uitgavenlimiet in de Console is de tweede beveiliging.
