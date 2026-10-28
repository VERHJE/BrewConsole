# Audit — Brew Engine, recepten en advies (Fase A)

*Datum: 28 oktober 2026. Branch `claude/app-review-improvements-wvsruc`, op commit 6c70ed3 (PR #35).*
*Status: alleen audit en plan. In deze fase is geen productiecode, geen recept en geen opgeslagen gegeven gewijzigd.*

---

## 0. Werkwijze en grenzen

**Gebruikte tools:**
- **Code lezen:** grep, sed, Python en Node in deze repository.
- **Eigen controleberekeningen:** een Node-script dat de echte `computeRecipe()` aanroept (`scratchpad/audit_calc.mjs`).
- **Testrunner:** `npm test`, de volledige suite.
- **Webonderzoek:** zoeken op internet.

**Beperkingen:**
- Het rechtstreeks openen van primaire bronnen (WebFetch) werkte niet. De netwerkinstellingen van deze sessie blokkeren onder meer `pmc.ncbi.nlm.nih.gov`, `pages.uoregon.edu`, `hario.co.uk` en `home-barista.com`.
- Van de belangrijkste wetenschappelijke bronnen ken ik daardoor alleen titel, opzet, abstract en samenvattingen, niet de volledige tekst. Bij elke claim staat dat erbij.
- Fysieke koffie-experimenten zijn niet uitgevoerd. Er is ook geen refractometer gebruikt.
- **Niets in dit rapport bewijst dat een kop beter smaakt.**

**Wat er niet is:** de app is **alleen voor filterkoffie** (V60-02 en Chemex 6-kops, molen Timemore C3S Pro). Espresso, de Sage Barista Express en de IMS-basket komen in de code niet voor. Het woord "espresso" komt alleen voor als *beoogd gebruik* van een boon; zulke bonen worden uitgesloten van het leren. De espresso-onderdelen van de opdracht (§4.1) zijn daarom niet tegen code getoetst; zie H.

---

## A. Samenvatting

**De belangrijkste bevindingen:**

1. **De rekenkern klopt op de punten die ik kon toetsen.**
   - De verhouding volgt uit `water/dosis = EY/TDS + vasthoudfactor` (`ratioFromWindow`, met `LIQUID_RETAINED_RATIO = 2,0`). Dat is de juiste massabalans voor filterkoffie.
   - Een controle over 26.730 combinaties gaf 0 schendingen: methode × profiel × branding × 200–1000 ml × vijf sterktestanden. Gecontroleerd zijn de som van het gietwater, oplopende tijden, een positieve dosis en een eindige tijd.
2. **De twee smaakclusters zetten vrijwel even sterk.**
   - "Lager-sterkte" (TDS 1,15–1,30 / EY 18–20) geeft 1:17,6.
   - "Voller" (TDS 1,30–1,45 / EY 20–22) geeft 1:17,4.
   - Het hogere TDS-doel wordt volledig opgeheven door het hogere EY-doel. Maar de app kan EY nergens apart sturen: maling en temperatuur hangen aan de branding, niet aan het cluster.
   - Gevolg: "Rond & vol" en "Helder & fris" verschillen in dosis maar ±1,7 % (17,3 tegen 17,0 g bij 300 ml). Het verschil zit bijna alleen in het gietschema.
   - Onderzoek van UC Davis laat juist zien dat **sterkte (TDS) de sterkste drijver** van smaak én voorkeur is.
3. **Het advies op smaak is goed gebouwd, maar de regels zijn ongetoetst.**
   - Goed: één hendel per kop, geen heen-en-weer, eerst geldigheid controleren, een slagboom op de resultaten en een versie op elke regel.
   - De puntenwegingen zelf staan in de code als "eerste schattingen, te valideren".
   - Gepubliceerd onderzoek naar filterkoffie zet één regel onder druk: zuurheid hangt sterk samen met **sterkte (TDS)**, niet alleen met lage extractie. "Scherp zuur = onderextractie" is dus maar een halve verklaring.
4. **De recepten verschillen in hoe goed ze onderbouwd zijn.**
   - Kasuya en April liggen dicht bij hun bron.
   - Het "Rao"-schema (4 gieten, klaar op 2:10) is geen recept van Rao. Rao's eigen recept in het Hario-interview is 20 g op 330 ml, met volgende gieten pas als het water grotendeels door is, en klaar op 4:00–4:30.
   - Hoffmann's V60-techniek wordt ook op de Chemex gebruikt.
   - De omschrijving van Perger ("in 2,5 min klaar") spreekt het eigen schema tegen (1:40).
5. **Groot onderhoudsrisico:** de broncode van de rekenkern (TypeScript, `src/...`) staat niet in deze repository. Alleen de gebouwde bundel staat er, bevroren op hash 1b13e449b38e07ee. Een fout in de kern kun je hier dus niet netjes herstellen.

**Wat juist niet moet veranderen:**
- Het herkomstsysteem: `resolved`/`researchGap`, STATED/ESTIMATED/DERIVED en de bronnen U/I/M.
- De verboden koppelingen: geen receptgetal uit hardheid, hoogte of proces.
- De advieslogica met één hendel en de slagboom.
- De massabalans.
- De dosisgrenzen en de veiligheidsgrens van de molen.
- Het vergelijken van alleen vergelijkbare koppen (bypass, ±40 % volume, waterprofiel).

**De meest waardevolle verbeteringen** (details in E):
1. **V1:** maak sterkte expliciet en toetsbaar per profiel, in plaats van via twee bijna gelijke vensters. Valideer met de blinde proef die de app al heeft.
2. **V3:** maak Rao eerlijk: het echte recept, of de naam eraf.
3. **V2:** laat de diagnose van "scherp zuur" ook naar sterkte kijken. Daarbij hoort een blinde proef om de adviesregels te toetsen.

---

## B. Architectuur en rekenkern

### B.1 Opbouw
| Laag | Waar | Doet wat |
|---|---|---|
| Rekenkern (bevroren) | eerste `<script>` na `<body>`, 57 kB, hash 1b13e449b38e07ee | Registers voor molen en brewer (C3S Pro, V60-02, Chemex 6-kops), harde grenzen, stijlrecepten (Kasuya, Hoffmann, April, Rao, Perger, Hedrick), `buildCoreRecipe` (dosis, water, verhouding uit een TDS/EY-venster), het maken en rangschikken van kandidaten, vertrouwensbanden. Bron in TS staat **niet** in de repo. |
| Recept in de app | `computeRecipe()` (±regel 5900–6200) | Kiest venster en overlay, sterktestap (±8 %/±4 %), bypass, temperatuuranker per branding, start-klik binnen 15–17, gietschema (`buildPourSchedule`), optie B (Kasuya-eindtijd), Erdoor-wachtpunten. |
| Brouwrecord v6 | `createBrewRecord`, `applyBrewEvent`, `BREW_TRANSITIONS` | Plan, gebeurtenissen, werkelijke waarden met bron U/I/M, levenscyclus brewing → completed → logged, herstel na herladen. |
| Diagnose en advies | `diagnoseTasting`, `leverFromMatrix`, `recommendNext` (`diag-2026.3`) | Proefkaart → sterkte × extractie → één hendel (klik of dosis), met CHECK/REPEAT/KEEP. |
| Leren | `learningCorrectionFor`, `personalCalibrationFor`, `measuredRetention`, `adviceOutcomeStats`, blinde proef (A/B) | Eigen maalcorrectie (n ≥ 3), eigen klikbereik (n ≥ 5), gemeten vasthouden (n ≥ 5), slagboom (≥20 geteste stappen, ≥65 % gelukt, ≤15 % slechter). Alleen ter informatie; past niets vanzelf aan. |
| Tests | `tests/*.test.mjs` (99 suites) | Pure logica, gouden recepten (byte voor byte), verboden koppelingen, robuustheid, schermtests met Playwright, ontwerpregels, bouwstap. |

### B.2 Route van invoer naar advies
Methode, branding en profiel → `ENGINE_PROFILE_MAP` (cluster en overlay) → `MODEL_POLICY`-venster (APP_ASSUMED) → `buildCoreRecipe`. Dat geeft de dosis (midden van 15–22 g × hoeveelheid), het water en de verhouding. Daarna volgen de grenzen (`generateCandidates`) en in de app:
- de sterktestap;
- de bypass;
- de temperatuur (`ROAST_TEMP_ANCHOR`);
- de start-klik (`ROAST_GRIND_ANCHOR_FRACTION`, met één klik fijner bij een kort schema);
- het gietschema;
- de timer met events;
- de proefkaart → diagnose → één advies.

"Gebruik voor volgende kop" is altijd een bewuste handeling.

### B.3 Aannames en constanten (de belangrijkste)
| Constante | Waarde | Herkomst volgens de code | Mijn oordeel |
|---|---|---|---|
| `LIQUID_RETAINED_RATIO` | 2,0 g/g | kern | Aannemelijk; praktijkbronnen noemen 2–2,5. Bij Chemex onbekend. De app meet het al (`measuredRetention`). |
| TDS/EY-vensters | 1,15–1,30 / 18–20 en 1,30–1,45 / 20–22 | APP_ASSUMED, kern zegt RESEARCH_GAP | Eerlijk gelabeld. Maar zie A.2: vrijwel dezelfde verhouding. |
| V60-dosis | 15–22 g | kern, ESTIMATED C | Aannemelijk (beddiepte); geen harde bron. |
| V60-contacttijd | 2:00–3:30 | ESTIMATED B, "diagnostisch, geen doel" | Goed gebruikt; schuift sinds optie B mee bij Kasuya. |
| Temperatuur per branding | 94–96 / 92–95 / 88–92 °C | eigen anker | Volgens Batali e.a. (2020) heeft temperatuur bij gelijke TDS/EY weinig eigen smaakeffect (getest: 87/90/93 °C). Werkt dus via de extractiesnelheid. De app zegt dit zelf al. |
| Start-klik | 15–17, licht fijner, donker grover | consolidatie deep-dive | Geen meting; de leerlus corrigeert. |
| Sterktestap | 8 % (halve stap 4 %) | eigen keuze | Ongetoetst, wel klein en omkeerbaar. |
| Bloomtijd bij verse bonen | +15/+10 s | eigen keuze | Ongetoetst, klein effect. |
| Optie B | exponent 0,4, referentie Kasuya 20 g | dit gesprek | Hypothese (zie I.4). |
| Diagnosepunten | zuur 2, bitter 1 (donker 0,5), droog 1 … | `diag-2026.3`, "eerste schattingen" | Ongetoetst; zie C.3. |

### B.4 Bewezen fouten, beperkingen en risico's
- **Bewezen fout (klein):** de omschrijving van Perger ("in 2,5 min klaar") klopt niet met het schema (1:40 op de V60, 3:18 op de Chemex).
- **Ontwerpbeperking (belangrijk):** de clusters verschillen in sterkte nauwelijks (A.2). Geen fout in de rekensom, wel een model dat de gebruiker iets anders laat verwachten.
- **Ontwerpbeperking:**
  - Bij Rao, Perger en het Kernrecept zijn het aantal gieten en de tijden een eigen invulling; de app zegt dat ook.
  - Bij Rao draagt het schema wel zijn naam, terwijl Rao's gepubliceerde recept duidelijk anders is.
- **Risico:** de bron van de rekenkern ontbreekt (A.5).
- **Risico:** één HTML-bestand van ±980 kB met ±15.000 regels. De tests dekken veel, maar zijn traag (±7 minuten).
- **Geen bewezen kritieke fout (P0) gevonden.**

---

## C. Bronnenonderzoek per claim

Bewijskwaliteit: **W** = wetenschappelijk (peer-reviewed), **T** = technisch, **P** = praktijk, **H** = hypothese.

### C.1 Sterkte (TDS) bepaalt de smaak meer dan extractie (EY)
- **Bronnen:**
  - [Batali, Ristenpart & Guinard 2020, *Scientific Reports*](https://www.nature.com/articles/s41598-020-73341-4): druppelkoffie, 87/90/93 °C, TDS × extractie gevarieerd. TDS en extractie bepalen het smaakprofiel, temperatuur nauwelijks. Volgens een persverslag heeft TDS het grootste effect.
  - [Frost, Ristenpart & Guinard 2020, *J. Food Sci.* 85(8)](https://ift.onlinelibrary.wiley.com/doi/10.1111/1750-3841.15326): TDS 1,0/1,25/1,5 % × extractie 16/20/24 % × drie brandingen.
  - [Guinard e.a. 2023, *J. Food Sci.* 88(5), "A new Coffee Brewing Control Chart"](https://ift.onlinelibrary.wiley.com/doi/10.1111/1750-3841.16531): drie studies samengevoegd, 3.186 consumentenoordelen, twee groepen consumenten.
- **Kwaliteit:** W. **Volledige tekst niet gelezen** (alleen abstract en samenvattingen).
- **Toepasbaarheid:** automatische druppelfilter, niet V60 of Chemex. Het is wel filtratie met dezelfde massabalans, dus de richting is overdraagbaar; exacte grenzen niet.
- **Tegenbewijs:** geen gevonden dat EY de belangrijkste drijver zou zijn.
- **Conclusie:** sterk onderbouwd dat sterkte de eerste smaakhendel is. Een model dat sterkte per profiel bijna gelijk laat, benut die hendel niet.

### C.2 Er is geen universeel "ideaal" TDS/EY-venster; voorkeuren lopen uiteen
- **Bronnen:**
  - [Cotter e.a. 2021, *J. Food Sci.* 86(1)](https://datadryad.org/dataset/doi:10.25338/B8993H), met dataset en ASIC-poster: 118 consumenten, 27 koffies. De meesten verkozen zwakker, één groep sterker.
  - Guinard 2023: twee groepen consumenten, een zadelvormig verloop van de waardering.
- **Kwaliteit:** W. Volledige tekst niet gelezen.
- **Relevantie:** de app is voor één persoon. Persoonlijke kalibratie is dus waardevoller dan elk algemeen venster.
- **Conclusie:** de vensters terecht als APP_ASSUMED behandelen. Investeer in het vinden van **jouw** sterkte, niet in een beter algemeen venster.

### C.3 Zuur, bitter en zoet tegenover TDS en extractie
- **Bronnen:**
  - [Batali e.a. 2021, *ACS Food Sci. Technol.*](https://x-mol.com/paper/1385747023844630528) (titreerbare zuurgraad): de zuurgraad stijgt lineair met TDS, de waargenomen zuurheid volgt de titreerbare zuurgraad, en er is geen duidelijk verband tussen zuurgraad en extractie.
  - SCA-samenvattingen ([Towards a New Brewing Chart](https://sca.coffee/sca-news/25/issue-13/towards-a-new-brewing-chart), [Manipulating and Measuring…](https://sca.coffee/sca-news/25/issue-15/manipulating-and-measuring-a-key-attribute-in-drip-brew-coffee)): het zuurst bij hoge TDS en lage extractie (±1,5 % / ±16 %), het minst zuur bij lage TDS en hoge extractie. Bitter piekt bij hoge TDS én hoge extractie. Zoet hoort bij lage TDS.
- **Kwaliteit:** W (abstract en samenvattingen).
- **Gevolg voor de app:**
  - `diagnoseTasting` geeft "scherp zuur" 2 punten onderextractie, ongeacht de sterkte.
  - Bij "sterkte goed" volgt het advies "1 klik fijner".
  - Fijner malen verhoogt in een filter extractie **én** TDS. Volgens deze data werkt de hogere extractie tegen zuur en de hogere TDS ervoor. Het netto-effect is onzeker.
  - "Minder koffie" (lagere TDS, iets hogere extractie) werkt volgens deze data op beide assen tegen zuur.
- **Goed om te weten:**
  - De app behandelt "te sterk + zuur" al met minder koffie.
  - "Zuur alleen" levert hooguit "mogelijk" op, nooit "waarschijnlijk".
- **Conclusie:** de regel is **aannemelijk maar niet aangetoond**. De beste vervolgstap is meten met de eigen blinde proef, niet de regel blind omdraaien.

### C.4 Temperatuur
- **Bron:** Batali 2020 (zie C.1).
- **Wat het zegt:** bij gelijke TDS en extractie weinig sensorisch effect binnen 87–93 °C. Temperatuur versnelt wel de extractie.
- **Conclusie:** de temperatuurankers per branding zijn als *extractiehendel* verdedigbaar en als smaakhendel overschat. De app zegt dat al in de toelichting. **Niets veranderen.**

### C.5 Water
- **Bronnen:**
  - Hendon & Colonna-Dashwood 2014, *J. Agric. Food Chem.* (computationeel: Mg²⁺ bindt het sterkst, dan Ca²⁺). Alleen secundaire dekking gezien ([phys.org](https://m.phys.org/news/2014-06-science-coffee.html)).
  - Een studie uit 2024 noemt de rol van Ca/Mg nog slecht begrepen ([PMC10907646](https://pmc.ncbi.nlm.nih.gov/articles/PMC10907646)).
  - De SCA-waterstandaard (hardheid 50–175, alkaliniteit 40–70 mg/L CaCO₃), die de app al citeert.
- **Kwaliteit:** W, maar computationeel; praktische dosis-respons onbekend.
- **Conclusie:** het huidige gedrag is het best onderbouwd: alleen noteren en bij hoge alkaliniteit (>70) eerst het water controleren bij vlakke zuren. **Niets veranderen.** Geen getallen uit hardheid of magnesium afleiden.

### C.6 Versheid en ontgassing
- **Bron:** [Smrke e.a., *J. Agric. Food Chem.* 66 (2018)](https://digitalcollection.zhaw.ch/handle/11475/12175), een methode voor het meten van ontgassing in de tijd.
- **Wat het zegt:** CO₂ komt versneld vrij bij malen en zetten. Opgegeven ontgassingstijden lopen sterk uiteen door verschillende methoden.
- **Wat ontbreekt:** een onderbouwde regel "X dagen rust" of "+Y s bloom" heb ik niet gevonden.
- **Conclusie:** de versheidsklassen en de +10/+15 s bloom zijn een **hypothese** met klein risico. Ze zijn eerlijk gelabeld. Laten staan; niet uitbreiden.

### C.7 Hoeveelheid, beddiepte en zettijd
Zie het eerdere onderzoek (Darcy, Gagné, Rao, Barista Hustle, praktijkmetingen). Meer koffie bij dezelfde maling zet langer; de exponent varieert sterk tussen ±0,2 en ±0,8. **Optie B (0,4) is een hypothese**, toetsbaar met eigen bed-droog-tijden (I.5).

### C.8 Immersie: extractie hangt niet af van de verhouding
- **Bron:** [Liang, Chan & Ristenpart 2021, *Sci. Rep.* 11:6904](https://pmc.ncbi.nlm.nih.gov/articles/PMC7994670). Bij volledige onderdompeling ligt de extractie rond 21 %, onafhankelijk van de verhouding en vrijwel onafhankelijk van maling en temperatuur (bij evenwicht). Vastgehouden vloeistof kan de gemeten extractie vertekenen.
- **Relevantie:** **beperkt**. V60 en Chemex zijn doorloopfilters, geen immersie. Wel bevestigt het de massabalans en het belang van vastgehouden vloeistof (`LIQUID_RETAINED_RATIO`).

### C.9 Receptbronnen
| Recept | Primaire bron (status) | Kernpunt |
|---|---|---|
| Kasuya 4:6 | [Hario-interview](https://www.hario-europe.com/blogs/hario-community/v60-ambassadors-tetsu-kasuya) (zoekresultaten) | 20 g / 300 ml, gieten 0:45 / 1:30 / 2:10 / 2:40, klaar 3:30; giet pas als het water erdoor is. |
| Hoffmann | [Hario USA – Ultimate](https://www.hario-usa.com/blogs/recipes-and-more-from-friends/james-hoffmann-uitimate-v60-technique); 1-kops video (beschrijving) | 30 g / 500 g, klaar 3:30; 15 g / 250 g ±3:00 met een andere techniek. |
| April | [Honest Coffee Guide](https://honestcoffeeguide.com/brew-recipes/april-coffee-roasters/) (secundair) en eerdere directe ophaling in het project | 20 g / 300 g, 3:20–3:30. |
| Rao | [Hario UK-interview](https://www.hario.co.uk/blogs/hario-ambassadors/hario-v60-recipe-interview-with-hario-ambassador-scott-rao) (zoekresultaten) | 20 g / 330 ml, 97 °C, giet weer als ±70 % is doorgelopen, 4:00–4:30. Stappen 1–3 niet geverifieerd. |
| Perger | [Long Shot London](https://longshortlondon.com/matt-perger-the-v60-pour-over-method/) (secundair) | 12 g / 200 ml, 3 gieten, ±2:20; de rekenkern noemt Perger "beslisregel, geen schema". |

---

## D. Receptenaudit

Gemeten met de echte `computeRecipe()` (V60 250–400 ml, Chemex 300–700 ml).

| Profiel (scherm) | Overlay | Schema nu | Oordeel |
|---|---|---|---|
| Gebalanceerd, Rond & vol, Helder & fris | Kasuya 4:6 | 5 gieten, 45 s, 3:30 (3:40 bij 22 g); Erdoor optioneel | **Goed.** De verdeling 40/60 volgt de bron; de giettijden volgen secundaire bronnen (Kasuya zelf: 2:10/2:40). Het sterkteverschil tussen deze drie is ±0 (A.2). |
| Hoffmann (V60) | Hoffmann Ultimate | bloom 0:45, gieten tot 1:15 en 1:45, 3:30 | **Redelijk.** Die 3:30 hoort bij 30 g; bij 15–22 g zegt Hoffmann zelf ±3:00 (andere techniek). Advies: optie B met zijn eigen twee punten (P2). |
| Hoffmann (Chemex) | Hoffmann Ultimate | zelfde schema, 3:30 | **Verbeteren.** Een V60-techniek op de Chemex; de app meldt zelf al dat het buiten de band valt. Herlabelen of uitsluiten (P2). |
| April | April huismethode | 6 gieten, 0:00–2:40, 3:20 | **Goed.** Ligt dicht bij de bron. |
| Rao (V60) | Rao Minimal Pour | 4 gieten op 30 s, 2:10 | **Verbeteren (P1).** Niet Rao's recept, maar wel zijn naam. |
| Rao (Chemex) | Rao Clarity | algemeen, 4:07 | Al als "ongeverifieerd toegeschreven" gemarkeerd. Goed zo. |
| Snel (Perger) | Perger 80/20 | bloom + 1 giet, 1:40 | **Omschrijving klopt niet** ("2,5 min"). Schema is een eigen invulling (eerlijk gemeld). |
| Bloemig, Sirooprig, Basisrecept | Kernrecept (Hedrick niet te genereren) | 4 gieten, 2:10 | Eigen recept, eerlijk gelabeld. **Laten.** |
| Chemex (overige) | Kernrecept | 4:07 bij 300–700 ml | **Verbeteren (P2).** Eén tijd voor een factor 2,3 in dosis; optie B met een 6-kops als referentie. |

**Ontbrekende configuraties:**
- Geen andere molens of brewers. De kern weigert die bewust (EQUIPMENT_SCOPE): goed.
- Espresso: zie H.

---

## E. Geprioriteerde verbeteringen

**Schaal:**
- Impact, Bewijs en Risico: Laag / Midden / Hoog.
- Complexiteit: S / M / L.
- P0 = kritiek, P1 = hoge waarde en goed onderbouwd, P2 = waardevol maar eerst valideren, P3 = experiment.

| ID | Verbetering | Probleem / bewijs | Impact | Bewijs | Complexiteit | Risico | Prio |
|---|---|---|---|---|---|---|---|
| V1 | Sterkte expliciet per profiel, toetsen met de blinde proef | De clusters geven 1:17,4 tegen 1:17,6 (berekend); TDS is de sterkste smaakdrijver (C.1, C.2) | Hoog | Midden (W, maar druppelfilter) | M | Midden (receptgetallen) | **P1** (eerst de proef, daarna pas getallen) |
| V3 | Rao eerlijk maken: het gepubliceerde recept, of de naam eraf | 2:10 en 4 gieten tegen Rao's 4:00–4:30 en bloom + 2 gieten op doorlopen (C.9) | Midden | Midden (primair, deels geverifieerd) | M | Laag tot midden | **P1** |
| V6 | De omschrijving van Perger corrigeren | "2,5 min" tegen 1:40 (code) | Laag | Hoog (bewezen) | S | Laag | **P1** |
| V2 | Diagnose van "scherp zuur" mét sterkte; adviesregels meten | Zuurheid hangt aan TDS (C.3); de regels heten in de code zelf "te valideren" | Hoog | Midden | M | Midden | **P2** (proef eerst) |
| V4 | Optie B voor Chemex, Hoffmann en April | Eén tijd bij elke hoeveelheid (C.7, D) | Midden | Laag tot midden | S | Laag | **P2** |
| V5 | Hoffmann op de Chemex herlabelen of uitsluiten | Een V60-techniek op een ander toestel (D) | Laag | Midden | S | Laag | **P2** |
| V7 | De TS-bron van de rekenkern in de repo, of de bouwherkomst vastleggen | Kern niet reproduceerbaar te herbouwen (B.4) | Midden (onderhoud) | Hoog (feit) | S tot M | Laag | **P2** |
| V8 | Validatiepaneel: Erdoor- en bed-droog-tijden per hoeveelheid, adviesresultaten | Er is al data, maar geen overzicht (`adviceOutcomeStats`, `drained`-events) | Midden | n.v.t. | M | Laag | **P2** |
| V9 | Exponent 0,4 vervangen door een eigen fit zodra er ≥ 8 koppen per hoeveelheid zijn (optie F) | 0,4 is een aanname (C.7) | Laag tot midden | Laag | M | Laag | **P3** |
| V11 | De wisselvallige R-02-schermtest herleiden en robuust maken (geen test overslaan) | Mislukt af en toe met een time-out na herladen (F.1) | Laag (gebruiker), Midden (vertrouwen in CI) | Hoog (gezien) | S tot M | Laag | **P2** |
| V10 | Vasthoudfactor 2,0 vervangen door de eigen meting (schakelaar) | De meting bestaat al, wordt nog niet gebruikt | Laag | Midden | S | Midden (alle getallen) | **P3** |

**Toelichting bij de belangrijkste:**
- **V1:** maak een korte, toetsbare keuze, bijvoorbeeld een verhoudingsdoel per smaak:
  - Helder & fris ±1:17;
  - Gebalanceerd ±1:16;
  - Rond & vol ±1:15.
  - **Eerst** een blinde vergelijking met de bestaande A/B-functie (`abTrialVerdict`: minimaal 5 proeven, winnaar bij ≥ 70 %), pas daarna de getallen aanpassen.
  - Sterkste tegenargument: je hebt al ±8 %-sterktestappen en persoonlijke kalibratie. Misschien volstaat een eerlijke zin ("deze smaken verschillen vooral in giettechniek, niet in sterkte"). Dat is de veilige minimale variant (V1a).
- **V2:**
  - Laat de diagnose bij "scherp zuur" en "sterkte goed" twee kandidaten noemen ("fijner" of "iets minder koffie"), niet één.
  - Of: kies eerst "iets minder koffie" bij lichte brandingen.
  - Toetsen met de slagboomstatistiek (`adviceOutcomeStats`): telt het aandeel "beter" omhoog?
- **V3:** twee opties.
  - (a) Het schema volgens Rao: bloom 3× dosis met draaien, ±40 s, gieten tot ±60 %, gieten tot 100 % bij ±70 % doorgelopen, met draaien, verwacht 4:00–4:30 bij 20 g. Dat vraagt waarschijnlijk een fijnere start-klik: een tweede receptbesluit.
  - (b) Het profiel "Rao-geïnspireerd (eigen schema)" noemen.
  - Voor (a) moet eerst de volledige tekst op hario.co.uk gelezen kunnen worden.

**Bewust afgewezen:** zie H.

---

## F. Validatieplan

### F.1 Al uitgevoerd
- **Volledige testrun** (`npm test`) als nulmeting op 6c70ed3: 988 tests, 987 geslaagd, 1 mislukt.
  - De mislukte test is R-02 ("Zet opnieuw … ook na een herstart", `kernflow.smoke.test.mjs:3591`): een time-out van 30 s op `[data-next-cup-go]` na het herladen.
  - Dezelfde test faalde eerder één keer op CI (commit 9a19c01). Los gedraaid slaagt hij hier 2 van 2 keer, en de GitHub-CI van PR #35 op 6c70ed3 was groen.
  - Conclusie: een **wisselvallige test**, geen aangetoonde fout in de app. De oorzaak is niet gevonden; zie V11..
- **Eigen controleberekening:**
  - 26.730 receptcombinaties, 0 schendingen van de vier invarianten (B.1).
  - Verhoudingen per cluster: 1:17,62 en 1:17,36 (midden), 1:17,51 en 1:17,27 (middelpunt van het venster).
  - De rekensom TDS ≈ EY/(verhouding − 2) laat zien dat de app bij EY 18/20/22 een TDS van ±1,17/1,30/1,43 verwacht.
- **Wat niet is gedaan:** geen fysieke zetten, geen refractometer, geen proefpanel.

### F.2 Nog nodig: software
- **V1 en V2:** unit- en eigenschapstests:
  - een monotone sterkte per profiel;
  - de verhouding binnen de toestelgrenzen;
  - het diagnosegedrag per combinatie (een volledige tabel sterkte × zuur × bitter × droog → advies, als gouden bestand);
  - oude records worden niet anders geïnterpreteerd (`MODEL_POLICY.version` en `DIAGNOSIS_RULESET_VERSION` ophogen).
- **V3:** gouden recepten bewust opnieuw genereren, met een herkomstregel.
- **V7:** een test dat de gebouwde bundel uit de bron dezelfde hash geeft.

### F.3 Fysieke experimenten (jij, thuis)
| # | Hypothese | Basis tegenover variant | Constant | Herhaling | Meting | Succes |
|---|---|---|---|---|---|---|
| E1 | Een sterkere verhouding maakt "Rond & vol" voller zonder bitterder te worden | 1:17,4 tegen 1:15,5, Kasuya, 300 ml | Boon (één zak, dag 7–21), water, klik, temperatuur | ≥ 6 blinde paren (A/B-functie, minimaal 5) | Voorkeur, body en bitter op de proefkaart | Variant wint ≥ 70 % (de drempel van de app), zonder "bitter"-toename |
| E2 | Bij "zuur, sterkte goed" helpt minder koffie vaker dan fijner malen | −4 % dosis tegen −1 klik | Idem | ≥ 6 per arm | "Beter dan vorige" en zuur | Duidelijk verschil (≥ 4 van 6) |
| E3 | Erdoor maakt de tijd herhaalbaarder dan de klok | Klok tegen Erdoor, Kasuya, 300 en 400 ml | Idem | ≥ 5 per arm en volume | Spreiding van de bed-droog-tijd (sd) | sd Erdoor < sd klok; smaak niet slechter |
| E4 | De bed-droog-tik is herhaalbaar | Zelfde recept 5× | Alles | 5 | sd van de bed-droog-tijd | sd ≤ 10 s (voorwaarde om tijd ooit in het advies te gebruiken) |

Sensorisch is subjectief. Een refractometer zou TDS meten, maar meer TDS of extractie is **niet** automatisch beter.

### F.4 Acceptatiecriteria (per wijziging)
- **V1:** E1 succesvol. Bestaande koppen worden niet anders gelezen. Geen recept buiten 15–22 g. Gouden bestand bewust bijgewerkt. Verworpen als E1 geen voorkeur laat zien.
- **V2:** E2 laat een verschil zien in de verwachte richting. De slagboomstatistiek gaat niet achteruit. Anders verworpen.
- **V3:** schema = de gepubliceerde stappen (na het lezen van de bron). Tests groen. Een tijd van ±4:00 bij 20 g vraagt een nieuwe start-klik: dat is een apart besluit.
- **V6:** de omschrijving klopt met het schema; een test controleert het.

---

## G. Implementatieplan (pas na jouw akkoord)

1. **V6 (S):** omschrijving van Perger, met een test die omschrijving en schema vergelijkt. Geen receptgetal. Terugdraaien = één commit.
2. **V7 (S–M):** bron van de rekenkern toevoegen, of een herkomstnotitie plus hashtest. Raakt de kern niet.
3. **V1a (S):** eerlijke zin bij de smaken ("verschillen vooral in giettechniek"). Daarna **E1** thuis. V1b (verhoudingsdoel per smaak) alleen als E1 slaagt. Dan `MODEL_POLICY.version` naar 4.0, gouden bestand opnieuw, oude records blijven op hun versie.
4. **V3:** bron lezen (domein toestaan), dan kiezen tussen schema (a) en naam (b). Bij (a): eigen tak in `buildPourSchedule` (zoals Hoffmann), gouden bestand, tests.
5. **V2:** eerst **E2** via de bestaande "Gebruik voor volgende kop". Daarna `DIAGNOSIS_RULESET_VERSION` naar diag-2026.4, met een gouden diagnosetabel.
6. **V4 en V5:** zelfde mechanisme als optie B, per techniek een eigen referentie.
7. **V8 en V9:** alleen-lezen-overzicht, later de eigen exponent.

**Compatibiliteit:** elke receptwijziging hoogt `MODEL_POLICY.version` op. Records bewaren `plan.inputs` en de versie, dus oude koppen worden niet opnieuw geïnterpreteerd. De rekenkern-hash blijft gelijk, behalve als V7 dat bewust verandert.
**Terugdraaien:** per stap één commit; gouden bestand en versienummer maken een terugval zichtbaar.

---

## H. Afgewezen ideeën

| Idee | Waarom niet |
|---|---|
| Espresso toevoegen (Barista Express, IMS 18 g) | Buiten de huidige opzet; een ander extractieregime (druk, puck, rendement, shottijd) met een eigen model en eigen tests. Een apart project, en alleen als je het vraagt. |
| Machine learning als recommender | Eén gebruiker, weinig koppen, geen gelabelde uitkomsten. De regels plus de blinde proef en de slagboom zijn beter te controleren. |
| Temperatuur of maling uit waterhardheid of magnesium | Geen dosis-responsbewijs (C.5); terecht een verboden koppeling. |
| Recept bijstellen op herkomst, variëteit of proces | Geen gevalideerde koppeling gevonden; terecht verboden. |
| Smaaknotities van de brander als voorspelling van extractie | Geen bewijs; alleen gebruikt als smaakdoel, en zo moet het blijven. |
| Zettijd als diagnose-input | Herhaalbaarheid van de bed-droog-tik onbekend (E4). Eerst meten. |
| Temperatuurankers verlagen of verhogen op smaakgronden | Bij gelijke TDS en extractie weinig effect (C.4); het anker werkt als extractiehendel en is in orde. |
| Kasuya's "meer gieten = sterker" als mechanisme presenteren | Niet onafhankelijk onderbouwd gevonden; alleen als zijn gepubliceerde techniek tonen (zoals nu). |

---

## I. Eindadvies

1. **De drie verbeteringen met de meeste waarde:**
   - V1: sterkte expliciet maken en toetsen.
   - V3: Rao eerlijk maken.
   - V2: de zuur-diagnose met sterkte, getoetst.
2. **De sterkste onderbouwing:** V6 (bewezen tekstfout). Van de inhoudelijke punten: V1, omdat peer-reviewed onderzoek laat zien dat TDS de sterkste smaakdrijver is en de app die hendel per profiel nu nauwelijks gebruikt (eigen berekening).
3. **Ongemoeid laten:**
   - de massabalans in de kern;
   - het herkomst- en vertrouwenssysteem;
   - de verboden koppelingen;
   - de advieslogica met één hendel;
   - de slagboom;
   - de dosis- en molengrenzen;
   - het vergelijken van alleen vergelijkbare koppen;
   - de waterlogica (alleen noteren plus de alkaliniteitscheck).
4. **Nog niet te bewijzen:**
   - dat een van deze wijzigingen beter smaakt;
   - exponent 0,4 (optie B);
   - dat Erdoor beter smaakt dan de klok;
   - de diagnosepunten;
   - de temperatuurankers boven 93 °C;
   - de vasthoudfactor bij Chemex;
   - de start-klik 15–17.
5. **Wat er nodig is:**
   - E1–E4 thuis, met de functies die de app al heeft;
   - het toestaan van hario.co.uk, pmc.ncbi.nlm.nih.gov en pages.uoregon.edu in de netwerkinstellingen, om de volledige teksten te lezen;
   - eventueel een refractometer, als objectieve aanvulling en niet als doel.
6. **Veiligste en meest waardevolle volgende stap:** V6 plus V1a (tekst, geen getallen), en daarna **E1** zetten met de blinde proef. De uitkomst van E1 bepaalt of de grotere wijziging (V1b) de moeite waard is.
