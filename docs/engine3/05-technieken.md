# 05 · Technieken en regeltabel

Data: `engine3/src/data/techniques.ts` en `engine3/src/data/selection-rules.ts`. Elk getal komt uit de genoemde bron. Waar de bron iets niet zegt, staat null of een gemarkeerde plaatshouder.

## De acht technieken

| Techniek | Bron (klasse) | Referentie | Einde | Assen (agitatie · structuur · extractie) |
|---|---|---|---|---|
| Kasuya 4:6 | Hario Europe + Philocoffea (A/B) | 20/300; 0:00 50 · 0:45 120 · 1:30 180 · 2:10 240 · 2:40 300 | 3:30 | gemiddeld · twee fasen · normaal |
| Hoffmann Ultimate | Hario USA (A/B) | 30/500, net van de kook (donker 88 °C, C); bloom 60 + swirl · 0:45→300 · 1:15→500 + roeren | 3:30 | gemiddeld · weinig gieten · normaal |
| Gagné | Coffee ad Astra (A) | 22/352, kokend; 66 + Rao spin · 0:30→~200 · →352 | 2:30–3:30 | gemiddeld · weinig gieten · hoog |
| Wendelboe | timwendelboe.no (A; temperatuur C) | 65 g/l, 96 °C (aanname); 60 + roeren · 0:30→200 · rondjes →500 | 3:00–3:30 | gemiddeld · doorlopend · normaal |
| Osmotic Flow | European Coffee Trip (C) | alleen in het midden, bolle korst; 20/250 of 15/225 | — | zeer laag · doorlopend · normaal |
| April | eigen gids (A; temperatuur C) | 20/300, 6 × 50 g op 0:00, 0:40, 1:10, 1:40, 2:10, 2:40; 92 °C | 3:20–3:30 | hoog · gelijke pulsen · normaal |
| Hedrick One and Done | Gota (B) | 15/225, 93 °C; 45 · 0:30→90 · 1:00→225 krachtig in het midden, niet swirlen | 2:00–2:30 | laag · één hoofdgiet · normaal |
| Rao Spin | Hario UK (A/B) | 20/330, 97 °C; 60 + krachtige spin · 0:40→200 · bij ~70 % doorgelopen →330 | 4:00–4:30 | gemiddeld · weinig gieten · hoog |

Perger 80/20 is een beslisregel, geen recept.

## Regeltabel voor de starttechniek

| Prioriteit | Als | Voorstel → proef | Kasuya eerste giet | Bewijs |
|---|---|---|---|---|
| 102 | Chemex, kop ≤ 400 g (1 kop = 340 g) | Chemex Howell (1 kop) → Pull & Pour | — | besluit |
| 101 | Chemex, kop 401–550 g | Chemex Stumptown → Barefoot | — | besluit |
| 100 | Chemex, kop ≥ 551 g (2 koppen = 680 g) | Chemex Barefoot → Stumptown, Blue Bottle, Onyx | — | besluit |
| 90 | licht/light-medium, en herhaald zuur of hol | Gagné → Kasuya | — | E3 |
| 85 | ongelijk doorlopen of droge afdronk | Rao → Kasuya | — | E3 |
| 60 | bloemige of theenotities | Wendelboe (eigen recept) → Kasuya | — | E3; besluit |
| 55 | natural/honey met fruit | Kasuya → Osmotic Flow | 0,667 (80 + 40, helderder) | E3; verdeling Gota (B) |
| 50 | chocolade, karamel, noot, zoet | April → Kasuya | 0,333 (40 + 80, zoeter) | E3; verdeling Gota (B) |
| 20 | kop ≤ 230 g | Kasuya → Hedrick | — | E3 |
| 0 | anders | Kasuya | 50 + 70 (Hario) | besluit |

Eigen uitkomsten gaan altijd boven deze tabel. Een gewonnen proef wint, voor die zak en voor vergelijkbare koffies.

## Open punten bij de technieken

1. ~~**Wendelboe past niet bij zijn rol.**~~ **Besloten (5 nov 2026):** Wendelboe houdt de rol voor bloemige en theeachtige koffies, met zijn eigen recept (bloom roeren, doorlopend in rondjes). Er komt geen 'lage agitatie'-variant, en de verzonnen namen 'Serene pulse' en 'Nordic light' vervallen.
2. **Osmotic Flow heeft geen gietschema.** Hij kan pas een proefkandidaat worden met eigen metingen, of als er een betrouwbare bron gevonden wordt.
3. **Plaatshouders in de tijden.** Bij Gagné (laatste giet), Wendelboe (derde stap) en Rao (laatste giet, die aan het doorlopen hangt) staat een tijd die de bron niet geeft. Die is gemarkeerd in de data. Bij die gieten moet `waitForDrain` de regel worden, niet de klok.
4. ~~**Hoffmann en Wendelboe noemen geen temperatuur.**~~ **Opgezocht (5 nov 2026):**
   - **Hoffmann:** Hario USA: 'the hotter, the better (especially with lighter roasts)'. Secundaire gidsen zeggen eensgezind 'net van de kook'. Licht en medium: 100 °C op de ketel. Donker: 88 °C, alleen uit een secundaire bron (klasse C).
   - **Wendelboe:** zijn eigen gids zegt alleen 'hot water'. Er is geen primair getal te vinden. Het beste alternatief is 96 °C (klasse C, aanname): zijn café zet de AeroPress met 96 °C uit de boiler, en recepten-sites die zijn gids overnemen noemen 96 °C. Bij donkere branding geldt de Philocoffea-regel (88/83 °C) als terugval.
   - Een eigen proef (96 tegen 100 °C) kan de aanname bij Wendelboe vervangen.

## Gietaanwijzingen, gecontroleerd tegen de bronnen (9 nov 2026)

De recepten kenden per giet alleen tijd, gewicht, patroon en swirl/roeren. Wat de bronnen verder zeggen (tempo, hoogte, kuiltje, hoe en hoelang roeren, wat na de laatste giet) stond alleen als losse notitie en kwam tijdens het zetten nergens terug. Alle zeven bronnen met een webadres zijn opnieuw gelezen; per giet staan nu optioneel `tip` (hoe), `after` (wat daarna), en per techniek `prep` (voor de start) en `finish` (na de laatste giet) in `data/techniques.ts`. De app laat ze zien op het receptscherm en, op het juiste moment, op de timer (`app3/src/core/gieten.ts`).

| Techniek | Gevonden bij het controleren | Aangepast |
|---|---|---|
| Kasuya 4:6 | Philocoffea en Hario noemen **geen gietpatroon**, tempo of hoogte; alleen 'giet pas als het water bijna doorgelopen is' en 'filter eraf op 3:30'. | 'In spiraal' staat er niet meer (`styleGiven: false`); 'haal de V60 eraf op 3:30' erbij. |
| Hoffmann Ultimate | Hario USA noemt **geen gietpatroon**; wel: swirl na de bloem (beter dan een lepel), laatste giet 'iets langzamer, niet te fel', daarna één keer met en één keer tegen de klok in roeren, even laten zakken en zacht swirlen; filter spoelen en een kuiltje maken; klaar voor 3:30. | Alle genoemde aanwijzingen per giet en voor/na; geen 'in spiraal' meer. |
| Gagné | Bloem 'gelijkmatig en wat snel vanuit het kuiltje', Rao-spin direct erna (15–20 s); spiralen alleen bij de eerste hoofdgiet; Rao-spin bij tweederde hoogte en een laatste als het water laag is; bed niet laten droogvallen; filter spoelen, bed vlak schudden, kuiltje; uitlopen 2:30–3:30, swirl voor het drinken. | Alles toegevoegd; patroon alleen nog bij de eerste hoofdgiet. |
| Wendelboe | Bloem roeren met een theelepel; **cirkelbeweging alleen bij de hoofdgiet** (2–2,5 min), daarna ± 1 min uitlopen en roeren voor het serveren. | Patroon bij bloem en tweede giet weggehaald; voor/na toegevoegd. |
| Hedrick | Hoofdgiet is **'in een spiraal, met energie, de straal dicht bij het midden'** (~10 g/s, 13 s), niet 'in het midden'; bloemen ~7,5 g/s en niet roeren of swirlen; kleine swirl alleen als het te snel doorloopt. | Hoofdgiet van 'midden' naar 'spiraal' met tip; 'niet roeren' bij beide bloemen. |
| Rao | Bloem direct stevig draaien, daarna heel zacht (< 1 s, net genoeg om de groeven te vullen); laag, bijna verticaal en rondbewegend gieten, steeds op dezelfde hoogte; vogelnestje; laatste giet bij ± 70 % doorgelopen. Geen vast patroon genoemd. | Aanwijzingen toegevoegd; patroon bij de bloem weggehaald. |
| April | Webadres ontbreekt; niet opnieuw gecontroleerd. | Ongewijzigd (met een notitie). |
| Osmotic Flow | Geen schema. | — |

Bijeffect: waar een bron geen patroon noemt, toont de app er niets over in plaats van een aanname als feit.

## Chemex-recepten (9 nov 2026)

Zes recepten uit `onderzoek_chemex.md`, als data in `engine3/src/data/chemex-techniques.ts` (`methods: ['chemex']`): Verve (15/225, 1 kop), Pull & Pour (24/385, één kalme giet), Barefoot (50/750, twee gietbeurten), Stumptown (42/700, drie), Blue Bottle (50/700, pulsen, giet aan het zakken gekoppeld) en Onyx (55/900, vier pulsen, 6–7 min). Per recept staan bron, klasse, voor- en nastappen en een tip per giet erin; wat de bron niet noemt, is een plaatshouder in `open` (komt als melding bij het recept).

- **Brewer:** `fitsMethod(def, method)`; een recept zonder `methods` is een V60-recept. De techniekkeuze (`chooseTechnique`) kiest een Chemex-recept nooit voor de V60 en omgekeerd, ook niet via een gewonnen proef of vergelijkbare zakken. Zelf kiezen blijft altijd kunnen: een V60-techniek op de Chemex krijgt de melding dat het dikkere filter trager doorloopt.
- **Portie:** de regels kijken naar de kopgrootte (`minCupG`/`maxCupG`); de app biedt '1 kop' (250 g), '2 koppen' (500 g) en 'Hele kan' (650 g).
- **Dosisgrens:** 15–57 g (laagste en hoogste dosis in de brongegeven recepten, klasse C). Boven 800 g water volgt een melding dat het dicht bij de rand van een 6-kops Chemex komt (885 ml).
- **Molen:** beginklik 24 (BrewTuner, klasse C), adviesvenster 17–31. Het doorloopmodel start voor de Chemex bij het eindmoment van het recept (aanname, breed), niet bij de V60-waarden; klikken van de V60 tellen niet mee voor de Chemex.
- **Sterktevoorkeur per brewer:** `strengthPlan` leert alleen van koppen en proeven van dezelfde brewer (oude logboeken zonder brewer tellen als V60). Een Chemex begint dus op de startdosis tot er Chemex-koppen geproefd zijn. Klachten per zak (zuur, droog) tellen nog voor beide brewers.
- **Leren op de Chemex:** het recept van de portieregel is zelf de controle (Kasuya is dat alleen op de V60). Na twee geproefde koppen daarvan met deze zak volgt een blinde proef met het volgende recept uit de regel; de winnaar wordt de keuze voor die zak. Een winnaar van de V60 telt niet voor de Chemex en omgekeerd.
- **Nog niet:** een keuze per boon (branding, proces) voor de Chemex; daarvoor zijn eerst eigen koppen nodig.

### Chemex Howell, één kop (9 nov 2026)

George Howell publiceert in zijn eigen PDF een recept 'Chemex six cup, brew for one': 25 tot 28 g koffie op 390 g water (340 g in de kop), 201 tot 205 °F, drie gietbeurten (130 g in 20 s, 1:00 naar 260 g, 2:00 naar 390 g, elk in concentrische cirkels vanuit het midden), klaar na 3:30 tot 4:00. Klasse A. Dosis 26,5 g (midden van de band) en 95 °C (midden van 94 tot 96 °C) zijn de referentie. Het is nu het voorstel voor '1 kop' (340 g, de maat van het recept); Verve (15/225) blijft beschikbaar voor een kleinere Chemex. De portieknoppen zijn '1 kop' (340 g) en '2 koppen' (680 g); 'Hele kan' is vervallen, want twee koppen zijn bij 6-kops vrijwel de hele kan.

Het doorloopmodel stelt de maalstand voor een Chemex-recept niet bij zolang er voor dat recept geen eigen doorlooptijd is gelogd (het beginpunt is zelf een aanname); eerder gaf elke Chemex-brew de melding dat het einde afweek.
