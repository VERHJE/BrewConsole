# Onderzoek — maalgraad × hoeveelheid, dosis × volume, en de bypass-methode

*Status: onderzocht. **BP-A, BP-B en BP-C zijn gebouwd** (zie §6); G-1, BP-D en BP-E niet. Geen receptgetal veranderd.*
*Datum: 29 september 2026. Vervolg op `onderzoek_D2_D4.md`.*

---

## 0. De drie antwoorden

1. **Moet de maalgraad mee met de hoeveelheid koffie?** Ja, qua richting: meer koffie betekent grover, minder koffie fijner. Alle bronnen zijn het daarover eens. Maar **wat telt is de beddiepte, niet het aantal grammen**. In een kegel groeit de beddiepte veel trager dan de dosis (met de derdemachtswortel). Binnen de normale V60-range (15–22 g) is het effect daarom klein: in de orde van een halve tot anderhalve klik, en daarvoor bestaat geen betrouwbaar getal. Bij de Chemex (17 g tegen 49 g) is het effect duidelijk groter.
2. **Hoort de dosis lineair mee te gaan met het volume?** **Ja.** De ratio bepaalt de sterkte. Het water dat in het bed achterblijft (≈ 2 g per g koffie) schaalt lineair mee, en alle referentierecepten houden hun ratio gelijk bij groter en kleiner (Hoffmann 1:16,7 bij zowel 15 als 30 g). Waar een groter bed iets anders extraheert, corrigeer je dat met de **maling**, niet met de dosis.
3. **Bypass:** de app doet het anders dan de bron waarop hij gebaseerd is. De bron (Drip Roast) gebruikt **meer koffie** en eindigt op 1:13–1:15. De app houdt dezelfde dosis als zonder bypass en eindigt op ≈ 1:17,4. Omdat er minder water door het bed gaat, daalt de extractie en wordt de kop in de app **meetbaar lichter** dan zonder bypass. Daarnaast: de vergelijking met je vorige kop, en daarmee de advies-poort, **haalt bypass- en gewone koppen door elkaar**. Voorstellen in §3.6.

---

## 1. Moet de maalgraad mee met de hoeveelheid koffie?

### 1.1 Bronnen

| Bron | Uitspraak | Soort |
|---|---|---|
| Barista Hustle, *P 3.02 Bed Depth* | Bedhoogte ~2,5–5 cm. Ondieper geeft meer kans op channeling, dieper een te trage contacttijd. "As a rule, the deeper the bed, the coarser you will need to grind." Bij grotere batches liever een bredere dan een hogere filter. | Opleiding (B/C) |
| Jonathan Gagné, *The Importance of Bed Depth* (2025) | Met een andere dosis maar **dezelfde beddiepte** krijg je vergelijkbare tijd, TDS en extractie. Een dieper bed is vergevingsgezinder en geeft meer body en zoetheid. "As bed depth increases so should the grind size." | Natuurkundige met metingen (B) |
| Scott Rao, dosis en ratio (2020) + *Bed depth* (2025) | V60 15–22 g ≈ 5–6 cm. Kleinere doses vragen fijner malen. Ondiepe bedden zijn gevoeliger voor astringentie. | Expert (C) |
| Scott Rao, *No-bypass lessons* | Is het bed te diep (> ~5 cm), dan is het beter om water langs het bed te sturen dan zo grof te malen dat al het water er op tijd doorheen kan. | Expert (C) |
| James Hoffmann, 1-kops V60 | Een ondiep bed loopt sneller door, dus fijner malen voor dezelfde sterkte. | Praktijk (B/C) |
| Blue Bottle, grote batches | 8-kops Chemex: "microadjustments" grover, dan loopt hij in 4–5 min. | Praktijk (C) |
| Coffee Chronicler, batch brew | Bed 3–5 cm; grotere batches iets grover dan je denkt. | Praktijk (C) |

**Conclusie over de richting:** eensgezind, in totaal zeven onafhankelijke bronnen. **Over de grootte:** geen enkele bron geeft een getal.

### 1.2 Een eigen schatting van de grootte (model, geen meting)

Dit rekenwerk is bedoeld om te begrijpen hoe groot het effect is, niet om in de app te zetten.

- **Beddiepte in een kegel:** diepte ∝ dosis^(1/3). V60 15 → 22 g geeft +14 % dieper (5 → 5,7 cm, klopt met Rao). Chemex 17 → 49 g geeft +42 % dieper.
- **Doorlooptijd bij gelijke maling** (Darcy-stroming door een poreus bed, kegelvorm): tijd ∝ dosis^α.
  - α ligt tussen 1/3 (de waterkolom boven het bed groeit mee) en 2/3 (de waterkolom blijft laag, bij pulsgieten).
  - Toets met de Chemex-referenties: 30 → 50 g geeft ×1,19 tot ×1,41 voorspeld en ×1,28 gemeten (4:30 → 5:45). Dat klopt.
- **Maling nodig voor dezelfde tijd:** de doorlaatbaarheid van een bed groeit ongeveer met het kwadraat van de deeltjesgrootte (Kozeny-Carman). Daaruit volgt: deeltjesgrootte ∝ dosis^(α/2), dus per **verdubbeling van de dosis 12–26 % grover**.
  - V60 15 → 22 g: **7–14 % grover**.
  - Chemex 17 → 49 g: **19–42 % grover**.

**Waarom dit geen klikgetal wordt:**
- Voor de Timemore C3S Pro is geen betrouwbare relatie tussen klikken en deeltjesgrootte bekend. De 83,3 µm per klik is bewust als "alleen mechanisch" gelabeld, en maalspleet is niet hetzelfde als deeltjesgrootte.
- Het model gaat uit van een gelijke doorlooptijd, terwijl de praktijk bij grotere brouwsels juist een langere tijd accepteert (Hoffmann 3:00 → 3:30; Chemex 4–6 min). Een deel van het effect vang je dus op met tijd in plaats van maling.

Grove orde van grootte: **binnen 15–22 g op de V60 ongeveer een halve tot anderhalve klik; tussen een kleine en een volle Chemex meerdere stappen.**

### 1.3 Wat betekent dit voor de app?

- Wat er nu staat is passend:
  - dezelfde startklik;
  - de richting-hints bij kleine en grote brouwsels (D4-2);
  - het persoonlijke leren dat alleen koppen van vergelijkbare grootte middelt (±40 %, C-3).
- Het getal voor **jouw** molen en **jouw** gewoonte kan alleen uit je eigen logboek komen, en dat doet de volumeband al.
- **Optie G-1:** een automatische klik grover of fijner, alleen aan de uitersten (Chemex ≤ 25 g of > 42 g). Mijn advies: pas overwegen na de advies-poort. Het is dezelfde soort beslissing als BC-11, maar zonder bron die een getal geeft.
- **Kanttekening voor de V60 op 15 g:** daar geldt al de BC-11-regel ("kort schema, 1 klik fijner") voor korte schema's. Een tweede automatische klik fijner erbovenop zou onderbouwing missen.

---

## 2. Hoort de dosis lineair mee te gaan met het volume?

### 2.1 Bronnen

| Bron | Uitspraak | Soort |
|---|---|---|
| Liang, Chan & Ristenpart, *Scientific Reports* (2021) | Bij immersie is TDS ≈ omgekeerd evenredig met de ratio, en is de extractie **onafhankelijk van de ratio** (≈ 21 % over een breed bereik). Het evenwicht is ongevoelig voor maalgraad, branding en temperatuur (80–99 °C). | Peer-reviewed (A voor immersie; voor percolatie indirect) |
| Hoffmann | 15 g / 250 g en 30 g / 500 g: **dezelfde 1:16,7** bij 1 en 2 koppen. | Praktijk (B/C) |
| Chemex-referenties | 42 g / 680 g (1:16,2) en 50 g / 800 g (1:16): de ratio blijft vrijwel gelijk. | Praktijk (C) |
| Batch brew (Coffee Chronicler, Barista Hustle) | 16–18:1 bij elke batchgrootte; grotere batches corrigeren via de maling en bedvorm. | Praktijk (C) |
| Gagné, filtertest | Een V60-filter houdt ~5,6 g water vast: een vaste kleine post, onafhankelijk van de dosis. | Meting (B) |

### 2.2 Analyse

- **De hoofdlijn is lineair.** De ratio zet de sterkte. Het water dat in het bed blijft (≈ 2 g/g, in de app `LIQUID_RETAINED_RATIO`) is ook lineair, dus de verhouding tussen ingegoten water en kopje blijft gelijk.
- **Wat niet lineair is:**
  - **Een dieper bed extraheert iets meer bij dezelfde maling**, doordat het water er langer over doet. Bij een gelijke ratio wordt een grotere kop dan iets sterker en iets verder geëxtraheerd. Alle bronnen corrigeren dat met de **maling** (en wat tijd), niet met minder koffie per ml. Met de dosis corrigeren zou de sterkte verlagen om een extractie-effect te dempen; dat zijn twee verschillende dingen.
  - **Vaste verliezen:** het filter houdt ~5–6 g water vast. Bij 250 ml is dat ~2 %, bij 500 ml ~1 %. Een kleine kop levert daardoor iets minder op, maar de concentratie verandert er niet door (wat het filter vasthoudt, heeft dezelfde samenstelling als je kop). Geen reden om de dosis te veranderen.
- **Uitzondering: bypass.** Daar verandert de verhouding tussen water door het bed en water in de kop, zie §3.

**Conclusie:** de dosis blijft lineair met het volume. De app doet dat al. Geen wijziging.

---

## 3. De bypass-methode: meer advies en sturing

### 3.1 Wat bypass is (twee verschillende dingen)

1. **Batch-bypass (bedrijfsmatig):** Fetco, Bunn en Curtis hebben een klep die een deel van het water langs het filter stuurt. Doel: grote batches zonder overloop, overextractie of heel lange brouwtijden (DCN-gids). Rao: bij een te diep bed beter bypass dan extreem grof malen.
2. **Concentraat + verdunnen (smaaktechniek):** sterk zetten (bron: 1:10–1:13) en daarna heet water toevoegen. Volgens de theorie komen de gewenste smaken vroeg in de extractie vrij, en laat je zo zware, bittere stoffen achter (DCN, Perfect Daily Grind, Drip Roast). Dit is wat de app aanbiedt.

**Bewijsniveau:** praktijk en blogs. Er is geen gecontroleerde smaakstudie voor pourover-bypass gevonden. De experimenteel-kaart in de app zegt dat al terecht ("vertrouwen: laag").

### 3.2 Hoe de app het nu doet (doorgerekend, V60 300 ml, medium)

| Bypass | Dosis | Door het bed | Bijschenken | Ratio in de brewer | Eindratio |
|---|---|---|---|---|---|
| uit | 17,3 g | 300 ml | — | 1:17,3 | 1:17,3 |
| 20 % | 17,3 g | 240 ml | 60 ml | 1:13,9 | 1:17,3 |
| 30 % | 17,3 g | 210 ml | 90 ml | 1:12,1 | 1:17,3 |
| 40 % | 17,3 g | 180 ml | 120 ml | 1:10,4 | 1:17,3 |
| 30 % + Sterkte +1 | 18,7 g | 210 ml | 90 ml | 1:11,2 | 1:16,0 |

**Vergelijking met de bron (Drip Roast):** 20 g op 200 g (1:10), plus 60–100 g bypass, geeft een eindratio van **1:13–1:15**. De bron zet dus **15–25 % meer koffie** in dan de app.

### 3.3 Wat dat met de sterkte doet (rekenvoorbeeld)

TDS = extractie × dosis / (totaal water − 2 × dosis). V60 300 ml:

| Extractie (EY) | 17,3 g (app, bypass) | 18,7 g (Sterkte +1) |
|---|---|---|
| 21 % | 1,37 % | 1,50 % |
| 20 % | 1,30 % | 1,42 % |
| 19 % | 1,24 % | 1,35 % |
| 18 % | 1,17 % | 1,28 % |

- Met minder water door het bed daalt de extractie. Hoeveel is niet gemeten; Gagné en DCN bevestigen alleen de richting.
- **Elk procentpunt minder extractie maakt de kop ~5 % lichter.**
- **Sterkte +1 (8 % meer koffie) compenseert ongeveer 1,5 procentpunt extractie.**

### 3.4 Maalrichting bij bypass: nog steeds omstreden

- **Fijner:** Drip Roast (fijne maling voor het concentraat), Gagné en Coffee ad Astra. Logica: met minder water moet elke gram sneller extraheren.
- **Grover:** Royal Coffee. In een eigen cupping (EK43, vier maalstanden, concentraat met 20 % bypass) scoorde **grof vrijwel overal hoger**; fijn gaf "onverwachte, meest ongewenste smaken".

Dit is niet op te lossen met bronnen. Het is wel op te lossen **met je eigen smaak**: te dun of zuur betekent fijner of sterker; bitter, scherp of drogend betekent grover. Dat is dezelfde regel als bij gewoon zetten, en de proefkaart vraagt precies dat.

### 3.5 Bevinding in de app: bypass en gewone koppen worden door elkaar vergeleken

- `findPreviousComparableBrew()` (de basis voor "beter/slechter dan vorige keer" en daarmee voor de advies-poort) zoekt alleen op dezelfde boon en hetzelfde toestel. Of er bypass was en hoeveel water het was, telt niet mee.
- `adviceOutcomeStats()` telt adviezen bij bypass-koppen gewoon mee in de poort.
- Het advies na een bypass-kop (maling of dosis) kan met "Gebruik voor volgende kop" op een kop zonder bypass terechtkomen.
- Het leren sluit bypass wel al uit (vervuilingsregel 4). De vergelijking en de poort doen dat niet.

**Waarom dit telt:** een bypass-kop is lichter. Wie na een gewone kop een bypass-kop zet, krijgt dus sneller "slechter". Dat vertroebelt precies de 20 geteste adviezen waarmee we willen bewijzen dat het advies werkt.

### 3.6 Voorstellen

| # | Voorstel | Verandert receptgetallen? | Advies |
|---|---|---|---|
| **BP-A** | **Concreet stappenplan op de bypass-kaart** (tekst): ① begin met 20 %; ② verwacht een iets lichtere kop dan zonder bypass; ③ te dun of zuur: eerst Sterkte +1, daarna 1 klik fijner; ④ bitter, scherp of drogend: 1 klik grover, of een lager percentage; ⑤ bijschenkwater heet uit dezelfde ketel; ⑥ zet dezelfde boon ook eens zonder bypass en vergelijk. Plus: wanneer proberen (donkere branding, funky naturals en anaerobe koffie, of als je gewone kop hard of drogend is). | Nee | **Ja** |
| **BP-B** | **Vergelijk alleen gelijke koppen:** bypass aan of uit (en het percentage) en volume binnen ±40 % moeten overeenkomen. Bypass-adviezen tellen **apart** en niet mee in de advies-poort. | Nee | **Ja**: beschermt de poort |
| **BP-C** | **Advies na een bypass-kop blijft bij bypass-koppen:** "Gebruik voor volgende kop" zet ook bypass en percentage terug, of zegt dat het advies voor een bypass-kop gold. | Nee | Ja, samen met BP-B |
| **BP-D** | Bij bypass **standaard Sterkte +1** (eindratio ≈ 1:16, dichter bij de bron). | **Ja** | Nog niet: eerst met BP-A zelf proeven of je kop te licht is |
| **BP-E** | Persoonlijk bypass-leermodel (Fase D uit het bypass-plan). | Nee | Later, na genoeg bypass-koppen |

---

## 4. Beslissingen die bij jou liggen

| # | Beslissing | Mijn advies | Verandert receptgetallen? |
|---|---|---|---|
| G-1 | Automatisch 1 klik grover of fijner aan de uitersten (Chemex ≤ 25 g / > 42 g) | Later, na de poort | Ja |
| D-lin | Dosis lineair met volume houden | **Ja** (is al zo) | Nee |
| BP-A | Stappenplan op de bypass-kaart | **Ja** | Nee |
| BP-B + BP-C | Alleen gelijke koppen vergelijken; bypass-adviezen apart | **Ja** | Nee |
| BP-D | Bij bypass standaard Sterkte +1 | Nog niet | Ja |
| BP-E | Persoonlijk bypass-model | Later | Nee |

BP-A, BP-B en BP-C zijn samen één kleine, goed testbare wijziging zonder receptverandering. BP-B maakt bovendien de advies-poort betrouwbaarder.

---

## 5. Bronnen

- Barista Hustle — [P 3.02 Bed Depth](https://www.baristahustle.com/lesson/p-3-02-bed-depth/)
- Jonathan Gagné — [The Importance of Bed Depth](https://coffeeadastra.com/2025/11/28/the-pulsar-mini-and-the-importance-of-bed-depth/) · [Four Rules of Optimal Coffee Percolation](https://coffeeadastra.com/2021/03/04/the-four-rules-of-optimal-coffee-percolation/) · [An In-Depth Analysis of Coffee Filters](https://coffeeadastra.com/2019/08/04/an-in-depth-analysis-of-coffee-filters-2/)
- Scott Rao — [What are the best dose and brewing ratio?](https://www.scottrao.com/blog/2020/2/4/how-to-choose-a-dose-and-brewing-ratio) · [Bed depth: why it matters](https://www.scottrao.com/blog/2025/11/11/bed-depth-why-it-matters) · [What I've learned from no-bypass brewing](https://www.scottrao.com/blog/no-bypass-lessons)
- Liang, Chan & Ristenpart — [An equilibrium desorption model for the strength and extraction yield of full immersion brewed coffee](https://www.nature.com/articles/s41598-021-85787-1), *Scientific Reports* 2021
- James Hoffmann via Hario USA — [1 Cup V60](https://www.hario-usa.com/blogs/recipes-and-more-from-friends/james-hoffmann-1-cup-v60-technique) · [Ultimate V60](https://www.hario-usa.com/blogs/recipes-and-more-from-friends/james-hoffmann-uitimate-v60-technique)
- Blue Bottle — [How to Brew Large Batches](https://blog.bluebottlecoffee.com/posts/how-to-brew-large-batches-of-coffee)
- Little Waves — [Chemex 6-cup brew guide](https://littlewaves.coffee/products/chemex-6-cup-coffee-dripper-brew-guide)
- The Coffee Chronicler — [Batch brew guide](https://coffeechronicler.com/batch-brew-guide/)
- Daily Coffee News — [The DCN Guide to Bypass in Coffee Brewing](https://dailycoffeenews.com/2023/06/08/the-dcn-guide-to-bypass-in-coffee-brewing/) (2023)
- Perfect Daily Grind — [Bypass coffee brewing: how can it improve extraction?](https://perfectdailygrind.com/2024/01/bypass-coffee-brewing-improving-extraction/) (2024)
- Royal Coffee — [Exploring Coffee Bypass Brew Techniques](https://royalcoffee.com/exploring-bypass/)
- Drip Roast — [7 Best V60 Recipes](https://www.driproast.com/best-v60-recipes/) (bypass-recept 20 g / 200 g + 60–100 g)

**Werkwijze en beperking:**
- De tabellen in §3.2 en §3.3 zijn uitgerekend met de app-code zelf (`computeRecipe`) en de standaardformule TDS = EY × dosis / (water − 2 × dosis).
- Het model in §1.2 is een eigen afleiding (Darcy/Kozeny-Carman), getoetst aan twee Chemex-referenties. Het is bedoeld voor orde-grootte-inzicht, niet voor een receptgetal.
- De bronnen kon ik vanuit deze omgeving alleen via zoekresultaten lezen, niet als volledige pagina. Vooral de Royal Coffee-cupping en het Drip Roast-recept zijn het nalezen waard voordat BP-D ter sprake komt.

---

## 6. Wat er gebouwd is (29 september 2026)

**BP-A: stappenplan op de bypass-kaart.** Een inklapbaar "Zo gebruik je het" in de bestaande experimenteel-kaart, met de zes stappen uit §3.6. Daarbij staat wanneer je bypass het meest probeert, en dat stappen bij bypass-koppen apart tellen. Alleen tekst.

**BP-B: alleen gelijke koppen vergelijken.**
- `isComparableSetup()`: gelijk betekent bypass aan of uit met hetzelfde percentage (een oud, onbekend percentage is alleen gelijk aan zichzelf), en water binnen ±40 %. Dat is dezelfde tolerantie als het leren (C-3).
- `findPreviousComparableBrew()` (de vraag "beter of slechter dan vorige keer?") slaat andere opzetten over.
- `adviceOutcomeStats()` houdt stappen bij bypass-koppen apart. Een stap die op een kop met een andere opzet getest is, krijgt `setupMismatch` en geen uitkomst. Geen van beide telt mee in de drempel voor fase 5.
- Het meetoverzicht meldt hoeveel stappen apart gehouden zijn.

**BP-C: een klaargezette stap onthoudt de opzet.**
- "Gebruik voor volgende kop" bewaart het bypass-percentage en het volume van de kop die de stap voorstelde.
- Bij de volgende kop met die boon zet de app bypass terug zoals het toen was.
- Zet je het toch anders, dan waarschuwt het receptscherm dat deze test dan niet meetelt.

**Tests** (641/641 groen):
- rekentests voor `isComparableSetup()`, de vergelijking en de apart-telling in de poort;
- Playwright voor het stappenplan en het terugzetten van bypass plus de waarschuwing (via "Brouw opnieuw").
