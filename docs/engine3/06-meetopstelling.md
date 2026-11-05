# 06 · Meetopstelling en nulmeting

Code: `engine3/eval/`. Een nieuwe engine wordt pas de standaard als hij hier aantoonbaar beter is dan Engine 2, en nergens slechter.

## De virtuele Jelle

- **Voorkeur:** 1,17 % TDS. Dat is wat Engine 2 uit Jelles 9 eigen koppen schat (15,8 g op 300 ml). Elke zak wijkt daar willekeurig iets van af.
- **Elke kop:**
  - de werkelijke TDS komt uit de massabalans (R 2,1 en EY 0,20, met spreiding per zak en per kop);
  - het oordeel volgt uit hoe ver de kop van de voorkeur ligt, plus ruis. De drempels liggen op ±0,5 en ±1,5, zoals de vijf knoppen in de app.
- **Scenario:** 8 zakken van 10 koppen, 300 g water. Iedere strategie krijgt dezelfde zakken en dezelfde ruis.
- **Werelden:** het oordeelmodel lijkt op dat van Engine 2. Om te voorkomen dat Engine 2 alleen wint omdat hij op zijn eigen aannames getest wordt, draait alles ook in afwijkende werelden:

  | Wereld | Afwijking |
  |---|---|
  | basis | slope 5, ruis 0,7 |
  | veel ruis | ruis 1,1 |
  | vlak oordeel | slope 3 |
  | scheef | te sterk weegt 1,6× zwaarder |
  | voorkeur drift | +0,3 % per kop |
  | zakken verschillen veel | spreiding 0,10 in plaats van 0,05 |

- **Doorloop na de laatste giet:** 78 s bij klik 16, ×0,886 per klik grover, ln-ruis 0,167 (molenmodel uit punt 4). Dit staat klaar voor de molenmodule.

## Maatstaven

| Maatstaf | Wat Jelle merkt |
|---|---|
| Precies goed | aandeel koppen waarop je 'precies goed' tikt |
| Koppen tot eerste goede | per nieuwe zak |
| Afwijking 2e helft | hoe ver de koppen in de tweede helft van een zak van je voorkeur liggen (% TDS) |
| Tegen het oordeel in | meer koffie na 'te sterk', of minder na 'te slap' |
| Dosisstap | hoe onrustig de dosis per kop verandert (g) |

## Nulmeting (200 herhalingen per wereld)

| Wereld | Strategie | Precies goed | Tot eerste goede | Afwijking 2e helft | Tegen oordeel in | Dosisstap |
|---|---|---|---|---|---|---|
| basis | vast recept | 24 % | 4,4 | 21,6 % | 0 % | 0,00 g |
| basis | **Engine 2** | **46 %** | **2,4** | **5,2 %** | **0 %** | 0,12 g |
| basis | orakel | 52 % | 2,0 | 2,0 % | n.v.t. | — |
| veel ruis | Engine 2 | 33 % | 3,1 | 6,0 % | 0 % | 0,18 g |
| veel ruis | orakel | 35 % | 2,8 | 2,0 % | n.v.t. | — |
| vlak oordeel | Engine 2 | 49 % | 2,1 | 6,7 % | 0 % | 0,09 g |
| scheef | vast recept | 12 % | 7,3 | 21,6 % | 0 % | — |
| scheef | Engine 2 | 44 % | 2,6 | 4,6 % | 0 % | 0,15 g |
| voorkeur drift | Engine 2 | 45 % | 2,5 | 5,7 % | 0 % | 0,14 g |
| voorkeur drift | orakel | 52 % | 2,0 | 2,0 % | n.v.t. | — |
| zakken verschillen veel | Engine 2 | 43 % | 2,8 | 6,5 % | 0 % | 0,16 g |
| zakken verschillen veel | orakel | 52 % | 2,0 | 2,0 % | n.v.t. | — |

Het orakel kent de ware voorkeur, wat in het echt niet kan. Het laat zien wat het maximum is: ook met de perfecte dosis is maar ~52 % van de oordelen 'precies goed', vanwege de ruis in het oordeel zelf. De volledige uitvoer staat in `engine3/eval/baseline-e2.json`.

**Gevoeligheid voor de voorkeur:**
- Bij 1,05 % blijft Engine 2 gelijk (45 %); het vaste recept zakt naar 10 %.
- Bij 1,40 % ligt de voorkeur toevallig dicht bij het basisrecept, en is vast even goed als Engine 2 (47 tegenover 46 %).

**Eigen koppen opnieuw afgespeeld** (`replay-local.ts`, 9 koppen met een oordeel):
- 3 keer wees het advies de goede kant op, 1 keer de verkeerde;
- 5 keer was er geen richting (de kop was goed, of het verschil was < 0,2 g);
- gemiddeld verschil tussen advies en gezette dosis: 1,1 g.

## Wat dit betekent

1. **Sterkte is bijna verzadigd.** Engine 2 haalt 46 van de 52 % die maximaal kan, en stapt nooit tegen het oordeel in. Een nieuwe sterktemodule kan hooguit een paar punten winnen. De meeste ruimte zit bij drift (45 tegenover 52 %) en bij zakken die veel verschillen (43 tegenover 52 %).
2. **De winst van Engine 3 moet uit andere modules komen:** maalgraad en tijd, techniekkeuze en smaak. Daarvoor bestaat nog geen nulmeting, omdat Engine 2 de klik niet zelf aanpast. De meetopstelling heeft het doorloopmodel al klaarstaan.
3. **Afspraak voor de bouw:** Engine 3 mag in geen enkele wereld meer dan 1 punt 'precies goed' verliezen tegenover Engine 2. Ook mag 'tegen het oordeel in' niet boven 0 % komen.

## Wat er nog bij moet zodra de molenmodule er is

- **Doorloopmaatstaf:** het aandeel koppen met het einde binnen 2:50–4:10 bij Kasuya. Daarnaast het aantal koppen tot een zak 'op tijd' loopt.
- **Techniekkeuze:** in de simulator een verborgen 'beste techniek per zak'. Daarmee is te meten hoe snel een proef die vindt, en hoe vaak een proef overbodig is.

## Engine 3, stap 3 (sterkte)

De sterktemodule van Engine 3 is gemeten met dezelfde opstelling (`node engine3/eval/run.ts 200`). In alle zes werelden zijn alle vijf maatstaven gelijk aan Engine 2, en 'tegen het oordeel in' blijft 0 %. Zie [12-sterkte.md](12-sterkte.md).

## Engine 3, stap 4 (tijd en molen)

De doorloopmaatstaf staat er nu: `node engine3/eval/grind-sim.ts 200`, met acht werelden en als vergelijking een vaste klik, 'zelf één klik bijsturen' en een orakel. Zie [13-tijd-en-molen.md](13-tijd-en-molen.md).

## Engine 3, stap 5 (techniekkeuze)

De simulator met een verborgen beste techniek per zak staat er nu: `node engine3/eval/technique-sim.ts 200`. Zie [14-techniekkeuze.md](14-techniekkeuze.md).

## Engine 3, stap 8 (samenstellen)

Op de eigen koppen (lokaal) doet het volledige `plan()` hetzelfde als Engine 2: 3 keer de goede kant op, 1 keer de verkeerde, 5 keer geen richting. Zie [15-samenstellen.md](15-samenstellen.md).

## Engine 3, stap 6 (zakherkenning)

Geen simulatie maar een differentiële toets tegen de app: dezelfde tekst geeft dezelfde uitkomst (alle app-testteksten en 600 willekeurige etiketten). Zie [16-zakherkenning.md](16-zakherkenning.md).

## Engine 3, stap 7 (smaakprofiel)

Geen poort in de simulator: het profiel stuurt niets. Getoetst met een simulatie van een proever met bekende treffers en valse alarmen (de schatting komt binnen 0,12 van de waarheid) en met een test dat `plan()` onveranderd blijft. Zie [17-smaakprofiel.md](17-smaakprofiel.md).
