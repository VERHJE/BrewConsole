# Implementatierapport — Implementatieplan Zetadvies v3.0

Wat gebouwd is in deze ronde, op basis van `Implementatieplan Zetadvies v3.0` en `Bouwbesluiten_v3.md`. Fase 0 (water proeven) is een fysieke smaaktest zonder code en blijft aan Jelle; Fase 1 t/m 7 zijn allemaal gebouwd en getest. Het Master Expert Team-reviewprotocol uit het plan (§0, prioriteitsvolgorde veiligheid/toegankelijkheid → functionele integriteit → wetenschappelijke correctheid → praktische bruikbaarheid → UX-helderheid → performance → visuele kwaliteit) is bij elke fase aangehouden.

## Fase 1 — De twee rekenfouten (D-1, D-2)

De kernrecept-ratio negeerde tot nu toe het water dat in het koffiebed achterblijft (D-1: de retentieterm ontbrak). `LIQUID_RETAINED_RATIO = 2,0` (g achtergebleven water per g droge koffie, tier 3-4/klasse C, gebaseerd op Rao en Coffee ad Astra) zit nu daadwerkelijk in `ratioFromWindow()`, en de disclaimer onder het recept vermeldt expliciet dát er een retentieaanname in de ratio zit en welke waarde. D-2 (de volumeklem verving een onbereikbaar volume stilzwijgend door een ander) is opgelost door de schuifregelaar te klemmen op precies het bereik dat `computeRecipe()` ook echt accepteert (`engineValidVolumeRange()`, met `ceil()`/`floor()` in plaats van afronden op het dichtstbijzijnde vijftal — dat laatste kon de bovengrens net over de rand van wat haalbaar is duwen). 250 ml is daardoor via de UI nooit meer bereikbaar op V60/klassiek; roept iets de rekenfunctie toch rechtstreeks aan met een onhaalbaar volume, dan komt er een leesbare uitleg terug (`"Geen geldig recept bij dit watervolume"`) in plaats van een dosis van 0 zonder toelichting.

## Fase 2 — Branddiepte en temperatuur (B-1)

Branddiepte stuurt sinds deze ronde twee dingen, en nadrukkelijk niet de ratio (B-1): een temperatuurankerpunt binnen de apparaatband (`ROAST_TEMP_ANCHOR`, met een uitvoerbare instructie zoals "koken en direct gieten" voor licht of "koken, ongeveer 1 minuut wachten" voor donker — geen kaal getal) en een positie binnen de al-gepubliceerde klikrange van de Setting Translator (`ROAST_GRIND_ANCHOR_FRACTION`, geen nieuw maalgetal). Dat laatste is het nieuwe "vertrekpunt"-presentatieniveau uit Bouwbesluit B-2: gelabeld, met herkomst, en — via Fase 5/7 — gelogd en achteraf toetsbaar (B-3).

## Fase 3 — Het gietschema (D-3, D-4)

`buildPourSchedule()` is herbouwd. D-3 (de Kasuya 4:6-bloom werd dubbel geteld) is opgelost met nieuwe overlaysjabloonvelden (`pulseCountIncludesBloom`, `phaseSplit`) — de eerste fase is nu daadwerkelijk 40% van het water over twee beurten, bloom inbegrepen, niet erbovenop. D-4 (de apparaatbrede contacttijd-richtlijn werd als receptdoel gebruikt in plaats van als controle achteraf) is opgelost door de schemalengte nu te laten volgen uit de giet-structuur zelf (`POUR_CYCLE_SEC = 30`, `FINAL_DRAWDOWN_SEC = 40`); de oude band heet nu `contactTimeDiagnosticBand` en verschijnt pas ná het brouwen, op het Klaar-scherm, als eerlijke plausibiliteitscontrole — nooit meer als sturend getal voor de timer.

## Fase 4 — Waterprofiel in de app (B-5, B-6)

Het oude, enkelvoudige waterhardheidsveld is een volledig waterprofiel geworden: hardheid, alkaliniteit (met eenheidkeuze CaCO3/HCO3 en de vaste omrekenfactor 0,82), en een verdunningsverhouding kraan:gedemineraliseerd. Elke parameter krijgt zijn eigen oordeel (B-5) — "hardheid in orde, buffering onbekend" in plaats van één samengevoegd "binnen de richtwaarde"-signaal. `hardnessNudge()` en de nieuwe `alkalinityNudge()` blijven allebei bewijsbaar `{temp:0}` teruggeven (B-6, de FORBIDDEN edge) — waterchemie beïnvloedt hier alleen het oordeel over het water zelf, nooit een receptgetal. Als kleine extra activering: de al aanwezige maar nooit aangeroepen `deriveWaterConfidenceInputs()`/`applyWaterProvenanceCeiling()` krijgen nu echte input en een eigen, eerlijke UI-regel — zonder de volledige, dormante confidence-rangschikkingspijplijn eromheen te herbouwen (scope-beslissing, zie `Bouwbesluiten_v3.md`). Persistentie is volledig achterwaarts compatibel: een backup van vóór deze wijziging (kaal `waterHardnessMgL`-getal) laadt zonder verlies.

## Fase 5 — Loggen wat je nodig hebt om te leren

Dit fundament heeft zelf geen smaakeffect, maar maakt Fase 6 en 7 mogelijk. Het logboek slaat nu ook op: de dosis en ratio uit het aanbevolen recept (ter vergelijking), de werkelijk gebruikte maalstand in klikken, de werkelijke brouwtijd (werd al berekend voor de eerlijke samenvatting, nu ook bewaard), het kopgewicht na afloop, en een momentopname van het actieve waterprofiel. Het kopgewicht is de belangrijkste: samen met dosis en ingegoten water geeft dat de werkelijke retentie `(water − kopgewicht) / dosis`, en na vijf of meer loggingen kan de aangenomen 2,0 uit Fase 1 vervangen worden door een gemeten waarde voor deze specifieke opstelling. `RECORD_SCHEMA_VERSION` ging van 1 naar 2. Oudere records zijn bewust niet geconverteerd of aangevuld — ontbrekende velden blijven ontbrekend en tellen nergens als nul mee; een aparte migratietest en een back-up-rondgangtest bewaken dat expliciet.

## Fase 6 — Van proeven naar de volgende aanpassing

De zeven cupping-sliders, die tot nu toe niets voedden, zijn gekoppeld aan één concreet voorstel voor de volgende kop — deterministisch, vier patronen (onderextractie → twee klikken fijner, overextractie → twee klikken grover, te zwak → meer dosis bij gelijk water, vlak/mogelijk waterbuffering → verwijzing naar het waterprofiel), gecontroleerd in die volgorde zodat er nooit meer dan één voorstel tegelijk verschijnt. Elk voorstel is nadrukkelijk een **hypothese om te toetsen**, nooit een bewezen correctie, en wordt nooit automatisch op het recept toegepast. Het voorstel wordt opgeslagen op de logging die het veroorzaakte (`entry.suggestion`) en is zo achteraf toetsbaar (B-3): de eerstvolgende logging voor dezelfde boon bevat, sinds Fase 5, zijn eigen werkelijk-gebruikte maalstand en scores, dus is met de twee loggings naast elkaar in de Historie te zien of het voorstel is opgevolgd en wat dat opleverde. Zichtbaar op twee plekken: als "Hypothese"-regel op de betreffende kaart in de Historie, en als apart, expliciet-gelabeld blok op het Recept-scherm bij de volgende keer dat je diezelfde boon zet.

## Fase 7 — Het boontype-model

De correctie bindt zich niet aan één boon maar aan een "emmertje": branddiepte-bucket (light/light-medium · medium · medium-dark/dark) × verwerkings-bucket (washed · natural/anaerobic · honey) × methode (V60/Chemex) — overdraagbaar naar een zak die nog nooit gekocht is. Terugvalladder: bij minder dan drie brouwsels in het exacte emmertje wordt eerst de verwerking losgelaten, dan ook de branddiepte, altijd met vermelding van n en het niveau waarop is teruggevallen; zelfs onder de drempel op elk niveau toont de app eerlijk "nog niet genoeg" met het werkelijke n, in plaats van stil niets. Wat wordt opgeslagen is de correctie, niet het recept: "gemiddeld twee klikken fijner dan het vertrekpunt, n=6". Drie vervuilingsregels zijn ingebouwd: alleen brouwsels die de gebruiker expliciet als geslaagd heeft gemarkeerd tellen mee (nieuwe, standaard-uit checkbox op het Klaar-scherm — bewust mislukte testkopjes blijven in de Historie staan maar voeden het model niet); espresso-bedoelde bonen zijn volledig uitgesloten; en een wijziging van het waterprofiel sluit het lopende segment automatisch af (B-7), doordat elke logging al een waterprofiel-momentopname draagt (Fase 5) die tegen het huidige profiel wordt getoetst. Zichtbaar op het Recept-scherm, als derde en laatste informatieve blok, alleen wanneer er daadwerkelijk een boon gekozen is.

## Testresultaten

`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 node --test tests/*.test.mjs` — **98/98 groen**, over drie bestanden:

- `brewconsole.pure-logic.test.mjs` (74) — rekenlogica tegen de echte broncode, in een sandbox die het onderscheid tussen `window` en `globalThis` van de browser nabootst. Nieuw deze ronde: retentieterm en volumeklem (Fase 1, inclusief de letterlijke §5-testeis "250/300/350 ml"), temperatuurankerpunt en maalrichting per branddiepte (Fase 2), gietschema/bloom/fase-split (Fase 3), waterprofiel-oordeel per parameter en de FORBIDDEN-edge-bewaking (Fase 4), het schemaversie-getal (Fase 5), alle vier proef-naar-voorstel-patronen plus het geval "geen patroon" (Fase 6), en de volledige emmertjessleutel/terugvalladder inclusief n<3 op elk niveau en alle drie vervuilingsregels (Fase 7).
- `kernflow.smoke.test.mjs` (21) — echte-browser Playwright-tests. Nieuw deze ronde: de schuifregelaar-klem, de retentie-disclaimer, een oude back-up die zonder verlies laadt, het waterprofiel live in de UI, de nieuwe logboekvelden die daadwerkelijk worden opgeslagen én getoond, een migratietest (schemaversie 1) en een back-up-rondgangtest (schemaversie 2) voor het logboek, de temperatuur-INSTRUCTIE (niet alleen een getal) op het Recept-scherm, twee end-to-end-tests voor Fase 6 (hypothese verschijnt in Historie én bij de volgende kop; de waterprofiel-link toont zich alleen bij het juiste patroon), en een end-to-end-test voor Fase 7 (leercorrectie verschijnt pas bij precies drie goedgekeurde loggings, met een eerlijke tussenmelding bij n=2).
- `sw-registration.test.mjs` (3) — ongewijzigd, bevestigt dat de service-workerregistratie nog steeds werkt; deze ronde voegde geen nieuwe bestanden toe, dus is er geen `CACHE_VERSION`-ophoging nodig geweest.

Twee bugs zijn tijdens het testen zelf gevonden en gerepareerd (beide in `Bouwbesluiten_v3.md` toegelicht): een paginabrede crash door een top-level variabele die te vroeg werd gelezen (`RADAR_LEVELS`), en een CSS-specificiteitsbug waardoor een verborgen knop tóch zichtbaar bleef.

## Wat niet is veranderd

`computeMethodAdvice()`, `buildReasoningLines()`, de coffee-database/seed-boondata, OCR, de brouwtimer/wake-lock-logica, en de PWA/service-worker-cachestrategie — allemaal ongewijzigd, zoals de regressiematrix (plan §4) vereist. Backup-export/-import blijft op elk niveau achterwaarts compatibel.

## Nog open

- **Fase 0 (water proeven)** is een fysieke test zonder code en is niet in deze ronde uitgevoerd — dat blijft aan Jelle.
- **De volgorde van Fase 0 en Fase 1** is de enige openstaande beslissing uit het plan zelf (§8) en is inhoudelijk, niet technisch — zie `Bouwbesluiten_v3.md` voor de volledige toelichting en het advies uit het plan.
- **Wat het plan zelf al buiten scope plaatste (§7)** en dus ook hier niet is aangeraakt: de elf profielknoppen (het verschil tussen de twee clusters is na Fase 1 verwaarloosbaar, een eventuele herstructurering hoort na Fase 6 met echte gebruiksdata), de brouwscore-formule (`Research_Brief_Brouwscore_v1.md` blijft geldig; na Fase 5/6 is er voor het eerst een eerlijke basis, maar de formule zelf is niet gebouwd), Chemex-specifieke kalibratie (geen dosisplafond/klikrange in de evidence-basis, en bij dit gebruiksprofiel feitelijk buiten beeld), en een refractometer-workflow.
- **Waterchemie als receptvariabele** blijft, zoals B-6 vastlegt, verboden — dat is geen open punt maar een blijvend principe.

## Bestanden

- `brewconsole_v2_2.html` — de app zelf, alle zeven fasen verwerkt.
- `tests/load-app.mjs`, `tests/brewconsole.pure-logic.test.mjs`, `tests/kernflow.smoke.test.mjs`, `tests/sw-registration.test.mjs` — uitgebreide testsuite, 98/98 groen.
- `Bouwbesluiten_v3.md` — de zeven kernbesluiten plus alle scope-/implementatiebeslissingen uit deze ronde.
- Dit rapport.
