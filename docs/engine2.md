# Engine 2 (e2-2026.4)

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
- **EY.** Nominaal 0,20; vanaf 3 refractometermetingen per brewer je eigen gemiddelde (§8). Engine 2 rekent heen (kop → TDS) en terug (doel → dosis) met dezelfde waarde, dus die valt weg in de dosis. Alleen de getoonde TDS-procenten hangen ervan af.

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
- **Record:** elke kop bewaart `plan.inputs.e2` (versie, dosis, eindtijd, basiseindtijd, doel, modus, n, R_abs, EY, verdunning, en een tipproef als die meeging). Daarmee valt het recept na herladen exact terug te rekenen, en blijft het tijdmodel eerlijk.

## 7. e2-2026.2: blinde paren, afwijking per zak, verdunnen, maling

### 7.1 Blinde paren als sterkste signaal
Elke afgeronde A/B-proef met twee doses is een blind paar. Dat geldt ook voor de oudere "helder"-proeven.
- **Kop A en kop B:** kop A is het recept, kop B de variant.
- **Model (Thurstone):**

  ```
  U(s) = −k·(s − doel)²/W²,  W = 0,17 (ln TDS),  k = 1,35 als s > doel (te sterk), 0,75 als s < doel
  verschil d = U(A) − U(B) + N(0; 1);   A als d > 0,3,  B als d < −0,3,  anders "geen verschil"
  ```

  - **W [aanname].** Gekozen zodat iemand met zijn doel precies op kop A bij 15 % verschil in ±75 % van de gevallen A kiest, en bij 8 % verschil in ±58 %.
  - **k.** De verhouding 1,8 komt uit de UC Davis-dataset: te sterk kost meer dan te slap.
- **In de berekening:** een paar telt mee in dezelfde rooster-posterior en dezelfde beslisregel als de sterktevraag. Het hangt niet af van de helling.
- **Rust:** een gewonnen paar op het doel telt als "goed".
- **Kalibratiepaar:**
  - **Wanneer:** zolang de onzekerheid groter is dan ±10 %, en er minstens 2 koppen zijn.
  - **Wat:** Engine 2 stelt onder "Meer voor deze kop" een blinde vergelijking voor. Kop A is je recept; kop B ligt ±15 % ernaast zolang de onzekerheid groter is dan ±12 %, daarna ±8 %.
  - **Richting:** kop B ligt aan de kant waar Engine 2 het minst zeker van is.
  - **Na afloop:** de uitslag gaat direct de posterior in.
  - **Oude proef:** de "helder"-proef van de oude engine verschijnt onder Engine 2 niet meer.

### 7.2 Rust
Engine 2 komt in rust bij drie keer "goed" op het doel, een onzekerheid kleiner dan ±12 %, **én** een doel dat binnen een kwart stap van het midden van de schatting ligt. Wijkt dat midden later meer af, dan zoekt Engine 2 weer met drempel 0,70.

### 7.3 Afwijking per zak
Je persoonlijke doel komt uit al je koppen. Per zak geldt een kleine, terughoudende afwijking:
- prior N(0; 0,05) in ln TDS;
- pas vanaf 3 koppen van die zak;
- alleen bij 70 % kans op minstens een halve stap;
- hooguit twee halve stappen.

### 7.4 Lichter dan de dosisgrens
Ligt je doel onder de dosisgrens van de brewer, dan zet Engine 2 op de grens en geeft hij een tegel "+X g heet water na het zetten":

```
X = M_b · (TDS_nu / TDS_doel − 1),   M_b = W − R_abs·D + EY·D
```

- **Waarom gelijkwaardig:** zelfde TDS en extractie als een zetting met meer water (Guinard e.a. 2023).
- **Wanneer niet:** niet bij bypass.
- **Record:** `plan.inputs.e2.dilutionG`. Bij het leren telt de kop met de verdunde TDS mee.

### 7.5 Maling en doorloop
Engine 2 schat met kleinste kwadraten wat één klik doet: ln(Bed droog / schema) tegen de klik, over je laatste 20 koppen met een ingevulde klik.
- **Wanneer bekend:** vanaf 6 koppen met minstens twee standen van elk 2 koppen, en alleen als het effect groter is dan 2× de standaardfout.
- **Wat de kaart dan zegt:** hoeveel klikken je naar de schematijd brengen.
  - Dat is een procesadvies, niet voor de sterkte.
  - Alleen bij meer dan 12 % afwijking, en maximaal 4 klikken.
- **Zolang het effect onbekend is:** de kaart stelt een kleine proef voor (3 koppen, 2 klikken grover).

## 8. e2-2026.3: gemeten TDS, tips als proef, meetlat

### 8.1 Gemeten TDS (refractometer)
Onder **Meer meten** in het logformulier staat een optioneel veld **TDS gemeten** (`actual.tdsPct`).
- **Geldig:** 0,4–2,5 %. Een andere waarde (bijv. 13,8 in plaats van 1,38) is een tikfout en wordt niet opgeslagen.
- **Als sterkte:** een gemeten kop telt in de posterior met de gemeten TDS in plaats van de berekende. Een verdunde kop is al gemeten na het bijvullen, dus daar komt geen correctie meer op.
- **Extractie per kop:**

  ```
  met kopgewicht:   EY = TDS · kop / dosis                    (exact)
  zonder:           EY = TDS/(1−TDS) · (W_totaal/D − R_abs)   (massabalans)
  ```

  Alleen waarden tussen 10 en 30 % tellen.
- **Jouw extractie:** het gemiddelde van de laatste 20 metingen per brewer (`e2EyModel()`). Vanaf 3 metingen rekent Engine 2 voor die brewer met jouw EY in plaats van 20 % (`e2EyFor()`), heen én terug. De dosis blijft daardoor dezelfde bij dezelfde antwoorden; alleen een gemeten kop voegt echt informatie toe.
- **Extractie per klik:** kleinste kwadraten van EY tegen de klik, vanaf 4 metingen met minstens twee standen van elk 2, en alleen bij een effect groter dan 2× de standaardfout.
- **In het advies:** het paneel toont de gemeten TDS en extractie van de kop.

### 8.2 Karakter: de scherp-zuur-tip met je eigen getal
De tip "één klik fijner en iets minder koffie" rekende met een aangenomen +1 %-punt extractie per klik. Is je eigen extractie per klik bekend (§8.1), dan rekent hij daarmee, en zegt hij dat erbij. De dosiscorrectie houdt de TDS gelijk:

```
D₂ = W / ratio(TDS_nu, R_abs, EY + ΔEY_klik)
```

De karakter-as blijft een proef, geen automatische stap.

### 8.3 Tips als proef
Elke proeftip uit de hendeltabel (§5) heeft een knop **Probeer bij je volgende kop**.
- **Wat er klaarstaat:** één proef tegelijk (localStorage `brewconsole_e2_trial`): de sterkte (−4 % of +4 %) en bij scherp zuur ook één klik fijner dan de kop van de tip.
- **Receptscherm:** de proef staat een keer per sessie ingesteld, alleen op dezelfde brewer, met een eigen melding en **Toch niet** (zet sterkte en maling terug). De maaltegel zegt "proef".
- **Bij Start:** gaat de proef mee in `plan.inputs.e2.trial` en is hij op. Verander je zelf de sterkte, dan is het geen proef meer en gaat hij niet mee.
- **Uitkomst:** het antwoord op "Vergeleken met je vorige kop" (`tasting.vsLast`).
- **Wat de proef niet doet:** de sterkte van de proefkop telt gewoon mee in de posterior, net als een handmatige afwijking. Leren van de uitkomst gebeurt nog niet automatisch; de meetlat telt.

### 8.4 Meetlat (Statistieken)
Onder **Jouw metingen** staat **Engine 2 · meetlat** (`e2Meetlat()`):
- over de laatste 10 geproefde koppen: hoe vaak Engine 2 je sterkte veranderde, tegen hoe vaak de oude engine een stap voorstelde;
- hoe vaak de sterkte goed was;
- de zekerheid (±%), rust of zoeken, en het aantal blinde paren;
- per proeftip: geprobeerd, beter, gelijk, slechter;
- per brewer de gemeten extractie.

Doel: minder wijzigingen bij evenveel goede koppen.

### 8.5 Home
De kaart **Je volgende kop** heeft een regel "Engine 2 · jouw sterkte 1:x · je zit goed / zoekt nog", plus een klaargezette proef voor die brewer.

## 9. e2-2026.4: leren van proeven, doorloop per zak, processignaal, meetlat

### 9.1 Leren van je proeven
Per proeftip telt Engine 2 de uitkomsten (`e2TrialOutcomes()`, uit `plan.inputs.e2.trial` en `tasting.vsLast`).
- **Werkt bij jou:** minstens 2× beter, en vaker beter dan slechter. De tip staat voorop, met de telling.
- **Werkt bij jou niet:** minstens 2× slechter, en vaker slechter dan beter. De tip blijft zichtbaar met de telling, maar zonder knop: Engine 2 zet hem niet meer klaar.
- **Anders:** de tip blijft zoals hij was, met "tot nu toe" en de telling.
- **Waarom zo weinig:** het gaat alleen om wat Engine 2 klaarzet, nooit om je recept. Een drempel van 2 [aanname] houdt de lijst eerlijk zonder dat één slechte kop een tip wegneemt.

### 9.2 Doorloop per zak en per klik
`e2TimeModel(store, method, technique, { beanId, plannedClick })`:
- **Per zak alleen het niveau** (ontwerp §4.3): vanaf 2 koppen van die zak

  ```
  ln f_zak = (n·gem. ln(Bed droog/schema)_zak + 3·ln f_brewer) / (n + 3)
  ```

  Het gewicht 3 is een aanname: een zak moet het met een paar koppen laten zien.
- **Per klik:** is het effect van één klik bekend (§7.5), en maal je anders dan het gemiddelde van je recente koppen, dan schuift het verwachte einde mee (`exp(b·Δklik)`, hooguit 4 klikken). De maalstand komt van het receptscherm, ook als een proef een klik fijner zet.
- **Grenzen:** het verwachte einde blijft tussen 0,6× en 1,7× het schema.

### 9.3 Doorloop als processignaal
Wijkt Bed droog meer dan 20 % af van het verwachte einde **dat bij het zetten gold** (`plan.inputs.e2.totalTimeSec`), en meer dan 3× je gewone spreiding, dan geeft het advies een controle:
- **langzamer:** verstopping: fijnstof, een te fijne stand of een dichtgeslagen filter;
- **sneller:** kanaalvorming of een te grove stand.

Je sterkte verandert hier niet door. Zonder persoonlijk verwacht einde (minder dan 3 koppen met Bed droog) geeft Engine 2 dit signaal niet; tegen het schema zou het bij jou elke kop afgaan.

### 9.4 Meetlat, aangevuld (ontwerp §9)
- wijzigingen per 10 koppen, tegen het doel van hooguit 2;
- "lekker" (4 of 5) over je laatste 10 koppen met een waardering;
- per zak hoeveel koppen tot de eerste lekkere (mediaan, en hoeveel zakken nog zonder);
- bij de proeven het oordeel uit §9.1.

### 9.5 Wat de data afraden: waardering als signaal voor je sterkte
In de UC Davis-data verschilt de waardering tussen de beste en de slechtste sterkte maar ±0,3 punt (9-puntsschaal), tegen een ruis binnen een persoon van 1,56. Eén waardering zegt dus vrijwel niets over je sterkte; de sterktevraag en blinde paren wel. De waardering telt daarom alleen in de meetlat, niet in de posterior.

## 10. Nog niet in deze versie
- **De karakter-as als automatische stap.** Ook met een refractometer blijft het een tip: de smaakkant (scherp zuur) is per persoon.
- **Chemex-templates met een eigen bron.**
