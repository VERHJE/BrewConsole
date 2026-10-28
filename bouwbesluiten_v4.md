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

# Visuele en UX-audit "Calm Precision" — fase 2 (rust en vertrouwen)

Uit dezelfde roadmap, fase 2: VA-11 t/m VA-17, VA-20, VA-21, VA-26, VA-29, VA-30, VA-32 t/m VA-34, plus kans K1 (de timer als instrument). Geen receptgetal, geen adviesregel en niets in de engine-bundel veranderd (de bundel is byte-gelijk aan die van fase 1). Keuzes van Jelle: productnaam **Brew Console**; de tab Smaakprofiel **verbergen zolang er geen smaakdata is**; "Zet deze boon" gaat **direct naar het recept**; de tabbalk **verdwijnt tijdens een taak**.

| # | Besluit | Gebouwd |
| --- | --- | --- |
| **K1 · VA-15** | De timer is een instrument. Geen woordmerk of themaknop erboven; de foto vult het hele scherm, ook op iPad en desktop; de inhoud staat in een rustige kolom (max. 560 px). In de aanrechtmodus (liggend, ≥ 900 px) blijft de volle breedte. Stop staat rechtsboven. | CSS onder `.app[data-state="brew"]`; `.brew-bg` zonder hoeken. De oude `:has()`-regel voor de aanrechtmodus is weg. |
| **VA-16** | Elk gegeven één keer in beeld. De klaarstand heeft één startactie ("Start de klok"; ▶ en ↻ pas na de start). De voortgangsbalk naast de badge "giet 1/3" is weg. Tijdens het wachten noemt de subregel de fase ("Bloom — laat het water zakken") en staat het volgende doel alleen in de pil. | `#screen-brew[data-armed]` verbergt ▶/↻; `.brew-pour-progress` (opmaak, CSS en JS) verwijderd. |
| **VA-17** | Pauze herkenbaar zonder kleur: het label "Gepauzeerd" in de klok, "▶ Hervat" op de knop, ring en instructie gedimd. De schermlezer hoort "Gepauzeerd" via de stapregel. De aanrechtmodus-knop is een echte schakelaar. | `setPauseBtnLabel()`, `#screen-brew[data-paused]`, `#dial-paused`; `.counter-toggle` met `role="switch"` en `aria-checked`. |
| **VA-14** | Home heeft één gevulde knop: "Zet opnieuw" op de kaart Je volgende kop, of "Nieuw brouwsel starten" als er nog geen volgende kop is. De rij snelkeuzes eronder (een derde startpunt) is weg. In de bonenstrip beginnen alle foto's op dezelfde hoogte. Lege start: één uitnodiging met "Boon toevoegen". Op het methodescherm staat de titel direct onder de koprij; de kaart Je volgende kop staat onder de methodekeuze. | `.home-cta--primary`, `#home-empty-hint`; `#home-chip-row` verwijderd. |
| **VA-12** | Logboek compact: elke kop is één regel (datum · methode · oordeel · wat je veranderde · adviestitel), die openklapt tot de volledige kaart. Hartje als tikdoel van 44 px; "Zet je beste kop opnieuw" als secundaire knop. | `renderBrewLogEntryCard()` met `<details class="brewlog-entry-details">`. |
| **VA-13** | Bonenkaart rustig: foto, naam (met ♥ als favoriet), één regel met proces · roast · versheid · voorraad, hoogstens drie smaaktags als tekst (+N), en één actie: "Zet opnieuw · V60" als er een vorige kop is, anders "Zet deze boon". Verwijderen staat op het boondetail. Zoekveld en sortering onder elkaar. | `.bean-card-go`, `#bean-detail-delete-btn`. |
| **VA-11** | De tab Smaakprofiel verschijnt pas als de boon smaakdata heeft (keuze Jelle). | `renderBeanDetailRadar()` zet `hidden` op de tab. |
| **VA-26** | Het thema volgt het systeem, tenzij je zelf kiest: Instellingen → Weergave (Systeem / Licht / Donker). De themaknop in de koprij is weg. `theme-color` is gelijk aan `--bg`. Een klein script in de `<head>` zet het thema vóór de eerste weergave (geen flits). Wie vroeger zelf wisselde, houdt die keuze; wie nooit wisselde, volgt voortaan het systeem. De back-up neemt "systeem" mee. | `themePref()`, `applyThemePref()`, `setThemePref()`, `loadTheme()` met een `matchMedia`-luisteraar; `<script id="theme-boot">`. |
| **VA-29 · VA-30** | Geen tabbalk tijdens een taak: recept, timer en proefkaart tot je die opslaat (keuze Jelle). Terug gaat via de terugknop; na het opslaan komt de balk terug, ook als het formulier blijft staan omdat er nog antwoorden open zijn. De kop van de proefkaart is compact (vinkje naast de titel, de drie getallen op één regel), zodat vraag 1 met alle opties op een iPhone SE in beeld staat. De knoppenrij op het recept zit zonder balk tegen de onderrand. De tabbalk is 94% dekkend (was 72–78%) en de overgang boven de knoppenrij is 8 px (was 30%), zodat er geen tekst doorschemert. | `isTaskScreen()`, `syncNavbar()` (vanuit `showScreen()` en `setBrewLogMode()`), `.app[data-task]`, token `--surface-bar`. |
| **VA-34** | "Zet deze boon" (bonenkaart, boondetail, en "Zet opnieuw" zonder vorige kop) gaat direct naar het recept, met de roast en het smaakprofiel van de boon (keuze Jelle). Past de boon ongeveer even goed bij twee smaken, dan eerst kort de smaakkeuze, met een regel die beide noemt. Zonder bekende roast of profiel: het adviesscherm zoals voorheen. Het adviesscherm blijft bereikbaar via "Niet zeker?"; een boon kiezen op dat scherm werkt als voorheen (BC-01). | `brewBeanDirect()`; `applyAdvice({ toProfile, tieNote })`; `#profile-tie-note`. |
| **VA-32** | Toegankelijkheidsstructuur. Sectiekoppen zijn `<h2>` (31 labels), de adviesketen `<h3>`; een `:where(h2,h3)`-reset houdt het uiterlijk gelijk. De timertitel is een `<h1>` die de focus krijgt bij openen, dus aangekondigd wordt. De tabs (boondetail, logboek) volgen het ARIA-tabpatroon: `aria-controls`, `role="tabpanel"`, één tabstop, pijltjes, Home en End; de themakeuze is een radiogroep met één tabstop en pijltjes. Tikdoelen ≥ 44 px: Stop, de hartjes, verwijderen, de smaakcategorieën, "meer"-knoppen, de rijen van de receptentabel, de keuzes op de proefkaart en de waterschuif. | `wireDetailTabs()`, `selectDetailTab()`. |
| **VA-33** | Eén productnaam (Brew Console, ook in `package.json`) en één stem. Weg: "Familiar. Refined. Extraordinary." (nu "Vertrouwd. Verfijnd. Bijzonder."), "Brew stoppen?", "Fine-tunet", "loggings" (nu "(gelogde) koppen"), "het engine-geldige venster" (nu "Past bij dit recept: 240–415 ml."), "leercorrectie" (nu "maalcorrectie"), "boontype + methode", "werkelijke stand" (nu "gemalen op klik 15"), "schema-tijd (niet gemeten)" (nu "volgens schema 3:30"). Decimale komma in klikken; "Backup" wordt "Back-up". | Alleen tekst; `prepNoteIsStatusOnly()` volgt de nieuwe zin. |
| **VA-20** | Eén knopfamilie. Elke gevulde knop draagt `.btn-primary` (minimaal 52 px hoog, `--radius-md`, de sansletter, de primaire tokens); `.btn-primary--sm` en `.pill-cta` zijn 44 px. Eén secundaire stijl voor `.btn-secondary`, `.advisor-primary`, `.advisor-link` en `.bean-use-btn`: oppervlak, koperen rand, sansletter. De serif blijft voor titels. De back-upknoppen staan op een smalle telefoon onder elkaar, zodat het label op één regel blijft. | Eén canonieke regel voor `.btn-primary, .start-btn, .pill-cta, .advice-cta`. |
| **VA-21** | Tokens in plaats van losse waarden. Eén `[hidden]`-regel voor de hele app (35 losse reparaties weg); één `body::before`; 68 kleurliteralen vervangen door tokens (`--copper-a02…a35`, `--ink-a00…a90`, `--glow-*`, `--rate-1…5` e.d.); 16 vaste hoeken naar `--radius-*`. Inline stijlen in de opmaak van 165 naar 8 (alle 8 datagestuurd, zoals de tagkleur). Een omzetting maakte de rode rand om de dosis onvoorwaardelijk; teruggezet naar alleen bij "bijna op", met een test. | `tests/design-system.test.mjs` (lint, draait mee in `npm run qa`). |
| **VA-27 (meegenomen)** | De waterschuif kreeg het koperaccent in plaats van systeemblauw. De tekst was al aangepast onder VA-33. | Eén regel CSS. |

**Gemeten na de bouw** (dezelfde meetscripts als de audit, Chromium):

- Contrast: 0 teksten onder 4,5 : 1 (zonder foto als achtergrond) over 54 schermopnamen (27 schermen × licht en donker), net als na fase 1.
- Tekst op de timerfoto (5 fasen × 4 formaten × 2 thema's, 208 metingen): allemaal boven de norm. Kleine tekst ≥ 5,2 : 1, de grote instructie ≥ 4,4 : 1 (norm 3), mediaan 12,3 : 1. **Lager dan na fase 1 op de iPad** (instructie liggend in de fasen doorlopen en klaar 5,6–7,0 → 4,4): de foto vult daar nu het hele scherm, dus de instructie staat boven een lichter deel van de kan. Nog ruim binnen de norm; een iets sterkere scrim op brede schermen kan in fase 3.
- Tikdoelen onder 44 px op de hoofdschermen: van 76 (audit) naar 1. Die ene is het selectievakje "Ik meng mijn kraanwater", dat binnen een label van 44 px hoog staat; het label is het tikdoel.
- K1: op iPhone, iPhone SE, iPhone liggend, iPad staand, iPad liggend en desktop, in de klaarstand en tijdens het gieten: geen koprij, geen tabbalk, de foto vult het scherm en er is geen horizontale scroll.
- VA-30: op de iPhone SE kost de vaste onderrand op het recept nu de knoppenrij (± 76 px, was ± 138 px). De vier hoofdgetallen (water, koffie, maalgraad, temperatuur) staan nu ook op de iPhone SE boven de knoppen; dat was het open punt van VA-04. Ratio en brouwtijd vallen er net onder.
- Klaarstand op de iPhone SE: "Start de klok" staat zonder scrollen in beeld (onderkant 662 van 667 px).
- Knopteksten op 375 px: geen enkel label breekt af of wordt afgekapt. De knoppen met icoon en label, kaarten met titel en uitleg, en de bypasskeuzes met percentage en ratio staan bewust op twee regels.

**Open punten:** de controle met VoiceOver op een echte iPhone (VA-32 [H]); de scrim op brede schermen (hierboven); "Meer over deze maalstand ↓" is een tekstlink die in de smalle tegel op twee regels staat.

## Testresultaten

918 tests groen (`npm run qa`), waarvan 22 nieuw: 8 in `tests/design-system.test.mjs` (de lint voor VA-20 en VA-21: geen losse kleur buiten de themablokken, geen statische inline stijl, één `[hidden]`-regel, geen ongedefinieerde custom property, hoeken via tokens, één `body::before`, elke gevulde knop `.btn-primary`, knoppen in de sansletter) en 14 browsertests in `tests/kernflow.smoke.test.mjs` ("Visuele audit fase 2": K1/VA-15 op twee formaten, VA-16, 17, 14, 13, 12, 11, 26 met toetsenbord, 29/30 op de iPhone SE, 34 met een bijna-gelijke boon, 32, 33, 20, en de rode rand om de dosis). Aangepaste bestaande tests: een helper `navTo()` tikt de tabbalk als die zichtbaar is (tijdens een taak is hij weg); een helper `expandLogEntries()` klapt de logregels open voordat een test de inhoud leest; de timertests verwachten de nieuwe wachtregel, "Start de klok" na ↻ en de schakelaar (`aria-checked`); de thematest gaat via Instellingen; verwijderen van een boon gaat via het boondetail; boondetail → recept is direct; de VA-19-test van fase 1 meet liggend (844 × 390), omdat de klaarstand op de iPhone SE nu niet meer scrolt; en de teksttests volgen de nieuwe woorden ("gemalen op klik", "volgens schema", "gelogde koppen", "maalcorrectie").

# Visuele en UX-audit "Calm Precision" — fase 3 (afwerking)

Uit dezelfde roadmap, fase 3: VA-22 t/m VA-25, VA-27, VA-28, VA-31 en VA-35 t/m VA-47. Geen receptgetal, geen adviesregel en niets in de engine-bundel veranderd (byte-gelijk aan fase 2). Keuzes van Jelle na een vergelijking van schermopnamen: getallen in de **tekstletter** (VA-43), **kleurstalen** voor bonen én roastkaarten (VA-47/28/40), en op het smaakscherm **alleen koper** (VA-23).

| # | Besluit | Gebouwd |
| --- | --- | --- |
| **VA-22** | Eén iconenset. Geen emoji of losse tekens meer in knoppen en labels (☕ 🔍 📷 🧪 🔔 🗑️ ⬇️ ⬆️ 🌸 ⚠ ✎ ↻ weg; het hartje en de camera zijn lijniconen). Alle lijniconen tekenen met 1,7 px, ook als ze groter of kleiner getoond worden (`vector-effect: non-scaling-stroke`); er waren vijf lijndiktes. `★ Beste kop` en `✓` blijven: dat zijn tekstletters in inhoud. | `HEART_ICON`, `HEART_ICON_FILLED`, `CHECK_ICON`, `.icon`. |
| **VA-23** | Smaakscherm: geen eigen kleur per smaak of stijl meer; iconen neutraal, koper alleen voor de gekozen regel (ook het bolletje op het receptscherm). De intro is één zin; wat je keuze wel en niet verandert staat achter "Wat verandert je keuze?" (de tekst zelf is gelijk gebleven, de test op eerlijke UI-teksten blijft gelden). | `.profile-icon`, `.more-info`. |
| **VA-24** | Boonformulier: labels van 14 px, uitleg als hulptekst onder het veld, "optioneel" klein en in de gewone letter, een kortere en gedempte scan-disclaimer. Smaaknotities: een zoekveld en twaalf suggesties (eerst je gekozen notities, dan wat je het vaakst koos, aangevuld met veelvoorkomende notities). Het volledige SCA-wiel (139 notities, met het smaakdiagram) staat achter een knop; een keuze daar en in de suggesties is dezelfde. Enter in het zoekveld verstuurt het formulier niet. | `flavorQuickTags()`, `renderFlavorQuick()`, `toggleFlavorTag()`, `setFlavorWheelOpen()`. |
| **VA-25** | Water in Instellingen: velden en uitkomsten zichtbaar, de uitleg achter "Hoe vind ik dit?", de keuzelijst voor verdunning over de volle breedte (niet meer afgekapt). De regel "pH: niet in te vullen" toonde iets wat niet kan; die zin staat nu in de uitleg. De herkomstregel is korter. | `#water-howto`. |
| **VA-27** | (Al in fase 2: koperen schuif en de tekst "Past bij dit recept".) Nu ook overal: selectievakjes, keuzerondjes en schuiven in koper. | `accent-color`. |
| **VA-28** | Boondetail: een kleine kop (kleurstaal, naam, herkomst, hartje) en direct daaronder "Zet deze boon" als primaire knop, boven de vouw op 390 × 844. De gegenereerde beschrijving (die naam, herkomst en labels herhaalde) is weg; feiten zonder waarde (de "—"-rijen) worden niet getoond. "Bewerken" en "Boon verwijderen" staan onderaan. | `#bean-detail-swatch`, `.bean-detail-head`. |
| **VA-31** | Statistieken: onder de 20 geteste stappen geen percentage ("100%" na één test las als een oordeel), wel "1 van 1" en een balk naar 20. Alleen weergave; de adviespoort zelf is gelijk. | `.gate-progress` in `renderAdviceOutcomeSection()`. |
| **VA-35** | Desktop en iPad liggend: de zijbalk loopt over de volle hoogte; alleen de actieve bestemming is gemarkeerd ("Zet" was altijd koper en vet); knoppen en lopende tekst hoogstens 720 px breed; Home vanaf 1100 px in twee kolommen (je kop links, je bonen rechts als raster). | `.home-main`, `.home-side`. |
| **VA-36** | iPad staand: recepttegels in één rij even hoog; op Home vanaf 700 px de bonen als raster dat de breedte vult. | `#stats-grid{align-items:stretch}`. |
| **VA-37** | Splash: de laadbalk die animeerde terwijl er niets laadde is weg (de tagline was al Nederlands, VA-33). | — |
| **VA-38** | De ring staat bij het openen van de timer meteen leeg (hij draaide 0,9 s terug van vol); een sprong terug (nieuw brouwsel, reset) gaat zonder overgang. De gloed ademt niet meer doorlopend, alleen drie keer tijdens de voorwaarschuwing vóór een giet. | `setDialFill()`, `.dial-wrap.pre-alert`. |
| **VA-39** | Recept: "Kies een boon" op een eigen regel (de knop van 44 px maakte de regelafstand ongelijk); tabelkop "Erbij" in plaats van "Water erbij"; daardoor staat "Klaar — laten doorlopen" in de iPad-zijkolom op één regel. | — |
| **VA-40** | Roastkaarten: de kleurstaal is het beeld; de keuze herken je ook zonder kleur, aan een dubbele koperen rand en een vinkje. Op de telefoon een lijst; vanaf 700 px vijf kaarten naast elkaar. | `renderRoastGrid()`. |
| **VA-41** | Adviesblok: de titel is "Maal 1 klik fijner"; de klikken staan één keer, in de tegels Nu → Volgende. Elders (Home, logboek) houdt de titel de klikken, want daar zijn geen tegels. | `titleShort` uit `recommendationTexts()`. |
| **VA-42** | Klaarstand en proefkaart: 14 px tussen "Proeven & loggen" en "Volledig schema"; tegellabels op één regel ("Temp." met eronder "gepland"). | — |
| **VA-43** | Getallen buiten de timer in de tekstletter met even brede cijfers; de eenheid kleiner en gedempt (17,3 g, 300 ml, 94–96 °C). De timer en het woordmerk blijven monospace. | `.unit`. |
| **VA-44** | Selectievakje "Ik meng mijn kraanwater": 24 px en koper. | — |
| **VA-45** | Een lange badge breekt tussen woorden af in plaats van buiten beeld te lopen (de bypass-badge eindigde op 424 px bij een scherm van 390). | `.badge`. |
| **VA-46** | Hover alleen met een echte muis: alle 25 hover-regels staan onder `@media (hover:hover)`, zodat op iOS na een tik geen hoverkleur blijft hangen. Een lint bewaakt dat. | — |
| **VA-47** | Bonen zonder eigen foto krijgen een kleurstaal van hun roastgraad met hun initialen (lijst, Home, boondetail), geen stockfoto die op een foto van de zak leek; lichte stalen met donkere letters, donkere met lichte. De vijf roastfoto's (874 kB) zijn uit de repository en uit de offline-cache; `CACHE_VERSION` gaat van 2 naar 3, zodat ze ook uit de cache van bestaande gebruikers verdwijnen. Een eigen foto per boon is kans K10 (fase 4). | `roastSwatchHtml()`, `beanInitials()`; `sw.js`. |

**Gemeten na de bouw** (dezelfde meetscripts als de audit, Chromium):

- Contrast: 0 teksten onder 4,5 : 1 (zonder foto als achtergrond) over 54 schermopnamen, licht en donker. Tekst op de timerfoto: 208 metingen, alle boven de norm (ongewijzigd t.o.v. fase 2).
- Tikdoelen onder 44 px op de hoofdschermen: 1, het selectievakje van 24 px dat binnen een label van 44 px staat.
- VA-24: het boonformulier volledig uitgeklapt was 9,5 schermhoogtes op 390 × 844; nu 3,97 (norm ≤ 4). Het volledige smaakwiel komt daar bovenop als je het opent.
- VA-28: "Zet deze boon" staat op 390 × 844 boven de vouw; geen "—"-rijen.
- VA-35: op 1440 × 900 is geen knop breder dan 720 px (was 802 px); precies één bestemming gemarkeerd.
- VA-38: de ring bij het openen van de timer: was een dashoffset van 10 → 565 in 0,9 s (vol naar leeg); nu vanaf het eerste beeld 565 (leeg).
- VA-45: met bypass aan en alle blokken open geen horizontale overloop (de lange badge eindigt op 340 px bij een scherm van 390).
- Knopteksten op 375 px: geen label breekt af of wordt afgekapt; "Niet zeker? Advies bij je boon →" is daarvoor korter geworden. "Meer over deze maalstand ↓" is een tekstlink in een smalle tegel en staat op twee regels (open punt uit fase 2).
- De offline-cache is ±874 kB kleiner (vijf roastfoto's).

**Open punten:** de controle met VoiceOver op een echte iPhone (uit fase 2), de scrim op brede schermen (uit fase 2), en de hover-staat op een echte iPhone (VA-46 [H]). Een eigen foto per boon is kans K10 (fase 4).

## Testresultaten

932 tests groen (`npm run qa`), waarvan 14 nieuw: 3 in `tests/design-system.test.mjs` (geen emoji in knoppen, labels of uitklapkoppen; één lijndikte voor lijniconen; elke `:hover` binnen `@media (hover:hover)`) en 11 browsertests in `tests/kernflow.smoke.test.mjs` ("Visuele audit fase 3": VA-22, 23, 24, 25, 28, 35, 36, 37/38, 39/42/43, 44/27, 45). Aangepaste bestaande tests: de fototest controleert nu de kleurstalen (lijst, Home, boondetail, roastkaarten; geen `<img>`); de servicewerkertest gebruikt cache `brew-console-v3` en een andere foto; de pH-regel staat in de uitleg (VA-25); de statistiektest verwacht "1 van 1" zonder percentage en een voortgangsbalk (VA-31); de adviestitel is "Maal 1 klik fijner" met de klikken in de tegels (VA-41); en receptgetallen staan in de tekstletter, de timer in monospace (VA-43). De lint kent `--swatch` (zet het element zelf, net als `--tag-color`) en `border-radius: inherit`.

# Knoppen in gedraaid koper (Knoppenlab, sterkte "subtiel")

De knoppen waren plat en één kleur. Uit het Knoppenlab (drie richtingen, daarna drie sterktes van gedraaid koper) is gekozen voor **gedraaid koper, subtiel**: het materiaal van een koperen waterkoker of draaiknop, met draaisporen en een zachte glans, maar rustig genoeg dat de tekst en het recept het belangrijkste blijven. Alles is CSS: gelaagde verlopen, geen afbeeldingen, geen nieuwe afhankelijkheden.

| Knop | Wat het is | Waar |
|---|---|---|
| **Primair** (Start, Opslaan, Hervat, adviesknoppen; `.btn-primary`) | Een koperen staaf: fijne draaisporen in de lengte, een cilinderverloop van licht boven naar donker onder, een lange reflectie die naar de randen zwakker wordt, een facetrand (licht boven, donker onder) en een korte slagschaduw. Tekst licht gegraveerd. Bij indrukken rolt de lichtband mee naar beneden en zakt de knop 1 px. Zonder verloop (oude browser) blijft het `--primary`. | `.btn-primary, .start-btn, .pill-cta, .advice-cta` |
| **Timer: pauze** | Een koperen draaiknop: een geslepen ring (licht van linksboven), een vlak met concentrische draaisporen, een vierlobbige reflectie die bij hover en indrukken een paar graden meedraait, en een gegraveerd icoon. Gepauzeerd wordt het de pil "Hervat" in dezelfde staaf als de primaire knop. | `.brew-controls #pause-btn` |
| **Timer: Home en Reset** | Dezelfde knop in donker brons, zodat de pauzeknop de enige koperen blijft (één primaire actie per scherm). | `#home-btn, #reset-btn` |
| **Secundair** | Alleen de rand is gedraaid metaal (licht boven, donker onder); het vlak blijft het oppervlak. De destructieve knop in Instellingen blijft rood. | `.btn-secondary, .advisor-primary, .advisor-link, .bean-use-btn` |

Hetzelfde metaal in beide thema's (koper verandert niet van kleur als het licht anders is); alleen de slagschaduw is in het lichte thema warmer en lichter. Hover alleen met een muis (VA-46); met "minder beweging" geen overgang. De reflectie draait en rolt via de geregistreerde eigenschappen `--rot` en `--roll` (`@property`). Alle kleuren staan als tokens in `:root` (`--metal-*`, `--knob-*`, `--bronze-*`).

**Gemeten** (Chromium, 390 × 844, licht en donker, per pixel in de tekstzone): knoptekst `--on-primary` op het gerenderde koper minstens 6,1 : 1 in rust en 4,6 : 1 ingedrukt (de donkerste plek); op de Hervat-pil 5,0 : 1. Het icoon op brons 5,8 : 1. De rekenkern is ongewijzigd.

**Testresultaten:** 936 tests groen (`npm run qa`), waarvan 4 nieuw in `tests/kernflow.smoke.test.mjs` ("Gedraaid koper (knoppen)": de staaf en het meerollen bij indrukken; de draaiknop, brons en de gepauzeerde staaf; de metalen rand van de secundaire knop; geen overgang met minder beweging).

# Knoppen in champagnekoper en zachtere blokranden

Na het gedraaide koper (hierboven) vond Jelle de horizontale draaisporen te druk. Op basis van een voorbeeld (een plaat geborsteld champagnekoper) is het herzien:

| Wat | Was | Nu | Waar |
|---|---|---|---|
| **Primaire knop** (en "Hervat") | Koperen staaf met horizontale draaisporen en een reflectie in de breedte. | **Egaal champagnekoper**: één verloop dat in het midden licht is (#C9A676) en naar boven en onder donkerder wordt (#84613F), met de **borstelstructuur** van het voorbeeld: lange, fijne verticale haarlijnen. De facetrand en schaduw blijven. Bij indrukken rolt de lichtband nog iets mee (half zo ver als eerst). | `--metal-bar`, `--metal-grain`; `.btn-primary` |
| **Timer: pauze** | Oranjekoperen draaiknop. | Dezelfde gedraaide knop (concentrische sporen) in champagnekoper, zodat hij bij de primaire knop hoort. Home en Reset blijven brons. | `--knob-*` |
| **Secundaire knop** | Rand in oranjekoper. | Rand in champagnekoper. | `.btn-secondary` e.a. |
| **Informatieblokken** (Je volgende kop, Back-up, het adviesblok, "Volgende keer" bij het recept) | Rand in vol koper. | Zachtere rand: koper op 40 % dekking. Keuzes (geselecteerde roast, chip, stap) houden vol koper, want daar betekent de rand "dit is gekozen". | `--block-accent-border` |

De borstelstructuur is uitgerekte ruis (SVG `feTurbulence`, hoge frequentie in de breedte, heel lage in de hoogte), als ingebouwd beeld in `:root`, met `background-blend-mode: overlay` over het verloop: 50 % grijs verandert niets, lichter en donkerder geven de haarlijnen. Geen afbeeldingsbestand, geen afhankelijkheid.

**Gemeten** (Chromium, 390 × 844, licht en donker gelijk):

- Kleurverloop over de knophoogte: #96724B → #C9A676 (midden) → #AB865C; het voorbeeld loopt van #7D5B3F aan de rand naar #CAA676 in het midden.
- Structuur: spreiding per rij 6,7–7,7 (op een schaal van 255); het voorbeeld 3,7–7,7.
- Knoptekst `--on-primary` tegen elk afzonderlijk pixel van de structuur in de tekstzone: minstens 5,1 : 1 in rust en 4,7 : 1 ingedrukt; gemiddeld 7,4 : 1. Om dat te halen zijn de flanken van het verloop iets lichter dan in het voorbeeld en rolt de lichtband bij indrukken maar half zo ver.

**Testresultaten:** het blok "Champagnekoper (knoppen)" in `tests/kernflow.smoke.test.mjs` (5 browsertests): geen horizontale strepen, één verloop met de structuur erover, meerollen bij indrukken, de pauzeknop en "Hervat", de metalen rand van de secundaire knop, de zachtere blokrand en geen overgang bij minder beweging. De rekenkern is ongewijzigd.

# Knoppen in geborsteld champagnekoper en zachtere blokranden

Na het gedraaide koper (hierboven) vond Jelle de horizontale draaisporen te druk. Op basis van een voorbeeld (een plaat geborsteld champagnekoper) is het herzien, in twee rondes: eerst egaal, daarna met de structuur van het voorbeeld, "echt fijn geborsteld, geen strepen".

| Wat | Was | Nu | Waar |
|---|---|---|---|
| **Primaire knop** (en "Hervat") | Koperen staaf met horizontale draaisporen en een reflectie in de breedte. | **Geborsteld champagnekoper**: één verloop dat in het midden licht is en naar boven en onder donkerder wordt, met de borstelstructuur van het voorbeeld (korte, fijne verticale vezels met wat spikkel). De facetrand en schaduw blijven. Bij indrukken rolt de lichtband nog iets mee (half zo ver als eerst). | `--metal-bar`, `--metal-grain`; `.btn-primary` |
| **Timer: pauze** | Oranjekoperen draaiknop. | Dezelfde gedraaide knop (concentrische sporen) in champagnekoper, zodat hij bij de primaire knop hoort. Home en Reset blijven brons. | `--knob-*` |
| **Secundaire knop** | Rand in oranjekoper. | Rand in champagnekoper. | `.btn-secondary` e.a. |
| **Informatieblokken** (Je volgende kop, Back-up, het adviesblok, "Volgende keer" bij het recept) | Rand in vol koper. | Zachtere rand: koper op 40 % dekking. Keuzes (geselecteerde roast, chip, stap) houden vol koper, want daar betekent de rand "dit is gekozen". | `--block-accent-border` |

**Hoe de structuur is gemaakt.** Uitgerekte ruis (SVG `feTurbulence`: fijn in de breedte, langer in de hoogte) plus een beetje fijne spikkel, als ingebouwd beeld in `:root`; geen afbeeldingsbestand. Drie keuzes maken het "fijn geborsteld" in plaats van "strepen":

- **Kort, niet doorlopend.** Vezels van ongeveer 17 px in plaats van lijnen over de hele knophoogte; doorlopende lijnen lezen als strepen.
- **Op schermpixelniveau.** Getekend op 3× en getoond op 1×, zodat een vezel één à twee schermpixels breed is op een iPhone.
- **Multiply, niet overlay.** Met overlay was de structuur het sterkst in de donkere randen ("vacht"); met multiply schaalt ze mee met het licht, zoals bij het voorbeeld: zwak aan de randen, het duidelijkst in het lichte midden. Omdat multiply alleen donkerder maakt, is het verloop 6 % lichter gezet.

**Gemeten** (Chromium, 390 × 844, licht en donker gelijk):

- Kleur over de knophoogte: #96714B → #C9A676 (midden) → #AA855C; het voorbeeld loopt van #7D5B3F aan de rand naar #CAA676 in het midden.
- Structuur (spreiding per rij, schaal 0–255): 4,3 aan de rand tot 6,6 in het midden; het voorbeeld 3,7 tot 7,7. Op 3× en op telefoonschaal haalt het voorbeeld 6,9, deze knop 5,5.
- Knoptekst `--on-primary` tegen elk afzonderlijk pixel van de structuur in de tekstzone: minstens 4,9 : 1, in rust en ingedrukt, op 2× en 3× (de startknop 5,1, de Hervat-pil 4,9); gemiddeld 7,3 : 1. Om dat te halen zijn de flanken van het verloop iets lichter dan in het voorbeeld en rolt de lichtband bij indrukken maar half zo ver.

**Testresultaten:** het blok "Champagnekoper (knoppen)" in `tests/kernflow.smoke.test.mjs` (5 browsertests): geen horizontale strepen, één verloop met de structuur erover (multiply), meerollen bij indrukken, de pauzeknop en "Hervat", de metalen rand van de secundaire knop, de zachtere blokrand en geen overgang bij minder beweging. De rekenkern is ongewijzigd.

# Primaire knop in mat champagnekoper (UI Refinement V1.0)

Jelle leverde een precieze specificatie aan: een rustig, bijna egaal vlak in champagnekoper, zonder strepen, textuur of glans. Op zijn keuze geldt die voor de **hele primaire knopfamilie** (`.btn-primary`: Zet opnieuw, Start, Naar de timer, Opslaan, Zet deze boon, Proeven & loggen, Hervat, enz.), niet alleen voor "Zet opnieuw", zodat de app één hoofdknop houdt (VA-20).

**Weg:** de geborstelde textuur (`--metal-grain`, een SVG-ruis via `multiply`), het staafverloop met rollende lichtband (`--metal-bar`, `--roll` en `@property --roll`) en de bijbehorende rand-, druk- en reliëftokens (`--metal-1`, `-3`, `-deep`, `-edge-hi`, `-edge-lo`, `-seat`, `-press`, `-press-hi`, `-emboss`). De dode kleuren in `.bed-dry-btn` zijn opgeruimd: die werden al door `.btn-primary` overschreven.

**Nieuw:**

| Eigenschap | Waarde |
|---|---|
| Vlak | `#D4A574`, met een heel zacht verloop van boven naar onder: `#E2BC91` 0 % → `#DAB082` 24 % → `#D4A574` 55 % → `#C99160` 100 %. Geen `::before`/`::after`, geen textuur. |
| Rand | 1 px `rgba(105,63,34,.22)`; bovenrand `rgba(255,242,222,.42)` als fijne lichtrand. |
| Schaduw | `inset 0 1px 0 rgba(255,242,222,.12), 0 2px 0 rgba(105,63,34,.28), 0 5px 12px rgba(0,0,0,.18)`. De interne highlight blijft: op 3× vormt hij met de bovenrand één aflopende lichtrand, geen dubbele lijn. |
| Vorm | 64 px hoog, hoek 17 px (afgeronde rechthoek, geen pil), volle breedte, zijmarge 24 px. |
| Letter | sansletter 17 px, gewicht 600, regelhoogte 24 px, spatiëring −0,2 px, `#21170F`. |
| Pijl | Het teken "→" is een lijnicoon van 20 × 20 px (zelfde iconenset, lijndikte 1,7), 10 px van de tekst; tekst en pijl staan als één groep gecentreerd. |
| Hover (alleen muis) | `brightness(1.025)`, 1 px omhoog. |
| Ingedrukt | `brightness(.97)`, 1 px omlaag, kleinere schaduw. Overgangen 150 ms. |
| Focus (toetsenbord) | omlijning 2 px `rgba(212,165,116,.85)` op 3 px afstand. |
| Uitgeschakeld | minder verzadiging, 60 % dekking, geen beweging. |
| Minder beweging | geen overgang en geen verschuiving. |

Alle waarden staan als tokens in `:root` (`--cta-*`, `--radius-cta`, `--fs-cta`), in beide thema's gelijk. De typeschaal krijgt daarvoor een achtste stap: 17 px voor de primaire knop (de iOS-maat voor knoppen); de typografietest kent die stap. `--primary` is in het donkere thema dezelfde kleur, maar verschilt in het lichte; daarom eigen tokens. Bestaande globale tokens zijn niet veranderd.

**Varianten en uitzonderingen.**

- **Kaartknop op Home.** De kaartvormige primaire knop op Home zonder volgende kop ("Nieuw brouwsel starten") draagt hetzelfde koper, maar houdt de kaartletter (titel vet, uitleg gewoon). Achtergrond, rand, schaduw en overgang van `.home-cta` overschreven die van `.btn-primary`; die staan er nu expliciet.
- **"Hervat".** De pil op de timer krijgt hetzelfde koper. De lopende pauzeknop blijft de gedraaide knop; Home en Reset blijven brons.
- **Kleine knop.** De kleine variant ("+ Nieuwe boon", 44 px) houdt dezelfde hoek, zodat de familie één hoekradius heeft.
- **Smallere zijmarges.** "Naar de timer · 3:30" naast "Aanpassen" heeft 16 px zijmarge en de adviesknop ("Gebruik V60 met deze keuzes") 10 px. Zo passen beide op 375 px weer op één regel, zoals voorheen. "Gebruik Chemex met deze keuzes" breekt op 375 px over twee regels, net als vóór deze wijziging.
- **"Proeven & loggen".** Die knop werd met `display:block` getoond; nu `flex`, zodat tekst en pijl als één groep gecentreerd staan.

**Gemeten** (Chromium; iPhone 390 × 844 op 2× en 3×, iPhone SE 375 × 667; licht en donker):

- Knoptekst `#21170F` tegen elk afzonderlijk pixel van het gerenderde koper in de tekstzone: minstens 6,9 : 1 in rust en 6,4 : 1 ingedrukt; gemiddeld 8,0 : 1. Gemeten op Zet opnieuw, Naar de timer, Hervat en de kaartknop.
- "Zet opnieuw": 316 × 64 px, hoek 17 px, afstand tekst–pijl 10 px, groep op 0,0 px van het midden.
- Op 375 px staat elke zichtbare primaire knop op één regel. Geen knop loopt buiten zijn kaart of het scherm.

**Testresultaten:** het blok "Primaire knop: mat champagnekoper" in `tests/kernflow.smoke.test.mjs` controleert:
- geen textuur en geen pseudo-lagen;
- het exacte verloop, de kleuren, de maat, de letter, de rand en de schaduw;
- de ingedrukte staat;
- de focusomlijning met het toetsenbord;
- de kaartknop op Home;
- de pauzeknop en "Hervat";
- de secundaire rand, de zachte blokrand en "minder beweging".

Aangepast:
- de VA-20-test herkent gevulde knoppen aan `--cta-base`;
- "Proeven & loggen" heeft een pijlicoon in plaats van het teken.

De rekenkern is ongewijzigd.

# Primaire knop in geborsteld champagnekoper (foto, uitsnede F2)

Het matte champagnekoper (V1.0, hierboven) was Jelle te vlak. Twee pogingen om het geborstelde karakter in CSS na te maken vielen af:
- V2.0, een herhalend verloop van 3 px op 2 % dekking, was niet wat hij bedoelde.
- Zijn eigen snippet (lichtbanen over de breedte, `filter`) leverde de volgende varianten op. Letterlijk zat de donkerste baan achter de tekst (3,6 : 1). De bewerkte versies (B–D) waren ook niet wat hij zocht.

Hij wees zijn foto van een plaat geborsteld champagnekoper aan als "de finesse die ik zoek". Die foto is nu de achtergrond van de hele primaire knopfamilie (`.btn-primary`).

**Keuze F2 uit drie uitsneden** (gemeten op "Zet opnieuw", tekstcontrast tegen de donkerste haarlijn / gemiddeld):

| Uitsnede | Contrast | |
|---|---|---|
| F1, de hele plaat | 3,5 / 6,1 | te donker boven en onder |
| **F2, het middelste deel (≈ 60 %)** | **4,5 / 6,7** | **gekozen** |
| F3, alleen de lichte band (≈ 40 %) | 5,0 / 7,0 | |

**Wat er staat:**

- **Bestand:** `photos/koper-geborsteld.webp`, 924 × 320 px, 31 kB. Het is de plaat zonder de zwarte randen, het middelste deel (1/1,65), in de hoogte verkleind. De knop drukt het beeld in de hoogte toch samen, en de haarlijnen lopen verticaal, dus ze blijven scherp. 320 px is genoeg voor de hoogste knop (de kaartknop, 105 px) op 3×.
- **Offline:** het bestand staat in `PHOTOS` in `sw.js`, net als de andere foto's, dus het is ook offline beschikbaar.
- **Achtergrond:** `background: var(--cta-photo) center / 100% 100% no-repeat, var(--cta-gradient)` op `.btn-primary`, "Hervat" en de kaartknop.
  - Het zachte verloop (#DDB58D → #D6AA7E → #D0A071) is de terugval zolang de foto laadt.
  - `background-color` blijft #D4A574.
- **Rand en schaduw:** uit V2.0. Rand 1 px `rgba(105,63,34,.18)`, bovenrand `rgba(255,242,222,.35)`. Eén compacte schaduw `0 2px 6px rgba(0,0,0,.12)`, ingedrukt `0 1px 4px rgba(0,0,0,.1)`. Geen inset-licht en geen donkere onderrand meer.
- **Ongewijzigd uit V1.0:** vorm, maat, letter en pijl. De staten (hover, ingedrukt, focus, uitgeschakeld, minder beweging) ook.
- **Kaartknop op Home** ("Nieuw brouwsel starten" zonder bonen):
  - Hij is 105 px hoog, daarom toont hij het lichte middendeel van de foto (`100% 150%`).
  - De uitleg staat op volle sterkte: gedempt tot 82 % haalde hij op de foto maar 4,1 : 1, nu 4,8 : 1.
  - Zijn hoek is nu ook 17 px: `.home-cta` zette 14 px, waardoor de familie twee hoeken had.
- **Tokens:** `--cta-photo`, `--cta-gradient`, `--cta-border(-top)`, `--cta-shadow(-press)`. Opgeruimd: de V1-tokens voor inset-licht, diepte en omgevingsschaduw, en de tijdelijke voorvertoningstokens (`--cta2-*`) en -regel.

**Gemeten** (Chromium, iPhone 390 × 844 op 3×, licht en donker gelijk; tekstcontrast tegen de donkerste haarlijn / gemiddeld):

| Knop | Contrast |
|---|---|
| Zet opnieuw, Start de klok, Proeven & loggen, Zet deze boon, + Nieuwe boon | 4,5 / 6,7 |
| Naar de timer, Hervat | 4,7 / 6,7 |
| Kaartknop: titel | 5,0 / 7,0 |
| Kaartknop: uitleg | 4,8 / 7,0 |

Op 375 px staat elke primaire knop op één regel. Geen knop loopt buiten zijn kaart of het scherm.

**Herkomst van de foto:** aangeleverd door Jelle. Komt hij van internet, dan moet het gebruiksrecht nog worden nagegaan.

**Testresultaten:** het blok "Primaire knop: geborsteld champagnekoper" in `tests/kernflow.smoke.test.mjs` controleert:
- de foto met het verloop als terugval, de maat, de letter, de rand en de schaduw;
- de ingedrukte staat;
- dat de foto laadt en in de offline-lijst staat;
- de focusomlijning;
- de kaartknop (middendeel en uitleg op volle sterkte);
- "Hervat", de secundaire rand, de zachte blokrand en "minder beweging".

De offline-test controleert dat de foto na installatie in de cache staat. De rekenkern is ongewijzigd.

**Aanvulling: de Zet-knop in de tabbalk.** De verhoogde, ronde middenknop van de tabbalk (telefoon) had nog de vlakke `--primary`-vulling met een koperen gloed. Hij draagt nu hetzelfde geborstelde champagnekoper:
- **Foto:** op dezelfde schaal als een knop van normale breedte (316 px), zodat de haarlijnen even fijn zijn.
- **Rand en icoon:** de rand van `.btn-primary`, en het kopje in `#21170F`. Het kopje haalt minstens 4,8 : 1; de norm voor een icoon is 3 : 1.
- **Schaduw:** een neutrale schaduw voor de hoogte (`--cta-fab-lift`) in plaats van de koperen gloed.
- **Ongewijzigd:** de ring van de actieve staat. Op desktop blijft het een gewoon menu-item in de zijbalk.

Getest in het blok "Primaire knop: geborsteld champagnekoper".

## Responsiveness ronde 1: liggend zetten, lage schermen en lange namen

**Aanleiding.** Een responsiveness-audit met vijf specialisten (layout, mobiel en iOS, toegankelijkheid, tablet en desktop, rendering) liet zien dat de app op gewone telefoons staand en vanaf 1100 px goed werkt. Op lage en liggende schermen viel juist weg wat je tijdens het zetten nodig hebt. Ronde 1 pakt de punten aan met het meeste effect. Alles is CSS, plus twee kleine JS-aanpassingen; recepten, advies en de rekenkern zijn ongewijzigd.

**Timerscherm**
- **R1 · Telefoon liggend** (`@media (orientation:landscape) and (max-height:500px)`): de wijzerplaat staat links en de instructie en bediening rechts, in beide standen van de aanrechtmodus.
  - De wijzerplaat schaalt met de hoogte (`min(240px, 100svh − 136px)`).
  - De bediening (Home, Pauze, Reset) staat hier vóór "Volledig schema", zodat Pauze zonder scrollen in beeld is. De tabvolgorde loopt nog via het schema; dat is het enige verschil met de DOM-volgorde.
  - Het raster vervangt hier ook het ≥900-raster van de aanrechtmodus, dat op een liggende iPhone Pro Max (932 × 430) te groot was.
- **R2 · Aanrechtmodus alleen op een echte tablet:** de standaard is nu `(min-width:700px) and (min-height:600px)` (`COUNTER_MODE_QUERY`). Een liggende telefoon is ook ≥ 700 px breed; draaien zette de modus daarom vanzelf aan en maakte de instructie 76 px groot. Een eigen keuze (aan/uit) blijft gelden.
- **R3 · Laag scherm staand** (`max-height:700px`, smaller dan 700 px):
  - De wijzerplaat schaalt mee: `clamp(160px, 31svh, 240px)`, en de tijd `clamp(36px, 6,8svh, 48px)`.
  - Onder 600 px hoog is de wijzerplaat `clamp(150px, 27svh, 240px)`, zijn de marges strakker en vervalt de ondertitel "Filterkoffie".
  - `svh` is de hoogte mét de Safari-werkbalken, met `vh` als terugval.
- **De koptekst van de timer** is hoogstens twee regels (`line-clamp`), zodat een lange boonnaam de wijzerplaat niet omlaag duwt.

**Smalle schermen en lange namen**
- **R6 · Recepttabel:** de toelichting onder een tijd ("in 30 s (~6 g/s)") mag afbreken. Onder 375 px zijn de celmarges smaller. Op 320 px is de tabel nu precies even breed als de kolom; eerst werd de pagina 351 px breed.
- **R7 · Lange woorden:**
  - Titels en namen die je zelf invoert, breken binnen een woord af als het woord niet past (`overflow-wrap:anywhere`).
  - Het bonenraster vanaf 900 px gebruikt `minmax(0,1fr)`.
  - Een boonnaam van meer dan 40 tekens krijgt op het boondetail (smaller dan 500 px) een eigen regel in de volle breedte, op 20 px (`data-long-name`, gezet in `renderBeanDetail`).
  - In het logboek wordt de boonnaam zelf afgekapt (hoogstens 40 % van de regel), zodat score en advies erachter zichtbaar blijven.
- **R8 · Kleine overlopers:**
  - De zeven proefstippen krimpen tot 32 px breed (44 px hoog), zodat ze op 320 px passen.
  - Onder 375 px neemt "Aanpassen" alleen de breedte van zijn label. "Naar de timer · 3:30" staat zo vanaf 360 px op één regel; daaronder blijven het twee regels.
  - De badge "Tier 3-5" mag naar een eigen regel.
  - De drie statistiektegels gebruiken onder 375 px de leesletter.

**Focus, ongedaan maken en rust**
- **R10 · Focus en scrollen:** `scroll-padding-bottom` op `html` houdt focus via het toetsenbord en `scrollIntoView` vrij van de vaste tabbalk (104 px plus de safe area) en, op het receptscherm, van de sticky knoppenrij (112 px).
- **R13 · Ongedaan maken:** de knop in de undo-balk is 44 px hoog. Een negatieve marge houdt balk en tekst op dezelfde plek. De balk gebruikt nu het token `--safe-b`.
- **R21 · Timerscherm tot rust:**
  - De ring verspringt elke seconde in 0,25 s (zoals een secondewijzer) in plaats van doorlopend 0,9 s te animeren.
  - De stip van "Scherm blijft aan" pulseert drie keer zodra het scherm aan gehouden wordt en staat daarna stil; eerst pulseerde hij eindeloos, ook onzichtbaar.

**Gemeten na ronde 1** (Chromium, met de meetscripts van de audit):

| Meting | Voor | Na |
|---|---|---|
| Timerscherm liggend (844 × 390, 667 × 375, 740 × 360, 932 × 430): instructie en Pauze/Start zonder scrollen | nee | ja |
| iPhone SE staand (375 × 667, Safari 375 × 553) en 320 × 568: Start de klok en Pauze in beeld | nee | ja |
| Pagina breder dan het scherm, breedtesweep 320–1920 (1.034 schermen) | 5 | 0 |
| Pagina breder dan het scherm, stresstest met lange namen (235 schermen) | 65 | 0 |
| Volledig verborgen toetsenbordfocus (390 × 844 / 375 × 667 / 844 × 390) | 19 / 34 / 60 | 0 / 0 / 0 |
| "Ongedaan maken", tikvlak | 130 × 19 px | 142 × 44 px |
| Timerscherm op een 4× vertraagde telefoon, na de puls: frames per seconde | 50 | 14 |

**Bewust niet in deze ronde:**
- Pauze tijdens het doorlopen staat op lage schermen nog onder de vouw; dan is "Bed droog" de hoofdknop en die staat wel in beeld.
- Op de iPhone SE van de eerste generatie liggend (568 × 320) valt "Start de klok" nog net weg.
- Onder 360 px blijft "Naar de timer · 3:30" twee regels.

**Testresultaten:** het blok "Responsiveness ronde 1" in `tests/kernflow.smoke.test.mjs` controleert liggend zetten, draaien, de iPhone SE (drie hoogtes), recept en lange namen op 320 px, en scroll-padding, de undo-knop en de rust op het timerscherm. Alle 946 tests slagen. De rekenkern is ongewijzigd.

## Responsiveness ronde 2: tablet en desktop

**Aanleiding.** Ronde 2 uit de responsiveness-audit: het timerscherm op iPad en laptop, de Zet-knop in de zijbalk, de koperfoto op brede schermen, en het gebruik van de ruimte op tablet en desktop. Jelle koos voor de koperfoto "scherper, zelfde look" en voor de Zet-knop "koperen icoonchip". Recepten, advies en de rekenkern zijn ongewijzigd.

**Timerscherm op iPad en laptop**
- **R4 · Aanrechtmodus vanaf 900 px liggend:**
  - Het geheel staat verticaal in het midden van het scherm (`min-height` + `align-content:center`). Eerst stond alles bovenaan en bleef 52–71 % van het scherm leeg.
  - De wijzerplaat is begrensd op de schermhoogte: `min(38vw, 440px, 100svh − 190px)`.
  - De tijd schaalt mee met de wijzerplaat via een container query: `clamp(48px, 17cqi, 96px)`. Dat geeft 75 px op een liggende iPad of laptop (eerst 48 px) en 64 px staand, zoals voorheen.
  - Op een groot scherm is het raster hoogstens 1440 px breed.
- **R4 · iPad Split View:** de aanrechtmodus staat nu ook standaard aan bij ≥ 500 px breed en ≥ 900 px hoog (507–694 × 1024). De aanrechtmaten (wijzerplaat 380 px) gelden daar ook.
- **R4 · Staand:** in de aanrechtmodus is de kolom 720 px, zodat "Giet tot 210 g" op één regel past.
- **R5 · Lage laptop:**
  - De wijzerplaat staat bovenaan zijn kolom, en een open schema scrolt in een eigen vak (hoogstens 34 % van de schermhoogte). De wijzerplaat zakt daardoor niet meer uit beeld (eerst 692 px op een scherm van 600 px).
  - Onder 600 px hoog gebruikt de laptop het liggende telefoonraster van ronde 1.
  - Met de aanrechtmodus uit is de wijzerplaat op een laptop tot 700 px hoog 220 px.

**Koper**
- **R18 · Zet in de zijbalk:** het kopje staat op een rond koperen vlak van 30 px. Het heeft dezelfde foto (316 px-schaal), rand en icoonkleur (`#21170F`, 4,8 : 1) als de Zet-knop op de telefoon. De regel zelf blijft een menu-item, met de bestaande actieve staat.
- **R23 · Koperfoto op brede schermen:**
  - **Probleem:** vanaf 700 px werd de foto tot 720 px uitgerekt. De haarlijnen werden twee keer zo grof als op de telefoon en op retina 1,55× opgeschaald.
  - **Waarom geen echte 2×-uitsnede:** de aangeleverde foto is zelf maar 924 px breed, dus een uitsnede met meer detail bestaat niet.
  - **Oplossing:** de F2-uitsnede plus haar spiegelbeeld vormen een tegel van 1848 × 320 px (`photos/koper-geborsteld-breed.webp`, 55 kB). Die herhaalt naadloos, want elke naad is een spiegelnaad.
  - **Gebruik:** vanaf 700 px ligt de tegel op telefoonschaal, 672 px per tegel (`--cta-photo-wide`, `672px 100% repeat-x`; de kaartknop `672px 150%`). De haarlijnen zijn daardoor even fijn als op de telefoon en ook op 2× scherp. De spiegelas valt achter de knoptekst en is niet te zien.
  - **Telefoons:** die houden de uitgerekte foto; de look daar is ongewijzigd.
  - **Offline:** de tegel staat in `PHOTOS` in `sw.js`.
  - **Contrast** (per pixel in de tekstzone, 2×): het donkerste haarlijnpixel geeft 3,8–4,5 : 1, gemiddeld 6,4–6,8 : 1. Dat is gelijk aan de oude, uitgerekte foto op dezelfde schermen (3,8–4,7 : 1, gemiddeld 6,4–6,8 : 1), dus deze ronde maakt het niet slechter. Op de iPhone (3×) blijft het minimum 4,5 : 1.

**Ruimte op tablet en desktop**
- **R19 · Recept:** al vanaf 900 px in twee kolommen (recept links, Start en schema rechts). Eerst gebeurde dat vanaf 1100 px; tussen 900 en 1099 px was het één kolom van 984 px met regels tot 177 tekens. De sticky knoppenrij en de scroll-padding van ronde 1 gelden nu tot 899 px.
- **R20 · Eén rechterrand per scherm:** vanaf 900 px is een scherm met één kolom als geheel 720 px breed. Dat geldt voor boondetail, nieuwe boon, instellingen, advies, triage, proefkaart en logboek; de proefkaart staat in taakmodus gecentreerd. De 720 px-grens voor knoppen geldt alleen nog direct op het scherm, niet in een kaart: "Zet deze kop opnieuw" vult nu zijn kaart.
- **R20 · Rasters:**
  - De bonenlijst staat vanaf 700 px in zoveel kolommen als er passen (`auto-fill, minmax(320px, 1fr)`): twee op een staande iPad (eerst één kaart van 720 px), drie op een groot scherm.
  - Het logboek blijft bewust één lijst, met compacte regels.
  - De statistiek gebruikt `auto-fit`, dus geen lege vierde kolom meer.
  - Is het raster van de roastkaarten smaller dan 800 px, dan is er iets minder binnenruimte en een naam van 17 px, zodat "Light-medium" en "Medium-dark" op één regel passen.
- **R20 · Regellengte:** hints, statistiekuitleg, disclaimers en versheidsregels zijn vanaf 700 px hoogstens 68 tekens breed.
- **R20 · Groot scherm:** vanaf 1600 px is de app 1280 px breed in plaats van 1080 px.
- **R20 · Geen scroll van 6 px:** de zijbalk is de schermhoogte min de padding van `.app`. Eerst scrolde elke pagina vanaf 900 px 6 px.

## Responsiveness ronde 3: afwerking

**Aanleiding.** Ronde 3 uit de responsiveness-audit: de afwerkpunten. Ook deze ronde verandert niets aan recepten, advies of de rekenkern.

**Tabbalk en focus**
- **R9 · Tabbalk:** vier gelijke kolommen rond de Zet-knop (grid), zodat Zet precies in het midden staat. Met `space-around` stond hij 11–18 px links. Een label dat breder is dan zijn kolom ("Instellingen" op 320 px) loopt naar rechts uit (`align-items: safe center`), niet tegen "Logboek". Onder 360 px is er geen letterafstand.
- **R11/R12 · Focusringen:** binnen een uitklapblok (`<summary>`), een receptrij, de bonenstrip en de bonenkiezer staat de ring nu binnen het element (`outline-offset:-3px`). Daar knipte overflow hem eerst (deels) weg.
  - **Bewust niet:** vanaf 900 px staat "Start" visueel bovenaan de rechterkolom maar komt hij in de tabvolgorde na het schema. De knoppenrij in de DOM verplaatsen zou de sticky knoppenrij op de telefoon breken, die op die volgorde leunt.
- **R16 · Tikvlakken:** het kruisje van de installatiehint is 44 × 44 px (was 19 × 20). De −/+ in het watervenster krimpen niet meer naast de schuif.

**Dialoogvensters en indrukken**
- **R14 · Pagina erachter:** zolang een dialoog open is, scrolt de pagina erachter niet mee (`html:has(.modal-overlay:not([hidden])){overflow:hidden}` plus `overscroll-behavior:contain`).
- **R14 · Bonenkiezer en watervraag:** hun knoppenrij (Annuleren, Later) blijft onderaan het vak in beeld terwijl de lijst scrolt. Op een liggende telefoon stonden ze eerst onder de rand van het vak. Een te hoog vak start bovenaan (`align-items: safe center`).
- **R15 · Indrukfeedback:** tekstlinks kleuren koper bij aantikken. Stop, bonenkaarten, de bonenkiezer, Verwijderen, de proefstippen, de aanrechtschakelaar, uitklapkoppen en de watertegel worden even lichter (`opacity:.72`). De eigen tikmarkering van iOS staat uit, dus zonder dit gaven 24 soorten bedieningselementen geen enkele reactie.

**Tekstvergroting**
- **R17 · Knoppen en tegels:**
  - De primaire knoppen hebben een regelhoogte zonder eenheid: `calc(24 / 17)` en `calc(20 / 14)`. Dat is bij normale grootte precies 24 en 20 px, maar groeit mee met grotere tekst, zodat afgebroken regels niet meer overlappen.
  - Statistieklabels breken af in plaats van in de buurtegel te lopen.
  - De labelkolom van de scancontrole groeit mee.
  - Een lange waarde op het boondetail gaat naar een eigen regel in plaats van weggeknipt te worden.
- **R17 · Timerscherm:** "Scherm blijft aan" kort in (…) voordat het onder "× Stop" kan schuiven, en de ruimte erboven groeit mee met de letter.
- **Gemeten** met het tekstvergrotingsscript van de audit (×2 en ×1,5 tekst, tekstafstand op 320 px, 9 schermen):

  | Meting | Voor | Na |
  |---|---|---|
  | Overlap | 13 | 8 |
  | Weggeknipt | 1 | 0 |
  | Overloop van een vak | 25 | 16 |

- **Wat overblijft:**
  - De tabbalklabels bij 2× tekst: vijf labels passen dan niet naast elkaar.
  - De recepttabel bij 2× tekst: de getallen breken bewust niet af.
  - De −/+ van de portie bij 2× tekst: 3 px overloop.

**Logboek en rendering**
- **R22 · Logboek:**
  - De koppen onder "Eerdere koppen" worden pas opgebouwd als je dat blok opent. Eerst bouwde elk bezoek alle koppen op, ook de ingeklapte.
  - Een tik op een hartje werkt alleen de hartjes van die kop en de lijst Favorieten bij. Eerst werd het hele logboek opnieuw opgebouwd en klapte elke open kop dicht.
  - De datums gebruiken drie gedeelde `Intl.DateTimeFormat`-objecten in plaats van een nieuwe formatter per aanroep (drie per kop).
  - De testhelper `expandLogEntries` klapt "Eerdere koppen" eerst open.
- **R24 · Rendering:**
  - **Audio:** de AudioContext wordt niet meer bij "Naar de timer" aangemaakt (dat kostte 33–362 ms vóór het timerscherm verscheen), maar bij "Start de klok" en "Doorgaan". Beide zijn echte tikken, dus het ontgrendelen op iOS werkt net zo; in de klaarstand klinkt nog niets.
  - **Tabbalk:** geen `backdrop-filter` meer. Die was op de 94 % dekkende balk onzichtbaar, en gaf op de transparante zijbalk een vaag kader.
  - **Offline-cache:** `sw.js` haalt de foto's bij installatie met `cache:'reload'`, zodat een opnieuw bewerkte foto met dezelfde naam meekomt.
- **Bewust niet:**
  - Kleinere varianten (`srcset`) voor de methode- en zetfoto's: die zouden op elk toestel extra bestanden in de offline-cache zetten, voor alleen een snellere decode.
  - `svh`/`lvh` in plaats van `dvh` voor de schermhoogte: het effect (relayout bij het bewegen van de Safari-werkbalk) is alleen op een echte iPhone te beoordelen.

**Gemeten na ronde 3** (Chromium, 360 × 740 op 3×, vertraagde CPU, mediaan van 3 runs; de tijd tot de volgende verf, INP):

| Interactie | 4× voor | 4× na | 6× voor | 6× na |
|---|---|---|---|---|
| Logboek openen, 150 koppen | 560 ms | 112 ms | 416 ms | 304 ms |
| Logboek openen, 300 koppen | 712 ms | 208 ms | 928 ms | 224 ms |
| "Naar de timer" (timerscherm openen) | 464 ms | 88 ms | 280 ms | 192 ms |

**Breedtesweep:**
- 1.034 schermen van 320 tot 1920 px en 329 liggende schermen: geen pagina breder dan het scherm.
- Overloop van een vak daalt van 254 naar 228. De tabbalklabels op 320 px passen beter; alleen op 340 px loopt "Instellingen" nu bewust buiten zijn kolom, binnen het scherm.

**Testresultaten:** in `tests/kernflow.smoke.test.mjs` controleren het blok "Responsiveness ronde 3" en een extra test in "Sprint 6: logboek per boon" het volgende:
- de tabbalk;
- de bonenkiezer liggend;
- het kruisje en de regelhoogte;
- "Eerdere koppen" en het hartje.

Alle 955 tests slagen. De rekenkern is ongewijzigd.

## Analyse 10/10: K1 t/m K7 (fouten en vertrouwen)

**Aanleiding.** De analyse "waar zit nog echte winst" (17 okt 2026) vond zeven kleine, geverifieerde fouten. Deze ronde verandert niets aan recepten, advies of de rekenkern (de engine-bundel is ongewijzigd).

- **K1 · Boondetail › Recepten:** de kaart stond zonder binnenruimte (de logboekkaart heeft die sinds VA-12 alleen op de uitklapregel). Hij heeft nu een eigen kaart (`.bean-recipe-card`) en de knop "Zet dit recept opnieuw". Die zet methode, water, sterkte en maalstand van de laatste kop met die methode klaar, via dezelfde route als "Zet je beste kop opnieuw". Op het receptscherm staat dan "Je laatste kop met de V60 (…)", niet "Je beste kop".
- **K2 · "Brouwsel bezig" op Home:**
  - De tijd loopt nu elke seconde mee; eerst bleef hij staan op het moment dat je Home opende.
  - Een koperen stip vervangt de emoji (VA-22).
  - Zolang er een brouwsel loopt, verdwijnt "Je volgende kop" en is "Nieuw brouwsel starten" geen gevulde knop meer.
- **K3 · Gegevens bij storingen:**
  - Een onleesbare of verkeerd gevormde bonenlijst wordt apart bewaard (`brewconsole_beans_corrupt_<tijd>`, zoals het logboek al deed) voordat de voorbeeldbonen hem kunnen overschrijven. Een verkeerd gevormde lijst gaf eerst een crash en een halve Home.
  - Bovenaan verschijnt een melding met "Back-up maken". Dat gebeurt bij:
    - een onleesbare bonenlijst of een onleesbaar logboek;
    - opslag die niet beschikbaar is;
    - opslaan dat mislukt;
    - een onverwachte fout.
  - Elke soort melding verschijnt één keer per sessie. Eerst stond dit alleen in de console.
- **K4 · Installeren:**
  - Het manifest is een eigen bestand (`manifest.webmanifest`); een data:-URL kan geen `start_url` hebben (Chrome: "start-url-not-valid").
  - Iconen van 192 en 512 px (ook maskable) en een iPhone-icoon van 180 px staan in `icons/` en in de offline-cache (`SHELL_FILES` in `sw.js`). Chrome meldt nu geen installatiefout meer.
  - De iconen zijn vergroot uit het bestaande icoon van 160 px; een nieuw beeldmerk is K21.
  - De HTML is ±94 kB kleiner.
  - **Let op bij publiceren:** `manifest.webmanifest` en de map `icons/` moeten naast `index.html` staan.
- **K5 · Schermlezer:** de sorteerkeuze bij Bonen en de waterschuif hebben een naam.
- **K6 · Desktop › Bonen:** "+ Nieuwe boon" en "Waarom smaakt dit anders?" staan vanaf 900 px naast elkaar, samen precies zo breed als de bonenlijst; elk blijft onder 720 px (VA-35). De lege lijst blijft zoals hij was.
- **K7 · Taal en proefkaart:**
  - De knop heet "Kop opslaan" (was "Loggen opslaan").
  - Waar het veld "Roast" heet, zeggen de foutmelding en de scancontrole nu ook "roast" (was "branding").
  - "Wat miste je?" telt als "Extra vraag", zodat de voortgang niet meer van "van 6" naar "van 7" springt.
  - Zolang de nadere vraag "Eerst nog: gezet zoals gepland?" openstaat, verdwijnt hetzelfde blok bovenaan.

**Testresultaten:** het blok "Analyse 10/10: K1–K7" in `tests/kernflow.smoke.test.mjs` plus een extra controle in de R-16-test. Twee bestaande tests zijn bijgewerkt:
- de scancontrole zegt nu "roast";
- de R-04-voortgang zegt nu "Extra vraag".

Alle 961 tests slagen.

## Analyse 10/10: K16 t/m K20 (beeld en rust)

**Aanleiding.** Ronde C uit de analyse "waar zit nog echte winst". Deze ronde verandert niets aan recepten, advies of de rekenkern (de engine-bundel staat op dezelfde hash). Alles wat getoond wordt, komt uit bestaande gegevens.

- **K16 · Receptscherm:**
  - Ratio en brouwtijd hebben dezelfde opbouw als de andere tegels (label, getal, uitleg), alleen kleiner. Eerst stond het label links en het getal rechts: drie verschillende opbouwen in één raster.
  - De vaste hulptekst "± 50 ml per tik, of tik het getal" is weg; de −/+ en het getal wijzen zichzelf.
  - De maaltegel toont "startgebied: klik 15–17". De bijstelregel ("zuur en snel door? fijner · bitter en traag? grover") staat nu bovenaan onder "Meer over deze maalstand".
- **K17 · Bonen:**
  - Toevoegen staat in de kop als "+ Boon" (eerst alleen een camera-icoon; de knop met tekst kwam pas onder de lijst).
  - De actie op elke kaart is een koperen tekstknop rechtsonder ("Zet opnieuw · V60 →") in plaats van een volle omrande knop. Het tikvlak blijft 44 px hoog.
- **K18 · Boondetail:**
  - Het drinkvenster is een balk van branden tot dag 42: rust en venster in koper, met een streep voor vandaag.
  - De voorraad is een balk (wat er nog in de zak zit).
  - Onder Historie staat het verloop per kop: hoe lekker (1–5) met de maalstand eronder, oud → nieuw, hoogstens 12 koppen, vanaf twee beoordeelde koppen.
  - De bestaande tekst blijft, inclusief "vuistregel, geen meting". Het verloop toont alleen wat gelogd is en zegt niets over oorzaak.
- **K19 · Home:** in de linkerkolom staat "Zo staat het", één kaart met feitenrijen:
  - je laatste beoordeelde kop;
  - welke bonen in hun drinkvenster zitten of nog rusten;
  - welke bijna op zijn (3 koppen of minder);
  - hoeveel koppen en geteste stappen de app heeft.
  Zonder gegevens is het blok er niet (leeg-eerst).
- **K20 · Licht thema:**
  - Kaarten zijn bijna wit papier (`--surface: #F8F4EC`) op de crème achtergrond, in plaats van beige op beige. Donkere tekst haalt daardoor alleen meer contrast; de axe-scan blijft schoon.
  - Het timerscherm houdt in beide thema's het donkere palet via `--night-*`-tokens. Eerst kreeg het in het lichte thema een crème wijzerplaat en lichte knoppen op de donkere foto.

**Testresultaten:**
- Nieuw blok "Analyse 10/10: K16–K20" in `tests/kernflow.smoke.test.mjs`.
- De BC-12-test is bijgewerkt: de bijstelregel staat nu achter "Meer over deze maalstand".
- Alle 966 tests slagen.

## Analyse 10/10: K22–K25, K13, K8–K10 (techniek, keuze en zetmoment)

**Aanleiding.** De rest van de analyse, na de besluiten van Jelle:
- de app is alleen voor hem, dus geen molenkeuze en geen introductie (K15 vervalt);
- de proefkaart houdt zijn vragen (K14 geparkeerd);
- gesproken aanwijzingen uitproberen;
- het icoon blijft zoals het is (K21 geparkeerd);
- de bouwstap mag (K23).

Deze ronde verandert niets aan recepten, advies of de rekenkern (de engine-bundel staat op dezelfde hash).

- **K22 · Opstarten:**
  - `sw.js` serveert het opstarten nu eerst uit de cache. Daarvoor wachtte hij tot 3 s op het netwerk, wat je op trage keukenwifi merkte.
  - Tegelijk haalt de worker de nieuwste versie op. Is die anders, dan bewaart hij hem en meldt hij `brewconsole-update-ready`; de app toont dan "Er is een nieuwe versie" met "Vernieuwen".
  - Tijdens een brouwsel verschijnt die melding nooit. Er is nog steeds geen `skipWaiting()`.
  - Een app die later opstart, vraagt zelf of er iets klaarstaat (`brewconsole-ask-update`).
  - `CACHE_VERSION` gaat naar 4, omdat de strategie verandert.
- **K23 · Bouwstap:**
  - `npm run build` maakt `dist/` (niet in git): `index.html` zonder commentaar, plus `sw.js`, het manifest, de iconen en de foto's.
  - Er komen geen pakketten bij. Een kleine lexer herkent strings, template literals en reguliere expressies, zodat bijvoorbeeld `https://` blijft staan.
  - De rekenkern blijft byte voor byte gelijk. Elk script gaat na het strippen door de parser van Node.
  - Resultaat: 931 → ±700 kB, gecomprimeerd 284 → 185 kB (−35 %).
  - `npm run qa:dist` draait de gedragstests op de gebouwde versie (`BREWCONSOLE_APP_HTML`); `tests/build.test.mjs` controleert de lexer, de rekenkern en dat de gebouwde app laadt.
  - **Publiceren:** `npm run build`, dan de map `dist/` publiceren in plaats van de hoofdmap.
- **K24 · Back-up en Over:**
  - Op een telefoon gaat de back-up via het deelmenu (Bestanden, iCloud Drive, mail). Annuleren telt niet als back-up. Op een computer blijft het een download.
  - "Over" noemt nu vier dingen: wat er met je gegevens gebeurt (alles op het toestel, alleen het scannen haalt eenmalig Tesseract.js), de receptbronnen, de molen en de versie.
- **K25 · Kleine extra's:**
  - De spatiebalk pauzeert en hervat op de timer, maar niet als de focus in een veld of op een knop staat.
  - Er is een linkvoorbeeld (`description`, `og:*`).
  - Er is een printversie: zwart op wit, zonder balken en knoppenrijen.
  - Bij "Hoe vind ik dit?" (water) staan links naar Vitens, Evides, Brabant Water, Oasen, WML, WMD en Waterbedrijf Groningen om op postcode te zoeken. De keuze uit R-12 om voor die bedrijven geen gemiddelde te tonen, blijft.
- **K13 · Smaakkeuze:**
  - De drie smaakdoelen dragen het scherm. De gietstijlen (Hoffmann, Rao, April…) staan achter één tik ("Of kies een gietstijl · 5"); is er al een gekozen, dan staat het blok open.
  - Een gelijkspel wordt per smaakdoel gegroepeerd: "Helder & fris: het gewone recept, Rao of Hoffmann" in plaats van drie keer "Helder & fris".
- **K8 · Gesproken aanwijzingen (proef, standaard uit):**
  - Aan te zetten onder Instellingen › Zetten, met "Test de stem".
  - De stem van het toestel zegt:
    - de eerste giet bij "Start de klok" (iOS laat spraak pas toe na een tik);
    - "Zo meteen: tot X gram" bij de voorwaarschuwing;
    - "Giet tot X gram" bij elke nieuwe giet;
    - "Laten doorlopen" na de laatste.
  - Het belletje en de puls blijven.
- **K9 · Live balk:** zolang er een brouwsel loopt, staat bovenaan op elk scherm (behalve de timer en Home, dat zijn eigen banner heeft) een balk met de tijd en de volgende stap. Een tik brengt je terug naar de timer.
- **K10 · Klaar:** het klaar-moment zet de gemeten tijd naast het schema ("Bed droog na 3:20 · 0:10 sneller dan het schema (3:30)"). Dat is alleen een feit; binnen 5 s staat er "zoals het schema".

**Testresultaten:**
- Nieuwe blokken "Analyse 10/10: K8–K10, K13, K24, K25" en `tests/build.test.mjs`.
- De SW-test voor een nieuwe deploy is herschreven voor K22.
- De BC-23-test en drie tests die een gietstijl kiezen, openen eerst het uitklapblok (K13).
- De gelijkspeltest volgt de nieuwe zin.

## Zettijd en hoeveelheid: optie B voor Kasuya (keuze Jelle, okt 2026)

**Aanleiding:** de app gaf bij Kasuya altijd 3:30, of je nu 250 of 400 ml zette. Een groter bed loopt trager door (Darcy: beddiepte is de lengteterm; Gagné, Rao, Barista Hustle). Daardoor viel een gewone grote zet steeds "buiten de normale tijd" en "later dan de schatting". Het onderzoek en de opties A–F staan in het gesprek van 27–28 okt; Jelle koos B, met Kasuya's eigen 20 g als uitgangspunt en alleen voor de Kasuya-recepten.

**Wat er is gebouwd:**
- **Verwacht einde:** bij Kasuya (klassiek, vol & rond, zoet, heel fruitig) wordt het einde boven 20 g `3:30 × (dosis/20)^0,4`, afgerond op 5 s. Bij 22 g (±380–415 ml) is dat 3:40; tot ±350 ml blijft het 3:30.
- **Waarom 0,4:** dat ligt tussen de kegeltheorie (1/3) en gepubliceerde recepten waarin de maling is bijgesteld (±0,2–0,5). Het is een voorzichtige middenwaarde, geen gemeten getal.
- **Alleen omhoog:** de giet-klok ligt vast (laatste giet op 3:00). Een kleiner bed kan dus niet eerder klaar zijn dan die giet plus zijn eigen korte doorloop; dat scheelt hooguit een paar seconden.
- **Ongewijzigd:** de giet-momenten en grammen blijven gelijk, net als de maalstand en het advies. Alleen de "Klaar"-stap en `totalTime` schuiven op.
- **Wat meeschuift:** de timer ("van 3:40", "verwacht klaar rond"), het klaar-moment (K10), de vergelijking op het Klaar-scherm (±15 s) en de normale tijd van het toestel (`diagnosticBandFor()`, bij 22 g 2:05–3:40, met "bij 22,0 g" erbij).
- **Uitzonderingen:** niet bij de concentraat-methode, omdat er dan minder water door het bed gaat dan bij de referentie (20 g / 300 ml). Ook niet bij andere technieken; daarover beslist Jelle apart.
- **Zichtbaar:** de brouwtijd-tegel zegt het erbij: "+0:10: bij 22,0 g loopt het bed trager door (Kasuya: 3:30 bij 20 g)".
- **Verhouding tot D-4:** dit vervangt voor Kasuya's verwachte einde de eerdere lijn "richting onderbouwd, getal niet" (`onderzoek_D2_D4.md` §3). De hints van D4-2 en de oordeelregel van D4-1 blijven.

**Testresultaten:**
- Nieuw blok "Optie B" in `tests/brewconsole.pure-logic.test.mjs` (factor, grenzen, giet-momenten, concentraat-methode, andere technieken, normale tijd).
- Nieuwe schermtest in `tests/kernflow.smoke.test.mjs`: 400 ml geeft 3:40 in de tegel en de timer, bed droog op 3:37 geeft "zoals het schema", en de normale tijd is 2:05–3:40 bij 22,0 g.
- De gouden recepten (300 ml) veranderen niet.
