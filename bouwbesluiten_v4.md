# BREW INTELLIGENCE 2.0 — Bouwbesluiten v4

Vastgelegd bij de implementatie van `Implementatieplan Reparatie v4.0` (19 bevindingen E-01 t/m E-19 uit het expertteam-review `claude_Brew_Engine_Deep_Dive_v1.md`). Dit document is de korte, uitvoerbare samenvatting van de vier Bouwbesluiten die het plan zelf niet nam (§7), plus de scope-/implementatiebeslissingen die tijdens het bouwen zelf nodig waren, en de vier openstaande onderzoeksvragen uit Fase D (§6) — geregistreerd als openstaande vragen, niet als voetnoot.

## Bouwbesluiten (§7 van het reparatieplan — vooraf voorgelegd aan Jelle, akkoord gekregen)

| # | Besluit | Betreft | Genomen keuze | Motivering |
| --- | --- | --- | --- | --- |
| **BB-1** | Worden `POUR_CYCLE_SEC`/`FINAL_DRAWDOWN_SEC` brewer-specifiek? | B-2b | **Ja — gebouwd.** | Zonder dit bleef Chemex een toestel waarvan geen enkel schema in zijn eigen contacttijd-diagnostische band viel. B-2a maakte dat eerlijk (de app geeft de gebruiker niet langer de schuld van zijn eigen schema), maar loste het probleem zelf niet op. Zie "B-2b — de precieze afleiding" hieronder voor de methode, die het plan zelf niet volledig specificeerde. |
| **BB-2** | Mag `helder` (Kasuya fase 1 = 70+50 bij 300 ml) als vertrekpunt-niveau worden toegevoegd naast de twee letterlijk gepubliceerde renderingen `zoet`/`neutraal`? | C-1 | **Ja — gebouwd.** | Twee van de drie standen zijn geen invulling maar bronversies (50+70 en 60+60, beide letterlijk gepubliceerd); alleen `helder` is een gelabelde eigen extrapolatie van een RESOLVED mechanisme — exact het patroon dat `ROAST_GRIND_ANCHOR_FRACTION` al volgt (Bouwbesluit B-2 uit v3), en toetsbaar via de leerlus. |
| **BB-3** | Mag de gemeten retentie ooit de vaste aanname van 2,0 g/g vervangen? | C-5 | **Alleen weergave, geen automatische substitutie — gebouwd.** | Automatische substitutie zou elk receptgetal in de app stilzwijgend wijzigen (non-negotiable N-1). C-5 toont het gemeten getal (vanaf 5 bruikbare metingen) náást de aanname; een expliciete schakelaar om de aanname daadwerkelijk te vervangen is een aparte, latere beslissing die niet in deze ronde is gebouwd. |
| **BB-4** | Moet `ROAST_TEMP_ANCHOR.light` (94–96 °C) omlaag, of blijft het staan met het eerlijkere label uit A-7? | A-7 | **Laten staan met het label — geen receptgetal gewijzigd.** | Verlagen zou een receptwijziging zijn op basis van een tekstredenering; het anker steunt op gangbare praktijk voor lichte brandingen, alleen niet op de specifieke studie (Batali/Ristenpart/Guinard, tot 93 °C getest) waar de oude notitie zich ten onrechte op beriep. A-7 corrigeert daarom alleen de tekst, op de twee plekken waar de tegenspraak stond (`tempBandNote` in `computeRecipe()` én de `#disclaimer`-tekst). |

### B-2b — de precieze afleiding (niet volledig gespecificeerd door het plan)

Het reparatieplan liet de exacte formule voor B-2b bewust open ("arithmetiek op een bestaand evidence-getagd getal... maar vereist expliciet akkoord"). Gekozen methode, toegepast in `brewerPourCycleConstants()`:

- **V60 blijft de referentie** (schaalfactor 1 — de bestaande 30 s/40 s, want V60's eigen 3-pulse Kernrecept-schema (160 s) valt al ruim binnen zijn eigen band van 120–210 s). Voor V60 verandert dus **niets** — geverifieerd: baseline-diff op alle V60-regels is 0.
- Voor elke andere brewer schaalt `POUR_CYCLE_SEC`/`FINAL_DRAWDOWN_SEC` mee met de verhouding tussen de **middens** van de contactTimeGuidance-banden van die brewer en V60 (`chemexMid / v60Mid = 270 / 165 ≈ 1,636`), afgerond op hele seconden. Voor Chemex geeft dat 49 s/65 s in plaats van 30 s/40 s.
- Resultaat: het 3-pulse Kernrecept-schema op Chemex landt nu op 242 s (binnen de band 240–300 s). Schema's met een ander aantal giet-momenten (Hoffmann, 2 pulses, 193 s; Perger, 1 pulse, 144 s) vallen terecht nog steeds erbuiten — D-4 (schemalengte volgt het aantal giet-momenten, niet omgekeerd) blijft dus volledig intact. B-2a's eerlijke melding ("dit schema valt zelf al buiten de band") vangt precies die resterende gevallen op.
- Dit is zelf een vertrekpunt-niveau keuze, geen gepubliceerd getal: een andere aanname over de "typische" pulseCount waarop je kalibreert (hier: 3, de Kernrecept-default) zou een net iets andere schaalfactor geven. Toetsbaar via `tests/brewconsole.pure-logic.test.mjs`, describe-blok "B-2b".

## Openstaande onderzoeksvragen (Fase D, §6 van het plan) — NIET door Claude Code opgelost

Deze vier punten vragen een inhoudelijke beslissing die de PDR §41 hard stop expliciet buiten de implementatie plaatst. Geregistreerd hier als openstaande onderzoeksbrief naar Layer 2/Layer 3, niet als code-taak.

| # | Vraag | Bevinding | Status |
| --- | --- | --- | --- |
| **D-1** | Hoe moeten de twee sensorische vensters (LOWER_STRENGTH_MODERATE_EXTRACTION vs. FULLER_BODIED) eruitzien, zodat elf profielknoppen daadwerkelijk verschillende recepten opleveren? Acceptatiecriterium: de ratio's van de twee vensters moeten minimaal 1,0 verschillen (nu: 15,51 vs. 15,27 → verschil 0,26). Deelvraag: is "fruitig → lagere EY (18–20)" verdedigbaar, of omgekeerd? | E-01 | **Open.** A-3 heeft dit tijdelijk eerlijk gemaakt in de UI (`#profile-scope-note`, gemarkeerd om te vervallen zodra D-1 is opgelost). |
| **D-2** | Onderbouwt "~15–22 g / 5–6 cm bed" (V60_DOSE_CEILING) werkelijk een ONDERgrens, of is 15 g te streng voor een enkele kop op 250 ml? Zo nee: een gelabelde waarschuwing i.p.v. een blokkade. | E-18 | **Open.** Niet aangeraakt — B-1's dosisklem handhaaft de bestaande grens ongewijzigd. |
| **D-3** | De dormante beslislaag (`selectRecommendation()`, `computeRecipeFit()`, `computeEvidenceConfidence()` in de engine-bundel): inweven in `computeRecipe()`, of verwijderen? De huidige tussentoestand (bestaat, is getest, wordt niet gebruikt) is de slechtste van de drie opties. | E-10 | **Open.** Buiten scope van dit reparatieplan (§0.3: geen enkele wijziging aan de engine-bundel). |
| **D-4** | Batchgrootte schaalt nu strikt lineair op watervolume; eerder onderzoek verbiedt die aanname expliciet. Welke niet-lineariteit is onderbouwd? | §10 van de PDR | **Open.** Niet aangeraakt in deze ronde. |

**E-14 (branddiepte-resolutie te grof)** is in het reparatieplan zelf al gemarkeerd als "geregistreerd, geen actie" — geen taak, dus hier niet herhaald als open vraag.

## Scope- en implementatiebeslissingen tijdens het bouwen

Plekken waar het reparatieplan een letterlijke `old_str`/`new_str` gaf, maar de daadwerkelijke bestandstoestand of een aanverwant testbestand een net iets andere aanpassing vroeg dan het plan expliciet aankondigde. Geen van deze wijzigt een receptgetal buiten wat de betreffende taak zelf al beoogde.

**A-7 — de tegenspraak stond niet letterlijk hetzelfde geformuleerd op de twee plekken.** Het plan noemt één exacte zin die op twee plekken zou voorkomen (`tempBandNote` en de `#disclaimer`-tekst). In de werkelijke bestandstoestand kwam de aanklagende clausule ("de band loopt daarom niet stilzwijgend door tot 96°C alsof dat wél getest is") maar op één plek letterlijk voor; de disclaimer-tekst bevatte een korter afgeknipte variant van dezelfde onterechte claim. Beide zijn gerepareerd met inhoudelijk dezelfde correctie (het 94–96 °C-anker ligt zelf boven het geteste bereik), in bewoording aangepast aan de bestaande zin ter plekke.

**A-6 raakt een bestaande test die de plan-auteur niet had voorzien.** Een reeds bestaande pure-logic-test regexte de basisratio met een letterlijke punt (`/^1:17\.[4-7]$/`) — een toevallige bijvangst van de oude inconsistentie die A-6 nu juist repareert. De regex is bijgewerkt naar een komma; de numerieke intentie (orde van grootte 17,4–17,7 / 17,2–17,5) is ongewijzigd.

**C-1's eigen testvoorstel had een niet-geverifieerde rounding-aanname.** De plan-tekst geeft een multi-volume-invariant-test (`[270, 300, 340, 380]` ml) die fase-1-water vergelijkt met een naïef afgeronde 40%-verwachting. Bij 270 ml wijkt dat af van de al bestaande, door C-1 ongewijzigde afronding-op-vijftal van `phaseWater` (108 → 110 g). De test is aangepast om diezelfde, al bestaande afrondingsconventie te volgen — geen appcode gewijzigd.

**B-4 + C-1 raken drie bestaande tests die het plan zelf niet in §8.2 noemt.** Naast de vier tests die §8.2 expliciet vervangt (de "schijnkeuze-detectie"-suite), bleken drie tests in de suite "Schijnkeuze-samenvoeging" de oude `PROFILE_MERGE_GROUPS`-vorm (met `zoet` erin) te coderen: `canonicalProfileKey()`, `visibleProfileKeys()` en `displayScoreFor()`. Bijgewerkt naar de nieuwe groep (`klassiek`/`vol_rond`, zonder `zoet`) — mechanisch gevolg van de taak, geen zelfstandige beslissing. Twee kernflow-smoke-tests (het aantal zichtbare profielknoppen op V60, en het aantal tweeling-notities in `#profile-grid`) zijn om dezelfde reden bijgewerkt (9→10 zichtbaar; 0→4 tweeling-notities, want B-4 detecteert nu ook de twee eerder gemiste groepen `fruitig_clean`/`bloemig_delicaat` en `sirooprig_vol`/`evenwichtig_flex`, die niet zijn samengevoegd tot één knop en dus terecht een zichtbare notitie krijgen).

**A-5 — `sizeWarning`-veld in `buildFallbackRecipe()` volledig verwijderd, niet op `''` gezet.** Het plan is op dit punt intern dubbelzinnig geformuleerd ("laat `sizeWarning: ''` staan in `buildFallbackRecipe()` niet bestaan — verwijder daar ook"); gelezen als een instructie om het veld in de fallback-tak te verwijderen (in `computeRecipe()` zelf blijft het veld bestaan met een altijd-lege waarde, voor compatibiliteit met bestaande lezers).

## Wat hierdoor niet verandert

Ongewijzigd, zoals §0.3 (non-negotiables) en de regressiematrix (§9) van het reparatieplan vereisen: de engine-bundel is byte-identiek; `computeMethodAdvice()`, `buildReasoningLines()`, de seed-boondata, OCR, de brouwtimer/wake-lock-logica en de PWA/service-worker-cachestrategie zijn niet aangeraakt (geen `CACHE_VERSION`-ophoging). Alle bestaande FORBIDDEN-edge-tests (`hardnessNudge`/`alkalinityNudge` → `{temp:0}`) blijven groen. Back-ups van schemaVersion 1 t/m 4 laden allemaal zonder verlies; export→import→export is rondgang-identiek (getest in `kernflow.smoke.test.mjs`).

## Testresultaten

131/131 tests groen (`node --test tests/*.test.mjs`), over vier bestanden — zie `implementatierapport_v4.0.md` voor de volledige uitsplitsing per taak.
