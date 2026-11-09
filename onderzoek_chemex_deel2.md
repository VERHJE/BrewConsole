# Onderzoek Chemex, deel 2: wat weten we nu, en waar valt in de app winst te halen

Datum: 9 nov 2026. Vervolg op `onderzoek_chemex.md`. Dit deel gaat over de gaten die daar openbleven (temperatuur, filter, maling, kleine porties, water, branding, extractie) en over wat dat voor Brew Console betekent. Er is niets gebouwd.

## 1. Het korte antwoord

Het meeste wat over de Chemex gezegd wordt, is **mening of herhaling van de maker**. Gecontroleerde metingen zijn er bijna niet. Wat we wel vonden en voor de app telt:

1. **Een kop in een 6-kops heeft meer koffie nodig dan wij nu doen.** George Howell publiceert zelf een recept "6-kops, voor één": **25 tot 28 g koffie op 390 g water** voor een kop van 340 g (3 gietbeurten, 4 minuten). Dat is ongeveer het dubbele van ons Verve-recept (15 g op 225 g), dat voor een kleinere Chemex is bedoeld. Scott Rao legt uit waarom een dunne laag een risico is (kanalen die de bodem halen geven astringentie). Dit raakt direct iets wat we gebouwd hebben.
2. **Je maalstand is een gok (inmiddels gecorrigeerd met je eigen zetsels, zie sectie 7).** Twee bronnen voor je molen spreken elkaar tegen: BrewTuner zegt 24 klikken voor de Chemex (die gebruikt de app), een andere lijst zegt 17 tot 19. De eerste kop is dus een kalibratie.
3. **Er is geen enkele gecontroleerde Chemex-tegen-V60-meting** met een refractometer. Eén forumgebruiker haalde op de Chemex 20,5 % extractie tegen bijna 23 % op de V60 met dezelfde boon. Eén persoon, één boon: een aanwijzing.
4. **Warmteverlies:** één thuismeting met thermokoppels zegt dat de Chemex snel warmte verliest, ook voorverwarmd. De rest is advies zonder meting.
5. **Branding:** de bronnen zeggen licht tot medium; geen enkele geeft een meting.

## 2. Hoe betrouwbaar

| Onderwerp | Beste bron die we vonden | Klasse |
|---|---|---|
| Eén kop in een 6-kops | [George Howell, Chemex brew guide (PDF, zelf gelezen)](https://cdn.shopify.com/s/files/1/0550/4119/6267/files/ChemexCombined_1125.pdf): 3-kops voor twee, 6-kops voor één, 6-kops voor twee | A |
| Bedikte en kleine porties | [Scott Rao, Bed depth: why it matters](https://www.scottrao.com/blog/2025/11/11/bed-depth-why-it-matters) (zelf gelezen) | A, maar noemt de Chemex **niet** |
| Kleine dosis in een 6-kops | zoekresultaten van gidsen en een forum | C |
| Warmteverlies | één thuisexperiment met thermokoppels (via zoekresultaat) | C |
| Maalstand C3S Pro op Chemex | BrewTuner (in de app) tegenover een [lijst op manuals.plus](https://manuals.plus/ae/1005006430407161) | C, tegenstrijdig |
| Extractie Chemex tegenover V60 | [één forumbericht](https://www.coffeeforums.co.uk/posts/262199) | C |
| Filterdikte/doorlooptijd | veel blogs; "20 tot 30 % dikker" is de claim van de maker, één recensie zegt "ongeveer twee keer zo dik" | C, tegenstrijdig |
| Water | algemene SCA-waarden, niet Chemex-specifiek | B/C |
| Branding en ratio | gidsen; één geeft ratio's per branding | C |

Let op: een groot deel van de zoekresultaten waren spiegelsites en SEO-pagina's. Alleen wat hierboven staat is gebruikt.

## 3. Bevindingen per onderwerp

**Dunne koffielaag.** Rao: "Channels that manage to reach the bottom of a coffee bed carry larger, astringency-causing compounds" de kop in, en het risico op astringentie neemt toe als de laag "substantially less" is dan zijn richtdoses (V60 20 tot 25 g, Kalita 185 25 g). Hij noemt de Chemex niet en geeft geen minimum. Een gids voor de 6-kops noemt 22 g voor een grote mok (352 g); voor een kop van 12 oz in een 3-kops 25 tot 28 g. **Afleiding (niet uit een bron):** onze 1-kop van ongeveer 15 g is ruim onder die waarden.

**Maalstand.** BrewTuner: V60 18, Chemex 24 (20 tot 28). Een andere lijst: pour-over 13 tot 16, Chemex 17 tot 19. Ze tellen mogelijk anders (vanaf nul of vanaf de strakste stand). Wat wel consistent is: de Chemex wordt **grover** gemalen dan de V60. Eén bron adviseert juist één of twee standen fijner dan de V60; dat spreekt de rest tegen.

**Temperatuur.** Voorverwarmen is overal "niet optioneel". De meeste warmte gaat verloren in de eerste 30 seconden. Aanbevolen compensatie varieert van 1 tot 2 °C tot 5 tot 10 °F, zonder meting. We hebben dus geen reden om de 96 °C uit de recepten te veranderen.

**Filter.** Alle bronnen: gebruik het Chemex-filter, vouw de drie lagen tegen de tuit. Eén recensie claimt een meting van de "natural" (ongebleekte) variant met refractometer en blinde proeven, maar publiceert geen cijfers. Onafhankelijke doorloopmetingen vonden we niet.

**Gieten en roeren.** Wat steeds terugkomt: wees voorzichtig met fel gieten ("de brede opening nodigt uit tot fel gieten, maar dat geeft kanalen"), swirl zacht na de laatste giet. Dit botst een beetje met Barefoot (juist één felle giet); de Prima-test gaf Barefoot wel het hoogste cijfer.

**Kasuya op de Chemex.** Derde partijen zeggen dat de methode "overdraagbaar" is bij dezelfde verhouding en gietverdeling. Een Chemex-versie met tijden en gewichten vonden we niet. Hoffmann en Rao hebben geen eigen Chemex-recept dat we konden vinden; een bron schrijft Rao's spin toe aan de Chemex zonder primaire bron.

**Water.** Hardheid bepaalt hoeveel smaak eruit komt, alkaliniteit hoeveel zuur blijft. Geen verschil per brewer gevonden; dit is een algemeen punt voor de hele app, niet voor de Chemex.

**Branding.** Licht tot medium wordt het meest genoemd; medium als veilige start. Eén gids noemt 1:17 tot 1:18 voor licht, 1:16 voor medium en 1:15 voor donker. Dat is één mening, geen meting.

**George Howell, drie recepten uit zijn eigen PDF** (alle: water 201 tot 205 °F, maling "drip-medium", filter spoelen, dikke kant tegen de tuit, in concentrische cirkels vanuit het midden, richten op donkere plekken):

| Recept | Koffie | Water | Gietbeurten | Tijd |
|---|---|---|---|---|
| 3-kops, voor twee (340 g) | 25 tot 28 g | 390 g | 100 g in 15 s; 1:00 naar 200 g; 2:00 naar 300 g; 3:00 naar 390 g (elk in 15 s) | ca. 4:00 |
| **6-kops, voor één (340 g)** | **25 tot 28 g** | **390 g** | **130 g in 20 s; 1:00 naar 260 g; 2:00 naar 390 g (elk in 20 s)** | **3:30 tot 4:00** |
| 6-kops, voor twee (710 g) | 50 tot 57 g | 780 g | 260 g in 30 s; 1:00 naar 520 g; 2:30 naar 780 g (elk in 30 s) | ca. 5:00 (3:30 tot 4:00 volgens de laatste stap) |

Daaruit volgt: de dosis voor één kop in een 6-kops is een **bronwaarde**, geen afleiding. Onze huidige 1-kop (Verve, 15/225) is een recept voor een kleinere Chemex.

## 4. Waar in de app winst te halen is

Gerangschikt naar nut en zekerheid. De items 1 en 2 raken wat er nu al staat.

| # | Winst | Waarom | Zekerheid |
|---|---|---|---|
| 1 | **Een eigen recept voor één kop in een 6-kops**: George Howell (25 tot 28 g op 390 g, drie gietbeurten) als voorstel voor "1 kop", en een ondergrens voor de dosis (nu 15 g) | Een roaster publiceert dit zelf; Rao en meerdere gidsen noemen het risico van een dunne laag | Hoog voor het recept (bron klasse A); de ondergrens is een afleiding |
| 2 | **Eerste Chemex-kop als maalkalibratie**: de app zegt dat 24 een startpunt is (twee bronnen verschillen) en vraagt na de eerste kop om de doorlooptijd | Het model leert hierna zelf bij; nu staat 24 er als feit | Hoog: het gaat om eerlijkheid over wat we niet weten |
| 3 | **Chemex-meting vastleggen**: de refractometer-invoer (TDS) werkt al per brewer; een korte uitleg dat jouw metingen de enige Chemex-tegen-V60-data zijn die bestaan | Er is geen gecontroleerde bron; jouw koppen zijn de data | Hoog, afhankelijk van of je een refractometer hebt |
| 4 | **Filtertype bij het zetsel** (Chemex wit, natural, ander) | Het enige filter-effect dat we kunnen onderzoeken is met eigen koppen; geen bron geeft cijfers | Middel: kost een nieuw veld |
| 5 | **Kasuya 4:6 als Chemex-proefkandidaat** met de bronverhouding en verdeling, tijden als plaatshouder | Is de enige techniek waar we al een rijke leerlus voor hebben | Laag tot middel: geen Chemex-bron voor de tijden |
| 6 | **Branding naar ratio op de Chemex** | Eén mening | Laag: laat de proeven dit uitzoeken |
| 7 | **Temperatuur loggen** (water bij de ketel, eventueel kop) | Geen meting beschikbaar, kost invoer | Laag |

Niet doen: de 96 °C of de recepten aanpassen op basis van de warmteverlies-claims, branding-ratio's als regel invoeren, of het filter-advies ("20 tot 30 % dikker") als meetwaarde gebruiken.

## 5. Wat we nog steeds niet weten

- Chemex-recepten van Hoffmann, Rao, Perger, Hedrick en Kasuya zelf.
- Een gecontroleerde meting van extractie, doorlooptijd of warmte tussen Chemex en V60.
- Hoe de maalstanden van de C3S Pro echt tellen (vanaf nul of de strakste stand) en welke Chemex-stand klopt.
- Of een 6-kops met 15 g echt slechter smaakt dan met 22 g; dat is met eigen koppen te testen.
- Of Barefoots felle giet en de zachte gietadviezen elkaar echt tegenspreken of dat dit afhangt van de boon.

**Verwerkt (9 nov 2026):** het Howell-recept voor één kop staat in de app als voorstel voor '1 kop' (340 g); zie `docs/engine3/05-technieken.md`.

## 6. Aanvulling: James Hoffmann, video over de Chemex (door Jelle aangeleverd, 9 nov 2026)

Bron: transcript van Hoffmanns video over de Chemex (klasse A: de maker van het V60-recept zelf; geen aanpassing door een derde). Het transcript is **afgebroken** bij "6. One…", dus alles wat daarna in de video komt, ontbreekt hier.

**Wat hij zegt**
- **Filter:** een Chemex-filter weegt net geen 4,5 g, een Hario-filter voor twee kopjes ongeveer 1,5 g: "drie keer zoveel papier", met aan de ene kant drie lagen. Dat is een **gewichtsmeting van Hoffmann zelf**; het vervangt de "20 tot 30 % dikker"-claim van de maker niet, maar zegt wel iets anders (het gewicht omvat ook het grotere vel). Spoel het filter altijd.
- **Maling:** "niet te veel compenseren voor de extra weerstand." Bij dezelfde maling, dosis en giettechniek liep de Chemex veel langzamer dan de V60. Dat is volgens hem prima: **4 tot 5 minuten bij een halve liter** en dan nog goede koffie. Mensen die te grof malen om 3 tot 3,5 minuut te halen, krijgen een zwakkere kop.
- **Dosis:** blijf bij **60 g per liter** (1:16,7); wie sterker wil, past dat aan. Hij waarschuwt voor een **spiraal van meer koffie en onderextractie** (meer koffie nemen omdat de kop dun is, terwijl te grof malen de oorzaak is).
- **Bloem:** hetzelfde als bij de V60, **2 tot 3 keer de dosis** (60 tot 90 g bij 30 g koffie), **minstens 45 seconden**.
- **Gieten:** "een vergelijkbare giettechniek, in fases, als in de V60-video", aan het eind **even roeren en dan swirlen** voor een vlak bed.
- **Luchtslot:** de dikke kant van het filter hoort bij de tuit; het papier mag na het spoelen de opening niet dichtplakken. Noodoplossing: een stokje (liefst metaal) in de kan. Beter: let op de opening.

**Wat dit verandert**
1. De **maling:** de app begint op klik 24 (6 klikken grover dan de V60). Hoffmann raadt juist aan niet veel grover te gaan, en een andere bron zei al "één of twee standen fijner dan de V60". Samen met de lijst die 17 tot 19 noemt, wijst alles op een **lagere beginklik dan 24**. Nog steeds geen meting, maar nu twee onafhankelijke aanwijzingen tegen één.
2. De **eindtijd:** bij Hoffmann hoort bij 500 g een tijd van 4 tot 5 minuten. Onze Chemex-recepten staan op 3:30 tot 4:00 (Howell, Verve, Pull & Pour) en de V60-variant van Hoffmann op de Chemex op 3:30. Die laatste is dus te kort als je Hoffmanns eigen Chemex-advies volgt.
3. Een **Hoffmann-Chemex-recept** is nu mogelijk uit zijn eigen woorden: 60 g/l, bloem 2 tot 3 keer, minstens 45 s, fases als de V60, aan het eind roeren en swirlen, klaar in 4 tot 5 minuten. **Ontbreekt:** de gietmomenten en gewichten per fase voor de Chemex (die staan in het afgebroken deel of in zijn V60-video).
4. De **filteraanwijzingen** (dikke kant bij de tuit, opening vrijhouden, altijd spoelen) staan al bij de recepten; het luchtslot kan als tip erbij.

## 7. Je eigen eerste Chemex-zetsels (logboek van 9 nov 2026)

Twee zetsels met het Hoffmann-V60-recept op de Chemex (400 g water, 21,1 en 22,8 g koffie, 100 °C, klik 14), zak Lord voldemor (Colombia, natural, licht gebrand):

| | Dosis / water | Klik | Bed droog | Staart na laatste giet (75 s) | Smaak |
|---|---|---|---|---|---|
| 07:42 | 21,1 / 400 g (1:19) | 14 | 3:24 | 129 s | te slap, vlak, droog afdronk, 3,5 |
| 16:09 | 22,8 / 403 g (1:17,7) | 14 | 3:42 | 147 s | juist, vlak, hol maar zoet, 3,5 |

Ter vergelijking, dezelfde zak op de V60 (Kasuya, 300 g, klik 15): bed droog na 3:46 tot 4:09, staart 46 tot 69 s.

**Wat dat zegt (n = 2, dus een aanwijzing):**
- Een Chemex-staart van 129 tot 147 s is ongeveer **twee tot drie keer zo lang** als bij de V60 op bijna dezelfde klik. Dat is het trage dikke filter, en het klopt met Hoffmann.
- Klik 14 (een stand **fijner** dan je V60 op 15) gaf toch een eindtijd van 3:24 tot 3:42, korter dan Hoffmanns 4 tot 5 minuten, en een vlakke, holle kop. Dat wijst **niet** op veel grover malen: de 24 uit BrewTuner zou de staart naar ongeveer 40 s brengen.
- Een kop van 22,8 g op 403 g was "juist" qua sterkte: de engine leert nu uit die eigen koppen een lagere dosis dan Howells 26,5 g op 390 g (zie de berekening: ongeveer 21 g op 380 g).

**Besluit:** beginklik voor de Chemex 15 (daarna de klik van je laatste Chemex-kop), venster 11 tot 22.

## 8. Bron voor later: Blue Bottle, eigen transcript

Jelle leverde op 9 nov 2026 het transcript van Blue Bottles eigen Chemex-video aan (klasse A, 4 gietbeurten, 700 g; echte gietmomenten 0:00, 0:45, 1:50, 3:10). Uitgewerkt in `bronnen/blue_bottle_chemex.md`, inclusief wat er in het recept `chemex_blue_bottle` aangepast moet worden. Verwerkt in de app op 9 nov 2026.

## 9. Bron voor later: vijf extra transcripten

Jelle leverde op 9 nov 2026 transcripten van Hedrick, Stumptown, Ox Coffee, Onyx (director's cut) en Gagné (podcast afl. 350) aan. Uitgewerkt, met wat er later in de app aangepast kan worden, in `bronnen/chemex_transcripten_9nov.md`. Verwerkt in de app op 9 nov 2026. Hedricks eigen Chemex-recept (40 g op 650 g) vult een gat uit sectie 5: er is nu wel een Chemex-recept van Hedrick.
