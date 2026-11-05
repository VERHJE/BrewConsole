# 07 · Open punten

## Beslissingen voor Jelle

1. **Wendelboe.** Zijn echte recept roert de bloom en giet doorlopend. Daarmee past het niet bij de rol 'lage agitatie voor thee en bloemig'. De keuze:
   - Wendelboe houdt de rol, met zijn echte recept;
   - de lage-agitatierol gaat naar Hedrick One and Done (niet swirlen).

   Zie 05.
2. **Temperatuur bij Hoffmann en Wendelboe.** Hun bronnen geven geen getal. Voorstel: de branding-regel van Philocoffea als terugval, gemarkeerd als aanname.
3. **Osmotic Flow.** Hij komt pas in de regeltabel als er een gietschema is. Tot die tijd blijft Kasuya met een grote eerste giet het voorstel bij fruitige naturals.

## Op het toestel testen

Open `toestelcheck.html` op de iPhone, vanaf het beginscherm, op hetzelfde adres als de app. Tik daarna op 'Uitkomst kopiëren' en stuur de tekst door. De check test:

- opslag die blijft (`persist`);
- IndexedDB;
- versleutelen (PBKDF2 + AES-GCM);
- WebAssembly (nodig voor een eigen QR-decoder);
- de ingebouwde QR-lezer;
- bestanden delen (back-up naar iCloud Drive);
- Web Worker en OffscreenCanvas.

In headless Chromium werkt alles behalve `persist`, de ingebouwde QR-lezer en bestanden delen. Daar zijn ze niet beschikbaar, maar zeggen ze nog niets over de iPhone.

## Meetplan voor eigen data (vóór de molenmodule)

- **Hoeveelheid.** 3 zetsels op 15 g / 225 ml en 3 op 30 g / 450 ml, op dezelfde klik. Daarmee is het einde op ±4 % te meten.
- **Maalgraad.** Eén proef met 3 klikken verschil, 5 koppen per stand. Dat ziet het effect in 88 % van de gevallen.
- **'Erdoor'-tikken.** Zet 'Gieten op doorlopen' aan. De back-up bevat nog geen enkele tik, en de molenmodule heeft ze nodig.

## Accounts (pas nodig bij de AI-stap)

- Een gratis Cloudflare-account, voor de Worker met de API-sleutel en eventueel de synchronisatie.
- Een Anthropic Console-account met betaling per gebruik, met een eigen werkruimte en sleutel voor de Worker en een uitgavenlimiet. Of die limiet voor dit account kan, moet nog bekeken worden.
