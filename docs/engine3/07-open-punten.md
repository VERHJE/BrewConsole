# 07 · Open punten

## Beslissingen

1. ~~**Wendelboe.**~~ **Besloten:** Wendelboe met zijn eigen echte recept. Zie 05.
2. ~~**Temperatuur bij Hoffmann en Wendelboe.**~~ **Opgezocht:** Hoffmann net van de kook (donker 88 °C, klasse C). Wendelboe 96 °C als aanname (klasse C); bij donkere branding Philocoffea. Zie 05, punt 4.
3. **Osmotic Flow.** Hij komt pas in de regeltabel als er een gietschema is. Tot die tijd blijft Kasuya met een grote eerste giet het voorstel bij fruitige naturals.

## Toestelcheck (gedaan, 5 nov 2026)

`toestelcheck.html` op Jelles iPhone (iOS 18.7, Safari 27.0.1), in Safari en vanaf het beginscherm. Beide keren dezelfde uitkomst:

| Test | Uitkomst | Gevolg voor Engine 3 |
|---|---|---|
| Opslag blijft (`persist`) | niet toegekend, ook niet vanaf het beginscherm | De back-up blijft nodig. De back-upherinnering blijft een vast onderdeel; het logboek mag nooit alleen op het toestel staan. |
| Opslagruimte | ~39 GB beschikbaar | Ruimte is geen beperking. |
| IndexedDB | werkt | Opslag van het logboek in IndexedDB. |
| PBKDF2 + AES-GCM | werkt (3–5 ms) | Versleutelde synchronisatie kan. |
| WebAssembly | werkt | Een eigen QR-decoder kan. |
| Ingebouwde QR-lezer (`BarcodeDetector`) | niet aanwezig | Engine 3 neemt een eigen decoder mee (WASM of pure JS). |
| Bestanden delen | werkt | Back-up via het deelmenu naar iCloud Drive. |
| Web Worker, OffscreenCanvas, createImageBitmap | werkt | Foto voorbewerken (OCR en QR) buiten de hoofdthread. |
| Service worker | beschikbaar | Offline werken blijft zoals nu. |

## Meetplan voor eigen data (vóór de molenmodule)

- **Hoeveelheid.** 3 zetsels op 15 g / 225 ml en 3 op 30 g / 450 ml, op dezelfde klik. Daarmee is het einde op ±4 % te meten.
- **Maalgraad.** Eén proef met 3 klikken verschil, 5 koppen per stand. Dat ziet het effect in 88 % van de gevallen.
- **'Erdoor'-tikken.** Zet 'Gieten op doorlopen' aan. De back-up bevat nog geen enkele tik, en de molenmodule heeft ze nodig.

## Accounts (pas nodig bij de AI-stap)

- Een gratis Cloudflare-account, voor de Worker met de API-sleutel en eventueel de synchronisatie.
- Een Anthropic Console-account met betaling per gebruik, met een eigen werkruimte en sleutel voor de Worker en een uitgavenlimiet. Of die limiet voor dit account kan, moet nog bekeken worden.
