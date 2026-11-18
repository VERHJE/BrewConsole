# Brew Console · review 17 november 2026

Op `main` (`ff8c76c`), na de audit van 15 november en de drie herstelrondes. Er is niets aan de app veranderd. Elke bevinding heeft een bewijs (bestand en regel, meting of schermafbeelding). Prioriteit: **H** = nu doen, **M** = volgende ronde, **L** = onderhoud.

## Wat goed is

- **Recepten:** 16 technieken met bronnen; temperaturen en maling hebben een bron of staan als aanname gemarkeerd. Alle 4080 combinaties van brewer, kop, doel en techniek kloppen intern (audit 15 nov).
- **Toegankelijkheid:** axe schoon voor WCAG 2.2 AA op 175 schermen; tekst ≥ 12 px; tikdoelen ≥ 44 px.
- **Code:** typeveilig (geen `any`, 3 keer `as unknown as`); de engine is zuiver en goed getest; 401 tests.
- **Beveiliging:** een CSP, tokens in constante tijd vergeleken, de sleutel alleen in de Worker.

## 1. Code

| # | Prio | Bevinding | Bewijs | Voorstel |
|---|---|---|---|---|
| C1 | L | Lange regels maken de schermcode moeilijk leesbaar | 240 van de 4396 regels in `app3/src` zijn langer dan 160 tekens; de langste 406 (`Zakken.tsx:92`), 389 (`Zetten.tsx:148`) | Een formatter (Prettier of dprint, regelbreedte ~120) in één aparte commit |
| C2 | L | Het zakformulier is het meest ingewikkelde scherm | `Zakken.tsx`: 256 regels, 6 componenten, 14 `useState` | `Editor` naar een eigen bestand, de formulierstaat in een hook |
| C3 | L | Namen naar rondes in plaats van naar onderwerp | `core/ronde2.ts` (zoeken, maanden, favorieten, rust, vergelijken); 9 testbestanden `ronde*`, `audit*`, `nalopen` | Hernoemen naar onderwerp (`zoeken.ts`, `rust.ts`, `vergelijk.ts`); tests idem |
| C4 | M | Eén CSS-bestand van 1033 regels met 50 media queries en 62 selectoren die vaker voorkomen; `overflow-wrap: anywhere` op het hele hoofdvlak | `app3/styles/base.css:25`; de dubbele selectoren gemeten op 15 nov | Opsplitsen per scherm; `anywhere` alleen op gebruikersinhoud (namen, notities), zie U1 |
| C5 | M | De AI-herkenning van zakken is gebouwd maar niet aangesloten | `engine3/src/bean/ai.ts` en de Worker-route `/scan` (met Anthropic-sleutel en daglimiet) bestaan; `app3/src` roept haar nergens aan | Besluit: aansluiten (foto → velden, met toestemming) of uit de Worker halen (minder kosten en aanvalsoppervlak) |

## 2. Recepten

| # | Prio | Bevinding | Bewijs | Voorstel |
|---|---|---|---|---|
| R1 | H (besluit) | De V60-grens van 22 g is een schatting en spreekt de eigen bronnen tegen. Daardoor kan de app geen tweede kop op de V60 zetten (kop max. 280 g) | `engine3/src/data/brewer.ts`: `v60 { min 15, max 22 }`, bron "geschat (klasse C)". De eigen V60-recepten: Hoffmann 30 g/500 g, Wendelboe 32,5 g/500 g. De Chemex-grens is wél afgeleid uit de bronnen. In het voorbeeldlogboek leert de engine "te slap" en loopt al tegen de 22 g aan (22 g op 292 g, 1:13,3) | V60-grenzen afleiden zoals bij de Chemex (15–32,5 g → kop tot ~430 g), of porties zoals bij de Chemex (1 kop, 2 koppen) |
| R2 | L | De vinkjes "Over de vorige kop" (Meer opties) dubbelen wat de engine al uit je proefnotities haalt | `technique.ts:151` voegt `recurringFeedback` en de vinkjes samen; de vinkjes worden niet onthouden | Eén zin uitleg ("terugkerende klachten haalt de app zelf uit je proefnotities") of de vinkjes weglaten |
| R3 | L | Het effect van het filterpapier wordt nog niet gebruikt | Bewuste keuze (13 nov), er zijn nog geen gegevens | Verloop per filter zodra er een paar koppen per filter zijn |

## 3. Werking

| # | Prio | Bevinding | Bewijs | Voorstel |
|---|---|---|---|---|
| W1 | H | Synchroniseren gebeurt alleen met de knop | `Sync.tsx:59` "Nu synchroniseren"; nergens een automatische aanroep van `syncNow` | Vanzelf synchroniseren bij openen, na opslaan van een kop of zak, en bij terugkomen in de app |
| W2 | M | Achteraf aanpassen kan maar half | Proeven → aanpassen kent dosis, water, klik, bypass, kop en TDS, maar geen filter (`Proeven.tsx:93–95`). Een niet-afgerond zetsel kun je alleen verwijderen (`Logboek.tsx:120`). Gearchiveerde zakken zijn nergens terug te zien of terug te zetten (`beanRows({archived})` wordt in de app niet gebruikt) | Filter in "aanpassen"; bij "Niet afgerond" ook "Toch afronden en proeven"; een lijst "Gearchiveerd" met Terugzetten |
| W3 | M | De back-upherinnering zie je alleen als je Meer → Gegevens opent | `Gegevens.tsx:84–85` | Ook op het Meer-overzicht tonen, of vervalt met W1 als synchronisatie aanstaat |
| W4 | M | De welkomstkaart vraagt nog naar "een back-up van de vorige versie" | Schermafbeelding welkom; de oude app is weg en de gegevens zijn overgezet | Kaart weglaten, of algemeen "Back-up terugzetten" |
| W5 | L | Het zetformulier vat de keuze samen zonder filter | Samenvatting "Verloopzak · 250 g · geen voorkeur" | Filter (als gekozen) in de samenvatting |

## 4. UI/UX

| # | Prio | Bevinding | Bewijs | Voorstel |
|---|---|---|---|---|
| U1 | H | Woorden breken midden in af | Gemeten op 320, 390 en 430 px: de knop **"VOLGEND / E"** in Proeven al op **390 px** (stap 2–5); smaakcategorieën ("Gefermenteerd", "Plantaardig", "Geroosterd", "Specerijen"), de kop "Synchronisatie" en "gemiddeld" in het Meer-etiket op 320 px. Oorzaak: `overflow-wrap: anywhere` op `.main` | `anywhere` alleen op gebruikersinhoud; elders `break-word`; de primaire knop in Proeven over de volle breedte; een test die woordbreuk meet op alle schermen (de schermronde van 15 nov mat dit niet) |
| U2 | M | Meerkeuze ziet eruit als enkele keuze | Afdronk is `role="checkbox"`, maar het vakje is rond (`base.css:714`); Zuurgraad (één keuze) heeft geen teken | Vierkant vakje bij meerdere keuzes; een rondje (radio) bij één keuze |
| U3 | M | Twee fotoknoppen bij een nieuwe zak | "QR-foto kiezen" en "Foto kiezen" | Eén knop: de zakfoto, waarin de app ook naar een QR-code zoekt |
| U4 | L | Drie tijdsaanduidingen bij hetzelfde recept | "Verwacht klaar tussen 3:24 en 3:51", "klaar rond 3:24–3:51" op de startknop en "Haal de V60 eraf op 3:30" | Eén aanduiding op de kaart; de knop houdt alleen "Start zetsel" of de tijd |

## 5. Ontwerp (visueel)

| # | Prio | Bevinding | Voorstel |
|---|---|---|---|
| D1 | M | In het zetformulier drie soorten bediening door elkaar: knoppen (brewer, doel), keuzelijsten (zak, filter, techniek) en een stapper (kop) | Kiezen per soort vraag: knoppen bij 2–3 korte keuzes, keuzelijst bij lange lijsten; Doel (4 keuzes over 2 regels) eventueel als keuzelijst |
| D2 | L | Proeven op de telefoon: de inhoud staat bovenaan, met veel leegte eronder; de knoppen staan halverwege | De knoppen onderaan vastzetten (zoals de startknop in Zetten) |
| D3 | L | De primaire knop in Proeven is smaller dan de rest | Volle breedte, zie U1 |

## 6. Overig

| # | Prio | Bevinding | Bewijs | Voorstel |
|---|---|---|---|---|
| O1 | H | Safari wordt nergens getest, terwijl de app op iPhone en iPad draait | Alleen Chromium in CI en in deze omgeving; de CSP, `:has()`, wake lock en de update van de service worker zijn in Safari niet gezien | Playwright WebKit in CI voor een kleine set (opstart, CSP, foto, timer, PWA); dat vraagt een wijziging in de CI en dus je akkoord |
| O2 | H | De uitrol hangt aan het uploaden van een zip | De live site liep vier rondes achter (15 nov) en staat nu weer achter op ronde 3 | Netlify aan GitHub koppelen |
| O3 | L | Geen versie van de app zelf in Over | Over toont de engine en het contract, niet de bouw | Bouwversie (de versie van de service worker) in Over, handig bij "staat de nieuwe versie erop?" |

## Voorgestelde volgorde

1. **Nu:** U1 (woordbreuk, met test), W4 (welkomstkaart), U2 (vakjes). *Gedaan op 17 nov; zie `bouwbesluiten_v4.md`. Daarmee is ook D3 opgelost, en het deel van C4 over `anywhere`.*
2. **Besluiten:** R1 (V60-grens of porties), C5 (AI aansluiten of weghalen), O1 (WebKit in CI), O2 (Netlify koppelen). *Besloten en uitgevoerd op 17 nov: R1 grens 32,5 g, C5 weggehaald, O1 aparte WebKit-job (niet verplicht), O2 de zip blijft. Zie `bouwbesluiten_v4.md`.*
3. **Daarna:** W1 (automatisch synchroniseren), W2 (achteraf aanpassen en archief), W3, U3, D1. *Gedaan op 17 nov, met een melding als een foto niet opgeslagen kon worden; zie `bouwbesluiten_v4.md`.*
4. **Onderhoud:** C1–C4, U4, D2, D3, W5, R2, O3. *Gedaan op 18 nov: C2, C3, C4, U4, D2, W5, O3; R2 met uitleg in plaats van weglaten (de vinkjes geven informatie die niet in de proefnotities staat); D3 al in stap 1. Open: C1 (formatter, besluit) en de waarschuwing bij een grote enkele giet (Hedrick).*
