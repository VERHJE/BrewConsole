# Technisch changelog — Implementatieplan v3.0 (Brew Engine / C3S Pro)

Op basis van `Brew_Engine_Implementatieplan_v3_C3S_Pro` (docx/pdf), met
`Timemore_C3S_Pro_Technische_Deep_Dive.pdf` als brongebonden achtergrond voor de
grinder-feiten en `Brew_Engine_Expert_Audit_Report_v2_with_C3S_Deep_Dive.pdf` als
corroborerende audit (geen tegenstrijdigheden met het plan gevonden). Scope voor deze
ronde, in overleg vastgesteld: **P0 + P1 volledig gebouwd; P2/P3 gedocumenteerd als
vervolgwerk, niet gebouwd** (zie "P2/P3 — bewust niet gebouwd" hieronder).

De motor-bundel is deze ronde bewust wél aangepast — met expliciete toestemming, die
het "engine blijft byte-identiek"-non-negotiable uit de vorige ronde (Reparatieplan
v4.0) voor déze ronde opheft. Elke motor-wijziging staat hieronder met zijn bron en
evidence-klasse.

Zes commits, elk los getest en op de volledige baseline-sweep geverifieerd:

| Commit | Taak |
|---|---|
| `66c3777` | P0 — regressie-baseline verbreed (ook `grindStartingPoint`/`grindStartingRange`) |
| `6446a99` | P1 — C3S Pro registry v3 + 13–18/15–17 range + 83,3 µm semantiek |
| `5cc4987` | P1 — Model Policy (versioned TDS/EY target windows) |
| `6299b46` | P1 — bypass method guard (V60-scoped) |
| `b275889` | P1 — technique provenance audit (source vs. synthesis) |
| `e128b42` | P1 — canonical recommendation pipeline (`selectRecommendation()` als enige winnaar-route) |

## Bestanden gewijzigd

- `brewconsole_v2_2.html` — enige applicatiebestand; zowel de engine-bundel
  (`window.BrewEngineBundle`, eerste `<script>`-blok) als de app-laag (tweede
  `<script>`-blok) zijn aangeraakt deze ronde.
- `tests/brewconsole.pure-logic.test.mjs` — 6 nieuwe `describe`-blokken (26 nieuwe tests
  in totaal: 10 C3S registry, 3 Model Policy, 3 bypass guard, 3 technique provenance, 4
  canonical pipeline, plus 1 fix aan een bestaande test — zie "Tests" hieronder).
- `tests/kernflow.smoke.test.mjs` — C3S grinder-blok smoke test + bypass-method-guard
  smoke test.
- `tests/_baseline.mjs` — fingerprint verbreed met `grindStartingPoint`/`grindStartingRange`
  (P0).
- `tests/load-app.mjs` — `__TEST_EXPORTS__`-shim uitgebreid met `MODEL_POLICY`.
- `_baselines_v3/` (nieuw) — vijf sequentiële baseline-snapshots, één per taak, elk
  handmatig kolom-voor-kolom gediffed vóór de volgende taak begon (zelfde discipline als
  `_baselines/` uit de vorige ronde).

## Functies gewijzigd/toegevoegd

**Engine-bundel:**
- `translateSetting()` — retourneert nu zowel `practicalRangeHint` als
  `startingRangeHint` (voorheen alleen het laatste); `micronsPerClickEstimate` is
  `resolved(...)` i.p.v. `contested(...)`; defensieve vloer-check nu op beide ranges.
- `mechanicalAdjustmentMicrons(clicks)` — nieuw. Enige plek waar `adjustmentMicronsPerClick`
  met een click-aantal vermenigvuldigd wordt.

**App-laag:**
- `overlayTemplateIdOf()`, `evidenceClassToBand()`, `selectViaCanonicalPipeline()` — nieuw
  (canonical pipeline).
- `computeRecipe()` — overlay-selectie loopt nu via `selectViaCanonicalPipeline()` i.p.v.
  een eigen `.find()` op `mapEntry.overlay`; retourneert nu ook `modelPolicyVersion`,
  `grindPracticalRange`, `grindMechanicalMicron`, `authorUnverified`; bypass-berekening
  heeft nu een `bypassMethodSupported`/`bypassActuallyApplied`-onderscheid.
  `buildFallbackRecipe()` — bijgewerkt met dezelfde nieuwe velden als default.
- `renderBypassToggle()` — vroege guard voor niet-V60-methoden (disabled knop +
  uitleg + reset van leftover `state.bypass`).
- `saveBrewLogEntry()` — logt nu ook `modelPolicyVersion` per record.

## Data gewijzigd (met provenance — plan §25's "elke gewijzigde numerieke regel")

| Waarde | Was | Wordt | Provenance | Bron |
|---|---|---|---|---|
| C3S Pro V60 starting range | 13–16 clicks (één ongedifferentieerd begrip, `ESTIMATED`/C) | **15–17** clicks, `SOURCED`/B | SOURCED, klasse B | SRC-C3S §1–3 |
| C3S Pro V60 practical range | *(bestond niet als apart begrip)* | **13–18** clicks, `SOURCED`/B | SOURCED, klasse B | SRC-C3S §1–3 |
| Micron/click | 83 µm vs. 50 µm, `CONTESTED` (twee bronnen tegen elkaar) | **83,3 µm/click**, `SOURCED`/B (mechanische verstelling, expliciet NIET particle size); 50 µm-tegenclaim blijft bewaard in `TIMEMORE_C3S_PRO_MICRON_HISTORICAL_LEDGER` (audit-only, niet meer gelijkwaardig in de UI) | SOURCED, klasse B (was: CONTESTED) | SRC-C3S §1–3 |
| TDS/EY doelvensters (LOWER/FULLER) | los literal (`ENGINE_TARGET_WINDOWS`), ongeversioneerd | Zelfde getallen, nu via `MODEL_POLICY.targetWindows[...]` (versie 3.0), expliciet `APP_ASSUMED` gelabeld | APP_ASSUMED (ongewijzigd getal, nu geversioneerd + expliciet gelabeld i.p.v. stilzwijgend) | eigen productaanname (G-CONTROL-CHART-01, ongewijzigd) |
| Bypass/concentraat-methode | toegepast op elke zettermethode zonder guard | alleen toegepast wanneer `methodKey === 'v60'`; elders expliciet "NIET toegepast" i.p.v. stil genegeerd | ongewijzigd getal (30%-vuistregel), scope nu correct beperkt | Drip Roast V60-bypassgids (ongewijzigd) |

**Geen enkel dosis/water/ratio/temperatuur/stap-getal is gewijzigd voor bestaande
recepten** — de volledige baseline-sweep (180 methode×profiel×roast×sterkte-combinaties,
`_baselines_v3/baseline_voor.txt` t/m `baseline_na_canonical_pipeline.txt`) bevat na alle
zes commits precies één verschuiving: `grindStartingPoint`/`grindStartingRange` op V60
van 13–16 naar 15–17 (de bedoelde rangewijziging, Chemex blijft ongewijzigd
`RESEARCH_GAP`). Alle overige kolommen (dose/ratioText/temp/totalTime/technique/steps)
zijn byte-voor-byte identiek vóór en ná elke taak.

## Migrations

Geen. `RECORD_SCHEMA_VERSION` is niet opgehoogd — `modelPolicyVersion` op nieuwe
brewlog-records is additief (`null` op oudere records, geen backfill, geen herinterpretatie
van bestaande records — historische logs blijven onaangeroerd, zoals het plan §26 eist).

## Tests

- `tests/brewconsole.pure-logic.test.mjs`: 96 → **125** tests (26 nieuw, 1 bestaande test
  gecorrigeerd — zie hieronder).
- `tests/kernflow.smoke.test.mjs`: +2 Playwright-smoke tests (C3S grinder-blok,
  bypass-guard).
- Volledige QA-suite (`npm run qa`): **157/157** groen (was 150/150 vóór deze ronde).
- **Test-fix, geen productiecode-wijziging:** de eerste versie van de technique-provenance-
  test gebruikte `chemex/robuust` (dat profiel mapt op `APRIL_HOUSE_METHOD`, niet op Rao) om
  `RAO_CHEMEX_DISCLOSED`'s `attribution.verified === false` te testen. Gecorrigeerd naar
  `chemex/fruitig_clean` (het profiel dat daadwerkelijk aan `RAO_CHEMEX_DISCLOSED` gekoppeld
  is) — geen engine- of app-gedrag veranderd, alleen de testinvoer was fout.

## Nieuwe invariants

1. `mechanicalAdjustmentMicrons()` is de enige plek waar `adjustmentMicronsPerClick` met
   een click-aantal vermenigvuldigd wordt — nooit doorgegeven aan een particle-size/D50/D90-
   veld (er bestaat geen zodanig veld; dit blijft zo, per plan §26).
2. `bypassActuallyApplied` is nooit `true` wanneer `methodKey !== 'v60'` (`computeRecipe()`,
   defensief + UI-guard in `renderBypassToggle()`).
3. Elke kandidaat die `selectViaCanonicalPipeline()` binnenkomt deelt per constructie
   dezelfde `core.targetWindow` als `candidateWindow` — er wordt nooit een TDS/EY-
   voorspelling per kandidaat gefabriceerd (zie `e128b42`'s commit-message voor de volledige
   redenering).
4. De 0–7-click veiligheidsvloer (`TIMEMORE_C3S_PRO_CLICK_FLOOR_MAX`) geldt nu defensief
   voor zowel de practical als de starting range (voorheen alleen voor de ene range die
   bestond).

## UI-copy wijzigingen

- Grind-blok: aparte weergave van practical range (13–18) en starting range (15–17),
  plus de mechanische specificatie (83,3 µm/click) met een expliciete "géén particle-
  size-/deeltjesgrootte-meting"-disclaimer — vervangt de oude "onopgeloste tegenstrijdigheid
  (83 vs. 50 µm)"-tekst.
- `#target-window-note`: toont nu `Model Policy v3.0 (APP_ASSUMED)` naast het bestaande
  TDS/EY-doelvenster.
- Bypass-knop op niet-V60-methoden: disabled, met uitleg waarom (was voorheen zonder guard
  overal aanklikbaar).
- Evidence-badge-rij: nieuwe `warn`-badge "Ongeverifieerde toeschrijving" wanneer een
  overlay se `attribution.verified === false` is (vandaag: Rao/Chemex).

## Bekende resterende research gaps

- **G-CONTROL-CHART-01** (TDS/EY-doelvensters): blijft `APP_ASSUMED`, geen eigen
  onderzoekscorpus — nu tenminste geversioneerd (Model Policy v3.0) i.p.v. stilzwijgend.
- **C3S Pro particle-size-per-click**: nooit gebouwd, blijft bewust ongebouwd (plan §26 —
  "geen universeel grinder-to-particle-size-model").
- **C3S Pro op Chemex**: numeriek startbereik blijft `RESEARCH_GAP` (ongewijzigd, plan §28
  eist expliciet dat dit zo blijft).
- **Personal calibration** (P2): zie hieronder.

## P2/P3 — bewust niet gebouwd deze ronde (vervolgwerk)

In overleg vastgesteld scope: P0+P1 volledig, P2/P3 als gedocumenteerd vervolgwerk.

- **P2 — Personal calibration refinement** ("Approved learning"): de bestaande
  goedgekeurd-alleen leerlus (C-3 uit Reparatieplan v4.0) blijft ongewijzigd. Het plan se
  eigen §27-verwachting ("Persoonlijke kalibratie: gebaseerd op goedgekeurde eigen
  brouwsels") is dus al voor een deel waar via de bestaande leerlus; een diepere koppeling
  specifiek aan de C3S Pro-registry (bv. een per-gebruiker geleerde starting-point-bias
  binnen de 15–17-range) is niet gebouwd. Vereist een eigen ontwerpbeslissing (hoeveel
  gewicht een individuele kalibratie krijgt t.o.v. de SOURCED starting range) die buiten
  deze ronde valt.
- **P2 — Golden fixtures** ("Stable numerical regression"): de `_baselines_v3/`-snapshots
  in deze ronde zijn functioneel gelijkwaardig (volledige sweep, kolom-voor-kolom
  gediffed per taak) maar zijn ad-hoc scripts, geen ingerichte golden-fixture-testlaag
  (vaste, in de test-suite zelf opgenomen verwachte-outputbestanden met een
  diff-assertie). Aanbevolen vervolgtaak: `_baselines_v3/baseline_na_canonical_pipeline.txt`
  omzetten naar een permanente golden-fixture-test in `tests/`.
- **P3 — PWA E2E** ("Offline reliability"): de bestaande `sw-registration.test.mjs`
  (cold-start-offline, network-first-na-deploy) is ongewijzigd en blijft groen; een
  bredere E2E-suite die de volledige PWA-flow (inclusief de nieuwe C3S/Model
  Policy/bypass-guard-UI) offline doorloopt is niet uitgebreid deze ronde.
- **P3 — Evidence/OCR hardening** ("Better future ingestion"): geen wijziging aan de
  boon-OCR-pijplijn deze ronde; buiten scope van dit plan (raakt geen enkele
  C3S/recommendation-taak).

## Wat niet is veranderd

`computeMethodAdvice()`, `buildReasoningLines()`, de seed-boondata, OCR, de
brouwtimer/wake-lock-logica, de service-worker-cachestrategie, en alle Reparatieplan
v4.0-non-negotiables (N-1 t/m N-8) blijven intact. Chemex' C3S Pro-startbereik blijft
`RESEARCH_GAP` (plan §28 eist dit expliciet).

## Eindcontrole — acceptance checklist (plan §28)

Volledige testsuite op de eind-HEAD (`e128b42`..`afabc10`, incl. deze documentatie-commit):
**157/157 groen** (`npm run qa`). Baseline-sweep vóór deze ronde
(`_baselines_v3/baseline_voor.txt`, 180 methode×profiel×roast×sterkte-combinaties) vs. ná
alle zes commits: **0 verschil** op dose/ratioText/temp/totalTime/technique/steps op alle
180 rijen; het enige verschil is `grindStartingPoint`/`grindStartingRange` op alle 99
V60-rijen (13–16 → 15–17, exact zoals bedoeld — geverifieerd dat elke verschoven waarde
klopt met `ROAST_GRIND_ANCHOR_FRACTION`'s bestaande, ongewijzigde formule toegepast op de
nieuwe range); de 81 Chemex-rijen zijn op die twee kolommen ook 0 verschil (blijft leeg/
`RESEARCH_GAP`, zoals vereist).

- [x] Baseline tests groen. — 157/157 (`npm run qa`).
- [x] Canonical RecommendationOutput geïmplementeerd. — `selectViaCanonicalPipeline()`
      roept `B.selectRecommendation()` aan (commit `e128b42`).
- [x] `computeRecipe()` omzeilt recommendation ranking niet meer. — de oude `.find()`-
      schaduwselectie is vervangen; geverifieerd via 4 gerichte tests + volledige
      baseline-sweep.
- [x] C3S Pro registry bevat S2C660 / 38 mm / SUS420. — `TIMEMORE_C3S_PRO_MECHANICAL_FACTS`
      (commit `6446a99`).
- [x] 83,3 µm/click is SOURCED mechanical fact. — idem, `evidenceClass: "B"`.
- [x] Geen click→PSD conversion. — `mechanicalAdjustmentMicrons()` is de enige
      vermenigvuldiging met clicks; er bestaat geen particle-size/D50/D90-veld dat dit
      resultaat ontvangt (niet gebouwd, per plan §26).
- [x] 13–18 V60 practical range. — `TIMEMORE_C3S_PRO_V60_PRACTICAL_RANGE`.
- [x] 15–17 V60 starting range. — `TIMEMORE_C3S_PRO_V60_STARTING_RANGE`.
- [x] 0–6/7 safety floor blijft hard. — defensieve `HARD_CONSTRAINT_VIOLATION`-check geldt
      nu voor beide ranges (was: alleen de ene range die bestond).
- [x] Chemex C3S Pro numeric starting range blijft unresolved. — bevestigd via
      baseline-sweep: alle 81 Chemex-rijen houden lege grind-kolommen, vóór én ná.
- [x] 50 µm-claim niet meer als gelijkwaardige actieve hardwarewaarde in UI. — verplaatst
      naar `TIMEMORE_C3S_PRO_MICRON_HISTORICAL_LEDGER` (audit-only) met `supersededBy`;
      UI toont alleen de SOURCED 83,3 µm-waarde.
- [x] TDS/EY windows versioned APP-ASSUMED. — `MODEL_POLICY` v3.0 (commit `5cc4987`).
- [x] Bypass V60-scoped. — `bypassMethodSupported`/`bypassActuallyApplied` +
      `renderBypassToggle()`-guard (commit `6299b46`).
- [x] Source recipe vs app synthesis zichtbaar. — audit tegen de plan se 5-categorie
      taxonomie (commit `b275889`): 4/5 al zichtbaar, nieuwe "Ongeverifieerde
      toeschrijving"-badge voor de 5e.
- [x] Approved-only learning intact. — niet aangeraakt deze ronde; de goedgekeurd-alleen
      leerlus uit Reparatieplan v4.0 (C-3) is ongewijzigd, alle bestaande leerlus-tests
      blijven groen.
- [x] Historical snapshots intact. — geen enkele bestaande brewlog-veld herschreven;
      `modelPolicyVersion` is additief (`null` op oudere records); `RECORD_SCHEMA_VERSION`
      niet opgehoogd.
- [x] Personal calibration cannot overwrite hardware facts. — `TIMEMORE_C3S_PRO_MECHANICAL_FACTS`
      is `Object.freeze()`'d; geen enkel calibratie- of leerlus-pad in de hele codebase
      schrijft ernaar.
- [x] Provenance tests groen. — 3 nieuwe technique-provenance-tests + 10 nieuwe C3S
      registry-tests, alle groen.
- [x] PWA offline E2E groen. — `sw-registration.test.mjs`, 3/3, ongewijzigd en nog steeds
      groen.
- [x] Import/export backwards compatibility groen. — geen import/export-code aangeraakt
      deze ronde (`git diff` op `brewconsole_v2_2.html` bevat geen wijziging in die
      functies); bestaande gedrag dus ongewijzigd.
- [x] Changelog/documentation bijgewerkt. — dit document.

**19/19 items uit §28 afgetekend.**
