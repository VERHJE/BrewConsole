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
- **Filtru, BeanBench, Coffee Book**: de sites gaven bij het ophalen een fout (429/503) en zoeken leverde niets op. **Niet beoordeeld**; hier wordt dus niets aan ontleend. Als Jelle schermafdrukken of concrete wensen heeft, kan dat alsnog.

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
| F5 logboek en inzicht | klaar zonder verloopgrafieken en zakpasvorm |
| F6 gegevens en synchronisatie | klaar; echte rondgang naar de Worker ligt bij Jelle (stap 0d) |
| F7 afwerking | PWA (eigen worker voor `/app3/`, offline start getest), toegankelijkheid (axe, WCAG 2.1 AA, licht en donker) en gehele stroom getest. **Omschakelen van `/` naar de nieuwe app is nog niet gedaan**: dat is een besluit van Jelle. |

De nieuwe app staat op `<adres>/app3/`. De oude app op `/` is ongewijzigd.

## Wat er nog niet is

- Verloopgrafieken (sterkte en tijd per zak) en `beanFit` in het zakdetail.
- Foto-OCR van een zak in de browser (de AI-route blijft uit).
- Automatisch synchroniseren op de achtergrond en een rollende back-up.
- Gesproken aanwijzingen en een melding op de volgende giet buiten de app (alleen scherm en trilling).

## Instellingen (6 nov 2026)

Meer → **Water** (hardheid, alkaliniteit in CaCO3 of HCO3, verdunning met demiwater, snelkeuzes Dunea/Waternet/PWN/SCA met bron), Meer → **Molen** (nulpunt gecontroleerd) en Meer → **Voorkeuren** (bij een proef A tegen B ook vragen welke helderder was). Alles zijn `setting`-gebeurtenissen en gaat dus mee met back-up en synchronisatie. Water en molen sturen het recept niet (een test eist hetzelfde `plan()`-advies met en zonder).
