# 13 · Tijd en molen (bouwstap 4)

Code: `engine3/src/grind.ts`, `engine3/src/data/grinder.ts` · tests: `engine3/test/grind.test.ts` · meetopstelling: `engine3/eval/grind-sim.ts` (uitvoer `engine3/eval/e3-grind-200.json`)

`grindPlan(feiten, { method, technique, beanId, waterG, lastPourAtSec, targetEnd, currentClick })` voorspelt de doorloop na de laatste giet en het einde (met band), geeft de kans dat het einde in de gewenste band valt en adviseert zo nodig een andere klik (hooguit 4 klikken per keer, binnen het bereik van de molen).

## Model

`ln(doorloop na de laatste giet) = techniek + κ·(klik − 16) + λ·ln(water/300) + zak + ruis`

Een Bayesiaanse lineaire regressie met bekende ruis: geen sampling, geen toeval.

| Term | Prior | Herkomst |
|---|---|---|
| techniek (eigen niveau) | ln 78 s, ±0,25 bij Kasuya, ±0,5 anders | molenmodel uit punt 4 (78 s bij klik 16) |
| κ, klikeffect | −11 % per klik grover (×0,886), ±0,04 | natuurkundige verwachting uit punt 4 |
| λ, hoeveelheid | 0, ±0,5 | geen bron; de bronnen houden voor 15/20/30 g ~3:30 aan |
| zak | 0, ±0,12 | aanname, vergelijkbaar met Engine 2 |
| ruis per zetsel | 0,167 | molenmodel uit punt 4 |

- Een zetsel van 30 zetsels geleden telt half (zoals bij sterkte).
- Het klikeffect kan niet positief worden: een grovere maling maakt het doorlopen niet trager. Wijst de data die kant op, dan geldt het effect als nul.
- Wat gemeten wordt: de 'erdoor'-tik van de laatste giet, anders 'bed droog', min het geplande moment van de laatste giet. Bij Kasuya wacht die giet soms op het doorlopen; die wachttijd zit dan in de ruis. Afgebroken zetsels, zetsels zonder klik en tijden buiten 5–900 s tellen niet.

## Het verschil met Engine 2

Engine 2 leert het effect van een klik pas na 6 zetsels met minstens twee standen (elk 2×) en past de klik niet zelf aan. Engine 3 begint met de natuurkundige verwachting vanaf de eerste kop en laat de data die bijstellen. Een nieuwe zak leert zijn afwijking binnen een paar koppen. Ook de gelogde 'erdoor'-tikken worden gebruikt zodra ze er zijn.

## Advies

- **Doel:** het midden van de gewenste band (Kasuya: 3:30, band 2:50–4:10 volgens Gota).
- **Laat de klik met rust** zolang de kans op 'in de band' minstens 80 % is én het verwachte einde binnen 20 s van het doel ligt.
- **Anders** de klik (±4) waarvan het verwachte einde het dichtst bij het doel ligt, mits dat het einde minstens 8 s dichter brengt of de kans met minstens 10 punten verhoogt.
- **Huidige klik:** de geplande, anders de laatste van deze zak, van deze techniek, de laatste van alle, en zonder gegevens 16.

## De molen (Timemore Chestnut C3S Pro)

Zie `engine3/src/data/grinder.ts`. De bronnen die je noemde en wat ze zeggen:

| Bron | Wat erin staat |
|---|---|
| [BrewTuner](https://brewtuner.io/grinders/timemore-c3s-pro) | V60 18 klikken, bereik 14–22; Chemex 24 (20–28); AeroPress 16 (13–20). 38 mm conisch, S2C 660. Geen micron per klik. De FAQ noemt 11–14 klikken als begin (tegenspraak op dezelfde pagina). |
| [Beean](https://beeancoffee.com/grinder-setting-converter/) | De converter bevat de C3S Pro, maar toont zonder te rekenen geen micron per klik. |
| Andere bronnen | The Basic Barista: V60 11–18 klikken, 83 micron per klik; Slow Pour Supply: 83 micron per klik; Balance Journal: 20 micron per klik. |

De bronnen spreken elkaar tegen over de grootte van een klik (83 tegen 20 micron). Daarom rekent de engine niet met microns. Hij gebruikt de bronnen alleen als richtlijn: het advies blijft binnen klik 8–25 (de V60-bereiken uit beide bronnen, 11–22, met 3 klikken marge; een aanname) en leert het effect van een klik uit jouw zetsels.

## Wat de eigen data nu zegt

Op de back-up (aantallen): 17 zetsels met 'bed droog' en klik. Gemiddelde doorloop na de laatste giet 73 s bij klik 16 (n = 10) en 79 s bij klik 17 (n = 7); de spreiding van ln(doorloop) is 0,23 over 240, 300 en 350 g water. Het klikeffect is daarin nog niet los te zien, omdat er maar twee naburige standen zijn. De proeven uit het meetplan (07) maken dat zichtbaar: 3 klikken verschil, 5 koppen per stand.

## Meetopstelling

Acht werelden (200 herhalingen, 8 zakken × 10 koppen, Kasuya: laatste giet op 160 s, band 170–250 s, doel 210 s). Vier strategieën: een vaste klik 16, 'zelf één klik bijsturen' (een klik grover als het te laat is, fijner als het te vroeg is), Engine 3, en een orakel dat de molen kent. De werelden testen ook wat er gebeurt als de aanname fout is: trager of sneller dan gedacht, een flauwer of steiler klikeffect, zakken die veel verschillen, veel ruis en drift.

| Wereld | Strategie | Op tijd | Dichtbij doel (±20 s) | Koppen tot eerste op tijd | Op tijd, 2e helft | Klikstap |
|---|---|---|---|---|---|---|
| basis | vaste klik 16 | 77 % | 29 % | 1.4 | 77 % | 0.00 |
| basis | één klik bijsturen (zelf doen) | 96 % | 75 % | 1.1 | 97 % | 0.04 |
| basis | Engine 3 (tijd en molen) | 100 % | 96 % | 1.0 | 100 % | 0.00 |
| basis | orakel (kent de molen) | 100 % | 98 % | 1.0 | 100 % | 0.00 |
| trager dan gedacht | vaste klik 16 | 15 % | 1 % | 6.4 | 15 % | 0.00 |
| trager dan gedacht | één klik bijsturen (zelf doen) | 93 % | 71 % | 1.3 | 96 % | 0.08 |
| trager dan gedacht | Engine 3 (tijd en molen) | 99 % | 91 % | 1.0 | 99 % | 0.05 |
| trager dan gedacht | orakel (kent de molen) | 100 % | 98 % | 1.0 | 100 % | 0.00 |
| sneller dan gedacht | vaste klik 16 | 99 % | 89 % | 1.0 | 99 % | 0.00 |
| sneller dan gedacht | één klik bijsturen (zelf doen) | 99 % | 91 % | 1.0 | 99 % | 0.01 |
| sneller dan gedacht | Engine 3 (tijd en molen) | 100 % | 85 % | 1.0 | 100 % | 0.04 |
| sneller dan gedacht | orakel (kent de molen) | 100 % | 98 % | 1.0 | 100 % | 0.00 |
| flauw klikeffect (−7 %) | vaste klik 16 | 77 % | 29 % | 1.4 | 77 % | 0.00 |
| flauw klikeffect (−7 %) | één klik bijsturen (zelf doen) | 95 % | 68 % | 1.1 | 96 % | 0.05 |
| flauw klikeffect (−7 %) | Engine 3 (tijd en molen) | 99 % | 88 % | 1.0 | 99 % | 0.02 |
| flauw klikeffect (−7 %) | orakel (kent de molen) | 100 % | 98 % | 1.0 | 100 % | 0.00 |
| steil klikeffect (−16 %) | vaste klik 16 | 77 % | 29 % | 1.4 | 77 % | 0.00 |
| steil klikeffect (−16 %) | één klik bijsturen (zelf doen) | 97 % | 80 % | 1.1 | 98 % | 0.03 |
| steil klikeffect (−16 %) | Engine 3 (tijd en molen) | 100 % | 91 % | 1.0 | 100 % | 0.01 |
| steil klikeffect (−16 %) | orakel (kent de molen) | 100 % | 97 % | 1.0 | 100 % | 0.00 |
| zakken verschillen veel | vaste klik 16 | 68 % | 36 % | 2.3 | 68 % | 0.00 |
| zakken verschillen veel | één klik bijsturen (zelf doen) | 95 % | 73 % | 1.2 | 97 % | 0.06 |
| zakken verschillen veel | Engine 3 (tijd en molen) | 99 % | 85 % | 1.0 | 99 % | 0.05 |
| zakken verschillen veel | orakel (kent de molen) | 100 % | 97 % | 1.0 | 100 % | 0.00 |
| veel ruis | vaste klik 16 | 70 % | 34 % | 1.5 | 70 % | 0.00 |
| veel ruis | één klik bijsturen (zelf doen) | 95 % | 78 % | 1.1 | 96 % | 0.05 |
| veel ruis | Engine 3 (tijd en molen) | 99 % | 88 % | 1.0 | 99 % | 0.01 |
| veel ruis | orakel (kent de molen) | 99 % | 89 % | 1.0 | 99 % | 0.00 |
| drift (−0,4 % per kop) | vaste klik 16 | 92 % | 59 % | 1.1 | 92 % | 0.00 |
| drift (−0,4 % per kop) | één klik bijsturen (zelf doen) | 98 % | 83 % | 1.1 | 98 % | 0.03 |
| drift (−0,4 % per kop) | Engine 3 (tijd en molen) | 100 % | 92 % | 1.0 | 100 % | 0.00 |
| drift (−0,4 % per kop) | orakel (kent de molen) | 100 % | 98 % | 1.0 | 100 % | 0.03 |

## Poort

- **Op tijd:** Engine 3 haalt in alle werelden minstens 99 % (de eis in de test is 95 %) en is nergens slechter dan een vaste klik.
- **Rust:** de klik verandert gemiddeld minder dan 0,1 klik tussen twee koppen van dezelfde zak.
- **Eerlijke kanttekening:** 'dichtbij het doel' is in de wereld 'sneller dan gedacht' lager dan bij de vaste klik, omdat die vaste klik daar toevallig precies goed zit. Op tijd is Engine 3 daar wel 100 %.
- **Aandachtspunt:** deze werelden volgen het molenmodel uit punt 4; dat is nog niet met jouw tikken getoetst. De proeven uit het meetplan moeten dat doen.
