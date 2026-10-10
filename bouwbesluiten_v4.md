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
| **D-2** | Onderbouwt "~15–22 g / 5–6 cm bed" (V60_DOSE_CEILING) werkelijk een ONDERgrens, of is 15 g te streng voor een enkele kop op 250 ml? Zo nee: een gelabelde waarschuwing i.p.v. een blokkade. | E-18 | **Onderzocht** (`onderzoek_D2_D4.md`, §2): 15 g blijft de ondergrens; het probleem is dat de app altijd het venstermidden kiest. D2-1 gebouwd (V60 240–415 ml, dosis op de grens, ratio binnen het venster). |
| **D-3** | De dormante beslislaag (`selectRecommendation()`, `computeRecipeFit()`, `computeEvidenceConfidence()` in de engine-bundel): inweven in `computeRecipe()`, of verwijderen? De huidige tussentoestand (bestaat, is getest, wordt niet gebruikt) is de slechtste van de drie opties. | E-10 | **Opgelost — ingeweven** (Implementatieplan v3.0, commit `e128b42`, na dit document): `computeRecipe()` kiest de winnaar nu via `selectViaCanonicalPipeline()`, dat alle drie aanroept. Niets meer te verwijderen (audit BC-26, bevestigd). |
| **D-4** | Batchgrootte schaalt nu strikt lineair op watervolume; eerder onderzoek verbiedt die aanname expliciet. Welke niet-lineariteit is onderbouwd? | §10 van de PDR | **Onderzocht** (`onderzoek_D2_D4.md`, §3): dosis↔water lineair is correct; beddiepte, tijd, maling en warmte niet. Richting onderbouwd, getal niet. D4-1 (tijdsoordeel per hoeveelheid) en D4-2 (richting-hints) gebouwd; D4-3/D4-4 niet. |

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

---

# Bouwbesluiten — Implementatieplan Bypass v1.0

Vastgelegd bij de implementatie van `Implementatieplan Bypass v1.0` (`claude_Implementatieplan_Bypass_v1.md`), onderbouwd door `claude_Research_Brief_Bypass_v1.md`. Bindend zodra hier vastgelegd, zoals het plan zelf aangeeft (§0). Fase A + B + C gebouwd; Fase D (persoonlijk bypass-model, bypasswater-type als segmentsleutel) en Fase E (doel-TDS) zijn bewust niet gebouwd — zie "Niet gebouwd" hieronder.

## Besluiten (§5 van het plan — vooraf voorgelegd aan Jelle, akkoord gekregen)

| # | Besluit | Genomen keuze | Motivering |
| --- | --- | --- | --- |
| **Bouwscope** | Alleen Fase A, A+B, A+B+C, of nog niet bouwen? | **Fase A + B + C.** | Repareert zowel de onjuistheden/het datagat (A+B) als voegt de instelbare keuze toe (C) — de gebruiker wil niet alleen eerlijkheid, ook de zelf-te-kiezen 20/30/40%-stap en proef-en-vul. |
| **Oude bypass-loggingen** | Uit de normale leercorrectie halen, of laten meetellen zoals nu? | **Eruit halen.** | Vóór audit H7 was het percentage procesafhankelijk (25–37,5%) en niet meer te reconstrueren; sowieso is bypass een andere techniek dan waar de normale maalcorrectie voor gemeten wordt (vervuilingsregel 4). Kanttekening: dit kan `n` onder `LEARNING_MIN_N` laten zakken — `learningCorrectionText()` benoemt dat nu expliciet. |
| **Chemex-scope** | De concentraat/bypass-knop bij Chemex verbergen, of laten staan met een experimenteel-label? | **Verbergen (BP-9).** | Geen enkele gevonden bron (Drip Roast's V60-bypassgids, de patenten, de competitieroutines) gaat over Chemex — een label zou nog steeds een knop tonen voor een niet-onderbouwde combinatie. `bypassMethodSupported`-guard in `computeRecipe()` blijft de eigenlijke garantie tegen stille toepassing. |

## Wat is gebouwd

**Fase A — eerlijkheid.** Label "Intensiteit" → "Concentraat + bypass (optioneel, experimenteel — alleen op V60)"; de "...normale sterkte"-claim geschrapt (met volledig volumeherstel is de kop hooguit even sterk bij gelijke extractie, RB §4.4) en vervangen door een expliciete RESEARCH_GAP-toelichting; het eenzijdige "doorgaans iets fijner/warmer"-advies vervangen door een neutrale weergave van de tegenstrijdige bronnen (RB E6/E7, beide CONTESTED); de interne toeschrijving aan "Scott Rao's bypass-techniek" gecorrigeerd (Rao publiceert over batchbrouwen/bed-diepte, niet over deze V60-smaaktechniek — RB §3); een experimenteel-kaart toegevoegd (PDR §27: hypothese/verwacht effect/mogelijk voordeel/risico/evidence-niveau/vertrouwen), hergebruikt de bestaande `.prep-intel-card`-vorm.

**Fase B — data-integriteit.** `RECORD_SCHEMA_VERSION` 4→5: nieuwe, additieve velden `bypassPct`/`pourWaterG`/`bypassPlannedG`/`bypassActualG`/`bypassMoment` op elke logging (oude records blijven `null`, niets met terugwerkende kracht aangevuld). `learningEligibleEntries()` sluit elk bypass-record uit (vervuilingsregel 4). Brew Mode's dubbelzinnige "aanvullen tot X g totaal" vervangen door een expliciete weeginstructie (dripper eraf, tarreren) plus "proef-en-vul". Klaar-scherm toont nu de werkelijke brewer-ratio bij bypass (`renderBrewLogHonestSummary()`) en onderdrukt het in/buiten-oordeel op de contacttijdband (die is afgeleid voor vol volume). Triage-diagnose bij de bypass-vraag uitgebreid met de tweede mogelijke oorzaak (extractieverlies in de geconcentreerde fase), eerste zin ongewijzigd.

**Fase C — instelbaar percentage + proef-en-vul.** `BYPASS_PCT_OPTIONS = [20, 30, 40]`, chiprij Uit/20%/30%/40% (elke optie toont zijn eigen brouwratio), vervangt het vaste 30%. `bypassAdvice(pct)` klemt op deze drie waarden; `computeRecipe()` kreeg het percentage als 13e, optioneel parameter (default 30, dus alle ±85 bestaande testaanroepen met 12 argumenten blijven ongewijzigd correct). Moment-keuze (achteraf/vooraf) stuurt welke weeginstructie Brew Mode toont. `bean.lastBrew` onthoudt het gekozen percentage (oude records zonder percentage: 30% als UI-beginstand, nooit teruggeschreven).

**Niet gebouwd (Fase D/E, buiten deze bouwronde):** het persoonlijke bypass-leermodel (eigen "emmertjes" per percentage, met dezelfde terugvalladder als het boontype-model) en het bypasswater-type als segmentsleutel (BP-7) — vereist een eigen UI-veld en leerlus-uitbreiding die niet is meegenomen in Fase A+B+C. Doel-TDS-modus (Fase E) is uitgesteld zolang er geen refractometer-workflow is (PDR §23: de normale gebruiker heeft geen TDS-meting nodig).

## Wat hierdoor niet verandert

`computeRecipe()`-uitvoer bij `bypassEnabled=false` blijft op elk gouden-snapshot-volume/profiel/branddiepte-combinatie byte-identiek (baseline-diff leeg na elke commit). Dosis, ratio, temperatuur en maalstand blijven volledig onafhankelijk van bypass en van het gekozen percentage. De FORBIDDEN-edge-garantie uit audit H7 blijft volledig intact: proces, branding, experimenteel-vlag en waterchemie sturen het bypasspercentage nooit — alleen het expliciete, door de gebruiker gekozen percentage doet dat.

## Testresultaten

383/383 tests groen (`npm run qa`), inclusief 5 nieuwe tests specifiek voor dit plan (`bypassAdvice()`-klemgedrag, `computeRecipe()`'s 13e argument, vervuilingsregel 4, de Chemex-hide-guard, en een volledige rondgang met 40% bypass van percentagekeuze tot opgeslagen logvelden).

# Bouwbesluit — halve sterktestap (diag-2026.2)

Vastgelegd bij de wijziging die uit een gebruikersmelding kwam: de standaard miste de heldere, fruitige smaak; het advies "een stap lichter" (−8% koffie) was te slap; er bestond geen stand daartussen om te kiezen of om geadviseerd te krijgen.

## Besluit (vooraf voorgelegd aan Jelle, akkoord gekregen)

| # | Besluit | Genomen keuze | Motivering |
| --- | --- | --- | --- |
| **Halve stap** | Alleen zelf kunnen kiezen, of ook als advies? | **Kiezen én advies.** | Alleen kiezen laat de adviesketen in een doodlopende straat: na een hele stap die te ver ging, zei de app "herhaal deze stand eerst" of ging hij helemaal terug naar de standaard — de kop die het doel al miste. Het midden is dan de logische volgende test. De stapgrootte is de helft van de bestaande 8% (eigen keuze, geen evidence-claim, net als de hele stap). |

## Wat is gebouwd

- **Kiezen:** `strengthAdjust` loopt over −1, −½, 0, +½, +1 (dosis −8%, −4%, standaard, +4%, +8%; watervolume blijft gelijk). `computeRecipe()` rondt af op het halve-stappenraster; de dosisklem (15–22 g, B-1) blijft gelden en meldt een klem zoals voorheen. De chiprij op het receptscherm heeft vijf standen.
- **Advies:** zit je op −8% of +8% en wijst het oordeel terug naar standaard ("te slap" / "te sterk", of "slechter dan de vorige"), dan adviseert de app eerst de halve stap (±4%) i.p.v. "herhaal" of helemaal terug. Bij "veel te slap/sterk" blijft het een hele stap terug. Een halve stap wordt nooit direct weer teruggedraaid (hysteresis). Is de halve stap niet haalbaar (geen effect op de dosis), dan geldt het oude gedrag. Een stap loopt nooit dwars over standaard heen (`landStrength()`).
- **Teksten:** "Een halve stap sterker/lichter: ~4% meer/minder koffie (van → naar in gram)", met uitleg waarom het midden (`halfway` / `halfway_worse`).
- `DIAGNOSIS_RULESET_VERSION` `diag-2026.1` → `diag-2026.2`. De advies-poort (≥20 getest, ≥65% gelukt, ≤15% schade) filtert niet op versie en telt een halve stap als elke andere stap mee.

## Wat hierdoor niet verandert

Elk bestaand recept (standaard en ±8%) blijft byte-identiek (golden fixtures, B-1-sweep, FORBIDDEN-edges en break-it-matrix lopen nu ook over ±4% en blijven groen). Advies vanaf standaard, na "veel te …" en bij maalstappen is ongewijzigd. De blinde helder-proef (A/B) blijft 0 tegen −8%.

**Vervolg (op verzoek):** de opt-in "Voortaan bij Helder & fris…" zet voortaan een halve stap (−4%, `AB_LIGHTER_STEP`) in plaats van een hele (−8%, dat bleek te slap). De opt-in blijft een eigen, bewuste keuze na de blinde proeven en wordt nooit vanzelf aangezet; de proef zelf vergelijkt nog steeds met één hele stap lager.

**Vervolg 2 (op verzoek):** ook de blinde helder-proef vergelijkt nu standaard met −4% (`AB_LIGHTER_STEP`), zodat wat getest wordt gelijk is aan wat de opt-in zet. Elke proef bewaart zijn `variantStep`; proeven tellen alleen mee voor de stap waarmee ze gedaan zijn. Oudere proeven (zonder `variantStep`, gedaan met −8%) blijven bewaard maar tellen niet mee voor het oordeel over −4%; de proefkaart meldt dat. Een al aangezette voorkeur blijft aan.

## Testresultaten

808/808 tests groen (`npm run qa`), inclusief 12 nieuwe pure tests (advieskeuzes, landing op het raster, teksten, dosis, poortstatistiek) en 2 browsertests (vijf chips op één regel, volledige cyclus −8% → halve stap → ingesteld → getest "beter" → houd zo).

# Expertreview oktober 2026 — Sprint A (fouten en vertrouwen)

Uit de expertreview van oktober 2026 (bevindingen R-01 t/m R-22). Sprint A raakt geen receptgetal en geen adviesregel; akkoord gekregen om te starten.

| # | Wat was er mis | Wat is gebouwd |
| --- | --- | --- |
| **R-01** | Een gelogde kop opnieuw openen ("← Terug naar timer" → "Proeven & loggen") toonde een lege proefkaart; opslaan overschreef proefkaart, advies en bevestiging. | `openBrewLogEntry()` vult de kaart uit het bewaarde record (`tastingDraftFromRecord()`, `actualsModeOfRecord()`) en toont het bewaarde advies. |
| **R-05** | "Bloemig & delicaat (Hedrick-methode)" en "Naar Hedrick's aanpak", terwijl de engine Hedrick nooit maakt. | Teksten eerlijk gemaakt; de tekstentest controleert nu dat een profielbeschrijving alleen een bronnaam noemt als de engine dat schema ook maakt. |
| **R-06** | Wie zonder boon begon, kon nergens alsnog een boon koppelen; de leerlus deed dan niets. | Boonkiezer (`openBeanPicker()`) op het receptscherm en na opslaan, met snel een boon aanmaken (alleen een naam; branding en profiel van het recept). `linkBrewToBean()` koppelt achteraf met dezelfde bijwerkingen als bij het zetten. |
| **R-07** | "Zet deze boon" (boondetail) liep altijd via het methode-advies en vroeg het profiel opnieuw. | Na de eerste kop gaat de boondetail direct naar het recept (`brewBean()`); op de bonenkaart heet de tweede knop dan "Anders zetten →". Een profiel gekozen in het advies wordt het profiel van de boon. |
| **R-08** | Een "check eerst"-advies verdween na het Klaar-scherm. | De boon bewaart het (`pendingCheck`) tot de volgende gelogde kop; Home en het receptscherm tonen het. |
| **R-16** | "Gezet zoals gepland?" werd makkelijk overgeslagen; de kop telde dan niet mee. | Opslaan zonder bevestiging vraagt het nog één keer: "Ja, opslaan", "Anders…" of "Weet ik niet, toch opslaan". |
| **R-17** | De brander werd de boonnaam; "250g" werd niet herkend. | Nieuw veld Brander; `extractRoasterFromText()`, `extractBagSizeFromText()`; regels in hoofdletters worden netjes gemaakt. |
| **R-18** | Na een boon opslaan via de Bonen-tab stond er toch "← Methode". | `showScreen(…, { keepTabRoot })`. |
| **R-19** | Klaar-scherm toonde de plantemperatuur als resultaat. | Label "Temp. (plan)". |
| **R-21** | Bonenkaart was een knop met knoppen erin; alkaliniteitseenheid zonder label. | De boonnaam is de knop; de kaart vangt alleen de tik eromheen. Label toegevoegd. |

# Expertreview oktober 2026 — Sprint B (de smaaklus sluiten, diag-2026.3)

Vooraf voorgelegd en akkoord gekregen: "Zet opnieuw" mag je vorige kop exact herhalen (herziet besluit C2 "sterkte per keer"), en de adviesregels mogen naar diag-2026.3.

## Besluiten

| # | Besluit | Gebouwd |
| --- | --- | --- |
| **R-02 / "Mijn recept per boon"** | "Zet opnieuw" herhaalt je vorige kop: maalstand (de bevestigde werkelijke klik, anders de geplande) en sterkte, naast methode, water en bypass. | `bean.stands[methode]` = de stand van de laatst gelogde kop (`standFromRecord()`, `updateBeanStand()`; een oudere kop overschrijft niets). `brewAgain()` zet hem; een klaargezette stap verandert daarna precies één ding. Receptscherm: "jouw stand" in de tegels en een kaart met "Terug naar het basisrecept". Na een kop van 2/5 of een "check eerst" vraagt die kaart of je liever het basisrecept wilt. Via het methode-advies begin je bewust opnieuw (C2 blijft daar gelden). Ook op de Chemex onthoudt dit jouw klik. "Zet je beste kop opnieuw" zet nu ook de maalstand van die kop. |
| **R-03** | "Droog/wrang" blokkeert het advies alleen bij een goede sterkte; een sterkteklacht krijgt zijn dosisstap met een giettip. Bitter + droog + vlak zuur (zonder water dat de zuren dempt) = waarschijnlijk overextractie → 1 klik grover. "Te sterk" met alleen een zwakke aanwijzing voor overextractie (bv. alleen bitter) → eerst minder koffie. | `diagnoseTasting()` (`flat_over`), `recommendNext()`. |
| **R-04** | Na een kop die het doel net niet haalde (of 4 of minder): "Wat miste je?" — meer fruit/helderheid → halve stap lichter; meer body → halve stap sterker; meer zoetheid → 1 klik fijner (niet bij bitter); minder bitter → 1 klik grover. Bij "meer fruit" eerst het water als dat de zuren dempt (alkaliniteit > 70); bij een zak van meer dan 3 weken na branden komt er een eerlijke versheidstip bij (`old_fruit`, geen receptfix: die bestaat niet). Een duidelijk extractie- of sterktesignaal gaat vóór de wens; geen heen-en-weer. | `TASTING_MISSED`, `missedQuestionApplies()`, `goalStepFor()`; de stap verschijnt alleen in de proefkaart als hij erbij hoort. |
| **R-09** | Een geslaagde kop (4/5) mag je verfijnen, maar alleen als je zelf zegt wat beter kan; zonder antwoord blijft het "Houd dit recept zo". | `recommendNext()` (`refine`). |
| **R-10** | "Houd zo" dat bij de volgende vergelijkbare kop weer geslaagd was, telt apart als "bevestigd". De poort en de drempels veranderen niet. | `adviceOutcomeStats().keep`, getoond onder Statistieken. |

## Effect, gemeten met een virtuele proever

30 virtuele bonen (beste klik 13–18, beste sterkte −8% … +8%), elke kop door de echte adviesmotor:

| | Komen tot rust | Op hun beste kop (5/5) | Gem. koppen |
| --- | --- | --- | --- |
| Vóór (terug naar start na elke kop, diag-2026.2) | 7 / 30 | 1 | — |
| Alleen onthouden (diag-2026.2) | 20 / 30 | 1 | — |
| Onthouden + diag-2026.3 + "Wat miste je?" | 30 / 30 | 30 | 4,7 |

Een model is geen echt panel: de richting is duidelijk, de precieze getallen niet. De simulatie staat als vaste test in `tests/dial-in-review.test.mjs` (minimaal 27/30).

## Wat hierdoor niet verandert

Geen enkel engine-receptgetal (golden fixtures, FORBIDDEN-edges en de break-it-matrix zijn ongewijzigd groen). Proces, hoogte en water sturen nog steeds geen receptgetal. De advies-poort (≥20 getest, ≥65% gelukt, ≤15% slechter) is ongewijzigd; Fase 5 blijft dicht tot die gehaald is.

# Expertreview oktober 2026 — Chemex standaard 500 ml (R-11)

Akkoord gekregen (receptgetal: de standaardhoeveelheid). De Chemex start voortaan op 500 ml i.p.v. de engine-standaard van 300 ml (dezelfde als de V60): een dun bed in de grote kegel loopt te snel door, wat de app zelf al als "klein brouwsel" meldde. Dosis en ratio volgen uit hetzelfde doelvenster (500 ml → 28,8 g, 1:17,4). Daarbij: op de Chemex staat de maalgraad niet meer dubbel ("middelgrof middelgrof"), en zonder bekend klikgetal zegt de tegel dat de app jouw klik onthoudt als je hem na het zetten invult (zie R-02). Een overlay die niet bij de hoeveelheid past (Rao Chemex tot een vast maximum) toonde een interne Engelse engine-code; die wordt nu in gewone taal uitgelegd.

# Expertreview oktober 2026 — ideeën 5, 6 en 7 (deze zak, per brander)

Gekozen uit de brainstorm. Geen van drieën verandert een receptgetal of adviesregel.

- **Drinkvenster per zak (idee 5).** Bewust de bestaande versheidstabel: "uitgerust" = dag 7 t/m 21 na branden (`drinkWindowFor()`). Op de boondetail als vuistregel, nooit als meting ("Proef zelf"), met de rustdagen ervoor en een melding als je meer koppen over hebt dan dagen in het venster. Een roast-afhankelijk venster is bewust niet gebouwd: dat zou de versheidsmelding op het receptscherm tegenspreken.
- **Deze zak (idee 6).** Aantal koppen, gemiddeld oordeel, voorraad en de beste kop van de zak (`bagSummaryFor()`, `bestCupOf()`), met "Zet deze kop opnieuw" (inclusief de maalstand, zie R-02). Bij een lege zak: bewaar deze stand voor als je de boon opnieuw koopt.
- **Per brander (idee 7), alleen weergave.** Nieuw veld Brander op de boon (zie R-17). Op de boondetail en onder Statistieken: hoeveel bonen en koppen van die brander, gemiddeld oordeel, en waar je goede koppen meestal lagen t.o.v. de startklik (`roasterSummary()`). Dit stuurt bewust niets: leren uit je koppen (een startklik per brander voorstellen) hoort bij Fase 5 en wacht op de adviespoort.

# Expertreview oktober 2026 — aanrechtmodus (idee 20)

Gekozen uit de brainstorm. De timer krijgt een aanrechtmodus: de giet-instructie ("Giet tot 120 g", "Wacht · 0:18") groot en leesbaar op afstand, de "Bed droog"-knop groter, en de minder belangrijke regels (lopend totaal, giet-snelheid) weg. Op een liggende tablet staat de wijzerplaat links en de instructie rechts. Standaard aan vanaf 700 px breed (tablet), standaard uit op een telefoon; met "Aanrechtmodus" op het timerscherm per toestel aan of uit te zetten (een per-toestel voorkeur in de browseropslag). Welke instructie er staat en wanneer, verandert niet. De verdere vormgeving komt mee in de visuele review.

# Expertreview oktober 2026 — Sprint C (tempo, voorbereiding, water, één smaakvraag)

Uit het verbeterplan van de review; geen receptgetal en geen adviesregel veranderd.

| # | Besluit | Gebouwd |
| --- | --- | --- |
| **R-14** | Giet-snelheid als een rustig straaltje: 4–8 g/s. Boven ±8 g/s roer je het bed op; het oude label ("~6–17 g/sec") kwam van een aangenomen 5–15 s per giet. Het schema (de starttijden) blijft gelijk. | `POUR_RATE_GPS`, `pourTimeLabel()`: per giet de giettijd bij 4–8 g/s ("~8–15 s"); een giet met een gepubliceerd eindmoment (Hoffmann) toont zijn eigen venster. De timer houdt "Giet tot …" vast zolang de giet bij 6 g/s duurt (`pourSecFor()`, minstens 5 s) en toont "+60 g in ~10 s". Vervangt `ASSUMED_SINGLE_POUR_SEC`. |
| **R-15** | De klok start niet meer direct vanaf het receptscherm. "Naar de timer" opent een klaar-check (filter spoelen, koffie en maalstand, weegschaal op 0, watertemperatuur) met "Start de klok"; het brouwsel (v6-record) ontstaat pas bij die tik. ▶ doet hetzelfde, ↻ brengt je terug naar de klaar-check, weggaan vanuit de klaar-check vraagt geen bevestiging. | `timer.armed`, `startBrewClock()`, `brewReadyItems()`, `renderBrewReady()`; de maalstand komt uit dezelfde bron als de maaltegel (`prepGrindValue()`). |
| **R-13** | Eén smaakvraag i.p.v. "profiel" (scherm) + "doel" (chips op het receptscherm). Het smaakscherm vraagt "Wat wil je proeven?": **Helder & fris** = heel_fruitig (Kasuya 4:6 met een grotere eerste giet, iets minder koffie) en doel Helder & fris; **Gebalanceerd** = klassiek (gelijke beurten), zonder aparte doelvraag op de proefkaart; **Rond & vol** = zoet (Kasuya 4:6 met een kleinere eerste giet) en doel Rond & vol. Alle drie bestaande profielen: geen nieuw receptgetal. Daaronder optioneel een gietstijl (Hoffmann, Rao, April, Snel/Perger, Basisrecept), met zijn eigen recept en zonder smaakdoel; een stijl met een naam staat er alleen als hij op die methode een eigen schema heeft (April en Rao niet op de Chemex). Profielen zonder eigen recept (vol_rond = klassiek, bloemig_delicaat, sirooprig_vol) staan niet meer als keuze; bonen die er een hebben werken door. Via het methode-advies volgt het doel uit het gekozen profiel (`goalForProfile()`). | `TASTE_CHOICES`, `STYLE_CHOICES`, `styleChoicesFor()`, `tasteDetail()` (de uitleg per smaak komt uit het recept zelf), `choiceTwinLabels()` (op de Chemex: "zelfde recept als …", het verschil zit dan in de proefkaart), `setGoalForChoice()`. De doel-chips op het receptscherm zijn weg; de samenvatting bovenaan noemt de smaak. |
| **R-12** | Water vroeg en concreet, zonder receptgetal. Bij je eerste boon één keer: "Welk water gebruik je?" met Dunea, Waternet, PWN (Andijk), "ander waterbedrijf of flessenwater" (naar Instellingen) en "Ik meng 1:1 met gedemineraliseerd water". Alleen bedrijven met één gepubliceerde, stabiele samenstelling; de waarden komen uit hun eigen kwaliteitsrapporten en de bron staat erbij. Bij Helder & fris met water dat veel buffert (> 70 mg/L CaCO3) één regel op het receptscherm met de mengtip. | `WATER_COMPANY_PRESETS` (Dunea ±170 mg/L HCO3 / 1,4 mmol/L, rapporten 2021–2024; Waternet 207 / 1,38, jaaroverzicht 2025; PWN Andijk 136 / 1,35, Q1 2023), `waterTipFor()`, `openWaterAsk()` (één keer, `brewconsole_water_asked`). |

**Correctie die hierbij hoort (R-12):** de adviesmotor keek naar de alkaliniteit van je kraanwater zonder de verdunning. Wie 1:1 mengde, kreeg dus bij een vlakke kop toch "Check eerst je water". Het advies gebruikt nu het water dat je echt gebruikte (`effectiveAlkalinityCaCO3()`, uit de watersnapshot van de kop). De regel zelf en de grens (70) zijn ongewijzigd.

**Gevolg om te weten (R-13):** wie Helder & fris kiest, krijgt op de V60 het Kasuya-schema met de grotere eerste giet en begint op 350 ml (de standaard van dat profiel); de blinde proef staat dan op het receptscherm, waardoor dat scherm langer is dan bij Gebalanceerd. Een boon met een eerdere combinatie (bijv. Klassiek + doel Helder & fris) houdt die bij "Zet opnieuw".

# Expertreview oktober 2026 — Sprint D (data en code)

| # | Besluit | Gebouwd |
| --- | --- | --- |
| **R-20** | Alles staat alleen in de browseropslag van één toestel. (1) Na je eerste gelogde kop vraagt de app de browser om blijvende opslag (`navigator.storage.persist()`; niet eerder, want Firefox vraagt daarvoor toestemming). (2) Op Home een rustige herinnering als je laatste back-up 30+ dagen oud is (of er nooit een was en je eerste gegevens 30+ dagen oud zijn), pas vanaf 3 gelogde koppen; "Later" houdt het een week stil; "Back-up maken" exporteert meteen. (3) Instellingen → Data toont of de opslag blijvend is, hoeveel er in gebruik is (van de ±5 MB die een browser meestal toestaat, met "bijna vol" vanaf 80%) en wanneer je laatste back-up was. | `backupReminderDue()` (puur, getest), `renderHomeBackupReminder()`, `requestPersistentStorage()`, `storageStatusText()`, `markBackupDone()` (`brewconsole_last_backup_at`). Geen gegevens verlaten het toestel. |
| **R-22** | Historisch commentaar uit de code. Alle 303 commentaarblokken met een geschiedenismarkering (NIEUW, FIX, HERZIEN, BIJGEWERKT, UITGEBREID, HERAUDIT) buiten de gebundelde engine zijn één voor één herschreven tot het *waarom van vandaag* (bronnen, invarianten, grenzen en verwijzingen naar tests en besluiten blijven staan); 19 blokken zonder actuele uitleg zijn weg. Twee commentaren die niet meer klopten zijn gecorrigeerd (reset start als nieuwe gebruiker, niet met voorbeeldbonen; de "Verfijn"-sectie is altijd bereikbaar). De oorspronkelijke teksten staan woordelijk in `docs/codegeschiedenis.md`. Het app-bestand is ±95 kB kleiner (1,05 MB → 0,96 MB). De engine-bundel blijft ongemoeid: die wordt gegenereerd uit de TypeScript-bron. Afspraak voortaan: geschiedenis hoort in deze bouwbesluiten, in de code alleen het waarom. | `docs/codegeschiedenis.md`. Geen gedragswijziging: alle 877 tests groen. |
| **R-22 (staat per boon)** | Wat per boon hoort, staat sinds Sprint B op de boon: maalstand en sterkte (`bean.stands`, R-02), het smaakdoel (`bean.goal`), methode/water/bypass (`bean.lastBrew`), een klaargezette stap (`pendingAdjust`) en een openstaande check (`pendingCheck`). De ±40 overige globale variabelen zijn formulier-, filter-, timer- of opslagstaat die bewust per sessie of per toestel geldt. Ze naar modules verhuizen is een herstructurering zonder gebruikerswinst in één bestand zonder build-stap; niet gedaan. | — |

# Visuele en UX-audit "Calm Precision" — fase 1 (vóór release)

Uit de roadmap van de audit (document "Visuele & UX-audit — Calm Precision"), fase 1 "Moet vóór release": VA-01 t/m VA-10, plus VA-18 en VA-19. Geen receptgetal, geen adviesregel en niets in de engine-bundel veranderd. Keuze van Jelle bij VA-07: roast zelf kiezen (niets voorgekozen), proces standaard "Weet ik niet".

| # | Besluit | Gebouwd |
| --- | --- | --- |
| **VA-01** | Tekst op de timerfoto krijgt eigen kleuren, los van het thema: de foto en de scrim zijn altijd donker, dus ook in het lichte thema lichte tekst. | Tokens `--on-photo`, `--on-photo-dim`, `--on-photo-faint`, `--on-photo-accent` voor instructie, subregel, klaar-check, bed-droog-hint, lopend totaal, giet-tip, eindnotitie en titel. |
| **VA-02** | De foto is sfeer, de tekst het instrument: de foto gedimd (`brightness(.55)`) en de scrim in het midden donkerder, zodat geen instructie op de witte kegel of de lichte voet staat. | `.brew-hero-img`, `.brew-hero-scrim`; `.brew-bg` heeft een donkere grond. |
| **VA-03** | Lichtthema-contrast herijkt. De gevulde primaire knop krijgt eigen tokens per thema (`--primary`, `--primary-hover`, `--on-primary`), hover alleen bij een echte muis; `--copper-light` in licht #7A4A1F; tekst in gevaarkleur via `--danger-text`. Smaaktags en wielcategorieën dragen hun kleur als stip, de tekst blijft in tekstkleur (een gele of lichtgroene tag was onleesbaar op wit). | `--tag-color` + `::before` op `.bean-tag` en `.flavor-cat-name` (`flavorTagChipsHtml()`, `renderFlavorTagChips()`); uitkomst in de adviesketen als rand i.p.v. gekleurde tekst. |
| **VA-04** | Receptscherm: eerst titel en boon, dan de vier hoofdgetallen, dan hoogstens één melding onder "Voor deze kop"; alle andere meldingen achter "Waarom dit recept?" (met het aantal in de kop). Volgorde: je gekozen stap, (een lopende blinde proef of "voortaan zwakker"), check eerst, jouw stand, beste kop, leercorrectie, hypothese, watertip, (uitnodiging blinde proef), feit uit je data, tweelingnotitie. Statusmeldingen zonder actie ("nog geen leercorrectie", het feit uit je data, de tweelingnotitie) komen nooit bovenaan. | `prepNoteOrder()`, `arrangePrepNotes()` (verplaatst alleen; de meldingen worden gevuld zoals voorheen). |
| **VA-05** | Aanrechtmodus op tablet en desktop (liggend, ≥ 900 px): het brouwscherm gebruikt tijdens het zetten de hele breedte; de instructie schaalt met haar kolom (container query, `clamp(44px, 10.5cqi, 92px)`); getal en eenheid breken nooit af ("240 g" niet-afbrekend, de tekst zelf blijft gelijk); Stop rechtsboven op het brouwscherm; badge, balk, pil en knoppen op één linkeras. | `keepUnitsTogether()`, `.nobr`, CSS onder `#screen-brew[data-counter="on"]`. |
| **VA-06** | Scanresultaat in een kolom, binnen het scherm. | `.process-note.scan-review`. |
| **VA-07** | Naam en roast verplicht; leeg opslaan maakte stil een "Naamloze boon" op Medium. Melding in tekst onder het veld (`role="alert"`, gekoppeld via `aria-describedby`), `aria-invalid` op het naamveld, focus naar het eerste ontbrekende veld. Geen roast voorgekozen (die stuurt temperatuur en maling); proces standaard "Weet ik niet" i.p.v. Washed. Bestaande bonen bewerken verandert niets aan hun waarden. | `validateBeanForm()`, `setBeanFieldError()`; scancontrole zegt "kies hieronder de branding" als de roast niet herkend is. |
| **VA-08** | Invoervelden op 16 px (`--fs-body`): iOS zoomt dan niet in bij focus. | `.form-input`. |
| **VA-09** | Eén focusbeheer voor alle vijf dialogen (bevestiging, watervraag, bonenkiezer, waterhoeveelheid, zetstap): focus erin bij openen (bij de bevestiging op de veilige keuze), Tab blijft binnen de dialoog, Escape = annuleren/later/sluiten, focus terug naar de opener. | `openDialog()`, `closeDialog()`, één `keydown`-listener. |
| **VA-10** | Eén woordenlijst. De naam in `PROFILE_INFO` is wat je ziet: een smaak (Helder & fris, Gebalanceerd, Rond & vol) of een gietstijl (Hoffmann, Rao, April, Snel (Perger 80/20), Basisrecept). Een stijl met smaakdoel heet "Helder & fris · Hoffmann". "Fresh & Clean", "Heel fruitig", "Fruitig & Clean", "Klassiek" e.d. staan nergens meer op het scherm. Twee stijlen zonder smaakkeuze houden een Nederlandse naam: Bloemig & delicaat, Sirooprig & rond. **Voorstel ter vaststelling door Jelle** (zo vroeg de audit). | `profileLabel()`, `profileDirectionLabel()`, `beanProfileLabel()`; `choiceLabelForState()` gebruikt dezelfde functie. Gebruikt op recept, proefkaart, logboek, bonenkiezer, boondetail, bonenformulier en advies. Een test borgt dat `TASTE_CHOICES`/`STYLE_CHOICES` exact de `PROFILE_INFO`-namen gebruiken. |
| **VA-18** | De actieve rij in "Volledig schema" kreeg nooit een markering: de JS zet het attribuut zonder waarde, de CSS zocht `="true"`. | Selector `[data-active]` / `[data-done]`. |
| **VA-19** | Na "Start de klok" terug naar boven (de klok en de eerste instructie in beeld) en de focus op de pauzeknop. | `startBrewClock()`. |

**Gemeten na de bouw** (dezelfde meetscripts als de audit, Chromium):

- Contrast: tekst onder 4,5 : 1 (zonder foto als achtergrond) van 18 naar 0 plaatsen in het donkere thema en van 169 naar 0 in het lichte, over dezelfde 54 schermopnamen. Daarvoor ook het favorietenhartje: `--berry` donker #D27089, de hartjesknop op de boonfoto een donkerder vlak.
- Tekst op de timerfoto: het slechtste 5%-contrast onder de instructie was 1,75 : 1 (klaar-check, iPhone SE); nu overal ≥ 6,3 : 1, mediaan ±17 : 1.
- VA-04: op de iPhone (390 × 844) staan bij zes combinaties (drie bonen, drie smaken zonder boon) alle getallen boven de knoppenrij, met niets tussen titel en getallen. **Nog niet op de iPhone SE (375 × 667):** daar valt de onderste getallenrij 80–160 px onder de knoppenrij. Dat vraagt compactere tegels; buiten het acceptatiecriterium, voor fase 2.
- VA-05: op 1024 × 768, 1180 × 820, 1366 × 1024 en 1440 × 900, in de fasen klaar, gieten, wachten en doorlopen: de instructie op één regel (55–79 px), geen losse eenheid, Stop rechtsboven (20 px van de rand, direct onder de kopregel van de app), instructie, subregel, badge en pil op één linkeras, geen horizontale scroll.
- VA-09: focus start op "Nee, doorgaan", Tab en Shift+Tab blijven in de dialoog, Escape sluit zonder te stoppen en de focus staat weer op Stop.
- VA-19: na "Start de klok" op de iPhone SE en liggend: scrollpositie 0, de klok in beeld, focus op de pauzeknop (was: klok 104–367 px boven beeld).

## Testresultaten

896 tests groen (`npm run qa`), waarvan 19 nieuw: 12 in `tests/visual-fase1.test.mjs` (woordenlijst, getal + eenheid, meldingsvolgorde) en 7 browsertests in `tests/kernflow.smoke.test.mjs` ("Visuele audit fase 1": VA-04, 05, 07, 09, 10, 18, 19). Aangepaste bestaande tests: de helper `saveBean()` vult nu de verplichte naam en roast (Medium, de oude stille standaard); de scancontrole verwacht de nieuwe teksten; de leercorrectie-tests klappen "Waarom dit recept?" open en controleren dat "nog geen leercorrectie" niet bovenaan staat; de Fase 7-test kiest Washed en Gebalanceerd nu zelf.
