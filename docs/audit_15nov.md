# Brew Console · kwaliteitsaudit 15 november 2026

Fase 1: in kaart brengen en vinden. Er is in deze fase niets aan de app veranderd. Herstel volgt na akkoord van Jelle. Opzet en nummering zoals in `audit_10nov.md`.

## A. Samenvatting

**Onderzochte versie:** `main` op `449f071` (PR #100), engine `e3-2026.1`, contract `e3-contract-1.4`.

**Oordeel over de app zelf:** sterk verbeterd sinds 10 november.
- Op 175 schermen geen enkele consolefout, geen horizontale overloop en geen axe-melding, ook niet voor WCAG 2.2 AA.
- Alle 4080 recepten (beide brewers, elke kopgrootte, elk doel, elke techniek) zijn intern kloppend.
- Back-up en terugzetten bewaren alles, ook het nieuwe filterveld.
- Geen bekende kwetsbaarheden; de sync-server is zorgvuldig gebouwd.

**Het grootste probleem zit niet in de app maar in de uitrol (P1-01).** De live site draait nog de stand van PR #96. De iPad-verfijningen, de grotere letters, het filterveld en de opruimronde staan er niet op. Wat je op je iPad ziet, is dus niet wat er getest is.

**Verder:** één tegenstrijdigheid in de timer (P2-02), een omleiding die bij een zip-upload niet werkt (P2-01) en een paar kleinere punten (P3).

## B. Dekking

**Schermen (20 routes), met lege en gevulde database:**
- Zetten
- Zakken: lijst, nieuw, detail, bewerken
- Logboek: lijst, detail, vergelijken
- Meer en de zeven subschermen
- Proeven
- Timer (giet, wachten op doorlopen)
- Onbekende zak, onbekende kop en onbekende route

**Formaten:** 320×640, 390×844, iPad staand 820×1180, iPad liggend 1180×820 en 1440×900.

**Per scherm gemeten:**
- consolefouten en paginafouten;
- horizontale overloop;
- tikdoelen kleiner dan 24 px (WCAG 2.2) en kleiner dan 44 px (Apple);
- tekst kleiner dan 12 px;
- axe met WCAG 2.0, 2.1 en 2.2 AA (op 390 en 1180 px).

**Daarnaast:**
- Een sweep over alle recepten.
- Gegevenspaden: back-up en terugzetten met het filter, filter bij de Chemex, de grens van 12 uur.
- Beveiliging: invoer in HTML, links van de gebruiker, de sync-server, de AI-herkenning en `npm audit`.
- Bundelgrootte en de lijst van de service worker.
- De live site, bekeken met `curl`.
- Schermafbeeldingen van Zetten, zakdetail, logboekdetail, Proeven, smaakprofiel en timer op telefoon en iPad, met eigen beoordeling.

**Niet getest:**
- Echt Safari of iOS en VoiceOver (alleen Chromium beschikbaar).
- Synchronisatie tussen twee echte toestellen en de echte AI-herkenning.
- Laadtijd op een toestel.

## C. Functionele QA

| Test | Uitkomst |
|---|---|
| 175 schermen: consolefouten en paginafouten | geslaagd, 0 |
| 175 schermen: horizontale overloop | geslaagd, 0 |
| axe WCAG 2.0, 2.1 en 2.2 AA op 70 schermen | geslaagd, 0 meldingen |
| Tekst kleiner dan 12 px | geslaagd, 0 |
| Tikdoelen kleiner dan 44 px | alleen de grafiekpunten (23–30 px), zie P3-03 |
| Recepten: 2 brewers × elke kopgrootte in stappen van 10 g × 4 doelen × 17 techniekkeuzes = 4080 | geslaagd: gieten telt op tot het water, tijden lopen op, geen NaN, verhouding 1:14,0 tot 1:16,7 |
| Back-up met filter Cafec TH-3 maken en terugzetten | geslaagd (filter blijft `cafec_th3`) |
| Chemex terwijl het formulier nog Cafec TH-3 onthoudt | geslaagd (geen filter in het zetsel) |
| Open zetsel na 11 en na 13 uur | geslaagd (na 11 uur nog in de banner, na 13 uur "Niet afgerond") |
| Timer bij "wacht op doorlopen" | **mislukt (P2-02):** kop en gietschema spreken elkaar tegen |
| Aantal koppen per zak | **afwijking (P3-01):** nooit afgeronde zetsels tellen mee |
| Tests | 414 groen (engine 191, app 223) en de archiefsuite van de oude app (1120); CI groen |

## D. UI en UX (eigen beoordeling van de schermafbeeldingen)

- **Goed:**
  - Het groene thema is overal consequent.
  - De iPad-schermen gebruiken de ruimte: Zetten in twee kolommen, Logboek met overzicht, de timer met het schema ernaast.
  - De tegels staan recht en de typografie is rustig.
- **Timer (P2-02):** tijdens het wachten staat bovenaan "Giet 2 van 5 · Wacht op doorlopen". In het gietschema heet giet 1 dan nog "Nu", met de lichtste markering, en giet 2 "Wacht". Er lijken twee rijen tegelijk actief.
- **Zetten op iPad (P3-04):** de vier filterknoppen lopen in de smalle formulierkolom over drie regels ("Niet bijhouden" staat alleen).
- **Telefoon (P3-05):** de tegel "MOLEN · C3S PRO" breekt over twee regels.
- **Logboekdetail (P3-06):** "doorgelopen 3:25" in het schema en daaronder "Laatste giet doorgelopen na 0:45" zijn twee verschillende tijden met hetzelfde woord.

## E. Techniek

- **Bundel:** `app.js` 252 KB (84 KB gzip), `app.css` 85 KB (19 KB gzip), twee chunks voor QR en foto's.
- **Service worker:** zet 12 bestanden (1,39 MB) vooraf in de cache. Daarvan zijn 850 KB iconen die de app zelf nooit toont; zie P3-02.
- **Beveiliging:**
  - Geen `innerHTML` of `eval`.
  - Winkellinks alleen `http(s)` en met `noopener`.
  - Sync-server: tokens in constante tijd vergeleken, groottegrens per blok, blokken onveranderlijk.
  - AI-sleutel alleen in de Worker, met een daglimiet.
  - `npm audit` 0 voor app en Worker.
- **Afhankelijkheden:** geen kwetsbaarheden. Preact 11 is uit (major); er is geen reden om nu over te stappen.

## H. Issueregister

### P1

**P1-01 · Uitrol · de live site loopt vier rondes achter.**
- **Bewijs** (23:12 UTC, rechtstreeks bij Netlify, `cache-status: fwd=miss`): op `dazzling-manatee-606398.netlify.app` is `app.js` 250.260 bytes en de service worker heeft versie `4e84ec31634d`. "Niet afgerond", Cafec TH-3 en `--fs-xs: .8125rem` ontbreken. `app.js` is precies even groot als de bouw van PR #96.
- **Oorzaak 1 (opgelost):** de zips van drie rondes waren gemaakt na `npm run app3:build`. Daarin stond de nieuwe app in `dist/app3/` en op de wortel nog de oude. Voortaan `rm -rf dist && npm run build` (bouwbesluiten, 15 nov).
- **Oorzaak 2 (open):** ook de schone zip van 15 nov staat niet live. Waarschijnlijk ging de upload naar een andere site, of staat automatisch publiceren op slot.
- **Oplossing:**
  - Jelle kijkt in Netlify onder Deploys en publiceert de bovenste deploy.
  - Structureel: koppel Netlify aan GitHub (Git-builds), zodat elke merge naar `main` vanzelf live gaat met `netlify.toml`. Dan vervalt de zip.

### P2

**P2-01 · Uitrol · `netlify.toml` werkt niet bij een zip-upload.**
- **Bewijs:** `/app3/` en `/app3/index.html` geven 404 in plaats van de omleiding (301) naar `/`. `netlify.toml` staat in de repo, niet in `dist/`, en een zip-upload leest hem niet.
- **Gevolg:** een toestel dat de app ooit op `/app3/` installeerde, krijgt bij de update-controle een 404. De oude service worker blijft dan actief, dus dat toestel blijft op een oude versie hangen. De gegevens zijn veilig: zelfde herkomst, zelfde database.
- **Oplossing:** de build schrijft `_redirects` (en eventueel `_headers`) in `dist/`. Een kleine wijziging in `scripts/build-app3.mjs`, met een test. Bij Git-builds (zie P1-01) werkt `netlify.toml` vanzelf.

**P2-02 · Timer · kop en gietschema spreken elkaar tegen tijdens het wachten.**
- **Bewijs:** na 50 s staat de kop op "Giet 2 van 5", de stap op "Wacht op doorlopen", en giet 1 in het schema op `now` ("Nu: +48 g", ook voor schermlezers) met giet 2 op `hold`. Zie `Timer.tsx:162`.
- **Oplossing:** een giet waarna gewacht wordt telt als gegoten (`past`). Alleen de weergave verandert, de klok en de engine niet. Een test erbij.

### P3

- **P3-01 · Zakken · het aantal koppen telt nooit afgeronde zetsels mee.** `state.ts:190` neemt elk niet-afgebroken zetsel mee in `brewIds`, terwijl de voorraad alleen afgeronde koppen telt (`beans.ts:239`). Dat raakt "6 koppen" in de lijst, de tegel Koppen en de sortering "Meest gezet". Oplossing in de app: alleen afgeronde koppen tellen. De engine en het contract blijven ongemoeid.
- **P3-02 · Prestaties · iconen in de voorraad van de service worker.** `icon-512.png` en `icon-maskable-512.png` zijn byte-gelijk (elk 355 KB). Samen met de andere twee iconen is dat 850 KB van de 1,39 MB, en de app toont ze nergens: het besturingssysteem haalt ze zelf op bij installeren. Oplossing: iconen uit de lijst laten, en in het manifest één bestand voor beide doelen gebruiken.
- **P3-03 · Grafieken · de punten zijn klein als tikdoel.** Ze zijn 24–30 px, op 320 px 23 px. WCAG 2.5.8 is toch gehaald via de tabel onder elke grafiek (een gelijkwaardige bediening), maar het blijft onder 44 pt. Oplossing: een onzichtbaar groter raakvlak per punt.
- **P3-04 · Zetten op iPad · de filterknoppen lopen over drie regels.** Kortere labels ("Hario", "Cafec TH-3", "Ander", "Geen") of een keuzelijst.
- **P3-05 · Telefoon · tegellabel "MOLEN · C3S PRO" breekt.** Korter label ("molen") of de molen in een subregel.
- **P3-06 · Logboekdetail · twee keer "doorgelopen" met een andere tijd.** Formulering bijvoorbeeld: "De laatste giet liep in 0:45 door."
- **P3-07 · Uitrol · geen beveiligingsheaders behalve HSTS.** Het risico is klein (geen HTML uit invoer, Preact zet tekst veilig om, links alleen http(s)). Een Content-Security-Policy kan mee met `_headers` uit P2-01.

**Nog open uit de opruimaudit (stap 3, wacht op besluit):**
- de licht/donker-herhaling in 19 schermtestbestanden;
- het archief van de oude app vervangen door vaste testgegevens;
- oude rapporten naar `docs/archief/`.

## I. Wijzigingen (ronde 1, 16 nov 2026)

- **P2-01 opgelost.**
  - De build schrijft `_redirects` en `_headers` in `dist/`, en zet een opruim-worker op `/app3/sw.js`.
  - Nagespeeld in Chromium: een installatie op `/app3/` komt na één keer herladen op `/` uit, zonder oude worker.
  - Test: `app3/test/uitrol.test.mjs`.
- **P2-02 opgelost.**
  - Tijdens het wachten staat de giet ervoor op "Klaar" en alleen de wachtende giet is gemarkeerd (`pourStates()` in `core/timer.ts`).
  - Test in `timer.test.ts`; die faalt met de oude regel.
- **P1-01 open.** Dit vraagt een handeling in Netlify (de juiste deploy publiceren, of Git-builds aanzetten).

## J. Resterende risico's

- Safari/iOS-specifiek gedrag (wake lock, statusbalk, PWA-update) is alleen op Jelles toestel te zien, en dat draait nu een oude versie (P1-01).
- Gelijktijdig synchroniseren op twee echte toestellen is alleen met unit-tests gedekt.

## K. Scores (1–10), met 10 nov ernaast

| Onderdeel | 10 nov | 15 nov | Waarom |
|---|---|---|---|
| Functionele betrouwbaarheid | 7 | 8,5 | Beide P1's van toen opgelost; 4080 recepten kloppen; alleen de timer-tegenstrijdigheid |
| Visuele kwaliteit | 7,5 | 8 | Eén thema, rechte tegels, iPad benut; kleine afbrekingen |
| UX | 6,5 | 7,5 | Terugweg naar een zetsel, filter, "Niet afgerond"; de timerkop en het schema botsen nog |
| Premium uitvoering | 6,5 | 7,5 | Details veel beter; een paar labels en tikdoelen |
| Responsive | 8 | 8,5 | Nul overloop op vijf formaten, iPad-lay-outs |
| Prestaties | 8 | 8 | Kleine bundel; precache met dubbele iconen |
| Toegankelijkheid | 7,5 | 8,5 | axe ook voor WCAG 2.2 schoon, tekst ≥ 12 px, tikdoelen ≥ 44 px behalve grafiekpunten |
| Uitrol | — | 4 | Live loopt vier rondes achter; `netlify.toml` werkt niet bij een zip |
| **App (zonder uitrol)** | **7** | **8** | |

## Voorgesteld herstelplan

1. **Nu, nodig om iets te zien:**
   - P1-01: Jelle publiceert de juiste deploy in Netlify; ik controleer daarna de live site.
   - Besluit: Git-builds aanzetten (aanbevolen) of bij zips blijven.
2. **Ronde 1:** P2-01 (`_redirects` in de build) en P2-02 (timer), met tests.
3. **Ronde 2:** P3-01, P3-04, P3-05 en P3-06, met schermafbeeldingen.
4. **Ronde 3, optioneel:** P3-02 (iconen), P3-03 (raakvlak grafiekpunten) en P3-07 (CSP).
