# Brew Console · kwaliteitsaudit 10 november 2026

Fase 1: in kaart brengen en vinden. Er is in deze fase niets aan de app veranderd. Herstel volgt pas na akkoord van Jelle.

## A. Samenvatting

**Productieversie:** `app3` (Preact/TypeScript) op de root van `dist/`, gebouwd met `npm run build`. Commit `69870c0` op main, engine `e3-2026.1`, contract `e3-contract-1.4`. Op `/oud/` staat alleen een melding die de oude app van toestellen haalt.

**Oordeel:** de basis is degelijk.
- Alle gegevens komen uit een logboek van gebeurtenissen dat eerst wordt opgeslagen.
- De timer rekent met klok en gebeurtenissen, niet met een teller.
- Er zijn ruim 370 eigen tests plus axe in licht en donker.
- Ik vond geen gegevensverlies, geen consolefouten en geen kapotte knoppen.

**Toch niet klaar voor "premium":**
1. **Rekenfout bij de V60 (P1).** De app laat kopgroottes toe waarbij de dosis wordt afgekapt en de verhouding onbruikbaar wordt. Bij 600 g staat 22 g koffie op 702 g water, dat is 1:32. Er staat wel een waarschuwing, maar het recept is gewoon te starten.
2. **Een lopend zetsel kwijtraken (P1).** Wie de timer verlaat, vindt geen weg terug. Zetten en Logboek wijzen niet naar een lopend of gepland zetsel.
3. **Kleinere UX- en ontwerpfouten (P2/P3).** Dubbele informatie op het zakdetail, een uitklapvorm zonder pijltje, "(algemeen)" in smaaklabels, en het kopveld dat "NaN" toont.

**Nog niet uitgebracht maken:** eerst P1-01 en P1-02 herstellen.

## B. Dekking

**Schermen (16 routes, alle bezocht met lege en gevulde database):**
- Zetten (welkom, formulier, receptkaart, proef)
- Timer (klaar, lopend, wachten, klaar, afgebroken)
- Proeven (alle stappen, proefkeuze)
- Zakken (lijst, filter, detail, nieuw, bewerken)
- Logboek (lijst, detail, vergelijken)
- Meer (smaakprofiel, molen, water, voorkeuren, gegevens, synchronisatie, over)
- Onbekende routes en ids

**Formaten:** 320, 375, 390, 414, 678, 768, 900, 1024, 1280, 1366, 1440 en 1470 px breed, licht en donker. De bestaande responsive-test dekt tien formaten; ik keek daarnaast zelf naar de schermafbeeldingen.

**Niet getest (beperkingen):**
- Echt Safari of iOS. Alleen Chromium is beschikbaar.
- VoiceOver.
- Een echt vergrendeld scherm of slaapstand. Dat is nagebootst met een gemanipuleerde klok.
- PWA-installatie op een toestel.
- Synchronisatie tegen de echte server.

## C. Functionele QA

| Test | Uitkomst |
|---|---|
| 16 routes met lege database, consolefouten en waarschuwingen | geslaagd, 0 meldingen |
| Onbekende zak of kop (`#/zakken/onbestaand`) | geslaagd ("Zak niet gevonden" met Terug) |
| Zak zonder naam opslaan | geslaagd ("Geef de zak een naam.") |
| Zakgrootte −250 g | geslaagd (geweigerd, melding 20–5000 g) |
| Naam van 200 tekens met unicode en emoji | geslaagd (geen horizontale overloop op lijst, detail of zetten) |
| Dubbele tik op Opslaan (zak) | geslaagd (1 zak) |
| Dubbele tik op Start zetsel | geslaagd (1 zetsel) |
| Twee zakken met dezelfde naam | **open (P2-06)**: toegestaan zonder waarschuwing |
| Kopveld "abc", "250,5" of leeg | **mislukt (P2-02)**: het veld toont "NaN" of "0" |
| V60 met een kop van 600 g | **mislukt (P1-01)** |
| Timer na 31 s herladen | geslaagd (0:31) |
| Timer 5 minuten "op de achtergrond" (klok vooruit) | geslaagd (5:31, juiste stap) |
| Timer verlaten en terugvinden | **mislukt (P1-02)** |
| Kapot JSON-bestand inlezen | geslaagd ("Dit bestand is geen geldige JSON.") |
| Vreemd JSON-bestand inlezen | geslaagd ("…geen back-up van Brew Console.") |
| 40 zakken: aanmaken en lijst tonen | geslaagd (lijst in 27 ms, JS-heap 9 MB) |
| Bestaande suites: app3 188, engine 187, axe licht en donker, responsive 10 formaten | geslaagd |

**Rekenkunde.** Ik heb 4392 recepten zelf nagerekend: elke brewer × techniek × doel × kop van 100 tot 700 g.
- Geen NaN.
- De som van de gieten is gelijk aan het water.
- Het laatste totaal is gelijk aan het water.
- Tijden en totalen lopen op.
- Afgeronde gietstappen tellen op tot het afgeronde totaal op het scherm.
- De temperatuur ligt tussen 80 en 100 °C.
- De klik valt binnen het bereik.
- De onzekerheidsband heeft altijd lo ≤ hi en het verwachte einde ligt na de laatste giet.

**Afwijkingen:**
- Verhoudingen buiten 1:12–1:20, zie P1-01 en P2-01.
- Osmotic Flow geeft een fout "geen gietschema in de bron", maar die techniek is in de app niet te kiezen.

## D. UI/UX

**Sterk:**
- Vaste vier tabs.
- Één primaire actie per scherm.
- Uitleg ingeklapt waar die niet nodig is.
- Duidelijke lege staten.
- Foutmeldingen in gewone taal.

**Zwak:**
- De terugweg naar een zetsel ontbreekt (P1-02).
- Het zakdetail herhaalt zichzelf (P2-03).
- Het zakformulier is lang en Opslaan staat helemaal onderaan, klein (P2-04).

## E. Premium ontwerp

**Goed:**
- Typeschaal van vijf maten.
- Cijfers in de serif.
- Eén accentkleur (messing).
- Zachte schaduwen.
- Consistente radius.
- Etiketten zonder foto.
- Beweging alleen waar die betekenis heeft, met "verminder beweging" gerespecteerd.

**Nog niet op niveau:**
- Drie keer dezelfde naam bovenaan het zakdetail.
- Uitklapkaarten zonder pijltje.
- "(algemeen)" achter smaakgroepen.
- In donker vallen de etikettegels weg tegen de kaart.
- De zoekplaceholder is afgekapt op 390 px.

## F. Techniek

- **Gegevens:** eerst opslaan, dan tonen. Mislukt opslaan, dan verandert er niets. Dubbele ids worden genegeerd en samenvoegen is deterministisch.
- **Timer:** afgeleid uit gebeurtenissen en `Date.now()`. Het hertekenen gebeurt elke 200 ms, met een wake lock en een herstart bij `visibilitychange`. Opruimen gebeurt in de effect-cleanup.
- **Prestaties:** de lijst met 40 zakken wordt in 27 ms getekend en de heap is 9 MB. Andere metingen heb ik niet gedaan, dus ik claim verder niets.
- **CI:** de QA-suite test nog de oude app (`tests/*.test.mjs` op `brewconsole_v2_2.html`), die niet meer wordt uitgeleverd. Eén test daarin (`R-02 Zet opnieuw`) faalde op 10 november eenmalig en zette PR #77 onterecht rood (P2-05).

## G. Toegankelijkheid en responsive

- axe (WCAG 2.0/2.1 A en AA) is schoon in licht en donker op alle hoofdschermen.
- Tikdoelen zijn minstens 44 px, getest op 10 formaten.
- Focusstijlen zijn aanwezig.
- Er is geen horizontale overloop, ook niet met extreme namen.
- WCAG 2.2-specifieke criteria (onder meer 2.4.11 focus niet verborgen, achter de vaste Start-balk) zijn niet automatisch getest.

## H. Issueregister

### P1

**P1-01 · Zetten/engine · V60 met grote kop geeft een onbruikbare verhouding.**
- **Reproductie:** Zetten → Hario V60 → kop 600 g.
- **Verwacht:** een recept rond 1:15, of een duidelijke grens aan de kopgrootte.
- **Werkelijk:** 22 g koffie, 702 g water (1:32). Bij 350 g is het al 1:18, bij 400 g 1:21 en bij 700 g 1:36. Er staat een waarschuwing, maar de Start-knop werkt.
- **Oorzaak:** `engine3/src/engine.ts` kapt de dosis af op `DOSE_LIMITS.v60.max = 22` nadat het water al vastligt. `CUP_MAX = 700` geldt voor beide brewers.
- **Oplossing (keuze Jelle):**
  - (a) Begrens de kop per brewer zodat de dosis binnen de brewergrens blijft (V60 ongeveer 200–290 g).
  - (b) Of houd de verhouding vast en verlaag het water, met de melding "maximaal ~290 g voor de V60".
- **Verificatie:** het rekenscript laat bij elke toegestane kop een verhouding tussen 1:13 en 1:18 zien.

**P1-02 · Timer/Zetten/Logboek · een lopend of gepland zetsel is niet terug te vinden.**
- **Reproductie:** start de timer, ga terug (browser of app opnieuw openen), open Zetten of het logboekdetail van de kop met "Bezig".
- **Verwacht:** een duidelijke weg terug naar de timer.
- **Werkelijk:** geen verwijzing. Een nieuw zetsel starten maakt een tweede, parallel zetsel. Geplande zetsels blijven als "Niet gestart" in het logboek staan.
- **Oorzaak:** Zetten en Logboek kijken niet naar zetsels met status gepland of bezig.
- **Oplossing:** een balk op Zetten ("Er loopt een zetsel · Terug naar de timer") en een knop in het logboekdetail.
- **Verificatie:** UI-test: timer starten, weg navigeren, terugvinden.

### P2

**P2-01 · Engine · kleine koppen en de Chemex-portiegrens.**
- Bij een kop van ≤150 g wordt de dosis opgehoogd tot minstens 15 g. Dat geeft 1:7,6 tot 1:11,5, wat erg sterk is.
- Chemex van 400 naar 450 g: de techniek wisselt (Howell → Stumptown) en een grotere kop krijgt minder koffie (31,2 → 30,5 g).
- **Oplossing:** de minimale kop per brewer begrenzen. De wissel uitleggen of laten beslissen.

**P2-02 · Zetten · het kopveld toont "NaN".**
- Invoer "abc" of "250,5" geeft "NaN" in het veld. Een leeg veld wordt "0".
- **Oorzaak:** `Number(value)` zonder komma-ondersteuning en zonder de laatste geldige waarde te bewaren.
- **Oplossing:** komma accepteren, ruwe tekst tonen, melding zonder het veld te overschrijven.

**P2-03 · Zakdetail · naam, brander en proces staan drie keer bovenaan** (etiket, eyebrow en h1 met subregel).
- **Oplossing:** met een etiket zonder foto de eyebrow weglaten en de subregel inkorten.

**P2-04 · Zak toevoegen · lange vorm.**
- De uitklapkaarten hebben geen pijltje en lijken daardoor knoppen zonder functie.
- Opslaan staat klein en helemaal onderaan.
- **Oplossing:** een pijltje toevoegen en Opslaan breed maken.

**P2-05 · CI · de poort test ook de niet-uitgeleverde oude app;** één onregelmatige test maakte een PR rood.
- **Oplossing (keuze Jelle):** de oude tests uit de verplichte poort halen, of de test robuust maken.

**P2-06 · Zakken · dezelfde naam twee keer opslaan gebeurt zonder waarschuwing.**
- **Oplossing:** een zachte melding "Er is al een zak met deze naam".

### P3

- **P3-01:** smaaklabels "Bessen (algemeen)" enzovoort. Toon "Bessen".
- **P3-02:** in donker vallen de etikettegels weg tegen de kaart. Een lichtere rand of een iets lichtere tint lost dat op.
- **P3-03:** de zoekplaceholder "Zoek op naam, brander of land" is afgekapt op 390 px. Een kortere tekst lost dat op.
- **P3-04:** de techniek Osmotic Flow zit in de data maar heeft geen schema. Verbergen of uitleggen.

## I. Wijzigingen

**Ronde 1 (10 nov, na akkoord Jelle, optie a voor P1-01):**

- **P1-01 opgelost.** Er zijn kopgrenzen per brewer, met de bron in de engine-data (`CUP_LIMITS` in `engine3/src/data/brewer.ts`).
  - Hario V60: 200–280 g.
  - Chemex: 200–700 g.
  - Daarbinnen hoeft de dosis niet afgekapt te worden.
  - Het label toont het bereik en de plusknop staat uit op de grens.
  - Wisselen van brewer schuift de kop binnen het bereik.
  - Een opgeslagen kop van vóór de grenzen wordt bij het laden bijgesteld.
  - Buiten het bereik is er geen recept en geen Start-knop, en staat er een melding onder het veld.
  - Test: `engine3/test/cuplimits.test.ts`, waarin elke toegestane kop × techniek tussen 1:13 en 1:18 valt en er geen afkapwaarschuwing komt. Plus `app3/test/audit1.ui.test.mjs`.
  - Hiermee is ook het eerste deel van P2-01 opgelost: kleine koppen onder 200 g kunnen niet meer.
- **P1-02 opgelost.**
  - Zetten toont "Er loopt nog een zetsel" (of "Er staat een zetsel klaar") met een knop "Naar de timer".
  - Het logboekdetail van een gepland of lopend zetsel heeft een knop naar de timer.
  - Afgeronde, afgebroken en open zetsels van meer dan 12 uur oud tellen niet mee.
  - Test: `audit1.ui.test.mjs`. Daarin wordt de timer gestart, verlaten, terug gevonden via Zetten en via het logboek, afgebroken, en daarna is de melding weg.
- **P2-02 opgelost.**
  - Het kopveld houdt de getypte tekst vast en accepteert een komma.
  - Bij ongeldige tekst staat er "Vul een getal in" en blijft het vorige recept staan.
  - Er verschijnt nooit meer NaN of 0.
  - Test: `audit1.ui.test.mjs`.
- **Aangepaste test:** `zetten.ui.test.mjs` gebruikte een V60-kop van 400 g. Dat is nu 280 g.
- **Regressie:** engine 189 en app3 191 tests slagen, inclusief axe licht en donker en responsive op 10 formaten.

**Ronde 2 (10 nov):**

- **P2-03 opgelost.** Op het zakdetail zonder foto staan naam, brander en proces alleen nog op het etiket. De h1 blijft voor schermlezers. De eyebrow en de brander in de subregel verschijnen alleen bij een foto.
- **P2-04 opgelost.** De uitklapkaarten hebben een eigen pijltje dat draait bij openen. Eerder verborg `display: flex` op de summary de standaardmarkering in Chromium. Opslaan is breed en 52 px hoog op de telefoon.
- **P2-06 opgelost.** Bij een naam die al bestaat (los van hoofdletters en spaties) staat er een zachte melding. Opslaan blijft mogelijk.
- **P3-01 opgelost.** Smaaktags tonen geen "(algemeen)" meer, op het zakdetail en in de logboekregel. Dubbele labels worden samengevoegd. De opgeslagen gegevens zijn ongewijzigd.
- **P3-02 opgelost.** In donker hebben de etiketten een dunne messing rand en een iets lichtere tint.
- **P3-03 opgelost.** De zoektekst is nu "Zoek zak, brander, land" en past op 390 px.
- **Tests:** `audit2.test.ts` en `audit2.ui.test.mjs`. Regressie: app3 196 tests geslaagd.

**Ronde 3 (10 nov, keuzes Jelle: P2-01 optie a, P2-05 optie a):**

- **P2-01 opgelost (uitleg, geen gladstrijken).** De Chemex-regels voor twee koppen en een hele kan zeggen in "Waarom dit recept?" dat elke portie het recept van de eigen bron volgt, en dat de dosis vlak boven de portiegrens daardoor iets lager kan uitvallen (450 g tegen 400 g). De getallen zijn niet veranderd. Test: `engine3/test/cuplimits.test.ts`.
- **P2-05 opgelost.** De stap `npm run qa` (de tests van de oude, niet meer uitgeleverde app) is uit `.github/workflows/ci.yml` gehaald, met toestemming van Jelle. De jobnaam is gelijk gebleven, zodat een vereiste check op GitHub blijft kloppen. De oude tests blijven met de hand te draaien via `npm run qa`. De poort draait nu engine3 en app3, en dat is wat er wordt uitgeleverd.

## J. Resterende risico's

- Echt Safari en iOS: lettertype, `:has()`, wake lock en het verlaten van een PWA zijn niet geverifieerd.
- Synchronisatie bij gelijktijdige wijzigingen op twee echte toestellen: alleen de unit-tests zijn gedraaid.
- Geen meting van laadtijd op een echt toestel.

## K. Scores (1–10)

| Onderdeel | Score | Waarom |
|---|---|---|
| Functionele betrouwbaarheid | 7 | Geen gegevensverlies of crashes; wel twee P1's |
| Visuele kwaliteit | 7,5 | Consistent palet, typeschaal en etiketten; nog dubbelingen en details |
| UX | 6,5 | Duidelijke flow, maar een zetsel kwijtraken en een lange zakvorm |
| Premium uitvoering | 6,5 | Goede basis; micro-details (pijltjes, labels, donkere tegels) nog niet af |
| Responsive | 8 | Geen overloop op 12 formaten, timer in twee kolommen; Safari niet gezien |
| Prestaties | 8 | Snel waar gemeten; weinig gemeten |
| Toegankelijkheid | 7,5 | axe schoon, tikdoelen getest; geen schermlezer of WCAG 2.2-test |
| **Totaal** | **7** | Degelijk en betrouwbaar; P1-01 en P1-02 staan premium in de weg |

## Voorgesteld herstelplan

1. **Ronde 1, nodig voor uitbrengen:**
   - P1-01: de grens per brewer (Jelle kiest a of b).
   - P1-02: de terugweg naar het zetsel.
   - P2-02: het kopveld.
   - Tests voor alle drie.
2. **Ronde 2, UX en ontwerp:** P2-03, P2-04, P2-06 en P3-01 t/m P3-03, met nieuwe schermafbeeldingen.
3. **Ronde 3, keuzes:** P2-01 (kleine kop en de Chemex-wissel) en P2-05 (CI).
