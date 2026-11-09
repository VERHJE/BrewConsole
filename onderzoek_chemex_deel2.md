# Onderzoek Chemex, deel 2: wat weten we nu, en waar valt in de app winst te halen

Datum: 9 nov 2026. Vervolg op `onderzoek_chemex.md`. Dit deel gaat over de gaten die daar openbleven (temperatuur, filter, maling, kleine porties, water, branding, extractie) en over wat dat voor Brew Console betekent. Er is niets gebouwd.

## 1. Het korte antwoord

Het meeste wat over de Chemex gezegd wordt, is **mening of herhaling van de maker**. Gecontroleerde metingen zijn er bijna niet. Wat we wel vonden en voor de app telt:

1. **Kleine porties in een 6-kops zijn riskant.** Meerdere bronnen noemen een dunne koffielaag als probleem; Scott Rao legt uit waarom (kanalen die de bodem halen geven astringentie). Onze 1-kop (250 g) komt neer op ongeveer 15 g koffie in een 6-kops; bronnen noemen 22 g (voor 352 g water) of een kleinere Chemex. Dit raakt direct iets wat we gebouwd hebben.
2. **Je maalstand is een gok.** Twee bronnen voor je molen spreken elkaar tegen: BrewTuner zegt 24 klikken voor de Chemex (die gebruikt de app), een andere lijst zegt 17 tot 19. De eerste kop is dus een kalibratie.
3. **Er is geen enkele gecontroleerde Chemex-tegen-V60-meting** met een refractometer. Eén forumgebruiker haalde op de Chemex 20,5 % extractie tegen bijna 23 % op de V60 met dezelfde boon. Eén persoon, één boon: een aanwijzing.
4. **Warmteverlies:** één thuismeting met thermokoppels zegt dat de Chemex snel warmte verliest, ook voorverwarmd. De rest is advies zonder meting.
5. **Branding:** de bronnen zeggen licht tot medium; geen enkele geeft een meting.

## 2. Hoe betrouwbaar

| Onderwerp | Beste bron die we vonden | Klasse |
|---|---|---|
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

## 4. Waar in de app winst te halen is

Gerangschikt naar nut en zekerheid. De items 1 en 2 raken wat er nu al staat.

| # | Winst | Waarom | Zekerheid |
|---|---|---|---|
| 1 | **Waarschuwing of ondergrens voor kleine doseringen in een 6-kops** (nu ondergrens 15 g, 1 kop = ongeveer 15 g) | Dunne laag is het enige punt waar een primaire bron (Rao) en meerdere gidsen op elkaar aansluiten | Middel: Rao noemt de Chemex niet; de drempel (ca. 22 g) is een afleiding |
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
