# 16 · Zakherkenning (bouwstap 6)

Code: `engine3/src/bean/` (`text.ts`, `scan.ts`, `qr.ts`), `engine3/qr/decode.ts` · data: `engine3/src/data/bean-scan-data.ts` (gegenereerd) · tests: `bean-text`, `bean-scan`

Twee manieren om een zak in te lezen, met dezelfde uitkomst: boonvelden volgens het datamodel (03), met per veld de bron (`paste`, `ocr`, `qr`). De derde, foto naar AI, is op 17 nov 2026 weggehaald (zie 3).

| Weg | Wat de engine doet | Waar het gebeurt |
|---|---|---|
| Tekst (geplakt of OCR) | `scanBeanText(tekst, { source, nowMs })` | in de engine, zuiver |
| QR-code | pixels lezen met jsQR, inhoud met `readQrPayload()` | pixels in `engine3/qr`, inhoud in de engine |

## 1. Tekst: `parseBeanText` uit de app, overgezet

De herkenning uit de huidige app (PR #40) is letterlijk overgezet naar strikte TypeScript: velden eerst (Origin, Process, Variety, Notes …), dan woorden; semi-washed als niet-eenduidig; cafeïnevrij; gedeelde hoofdwoorden ('gedroogd & tropisch fruit'); naam, brander, zakgrootte en branddatum met de regels voor logo-ruis en webshops.

- De woordenlijsten staan in `bean-scan-data.ts` (oorspronkelijk gegenereerd uit de oude app). Sinds 17 nov 2026, toen de oude app uit de repo ging, vergelijkt de test ze met de vastgelegde lijsten in `engine3/test/oude-app/`.
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

## 3. AI: weggehaald (17 nov 2026)

Er was een AI-herkenning van een zakfoto gebouwd: `POST /scan` op de Worker, met toestemming per scan, een vast model, een daglimiet en een strikt schema voor het antwoord. Ze is nooit aangezet (besluit Jelle, 5 nov 2026: het kost geld) en de app riep haar nergens aan; vanuit de browser kon dat ook niet, omdat de Worker in CORS geen POST toestond.

**Besluit Jelle (17 nov 2026, review C5): weghalen.** Weg zijn `engine3/src/bean/ai.ts`, `engine3/sync/ai.ts`, de route `/scan` (nu 404 "onbekend pad", met een test), de bron `ai` en de tests `bean-ai`. Minder code, geen sleutel nodig, en niets in de app stuurt een foto naar buiten. Wie tekst van een zakfoto wil gebruiken, kan op de iPhone de tekst uit de foto kopiëren (Live Tekst) en plakken. De oude code staat in de git-geschiedenis (tot en met commit `d380c28`).
