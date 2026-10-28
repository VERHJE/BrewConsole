# Engine 2 (e2-2026.1)

Engine 2 zet je **sterkte** (de dosis) en je **verwachte einde**. Na het proeven geeft hij **advies** volgens een hendeltabel.

- De techniek (gietschema, temperatuur, maling) komt uit de bestaande engine. Die blijft ongewijzigd en rekent mee ter vergelijking.
- Engine 2 staat standaard aan. Uitzetten kan in **Instellingen → Rekenkern** (localStorage `brewconsole_engine2 = '0'`).
- De code staat in `brewconsole_v2_2.html`, in het blok `ENGINE 2`, direct na `recomputeRecipeForRecord()`. De tests staan in `tests/engine2.test.mjs`.

## 1. Massabalans

```
EY = TDS/(1−TDS) · (W/D − R_abs)          (Guinard e.a. 2023, J. Food Sci. 88(5))
W/D = EY·(1−TDS)/TDS + R_abs
```

- **R_abs (vastgehouden water).** Standaard 2,1 g/g, voor filter, uit dezelfde bron. Heb je minstens 5 gewogen koppen (V10), dan gebruikt Engine 2 je eigen waarde. `measuredRetention()` meet (water − kop)/dosis; omdat de kop ook de opgeloste koffie bevat, is het vastgehouden water die waarde plus de extractie.
- **EY.** Nominaal 0,20. Engine 2 rekent heen (kop → TDS) en terug (doel → dosis) met dezelfde waarde, dus die valt weg in de dosis. Alleen de getoonde TDS-procenten hangen ervan af.

## 2. Persoonlijke sterkte

### Waarnemingen
Elke geproefde kop met een sterkte-antwoord, over alle zakken en brewers heen.
- **Antwoorden:** `much_too_weak` … `much_too_strong` worden −2 … +2.
- **TDS van de kop:** uit de werkelijke dosis (anders de geplande) en het water.
- **Half meetellen:** laat geproefde koppen en bypass-koppen tellen half mee.

### Model
Het sterkte-antwoord is ordinaal-probit:

```
latent = B · ln(TDS_kop / TDS_doel) + ε,   ε ~ N(0; 0,70)
drempels ±0,5 en ±1,5
```

- **Ruis 0,70:** eigen analyse van de UC Davis-dataset (Cotter, Ristenpart & Guinard, Dryad doi:10.25338/B8993H, CC0; 118 personen, 3.186 proeverijen).
- **Helling B (hoe scherp je proeft):** niet vast. Engine 2 middelt over B ∈ {1,61; 3; 5; 8; 12}, gewogen naar hoe goed elke helling je antwoorden verklaart.
  - 1,61 is de consumentenhelling uit de dataset.
  - Met alleen die helling zou de engine een scherpe proever een te lichte kop adviseren.

### Rekenen
- **Rooster:** ln TDS van 0,80 tot 1,90 % in stappen van 0,005.
- **Prior:** normaal rond de TDS van je eerste geproefde kop, met een SD van 0,25 (log).
- **Vergeten:** elke nieuwe kop dempt de eerdere bewijskracht met een factor 0,5^(1/30). Een kop van 30 koppen geleden telt dus half.

## 3. Beslisregel

De regel wordt over al je koppen afgespeeld en is deterministisch:
- **Start:** het doel begint bij de TDS van je eerste geproefde kop.
- **Wanneer het doel verschuift:** na elke kop berekent Engine 2 de kans dat het doel minstens een halve stap (4 %) lichter of sterker ligt. Haalt die kans de drempel, dan verschuift het doel naar de mediaan van de posterior.
  - Per kop maximaal 2 halve stappen.
  - Bij de eerste twee koppen maximaal 1.
- **Drempel:**
  - 0,70 zolang je zoekt;
  - 0,85 in rust.
- **Rust:** de laatste drie koppen op het doel waren "goed" en de posterior-SD is kleiner dan 0,12.
- **Zonder koppen:** het doel is het recept van de bestaande engine.

Uit een simulatie met het ruismodel uit de dataset: deze regel is even nauwkeurig als stappen op elk los oordeel, met ±70 % minder receptwijzigingen. De strengere drempel in rust voorkomt dat een goed recept wegdrijft.

## 4. Tijdmodel

Per brewer en techniek, zonder bypass, vergelijkt Engine 2 Bed droog met het verwachte einde van de bestaande engine (`plan.inputs.e2.baseTotalSec`, anders `plan.expectedDrainEndSec`).
- **Wat het oplevert:** de mediaan van de laatste 10 verhoudingen schaalt het verwachte einde.
- **Wanneer:** pas vanaf 3 koppen, en alleen als de factor tussen 0,7 en 1,5 ligt.
- **Wat het verandert:** alleen het einde verschuift (de laatste "klaar"-stap); de giet-momenten blijven staan. Na de laatste giet moet er minstens 15 s over zijn.

## 5. Hendeltabel (na het proeven)

De sterkte regelt de posterior. Voor de rest gelden de regels hieronder, afgeleid uit de UC Davis-data (binnen persoon) en uit R01–R03.

| Klacht | Advies | Soort |
|---|---|---|
| Droog of wrang | gieten, kanaal, filter spoelen | controle |
| Bitter bij een goede sterkte | één keer −4 % in plaats van grover | proef (E7) |
| Scherp zuur bij een goede sterkte | één klik fijner **en** iets minder koffie (berekend, zodat de sterkte gelijk blijft) | proef (E9) |
| Zoetheid gemist | één keer −4 % (zoet volgt een lichtere kop, niet fijner malen) | proef (E8) |
| Fruit gemist / body gemist | −4 % / +4 % | proef |

Bij een sterkteklacht geeft Engine 2 geen extra smaaktip: dat lost de sterkte zelf op.

## 6. Wat er in de app verandert als Engine 2 aan staat

- **Receptscherm:**
  - de Engine 2-kaart toont je sterkte, de band, hoe zeker die is, het verwachte einde en wat de oude engine zou zetten;
  - de sterkteknoppen zijn een handmatige afwijking voor één kop; ook die kop telt mee.
- **Oude stappen per zak:** de sterkte uit "Zet opnieuw" en klaargezette dosisstappen van de oude engine gelden niet. Engine 2 leert over al je zakken samen. Maalstappen blijven gelden, want dat is proces.
- **Advies na het proeven:** het Engine 2-paneel vervangt het oude advies. Het oude advies wordt nog wel berekend en bewaard, en staat ter vergelijking onder het paneel.
- **Record:** elke kop bewaart `plan.inputs.e2` (versie, dosis, eindtijd, basiseindtijd, doel, modus, n). Daarmee valt het recept na herladen exact terug te rekenen, en blijft het tijdmodel eerlijk.

## 7. Nog niet in deze versie

- Blinde A/B-paren als hoofdsignaal (Thurstone). De A/B-proef werkt wel, relatief tot Engine 2.
- De karakter-as als automatische stap. Nu is die er alleen als tip, omdat de EY per klik zonder refractometer een aanname is.
- Bypass als automatische route naar een lage sterkte onder de dosisgrens. Nu meldt Engine 2 de grens.
- Een kleine smaakafwijking per zak.
