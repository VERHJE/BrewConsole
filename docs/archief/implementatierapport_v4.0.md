# Implementatierapport — Implementatieplan Reparatie v4.0

Wat gebouwd is in deze ronde, op basis van `Implementatieplan Reparatie v4.0` (het expertteam-review `claude_Brew_Engine_Deep_Dive_v1.md`, 19 bevindingen E-01 t/m E-19). Fase A en B zijn volledig gebouwd; Fase C is volledig gebouwd inclusief de drie taken die een vooraf akkoord van Jelle vereisten (BB-1, BB-2, BB-3 — alle drie toegekend, zie `bouwbesluiten_v4.md`). Fase D is bewust NIET in code opgelost — dat zijn vier onderzoeksvragen die de PDR §41 hard stop buiten de implementatie plaatst; ze staan geregistreerd in `bouwbesluiten_v4.md`.

Het Master Expert Team-protocol (§0.1: LEES → PATCH → TEST → VERGELIJK → NIEUWE TEST → RAPPORTEER) is per taak aangehouden. Elke taak is los gecommit.

## Fase A — Eerlijkheidsherstel (geen enkele taak raakt een receptgetal)

- **A-1** (E-07a): het TDS/EY-doelvenster en zijn herkomst (`G-CONTROL-CHART-01`) staan nu op het Prep-scherm (`#target-window-note`), niet alleen beweerd in een code-comment. Disclaimer- en commentaartekst gecorrigeerd. Test: kernflow-smoke.
- **A-2** (E-07b): het kopgewichtlabel belooft niet langer functionaliteit die pas in C-5 gebouwd is. Tekst opnieuw aangepast ná C-5 (zie daar).
- **A-3** (E-01, tussenoplossing): altijd zichtbare `#profile-scope-note` legt uit dat het profiel vandaag vooral het gietschema stuurt, niet de receptgetallen — gemarkeerd om te vervallen zodra D-1 is opgelost. Test: kernflow-smoke.
- **A-4** (E-06): overlays zonder gecorroboreerd `pulseCount` (Rao V60, Perger) melden nu dat het AANTAL beurten een eigen invulling is; de evidence-badge kan de disclaimer niet meer tegenspreken (`pulseCountSourced`). Test: pure-logic.
- **A-5** (E-16): de dode `sizeConsistencyWarning` (kon per constructie nooit vuren) is verwijderd i.p.v. "werkend gemaakt". Test: pure-logic.
- **A-6** (E-17): `nlRatio()` normaliseert de basisratio naar een Nederlandse komma, overal waar hij verschijnt. Eén bestaande test (ratio-orde-van-grootte) bijgewerkt van punt- naar komma-regex. Test: pure-logic.
- **A-7** (E-15, Bouwbesluit BB-4): de temperatuurnotitie beweert niet langer dat de 94–96 °C-band voor lichte branding getest is door een onderzoek dat zelf maar tot 93 °C ging — op beide plekken waar de claim stond (`tempBandNote` én `#disclaimer`). Geen receptgetal gewijzigd (BB-4: het anker blijft staan, alleen het label is eerlijker).

**Onzekerheid:** geen. Baseline-diff na Fase A bevat uitsluitend A-6's decimaalteken-normalisatie op `st=0`-regels, exact zoals de regressiematrix (§9) voorspelt.

## Fase B — Integriteitsherstel

- **B-1** (E-02, kritiek): de sterktehendel klemt nu op het bestaande `V60_DOSE_CEILING` (15–22 g), met een expliciete melding bij klemmen (`strengthNote`, nooit een stille substitutie) en een uitgeschakelde chip wanneer een stap toch niets zou opleveren. Geverifieerd: 0 schendingen over het volledige raster (265–380 ml × sterkte −1/0/+1). Baseline-diff: alleen `st≠0` aan de randen.
- **B-3** (E-04): de giet-intervallen zijn nu exact `POUR_CYCLE_SEC` (voorheen dubbeltelling van `FINAL_DRAWDOWN_SEC`, 37–50 s in plaats van 30 s). `totalTime` per profiel volledig ongewijzigd (N-6). Baseline-diff: alleen de `steps`-kolom.
- **B-2a** (E-03, kritiek): de app geeft de gebruiker niet langer de schuld van zijn eigen giet-schema wanneer dat schema zelf al buiten de contacttijd-diagnostische band valt (op Chemex vóór B-2b: elk schema). Tekstlaag, geen receptgetal.
- **B-2b** (Bouwbesluit BB-1, akkoord): `POUR_CYCLE_SEC`/`FINAL_DRAWDOWN_SEC` zijn per brewer afgeleid uit de al bestaande, klasse-B `contactTimeGuidance` — V60 blijft exact de referentie (0 wijziging), Chemex' 3-pulse Kernrecept-schema landt nu binnen zijn eigen band (242 s). D-4 blijft intact: een ander aantal giet-momenten geeft nog steeds een ander schema. Zie `bouwbesluiten_v4.md` voor de precieze afleiding (niet volledig gespecificeerd door het plan).
- **B-4** (E-09): `findProfileTwins()` vergelijkt nu het werkelijk berekende recept (fingerprint), niet het gemapte overlay-id. Onthult twee eerder gemiste tweelinggroepen (`fruitig_clean`/`bloemig_delicaat`, `sirooprig_vol`/`evenwichtig_flex` op V60; vijf profielen op Chemex). Baseline-diff leeg.
- **B-5** (E-08): bij bypass toont `bypassNote` nu de werkelijke in-brewer-ratio (~1:12 i.p.v. de eindratio 1:17,4) plus het venstervoorbehoud. Baseline-diff leeg.
- **§8.2**: de vier bestaande "schijnkeuze-detectie"-tests die de oude aanname van precies één tweelinggroep codeerden zijn vervangen door de door B-4+C-1 daadwerkelijk gemeten groepen, plus een nieuwe structurele bewaking dat `PROFILE_MERGE_GROUPS` nooit een groep kan samenvoegen die geen echte tweeling (meer) is.

**Onzekerheid:** B-2b's schaalfactor-methode (bandmidden-verhouding t.o.v. V60) is een eigen, verdedigbare interpretatie — een andere aanname over de "typische" pulseCount zou een net iets andere factor geven. Zie Bouwbesluit BB-1.

## Fase C — Smaakwinst en leerlus

- **C-1** (E-05, Bouwbesluit BB-2, akkoord — vereist B-4): Kasuya's eigen "taste dial" is aangezet. `zoet` (50+70) en `neutraal`/klassiek+vol_rond (60+60) zijn letterlijk de twee gepubliceerde renderingen; `helder`/heel_fruitig (70+50) is een eigen, gelabelde extrapolatie. `PROFILE_MERGE_GROUPS` verliest `zoet` (nu aantoonbaar een ander schema). Baseline-diff: alleen de vier Kasuya-profielen, alleen de eerste twee pour-hoeveelheden.
- **C-2** (E-11): elke logging draagt een `beanSnapshot` (verwerking, beoogd gebruik, branddiepte). `RECORD_SCHEMA_VERSION` 3→4, additief — records van vóór C-2 vallen terug op de live boon-opzoeking, exact hun huidige gedrag. Migratie-/rondgangtests dekken schemaVersion 1 t/m 4.
- **C-3** (E-12, vereist C-2): de leerlus poolt niet meer over volumes die >40% verschillen (`LEARNING_VOLUME_TOLERANCE`, hergebruikt van de al bestaande `SIZE_CONSISTENCY_TOLERANCE`-vraag, geen nieuw getal). Maakt het model strenger — een bestaande correctie kan later verschijnen dan voorheen, expliciet benoemd risico.
- **C-4** (E-13): het onderextractie-patroon is verbreed (`zoet laag` → `zoet niet hoog`, 6,4%→8,1% dekking) mét conflictbewaking: als onder- én overextractie nu beide matchen, adviseert de app geen maalrichting maar vraagt om herhaling op hetzelfde recept.
- **C-5** (E-07b, Bouwbesluit BB-3, akkoord — alleen weergave): `measuredRetention()` berekent de werkelijke retentie over bruikbare, niet-bypass loggingen (plausibiliteitsfilter 1,0–3,5 g/g, drempel n=5). Vervangt `LIQUID_RETAINED_RATIO` NIET automatisch (N-1) — toont alleen naast de vaste aanname op het Prep-scherm.

**Onzekerheid:** C-3's risico (een leercorrectie kan door de strengere volumefilter tijdelijk verdwijnen) is inherent aan de taak zelf en door het plan al als juiste richting benoemd, niet als bug.

## Fase D — Onderzoek (geen code)

D-1 t/m D-4 zijn geregistreerd in `bouwbesluiten_v4.md` als openstaande onderzoeksvragen. Geen van de vier kon door Claude Code worden opgelost zonder een inhoudelijke beslissing die buiten de implementatiescope valt.

## Testresultaten

`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 node --test tests/*.test.mjs` — **131/131 groen**, over vier bestanden:

- `brewconsole.pure-logic.test.mjs` — rekenlogica tegen de echte broncode. Uitgebreid met: A-4/A-5/A-6 (Fase A), B-1/B-3/B-2a/B-2b/B-4/B-5 (Fase B, inclusief de vervangen §8.2-tests), C-1/C-2/C-3/C-4/C-5 (Fase C).
- `kernflow.smoke.test.mjs` — echte-browser Playwright-tests. Uitgebreid met: A-1/A-3 (doelvenster/profielbereik zichtbaar), B-2a (Chemex-melding op het Klaar-scherm, bijgewerkt profiel na B-2b), C-2 (migratie schemaVersion 1/2/3, leercorrectie-terugval zonder beanSnapshot, rondgang schemaVersion 4). Twee bestaande tellingen (zichtbare V60-profielen, tweeling-notities) bijgewerkt als mechanisch gevolg van B-4/C-1.
- `sw-registration.test.mjs` — ongewijzigd, geen nieuwe bestanden toegevoegd, dus geen `CACHE_VERSION`-ophoging nodig.
- `_baseline.mjs` — geen testbestand (draait niet mee in de suite), het gedragsnulmeting-script uit §2 van het plan. Elke fase-diff is handmatig geverifieerd tegen de regressiematrix (§9) vóórdat de volgende taak begon.

## Wat niet is veranderd

De engine-bundel is byte-identiek aan vóór deze ronde. `computeMethodAdvice()`, `buildReasoningLines()`, de seed-boondata, OCR, de brouwtimer/wake-lock-logica en de PWA/service-worker-cachestrategie zijn niet aangeraakt. Alle acht non-negotiables (N-1 t/m N-8, §1.1 van het plan) zijn aantoonbaar intact — zie `bouwbesluiten_v4.md` voor de details per punt.

## Nog open

- **D-1 t/m D-4** — zie `bouwbesluiten_v4.md`, de grootste resterende schuld volgens het plan zelf.
- **BB-3's vervolgvraag** (een expliciete schakelaar om de gemeten retentie de vaste aanname te laten vervangen) is een aparte, latere beslissing — nog niet gebouwd.
- **Handmatige controles** (Gate 3/4 uit het plan: toetsenbord/VoiceOver/contrast op de gewijzigde schermen, iPhone/iPad, één kernflow-doorklik per fase) zijn niet uitgevoerd in deze ronde — dat vereist een fysiek apparaat resp. een browserdemo die buiten een geautomatiseerde testrun valt.

## Bestanden

- `brewconsole_v2_2.html` — de app zelf, alle drie fasen (A/B/C) verwerkt. `index.html` is een symlink hiernaartoe (Netlify-deployment blijft `index.html` serveren).
- `tests/load-app.mjs`, `tests/brewconsole.pure-logic.test.mjs`, `tests/kernflow.smoke.test.mjs`, `tests/sw-registration.test.mjs` — uitgebreide testsuite, 131/131 groen.
- `bouwbesluiten_v4.md` — de vier Bouwbesluiten (BB-1 t/m BB-4) plus alle scope-/implementatiebeslissingen uit deze ronde en de vier D-vragen.
- Dit rapport.
