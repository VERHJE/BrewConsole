# 18 · Frontend rond `createEngine()`

Vastgesteld 5 nov 2026. De hele frontend wordt opnieuw opgebouwd. Layout, kleuren en indeling van de oude app hoeven niet behouden te blijven. De engine blijft zoals hij is (`e3-contract-1.0`): de frontend leest en schrijft alleen via het contract.

## Uitgangspunten

1. **Eén bron van waarheid: het logboek.** Het scherm bewaart geen eigen toestand over koffie. Alles wat de gebruiker doet wordt een `EngineEvent`; wat het scherm toont komt uit `learn(log)` en `plan(state, vraag)`.
2. **Kern zonder DOM.** Alles wat geen scherm is (opslag, gebeurtenissen maken, timer-logica, formulieren omzetten naar gebeurtenissen) staat in `app3/src/core/` en draait in Node. Daar zitten de meeste tests. De schermen zijn dun.
3. **Niet verzinnen, wel laten zien wat onzeker is.** `Advice.uncertainty`, `reasons` en `warnings` worden getoond; een band is een band, geen getal.
4. **Offline eerst, privé eerst.** Alles werkt zonder netwerk. Synchronisatie is optioneel en versleuteld (08). AI-foto-herkenning blijft uit (besluit Jelle).
5. **Naast de oude app, niet erin.** De nieuwe app staat op `/app3/` tot hij de oude kan vervangen. De oude app verandert niet. Het omschakelen is een aparte stap.

## Techniek

| Keuze | Waarom |
|---|---|
| TypeScript strict (zoals de engine) | Eén taal, dezelfde eenheidstypes (`Grams`, `Seconds` …) tot in het scherm. |
| Preact 10 + JSX (esbuild) | 4 kB, geen build-magie, bekende componenten. Geen router- of staatbibliotheek: een kleine hash-router en een store van ±60 regels. |
| IndexedDB voor het logboek, `localStorage` alleen voor voorkeuren | Het logboek is groot en mag niet stil verdwijnen; `navigator.storage.persist()` wordt gevraagd (zie `toestelcheck.html`). |
| Eigen CSS met tokens (licht/donker), geen CSS-framework | Volledige controle over timerscherm en teltafel; geen extra gewicht. |
| Bundel naar `dist/app3/` via `npm run app3:build` | De bestaande publicatie (`npm run build`) neemt `dist/app3/` mee. |

## Mappen

```
app3/
  index.html            schil, manifest-link, één <div id="root">
  src/
    core/               zonder DOM: store, ids, gebeurtenissen maken, timer, formulieren, back-up
    ui/                 Preact-componenten en schermen
    main.tsx            ingang: store openen, engine maken, router starten
  styles/               tokens.css, base.css, schermen
  test/                 node:test voor core/, Playwright voor de schermen
```

## Schermen en stroom

Onderaan vier tabs (verdwijnen tijdens een zetsel): **Zetten · Zakken · Logboek · Meer**.

| Scherm | Doel | Engine |
|---|---|---|
| **Zetten** | Kies zak, kopgrootte, doel → advies → "Start" | `plan()`; toont recept, reden, onzekerheid, waarschuwingen, eventueel een proef |
| **Recept** | Schema (gietmomenten, temperatuur, klik, dosis) in één oogopslag | `Advice.recipe` |
| **Timer** | Teltafel-weergave: klok, volgende giet, "erdoor"-tik, pauze | schrijft `brew.timer`; geen engine-aanroep |
| **Proeven** | Na afloop: sterkte, zuur, afdronk, blind kiezen, daarna notities herkend, plezier | schrijft `tasting` (+ `brew.actuals`, `pair.trial`) |
| **Zakken** | Lijst, toevoegen (plakken, QR, handmatig), controlekaart per veld | `scanBeanText`, `readQrPayload`; schrijft `bean.upsert` |
| **Zak-detail** | Velden, herkomst per veld, kopgeschiedenis, pasvorm met je smaakprofiel | `beanFit`, `cupsOf` |
| **Logboek** | Alle koppen, filter, verloop (sterkte, tijd tot einde) | `FactState` |
| **Meer → Smaakprofiel** | Blinde gevoeligheid per categorie, herkenning, plezier | `tasteProfile()` |
| **Meer → Molen** | Klik-tijd-model, "zo reageert jouw molen" | `fitGrind` |
| **Meer → Water, Molen-instelling** | `setting`-gebeurtenissen | |
| **Meer → Gegevens** | Back-up in/uit (v3-migratie), synchronisatie, wissen | `migrateBackupV3`, sync-client |

## Inspiratie

Bekeken en wat ervan overgenomen wordt (alleen wat de bron zelf zegt):

- **Beanconqueror** (beanconqueror.com): velden per brewmethode in eigen volgorde zetten; bonen importeren met scannen; voorraad en uitgaven per zak; automatische rollende back-ups en makkelijke export; waterprofielen als eigen onderdeel.
  → Overnemen: invoerstroom die het logboek volgt, voorraad per zak (uit `bagSizeG` minus doses), rollende back-up in IndexedDB, water apart.
- **Timer.Coffee** (App Store/Play Store): stap-voor-stap-instructies per methode, rekenmachine, doorlopen op de achtergrond (Live Activity), maalstand per recept, dagboek, voorraad, herinneringen voor versheid.
  → Overnemen: één rustig timerscherm met alleen "wat nu", wake lock en melding op de volgende giet, versheidsmelding op de zak.
- **Brewio** (App Store): dagboek met eigen recepten en boonvelden (herkomst, brander, proces, brandingsdatum, smaaknotities).
  → Bevestigt de zakvelden die we al hebben; niets nieuws nodig.
- **Filtru** (getfiltru.com, gelezen 6 nov): stap-voor-stap-timer met per stap het doel en de volgende handeling; 'begin eenvoudig, ga dieper als je wilt'; doel-tegenover-werkelijk-markering bij de weegschaal; gesproken uitlezing en VoiceOver voor wie de handen vol heeft; receptenbibliotheek per methode.
  → Overnemen: timer die altijd 'nu' en 'straks' toont (staat er), progressieve diepte (eenvoudig zetten, logboek en inzicht pas op verzoek), gesproken aanwijzingen (nog niet).
- **BeanBench** (App Store, gelezen 6 nov): haptiek en fase-aanwijzingen in de timer; drenageschatting vooraf ingevuld uit het recept; zak scannen met controle vóór opslaan en 'foto's verlaten je telefoon niet'; kwartsterren met tik of slepen; rustdagen en een herinnering als een zak klaar is; 'opnieuw kopen' neemt prijs en maat over; vergelijken alleen binnen dezelfde koffie en methode; vastgezette favoriete methoden bovenaan; zichtbare synchronisatiestatus (laatste keer en wat misging); share cards.
  → Overnemen: rustdagen in de zakkenlijst en bij Zetten, 'opnieuw kopen', synchronisatiestatus (nu alleen in het scherm), vergelijken binnen dezelfde zak (verloopgrafieken doen dat al), sneller waarderen.
- **Caliburr** (caliburr.coffee, gelezen 6 nov): recepten vastgepind aan de exacte molen, machine en boon ('een stand op de ene molen is niet dezelfde op een andere'); 'dit werkte' met één tik.
  → Bevestigt de keuze om de klik altijd bij de molen (Timemore C3S Pro) te houden; geen gedeelde recepten gepland.
- **Timer.Coffee** (pdf's van de site, door Jelle aangeleverd 6 nov: startpagina, Features, V60-receptpagina; de pagina over branders is niet gebruikt): één focusscherm per stap met een ring (tijd van de stap), de opdracht ('voeg 60–90 g water toe') en onderaan 'Next:'; per stap geluid of trilling, scherm blijft aan, pauzeren en later verdergaan; recepten schalen mee met de hoeveelheid (Kasuya 4:6 heeft sterkte- en zoetheidsregelaars); zakkenkelder met 'zoveel of zo weinig detail als je wilt', foto-herkenning, beoordeling per zak (zoetheid, zuur, body) en favorieten; dagboek dat elke kop **automatisch** bewaart, groepeert per zak ('het pad naar een goede kop') en **twee koppen naast elkaar zet met wat er veranderde** ('maling gelijk, temperatuur +2 °C, verhouding iets strakker'); maandkalender met reeks en weekoverzicht (hoeveel, vaste methode, beste kop); zoeken en filteren op methode, zak, herkomst, waardering, eigen labels en 'heeft notitie', met bladwijzers; werkt volledig offline en synchroniseert op verzoek (of blijft op het toestel); Live Activity op het vergrendelscherm en Apple Watch; ontwerp: wit/zwart, grote vette koppen, afgeronde kaarten met pictogram, titel en één regel uitleg, uitklapbare veelgestelde vragen.
  → Overnemen: **twee koppen vergelijken met een lijst van wat er veranderde** (past precies bij het logboek: dosis, klik, temperatuur, techniek, tijd), de **ring per stap met 'Hierna:'** op het timerscherm, **favorieten en zoeken/filteren** in zakken en logboek, een **maandweergave met reeks** (rustig, niet als spel). Niet overnemen, bewust: community-recepten en 'live brews' van anderen (privacy), Live Activity en Watch (kan niet in een webapp), 30 methoden (wij doen V60 en Chemex).
- **Niet beoordeeld**: timer.coffee (blijft 429 geven; alleen de store-beschrijving is gelezen) en Coffee Book (geen adres).

## Ontwerp

- Mobiel eerst (iPhone, één hand), daarna iPad en laptop (twee kolommen: lijst links, detail rechts).
- Rustig en leesbaar: een warm neutraal vlak, één accentkleur (koper), grote cijfers voor wat je tijdens het zetten leest. Licht en donker volgen het toestel.
- Eén iconenset (inline SVG), geen emoji in knoppen. Tikvlakken ≥ 44 px. Focus altijd zichtbaar. Tekstvergroting tot 200 % zonder overlopen.
- Taal: Nederlands, kort, geen jargon zonder uitleg. Teksten van de engine (`Reason.text`) worden ongewijzigd getoond.

## Stappen

| # | Stap | Oplevering | Poort (naast de vaste poort) |
|---|---|---|---|
| F0 | Skelet | `app3/` met bouw, store (IndexedDB + geheugen), router, tokens, tabbalk, lege schermen, CI | `app3:build` slaagt; store bewaart en herstelt een logboek; app start offline |
| F1 | Zakken | lijst, toevoegen via plakken/QR/handmatig, controlekaart per veld, zak-detail | een geplakte zaktekst geeft dezelfde velden als `scanBeanText`; elk veld toont zijn herkomst |
| F2 | Zetten + recept | zak, kopgrootte, doel → `plan()` → receptscherm met reden en onzekerheid | een vraag geeft exact `plan()`-uitvoer weer; geen getal dat de engine niet gaf |
| F3 | Timer | teltafel, giet-aanwijzingen, erdoor-tik, pauze, wake lock | timergebeurtenissen leveren in `learn()` dezelfde `endSec`/`drainedAtSec` als getikt; telt door bij vergrendelen |
| F4 | Proeven | sterkte, zuur, afdronk, blinde keuze → notities → plezier; werkelijke waarden; blind paar | `tasting` komt in `learn()` en verandert het volgende advies zoals de engine voorschrijft |
| F5 | Logboek en inzicht | kopgeschiedenis, filter, smaakprofiel, molen-model | getallen komen uit `FactState`/`tasteProfile`/`fitGrind`, niet uit eigen rekenwerk |
| F6 | Gegevens | back-up in/uit (v3-migratie), synchronisatie, rollende back-up, wissen | import van de eigen back-up geeft de verwachte tellingen; twee browsers synchroniseren |
| F7 | Afwerking en omschakelen | PWA/service worker, toegankelijkheid, e2e-test van de hele stroom, `/app3/` → `/` | Playwright-rondgang: zak → advies → timer → proeven → nieuw advies |

Per stap: tests + `npm run e3:check` + de app3-tests groen, docs en `bouwbesluiten_v4.md` bijgewerkt, één commit of een korte reeks.

## Open punten voor Jelle

- Naam en beeldmerk van de nieuwe app (voorlopig "Brew Console").
- Of de oude app blijft bestaan naast de nieuwe, of na F7 verdwijnt.
- Smaaktaal in de interface: de negen wielcategorieën zijn Nederlands; alleen vertalen waar het wiel zelf dat doet.

## Stand (5 nov 2026)

| Stap | Stand |
|---|---|
| F0 skelet | klaar |
| F1 zakken | klaar (plakken, QR-foto, controlekaart met herkomst; geen foto-OCR en geen AI-foto) |
| F2 zetten + recept | klaar |
| F3 timer | klaar (klok afgeleid uit gebeurtenissen, wake lock, trilling) |
| F4 proeven | klaar; **F4b** (A tegen B) klaar, kernlogica getest, de proefkaart zelf niet in de browser |
| F5 logboek en inzicht | klaar, inclusief verloopgrafieken en zakpasvorm (6 nov) |
| F6 gegevens en synchronisatie | klaar; echte rondgang naar de Worker ligt bij Jelle (stap 0d) |
| F7 afwerking | PWA (eigen worker voor `/app3/`, offline start getest), toegankelijkheid (axe, WCAG 2.1 AA, licht en donker) en gehele stroom getest. **Omschakelen van `/` naar de nieuwe app is nog niet gedaan**: dat is een besluit van Jelle. |

De nieuwe app staat op `<adres>/app3/`. De oude app op `/` is ongewijzigd.

## Wat er nog niet is

- Foto-OCR van een zak in de browser (de AI-route blijft uit).
- Automatisch synchroniseren op de achtergrond en een rollende back-up.
- Gesproken aanwijzingen en een melding op de volgende giet buiten de app (alleen scherm en trilling).

## Instellingen (6 nov 2026)

Meer → **Water** (hardheid, alkaliniteit in CaCO3 of HCO3, verdunning met demiwater, snelkeuzes Dunea/Waternet/PWN/SCA met bron), Meer → **Molen** (nulpunt gecontroleerd) en Meer → **Voorkeuren** (bij een proef A tegen B ook vragen welke helderder was). Alles zijn `setting`-gebeurtenissen en gaat dus mee met back-up en synchronisatie. Water en molen sturen het recept niet (een test eist hetzelfde `plan()`-advies met en zonder).

## Ronde 1 en 1b: Zetten en Timer (6 nov 2026)

Voortgekomen uit een eigen controle van de schermen (telefoon 390 px, laptop 1280 px) en uit Timer.Coffee (ring per stap en 'Next:').

- **Zetten, telefoon:** het formulier staat de eerste keer open; daarna klapt het in tot één regel ('Zak · 250 g · doel') met 'Wijzig'. De **startknop zit vast** onder het scherm, boven de tabbalk, en staat zonder scrollen in beeld.
- **Zetten, laptop:** formulier links, recept rechts; geen samenvatting; startknop vast onderaan de rechterkolom.
- **Timer:** één stap tegelijk. Een **ring** toont de aftelling tot het einde van de stap (tot de volgende giet, of bij de laatste giet tot het verwachte einde), met de opdracht ernaast en een regel **'Hierna …'**. Bij Kasuya, waar een giet op doorlopen wacht, staat er 'wacht' in een gestippelde amberkleurige ring zonder aftelling. De totale tijd blijft groot bovenaan, omdat de gietmomenten absolute tijden zijn. De ring is voor het oog (`aria-hidden`); de tekst ernaast is de statusmelding en verandert alleen per stap, niet elke 200 ms.
- **Logica** (`core/timer.ts` → `stepGuide`): puur en getest (klaar, giet met aftelling en 'hierna', wachten op doorlopen, laatste giet, klaar).
- **Gevonden door de toegankelijkheidstest:** het grijs van kleine tekst (`--text-3`) was in het lichte thema te zwak; donkerder gemaakt. Gedane stappen hebben geen doorzichtigheid meer.
- **Niet gedaan:** gesproken aanwijzingen en geluid bij een nieuwe stap (nu trilling en scherm).

## Ontwerpinspiratie voor ronde 3 (6 nov 2026, nog niet toegepast)

Bron: Stuurlui, '10 mooie websites ter inspiratie' (gelezen). Het tweede artikel (Android Authority, 'best-looking Android app designs 2026') gaf bij ophalen 403 en is **niet gelezen**; de inhoud moet Jelle aanleveren (tekst plakken of pdf).

Het artikel gaat over **websites met veel beeld**, niet over gebruiksapps. Wat daarvan bruikbaar is voor Brew Console:
- **Rust en witruimte**; een ingehouden palet zodat de inhoud opvalt (Uit Pauline's Keuken). Past bij onze warme neutrale basis met één koperkleur.
- **Herkenbaar lettertype** als merk (The New Yorker, Pauline's Keuken); serif met schreefloos als paar (Stock Dutch Design). Nu gebruiken we alleen het systeemlettertype; een koppen-lettertype is een keuze voor ronde 3.
- **Kookmodus** met scherm aan (Pauline's Keuken): hebben we al (wake lock tijdens het zetsel).
- **Menu onderaan op mobiel** voor de duim (The White House): hebben we al (tabbalk).
- **Subtiele beweging**, niet storend of traag (Douwe Egberts, Stock Dutch Design): wij beperken beweging tot de ring, het verloop en tikfeedback, en respecteren 'minder beweging'.
- **Functie boven vorm** (het artikel zelf): een timer moet in één oogopslag leesbaar blijven; contrast en grote getallen gaan voor sfeer.

Niet bruikbaar zonder beeldmateriaal: foto-gedreven indeling, parallax, volle-breedte-foto's. Een optie voor later is een foto per zak (BeanBench en Timer.Coffee hebben die), maar dat staat niet op het plan.
