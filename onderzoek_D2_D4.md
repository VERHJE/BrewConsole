# Onderzoek D-2 en D-4 — dosisgrens V60 en schalen met de hoeveelheid water

*Status: onderzocht. **D2-1, D4-1 en D4-2 zijn gebouwd** (zie §6); D2-2, D2-3, D4-3 en D4-4 niet. Bestaande recepten zijn onveranderd (golden fixtures gelijk).*
*Datum: 29 september 2026. Hoort bij `bouwbesluiten_v4.md` (openstaande onderzoeksvragen D-2 en D-4).*

---

## 0. Samenvatting in vijf zinnen

1. **D-2:** de ondergrens van 15 g voor de V60-02 is niet te streng. Geen enkele bron gaat in de 02 onder de 15 g, en Rao raadt zelfs 20–22 g aan. **Het echte probleem zit elders.** De app kiest altijd het *midden* van het smaakdoelvenster (ratio ≈ 1:17,6). Daardoor weigert hij 250 ml, terwijl 15 g op 250 ml (Hoffmanns bekende 1-kopsrecept) **binnen het eigen doelvenster van de app** valt.
2. Als de app bij de randen van de dosisgrens een ratio kiest die nog steeds binnen het venster valt, wordt het V60-bereik **240–415 ml in plaats van 265–380 ml**. Alle recepten die nu al kunnen, blijven exact gelijk.
3. **D-4:** dat dosis en water lineair meeschalen is correct, want het doelvenster en de retentie (2 g water per g koffie) zijn lineair. **Niet lineair** zijn de beddiepte (groeit met de derdemachtswortel van de dosis), de doorlooptijd, de benodigde maalgraad en het warmteverlies. De app houdt maalstand, temperatuur en schematijd nu vast op één waarde, van 150 tot 850 ml.
4. Voor de *richting* van die effecten is het bewijs goed: groter betekent grover of langer, kleiner betekent fijner en warmer. Een betrouwbaar *getal* (hoeveel klikken per gram) bestaat nergens. Daarom stel ik voor om geen automatische klikverandering in te bouwen, maar de volumeafhankelijke eerlijkheid te verbeteren en het persoonlijke leren per volumeband (C-3, bestaat al) het getal te laten vinden.
5. Beslissingen die bij jou liggen staan in §4.

---

## 1. Wat de app nu doet (gemeten, niet aangenomen)

Recept doorgerekend met `computeRecipe()` op de huidige `main` (medium branding, klassiek, geen bypass):

| Toestel | Water | Dosis | Ratio | Maalstand | Temp | Schema | Opmerking |
|---|---|---|---|---|---|---|---|
| V60 | 150–260 ml | — | — | — | — | — | **geweigerd**: dosis < 15 g |
| V60 | 270 ml | 15,6 g | 1:17,4 | 16 | 94 °C | 3:30 | |
| V60 | 300 ml | 17,3 g | 1:17,4 | 16 | 94 °C | 3:30 | |
| V60 | 380 ml | 21,9 g | 1:17,4 | 16 | 94 °C | 3:30 | |
| V60 | 400–700 ml | — | — | — | — | — | **geweigerd**: dosis > 22 g |
| Chemex | 300 ml | 17,3 g | 1:17,4 | — | 94 °C | 4:07 | |
| Chemex | 500 ml | 28,8 g | 1:17,4 | — | 94 °C | 4:07 | |
| Chemex | 700 ml | 40,4 g | 1:17,4 | — | 94 °C | 4:07 | |

Wat opvalt:

- **V60 accepteert alleen 265–380 ml** (`engineValidVolumeRange`). Een gewone kop van 250 ml kan niet.
- **Alles behalve de dosis staat vast.** Maalstand, temperatuur, schemalengte en aantal gietbeurten zijn gelijk bij 270 en 380 ml (V60), en bij 300 en 700 ml (Chemex). De gietbeurten worden alleen groter.
- **Hoe de dosis ontstaat:** `buildCoreRecipe()` neemt 18,5 g (het midden van 15–22 g) × `batchSize`, en water = dosis × **het midden** van het ratiobereik uit het doelvenster. Daarna controleert `generateCandidates()` of de dosis binnen 15–22 g valt. Zo niet, dan komt er geen recept.
- **Chemex heeft geen dosisgrens** (research gap `G-CHEMEX-DOSE-CEILING-01`), dus schaalt hij onbegrensd lineair door tot 850 ml.

---

## 2. D-2 — Is 15 g te streng voor een enkele kop?

### 2.1 De oorspronkelijke vraag

> "Onderbouwt '~15–22 g / 5–6 cm bed' (V60_DOSE_CEILING) werkelijk een ONDERgrens, of is 15 g te streng voor een enkele kop op 250 ml? Zo nee: een gelabelde waarschuwing i.p.v. een blokkade." (`bouwbesluiten_v4.md`)

### 2.2 Bronnen

| Bron | Wat staat er | Soort bewijs |
|---|---|---|
| Scott Rao, *What are the best dose and brewing ratio?* (2020) | "A device such as a v60 generally brews best in a range of 15g—22g of coffee (5cm—6 cm.)" — dit is letterlijk de herkomst van `V60_DOSE_CEILING`. | Expert-vuistregel (C) |
| Scott Rao (herhaald in meerdere samenvattingen) | Raadt in de 02 af om ver onder 20–22 g te gaan: kleinere doses vragen een fijnere maling (meer fijne deeltjes, meer bitterheid) en de gemiddelde extractietemperatuur is lager bij kleine brouwsels. | Expert-mening met mechanisme (C) |
| Scott Rao, *Bed depth: why it matters* (nov. 2025) | Kanaaltjes die de bodem van het bed halen voeren samentrekkende (astringente) stoffen mee; in een ondiep bed halen meer kanaaltjes de bodem. **Ondiepe bedden zijn gevoeliger voor astringentie.** | Mechanisme (C) |
| James Hoffmann, *A Better 1 Cup V60 Technique* | **15 g op 250 g water** in de V60 (ratio 1:16,7), bloom 50 g + 4 gietbeurten, klaar rond 3:00. Maal fijner dan bij een grote kop, want een ondiep bed loopt sneller door. | Veelgebruikte praktijkreferentie (B/C) |
| James Hoffmann, *Ultimate V60 Technique* | 30 g op 500 g in de V60-02, klaar rond 3:30. | Veelgebruikte praktijkreferentie (B/C) |
| Hario (fabrikant) | V60-02 is bedoeld voor 1–4 kopjes. De 01 is de kleinere variant voor 1–2 kopjes. | Fabrikant (C) |
| Jonathan Gagné, *The Importance of Bed Depth* (2025) | Diepere bedden zijn vergevingsgezinder en geven meer body en zoetheid. Bij dezelfde beddiepte geven verschillende doses vergelijkbare tijd, TDS en extractie. Hoe dieper het bed, hoe grover de maling moet. | Natuurkundige met metingen (B) |

**Beperking:** de pagina's zelf kon ik niet openen (het netwerkbeleid van deze omgeving blokkeert directe fetches). De citaten hierboven komen uit zoekresultaten en samenvattingen. De Rao-, Hoffmann- en Gagné-uitspraken worden consistent door meerdere onafhankelijke bronnen herhaald. Getallen van sites als driproast.com ("02 handles 15–40 g") heb ik bewust niet als bewijs gebruikt.

### 2.3 Analyse

**a) Onder de 15 g: geen steun.** Elke bron die klein brouwt in de V60-02 stopt bij 15 g (Hoffmann; ik ga ervan uit dat zijn 1-kopsvideo de 02 gebruikt, zoals zijn andere V60-video's, maar dat heb ik niet aan de bron kunnen controleren). Rao vindt zelfs dat al te klein. Wie minder wil, wordt door Hario en de praktijk naar de 01 verwezen, en die valt buiten de scope (`EQUIPMENT_SCOPE`). **De ondergrens van 15 g blijft dus staan.** Een zachte waarschuwing in plaats van een blokkade onder 15 g is niet te onderbouwen.

**b) Waarom de app 250 ml weigert.** De app rekent: water = dosis × *midden van het ratiobereik*. Bij 15 g en ratio 17,6 wordt dat 265 ml, dus minder water betekent minder dan 15 g, en dat mag niet. Maar het doelvenster zelf staat een heel **bereik** van ratio's toe:

| Doelvenster (cluster) | TDS | EY | Ratiobereik | Met 15 g | Met 22 g |
|---|---|---|---|---|---|
| LOWER_STRENGTH_MODERATE_EXTRACTION | 1,15–1,30 % | 18–20 % | 1:15,9 – 1:19,4 | **238–291 ml** | 349–427 ml |
| FULLER_BODIED | 1,30–1,45 % | 20–22 % | 1:15,8 – 1:18,9 | **237–284 ml** | 347–416 ml |

(Ratio = EY/TDS + 2, de bestaande `ratioFromWindow()` inclusief `LIQUID_RETAINED_RATIO`.)

**15 g op 250 ml (1:16,7) ligt dus binnen beide doelvensters.** Het is precies Hoffmanns referentierecept. De weigering komt niet uit het bewijs, maar uit de implementatiekeuze om altijd het venstermidden te nemen.

**c) De bovenkant (22 g).** Rao zegt "brews best" tot 22 g, maar Hoffmann gebruikt in dezelfde 02 routinematig 30 g, en Hario noemt 1–4 kopjes. Dit is **omstreden**: 22 g is een voorkeur van één expert, geen fysieke grens. Boven 22 g wordt het bed dieper (zie D-4), dus moet de maling grover. Daar heeft de app vandaag geen regel voor. De bovengrens verhogen hoort daarom bij D-4, niet bij D-2.

### 2.4 Voorstel D-2

**Stap 1: ratio aan de rand in plaats van weigeren** (aanbevolen, geen nieuw getal).

- Als de dosis bij de ratio uit het venstermidden onder 15 g zou vallen: **zet de dosis op 15 g** en gebruik de ratio die daarbij hoort, zolang die binnen het ratiobereik van het venster blijft.
- Hetzelfde aan de bovenkant: dosis op 22 g, ratio iets lichter, zolang die binnen het venster blijft.
- Buiten dat bereik blijft het eerlijk "geen recept bij dit volume".

Gevolgen:

| | Nu | Na stap 1 |
|---|---|---|
| V60-bereik (LOWER) | 265–380 ml | **240–425 ml** |
| V60-bereik (FULLER) | 265–380 ml | **240–415 ml** |
| Recepten tussen 265 en 380 ml | — | **onveranderd** (golden fixtures blijven gelijk) |
| 250 ml | geweigerd | 15 g, 1:16,7 (= Hoffmann 1-kop) |

UI-eerlijkheid: bij een recept aan de rand toont de app één regel, bijvoorbeeld *"Kleine kop: de dosis staat op de ondergrens van 15 g; daarom is deze kop iets sterker dan het midden van je doel (nog binnen het doel)."*

Wat nodig is:

- In de app-laag een klem op de dosis vóór de hardeconstraint-controle, zodat de engine-bundel zelf onveranderd blijft. Dit moet ook gelden voor `engineValidVolumeRange()`, met ceil/floor op 5 ml zoals nu.
- Tests:
  - 240/250/260 ml geeft 15 g met een ratio binnen het venster;
  - 235 ml wordt nog steeds geweigerd;
  - de golden fixtures blijven gelijk;
  - de sterkteknop (B-1) blijft correct klemmen.

**Stap 2: maalhint voor kleine koppen** (optioneel).

- Hoffmann en Gagné zijn het eens over de richting: een ondiep bed loopt sneller door, dus fijner malen.
- De app heeft voor korte schema's al een gelabelde "1 klik fijner"-regel (BC-11).
- Voorstel: bij 15 g een **tekstuele** hint ("kleine kop: loopt hij te snel door, maal dan 1 klik fijner"), zonder het getal automatisch te veranderen. Een automatische klik alleen met jouw akkoord, zoals bij BC-11.

**Niet doen:** de ondergrens onder 15 g verlagen, of een "zachte" waarschuwing onder 15 g. Daar is geen bron voor.

---

## 3. D-4 — Welke niet-lineariteit bij schalen is onderbouwd?

### 3.1 De oorspronkelijke vraag

> "Batchgrootte schaalt nu strikt lineair op watervolume; eerder onderzoek verbiedt die aanname expliciet. Welke niet-lineariteit is onderbouwd?"

### 3.2 Wat mag lineair blijven (en waarom)

| Grootheid | Lineair? | Onderbouwing |
|---|---|---|
| Dosis ↔ water | **ja** | Het doelvenster (TDS/EY) bepaalt een ratio, en een ratio is per definitie lineair. |
| Water dat in het bed achterblijft | **ja** | ≈ 2 g per g koffie (`LIQUID_RETAINED_RATIO`); de C-5 retentiemeting toetst dit met jouw eigen kopgewicht. |
| Bloomwater | **ja** | Gangbaar 2–3 × de dosis (Hoffmann: 50 g bij 15 g; 60 g bij 30 g). |
| Grootte van elke gietbeurt | **ja** | Een vast aandeel van het totaal (Hoffmann: 40/60/80/100 %). |

### 3.3 Wat niet lineair is

**1. Beddiepte, zeker (meetkunde).**
- V60 en Chemex zijn kegels. Het volume van een kegel groeit met de derde macht van de hoogte, dus **beddiepte ∝ dosis^(1/3)**.
- Controle met Rao's eigen getallen: 15 g ≈ 5 cm geeft bij 22 g 5 × (22/15)^(1/3) = **5,7 cm**. Dat klopt met Rao's "5–6 cm".
- Bij 30 g (Hoffmann Ultimate): ≈ 6,3 cm.
- Dubbele dosis betekent dus maar ~26 % dieper bed, niet 100 %.

**2. Doorlooptijd bij gelijke maling: richting zeker, grootte onzeker.**
- Een dieper bed geeft meer weerstand en er moet meer water doorheen, dus een groter brouwsel duurt langer.
- Referenties:
  - Chemex bij een gewone hoeveelheid: 4:00–5:00 (de bestaande registry-band, klasse B). Chemex 50 g / 800 g: **5–6 min** (projectbarista, manualcoffeebrewing: 5:45). Blue Bottle raadt voor een 8-kops Chemex "4 tot 5 minuten" aan, en adviseert grover te malen als het langer duurt.
  - V60: Hoffmann 15 g → ~3:00, 30 g → ~3:30. Maar dat zijn twee verschillende technieken, dus geen zuivere vergelijking.
- Een ruwe stromingsschatting (Darcy, kegelvorm) geeft **tijd ∝ dosis^(2/3)** bij gelijke maling.
  - Voor Chemex 30 → 50 g voorspelt dat ×1,41. Gemeten (5:45 tegen het bandmidden 4:30) is ×1,28, dus in de buurt.
  - Voor V60 15 → 30 g voorspelt het ×1,59. Gemeten wordt ×1,17, want Hoffmann past techniek en maling aan.
  - **Conclusie: bruikbaar als richting, niet als getal.**

**3. Maalgraad: richting eensgezind, grootte onbekend.**
- Groter brouwsel: grover malen (Gagné: "as bed depth increases so should the grind size"; Blue Bottle: "microadjustments, not macro"; Rao).
- Kleiner brouwsel: fijner malen (Hoffmann 1-kop).
- **Geen enkele bron geeft een getal** (klikken of micron per gram of per cm beddiepte). Voor de Timemore C3S Pro bestaat het al helemaal niet.

**4. Temperatuur: richting redelijk, grootte onbekend.**
- Klein brouwsel betekent relatief meer warmteverlies, dus een lagere gemiddelde slurrytemperatuur (Rao).
- Gagné mat in een plastic V60 met een waterkoker op 99 °C een gemiddelde slurry van ~84 °C.
- Voorverwarmen van de dripper beperkt het verlies.
- Richting: kleine koppen zo heet mogelijk, grote koppen minder kritisch. Een getal per gram is er niet.

### 3.4 Waar de app daardoor nu scheef zit

| Situatie | Wat de app doet | Wat er werkelijk gebeurt | Ernst |
|---|---|---|---|
| Chemex klein (300–430 ml, 17–25 g) | Beoordeelt de gemeten tijd tegen de band 4:00–5:00 | Die band hoort bij een **volle** 6-kops (±42 g / 680 ml, 4–5 min — zie bijstelling hieronder); een ondiep bed loopt sneller door | Onterecht "buiten de band"-signaal; geen verkeerd advies (de diagnose gebruikt geen tijd) |
| Chemex groot (700–850 ml, 40–49 g) | Beoordeelt tegen 4:00–5:00 | Blue Bottle: ook een 8-kops hoort 4–5 min te duren; andere bronnen noemen 5–6 min | Bronnen spreken elkaar tegen, dus oordelen blijft verdedigbaar |
| V60 22 g vs 15 g | Zelfde maalstand 16 | 22 g loopt trager (dieper bed) | Klein; het persoonlijke leren per volumeband (C-3) vangt het op zodra er data is |
| V60 klein (na D-2 stap 1) | Zelfde maalstand | 15 g loopt sneller door, is minder warm | Klein; zie hint D-2 stap 2 |
| Boven 22 g in de V60 | Geweigerd | Kan prima (Hoffmann 30 g), maar vraagt een grovere maling | Keuze; zie §3.5 stap 3 |

**Positief:** Fase 4 (diagnose + advies) gebruikt de gemeten tijd (nog) niet voor zijn oordeel. Het leren (C-3) telt alleen brouwsels binnen ±40 % van het huidige volume mee (`LEARNING_VOLUME_TOLERANCE`). De niet-lineariteit veroorzaakt dus nu geen verkeerd advies, alleen een onterecht tijdsignaal op het Klaar-scherm bij grote Chemex-brouwsels.

**Bijstelling tijdens het bouwen:** een extra bron ([Little Waves, Chemex 6-cup brew guide](https://littlewaves.coffee/products/chemex-6-cup-coffee-dripper-brew-guide)) geeft voor een volle 6-kops **42 g op ~680 ml in 4–5 minuten**. De Chemex-band hoort dus bij een vol brouwsel. Mijn eerste lezing, dat vooral grote Chemex-brouwsels een onterecht signaal krijgen, was onjuist: het onterechte signaal zit bij **kleine** Chemex-brouwsels, waaronder de standaard van 300 ml (17 g). Zie de tabel hierboven.

### 3.5 Voorstel D-4

**Stap 1: eerlijk tijdsoordeel per volume** (aanbevolen, geen nieuw getal).

- De contacttijdband (V60 2:00–3:30, Chemex 4:00–5:00) geldt voor een "gewone" hoeveelheid.
- Geef op het Klaar-scherm alleen een binnen/buiten-oordeel als het volume binnen ±40 % van het referentievolume van het toestel valt. Dat is dezelfde tolerantie als het leren al gebruikt.
- Daarbuiten één eerlijke regel: *"Bij deze hoeveelheid duurt het doorlopen normaal langer (of korter). De band geldt voor een gewone kop, dus hier geen oordeel."*

**Stap 2: richting-hint bij grote en kleine brouwsels** (aanbevolen, tekst).

- Groot (Chemex ≥ ~40 g, of V60 boven 22 g als stap 3 doorgaat): *"Groot brouwsel: loopt het bed trager leeg dan het schema, maal dan de volgende keer iets grover."*
- Klein (V60 op 15 g): de hint uit D-2 stap 2.
- Het persoonlijke leren per volumeband zoekt daarna het echte getal voor jóúw molen.

**Stap 3: V60 boven 22 g toestaan als gelabelde "grote kop"** (optioneel, jouw beslissing, verandert receptgetallen).

- Grens 22 → 30 g, met label "boven Rao's aanbeveling; volgens Hoffmann's Ultimate V60 (30 g / 500 g)".
- Altijd samen met de grover-hint.
- Bewijs: omstreden (Rao vs Hoffmann). Beter te doen **na** de 20 geteste adviezen, zodat je eerst weet of het basisrecept klopt.

**Stap 4: getalsmatige schaling van tijd of maling** (niet aanbevolen).
- De `dosis^(2/3)`-schatting en een "klikken per gram"-regel zijn niet gevalideerd. De Chemex-referenties komen wel in de buurt, maar de V60-referenties niet.
- Een getal hier zou precies het soort verzonnen precisie zijn dat de app sinds v4 vermijdt.
- Het persoonlijke leren is de juiste plek om dit getal te laten ontstaan.

**Temperatuur:** geen getalswijziging. Hooguit een voorverwarm-tip bij kleine koppen ("spoel de dripper goed heet door"). Die tip past bij stap 2.

---

## 4. Beslissingen die bij jou liggen

| # | Beslissing | Mijn advies | Verandert receptgetallen? |
|---|---|---|---|
| D2-1 | Ratio aan de rand van het doelvenster toestaan (V60 240–415 ml, 250 ml mogelijk) | **Ja** | Alleen voor volumes die nu geweigerd worden; bestaande recepten niet |
| D2-2 | Hint "kleine kop: 1 klik fijner als hij te snel doorloopt" | Ja, als tekst | Nee |
| D2-3 | Automatisch 1 klik fijner bij 15 g (zoals BC-11) | Nee, eerst data | Ja |
| D4-1 | Tijdsoordeel alleen binnen ±40 % van het referentievolume | **Ja** | Nee |
| D4-2 | Grover-hint bij grote brouwsels + voorverwarm-tip bij kleine | **Ja** | Nee |
| D4-3 | V60 tot 30 g als gelabelde "grote kop" | Later, na de advies-poort | Ja |
| D4-4 | Getalsmatige schaling van tijd of maling | **Nee** | Ja |

D2-1, D4-1 en D4-2 samen zijn één kleine, goed testbare wijziging. Hij maakt de app eerlijker en laat 250 ml toe, zonder één bestaand recept te veranderen.

---

## 5. Bronnen

- Scott Rao — [What are the best dose and brewing ratio?](https://www.scottrao.com/blog/2020/2/4/how-to-choose-a-dose-and-brewing-ratio) (2020)
- Scott Rao — [Bed depth: why it matters](https://www.scottrao.com/blog/2025/11/11/bed-depth-why-it-matters) (2025)
- Jonathan Gagné, Coffee ad Astra — [The Importance of Bed Depth](https://coffeeadastra.com/2025/11/28/the-pulsar-mini-and-the-importance-of-bed-depth/) (2025)
- Jonathan Gagné, Coffee ad Astra — [How to Brew Better Coffee with a V60](https://coffeeadastra.com/2018/11/30/brewing-better-coffee/)
- James Hoffmann via Hario USA — [1 Cup V60 Technique](https://www.hario-usa.com/blogs/recipes-and-more-from-friends/james-hoffmann-1-cup-v60-technique)
- James Hoffmann via Hario USA — [Ultimate V60 Technique](https://www.hario-usa.com/blogs/recipes-and-more-from-friends/james-hoffmann-uitimate-v60-technique)
- Blue Bottle Coffee Lab — [How to Brew Large Batches of Coffee with Chemex or French Press](https://blog.bluebottlecoffee.com/posts/how-to-brew-large-batches-of-coffee)
- Project Barista — [Brew for a Crowd with the 8 Cup Chemex](https://projectbarista.com/chemex-recipes/)
- Brewing Coffee Manually — [Brewing Large Batches of Coffee With the Chemex](https://manualcoffeebrewing.com/brewing-large-batches-of-coffee-with-the-chemex/)
- Barista Hustle — [Towards a Common Coffee Control Chart](https://www.baristahustle.com/towards-a-common-coffee-control-chart/) (ratio als lijn door het strength/extraction-vlak)

**Werkwijze en beperking:** de metingen in §1 en de ratiobereiken in §2.3 zijn uitgerekend met de app-code zelf (`computeRecipe`, `engineValidVolumeRange`, `ratioFromWindow`). De bronnen kon ik vanuit deze omgeving alleen via zoekresultaten lezen, niet als volledige pagina. Voordat een van de voorstellen wordt gebouwd, is het verstandig de Rao- en Gagné-artikelen van 2025 zelf na te lezen.

---

## 6. Wat er gebouwd is (29 september 2026)

**D2-1: ratio aan de rand van het doelvenster.**
- `doseEdgeFor()` in de app-laag; de engine-bundel is onveranderd.
- Valt de dosis bij het venstermidden buiten 15–22 g, dan zet de app de dosis op de grens en rekent de ratio terug, zolang die binnen het ratiobereik van het doelvenster blijft.
- `engineValidVolumeRange()` rekent met dosisgrens × ratiorand: V60 **240–415 ml** (LOWER tot 425 ml).
- Voorbeelden:
  - 250 ml geeft 15 g op 1:16,7;
  - 400 ml geeft 22 g op 1:18,2;
  - 265–380 ml is ongewijzigd.
- Receptscherm:
  - bij de dosis staat "ondergrens" of "bovengrens van dit toestel";
  - bij de ratio staat "iets sterker/lichter dan het midden van je doel (nog binnen het doel)", maar niet als de sterkteknop aan staat.

**D4-1: tijdsoordeel per hoeveelheid.**
- `batchScaleFor()` met referentiedosis V60 18,5 g (midden van Rao's 15–22 g) en Chemex 42 g (volle 6-kops).
- Het Klaar-scherm geeft alleen een binnen/buiten-oordeel als de dosis binnen ±40 % van die referentie ligt, dezelfde tolerantie als het leren (C-3).
- Daarbuiten staat er: "loopt het bed normaal sneller/langzamer door … daarom hier geen oordeel over je tijd".
- De B-2a-melding ("het schema zelf valt buiten de band") gaat voor.
- In de praktijk: V60 altijd beoordeeld; Chemex onder ~25 g (~430 ml) niet.

**D4-2: richting-hints op de maalgraadtegel** (tekst, geen getal).
- V60 op 15 g: "kleine kop: loopt sneller door · begin aan de fijne kant · spoel de dripper heet voor".
- Chemex ≤ 25 g: "klein brouwsel: loopt sneller door · zuur? iets fijner · spoel de Chemex heet voor".
- Chemex boven 42 g: "groot brouwsel: loopt trager door · traag en bitter? volgende keer iets grover" (Blue Bottle).
- V60 boven 22 g zou ook "groot" zijn, maar dat kan pas als D4-3 ooit doorgaat.

**Bijvangst:** de toelichting bij `LEARNING_VOLUME_TOLERANCE` zei dat 265 en 380 ml "~40 % beddiepte" verschillen. Het is ~40 % dosis en ~13 % beddiepte (kegel). Tekst gecorrigeerd; het getal is ongewijzigd.

**Tests** (636/636 groen):
- rekentests voor `doseEdgeFor()`, de nieuwe grenzen (235/240/425/430 ml), 250 en 400 ml, de sterkteknop op de grens en het onveranderde bereik 265–380 ml;
- Playwright voor de labels, de hints (V60 klein, Chemex klein/normaal/groot) en het Klaar-scherm bij een klein Chemex-brouwsel;
- vier oudere tests die vastlegden dat 250 ml geweigerd moest worden, zijn bijgewerkt naar het nieuwe gedrag.
