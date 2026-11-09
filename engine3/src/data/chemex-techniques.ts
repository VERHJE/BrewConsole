// Engine 3 · de zes Chemex-recepten als data (onderzoek_chemex.md, 9 nov 2026).
//
// Gietmomenten, hoeveelheden en tips komen uit de recepten van de makers zelf (Stumptown, Verve, Pull & Pour)
// of uit de Prima Coffee-vergelijking (Barefoot, Blue Bottle, Onyx). Waar de bron een tijd niet noemt, staat
// er een plaatshouder die ook in `open` staat (en dus als melding bij het recept komt). Niets is zelf verzonnen.
// Besluit Jelle (9 nov 2026): een 6-kops Chemex; eerst de recepten uit het onderzoek, leren van eigen koppen volgt.

import type { TechniqueDef } from './techniques.ts';

export const CHEMEX_TECHNIQUES: readonly TechniqueDef[] = [
  {
    id: 'chemex_howell_cup',
    name: 'Chemex Howell (1 kop)',
    author: 'George Howell Coffee',
    sourceClass: 'A',
    methods: ['chemex'],
    sources: [{ title: 'George Howell Coffee, Chemex brew guide (PDF): "Chemex six cup, brew for one"', url: 'https://cdn.shopify.com/s/files/1/0550/4119/6267/files/ChemexCombined_1125.pdf', readPrimary: true }],
    axes: { agitation: 'low', structure: 'equal_pulses', extraction: 'normal' },
    reference: {
      doseG: 26.5, waterG: 390,
      tempC: 95, tempNote: 'Howell: 201 tot 205 °F (94 tot 96 °C); 95 °C is het midden van die band.',
      grind: 'drip-medium (bron); op jouw molen grover dan de V60',
      pours: [
        { atSec: 0, toG: 130, style: 'circles', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Binnen 20 seconden. Begin in het midden en werk in concentrische cirkels naar buiten.' },
        { atSec: 60, toG: 260, style: 'circles', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Binnen 20 seconden, weer in concentrische cirkels vanuit het midden. Richt op de donkere (droge) plekken; zijn alle plekken nat, giet dan midden in het bed om te roeren.' },
        { atSec: 120, toG: 390, style: 'circles', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Binnen 20 seconden, op dezelfde manier.' }
      ],
      prep: ['Spoel het filter met heet gefilterd water tot het glas warm is; gooi dat water weg.', 'De kant met drie lagen zit tegen de tuit; het papier sluit aan tegen de wand, zonder luchtbellen.', 'Schud het bed vlak en zet de weegschaal op nul.', 'Let op de luchtopening bij de tuit: het papier mag de geul niet dichtplakken (dan valt het doorlopen stil). Gebeurt dat, zet dan een stokje in de kan.'],
      finish: ['Het bed loopt na ongeveer 3:30 tot 4:00 door; haal het filter eruit en serveer.'],
      endSec: { lo: 210, hi: 240 },
      notes: ['Recept van de maker (klasse A) voor één kop van 340 g in een 6-kops Chemex: 25 tot 28 g koffie op 390 g water (ratio 1:14 tot 1:15,6).', 'De dosis 26,5 g is het midden van 25 tot 28 g.', 'Te sterk of bitter: iets grover malen; te zwak of zuur: iets fijner (Howell).']
    },
    scaling: 'De bron geeft 25 tot 28 g op 390 g water voor één kop (340 g) en 50 tot 57 g op 780 g voor twee.',
    role: 'Eén kop in de 6-kops Chemex: genoeg koffie voor een bruikbare laag.',
    open: []
  },
  {
    id: 'chemex_verve',
    name: 'Chemex Verve (1 kop)',
    author: 'Verve Coffee Roasters',
    sourceClass: 'A',
    methods: ['chemex'],
    sources: [{ title: 'Verve Coffee Roasters, Chemex brew guide (per kop)', url: null, readPrimary: true }],
    axes: { agitation: 'very_low', structure: 'equal_pulses', extraction: 'normal' },
    reference: {
      doseG: 15, waterG: 225,
      tempC: 96, tempNote: 'Verve: ongeveer 96 °C (niet exact in de bron).',
      grind: 'medium (bron); op jouw molen grover dan de V60',
      pours: [
        { atSec: 0, toG: 50, style: 'circles', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Langzame cirkels, alle koffie nat maken.' },
        { atSec: 40, toG: 115, style: 'circles', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Langzame cirkels.' },
        { atSec: 85, toG: 175, style: 'circles', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Langzame cirkels.' },
        { atSec: 130, toG: 225, style: 'circles', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Langzame cirkels.' }
      ],
      prep: ['Spoel het filter en verwarm de kan voor; gooi het water weg.', 'De dikke kant (drie lagen) van het filter zit tegen de tuit.', 'Let op de luchtopening bij de tuit: het papier mag de geul niet dichtplakken (dan valt het doorlopen stil). Gebeurt dat, zet dan een stokje in de kan.'],
      finish: ['Haal het filter eruit als het bed bijna droog is.'],
      endSec: { lo: 210, hi: 240 },
      notes: ['Een recept per kop voor een kleine Chemex; in een 6-kops is het bed dun, dus het kan sneller doorlopen.', 'De bron noemt de tijden van de derde en vierde giet niet; 1:25 en 2:10 zijn een plaatshouder.']
    },
    scaling: 'De bron geeft alleen 15/225.',
    role: 'Eén kop op de Chemex, rustig en zonder roeren.',
    open: ['Plaatshouder: de momenten van giet 3 en 4 (1:25 en 2:10) staan niet in de bron.']
  },
  {
    id: 'chemex_pull_pour',
    name: 'Chemex Pull & Pour',
    author: 'Pull & Pour',
    sourceClass: 'B',
    methods: ['chemex'],
    sources: [{ title: 'Pull & Pour, Chemex method', url: null, readPrimary: true }],
    axes: { agitation: 'very_low', structure: 'one_main_pour', extraction: 'normal' },
    reference: {
      doseG: 24, waterG: 385,
      tempC: 94, tempNote: 'Pull & Pour noemt 91 tot 96 °C; 94 °C is het midden van die band.',
      grind: 'medium-grof',
      pours: [
        { atSec: 0, toG: 50, style: 'spiral', styleGiven: false, agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Ongeveer 50 g, minstens 20 seconden, daarna wachten.', after: 'Laat bloemen tot 0:45.' },
        { atSec: 45, toG: 385, style: 'spiral', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Eén langzame, doorlopende giet vanuit het midden naar buiten; ongeveer 2 minuten.' }
      ],
      prep: ['Spoel het filter en verwarm de kan voor; gooi het water weg.', 'Let op de luchtopening bij de tuit: het papier mag de geul niet dichtplakken (dan valt het doorlopen stil). Gebeurt dat, zet dan een stokje in de kan.'],
      finish: ['Laat het doorlopen; klaar rond 3:45.'],
      endSec: { lo: 210, hi: 240 },
      notes: ['Eén gietbeurt na de bloem: de minste agitatie van alle Chemex-recepten.', 'Bron: 3:45, afgerond 3:30 tot 4:00.']
    },
    scaling: 'De bron geeft alleen 24/385.',
    role: 'Eén of twee koppen, kalm en met één giet.',
    open: []
  },
  {
    id: 'chemex_barefoot',
    name: 'Chemex Barefoot',
    author: 'Barefoot Coffee Roasters (via Prima Coffee)',
    sourceClass: 'B',
    methods: ['chemex'],
    sources: [{ title: 'Prima Coffee, Comparing Chemex recipes (7 roasterrecepten, dezelfde boon en molen)', url: null, readPrimary: true }],
    axes: { agitation: 'medium', structure: 'few_pours', extraction: 'normal' },
    reference: {
      doseG: 50, waterG: 750,
      tempC: 96, tempNote: 'Barefoot: 204 °F (96 °C).',
      grind: 'medium-grof',
      pours: [
        { atSec: 0, toG: 75, style: 'spiral', styleGiven: false, agitationAfter: 'swirl', waitForDrain: false, drainCue: null, tip: 'Bloem van 1,5 × de dosis.', after: 'Swirl de kan zodat alle koffie nat wordt. Laat bloemen 30 tot 50 seconden.' },
        { atSec: 40, toG: 750, style: 'circles', agitationAfter: 'stir', waitForDrain: false, drainCue: null, tip: 'Eén felle giet in een cirkel; vermijd de rand van het filter.', after: 'Roer het bed bij de randen om koffie van de wand te halen.' }
      ],
      prep: ['Spoel het filter en verwarm de kan voor; gooi het water weg.', 'Let op de luchtopening bij de tuit: het papier mag de geul niet dichtplakken (dan valt het doorlopen stil). Gebeurt dat, zet dan een stokje in de kan.'],
      finish: ['Laat het doorlopen; klaar rond 4:00.'],
      endSec: { lo: 225, hi: 255 },
      notes: ['In de Prima-vergelijking het hoogste cijfer (10/10, één lichte washed boon, één proever): geen bewijs, wel een aanwijzing.', 'Het moment van de tweede giet is het midden van de bron (30 tot 50 s).']
    },
    scaling: 'De bron geeft alleen 50/750.',
    role: 'Grotere portie (twee koppen tot een hele kan), weinig gietbeurten.',
    open: ['Plaatshouder: het moment van de tweede giet (0:40) is het midden van 30 tot 50 s.']
  },
  {
    id: 'chemex_stumptown',
    name: 'Chemex Stumptown',
    author: 'Stumptown Coffee Roasters',
    sourceClass: 'A',
    methods: ['chemex'],
    sources: [{ title: 'Stumptown, Chemex brew guide (ook als transcript van de video, aangeleverd door Jelle, 9 nov 2026)', url: null, readPrimary: true }],
    axes: { agitation: 'medium', structure: 'few_pours', extraction: 'normal' },
    reference: {
      doseG: 42, waterG: 700,
      tempC: 96, tempNote: 'Stumptown: 205 °F (96 °C).',
      grind: 'medium-grof',
      pours: [
        { atSec: 0, toG: 150, style: 'spiral', styleGiven: false, agitationAfter: 'stir', waitForDrain: false, drainCue: null, tip: 'Bloem van ongeveer 3,5 × de dosis.', after: 'Roer zodat alle koffie nat is. Laat bloemen 45 seconden.' },
        { atSec: 45, toG: 450, style: 'spiral', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Eerst fel wiebelend over de donkere plekken, dan zacht in een spiraal, tot 450 g of dicht bij de rand. Giet over de donkere plekken en vermijd de lichte.' },
        { atSec: 105, toG: 700, style: 'spiral', styleGiven: false, agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Giet tot 700 g, of tot het slurry-niveau ongeveer gelijk is aan de bovenkant van de Chemex.' }
      ],
      prep: ['Spoel het filter en verwarm de kan voor; gooi het water weg.', 'De dikke kant (drie lagen) van het filter zit tegen de tuit; de enkele laag zit er vanaf.', 'Let op de luchtopening bij de tuit: het papier mag de geul niet dichtplakken (dan valt het doorlopen stil). Gebeurt dat, zet dan een stokje in de kan.'],
      finish: ['Op ongeveer 4:00 moet je dicht bij het doelvolume zijn (let op de glazen bel aan de zijkant van de kan). Til het filter voorzichtig op en laat het even boven de kan uitdruppelen; haal het dan weg en swirl de kan.'],
      endSec: { lo: 240, hi: 240 },
      notes: ['Drie gietbeurten, gemiddelde agitatie, ratio 1:16,7.', 'In de Prima-vergelijking 9/10, samen met Blue Bottle en George Howell.', 'Het moment van de derde giet (1:45) komt uit de bron.']
    },
    scaling: 'De bron geeft alleen 42/700.',
    role: 'Standaard voor twee tot drie koppen: drie gietbeurten.',
    open: []
  },
  {
    id: 'chemex_blue_bottle',
    name: 'Chemex Blue Bottle (pulsen)',
    author: 'Blue Bottle Coffee',
    sourceClass: 'A',
    methods: ['chemex'],
    sources: [{ title: 'Blue Bottle Coffee, "How to brew Chemex pour over" (gecorrigeerd transcript van de video; aangeleverd door Jelle, 9 nov 2026)', url: null, readPrimary: true }, { title: 'Prima Coffee, Comparing Chemex recipes (eerdere bron)', url: null, readPrimary: true }],
    axes: { agitation: 'low', structure: 'equal_pulses', extraction: 'normal' },
    reference: {
      doseG: 50, waterG: 700,
      tempC: 97, tempNote: 'Blue Bottle: 205 tot 210 °F (96 tot 99 °C); 97 °C is het midden van die band.',
      grind: 'medium-grof, iets fijner dan French press (zeezout)',
      pours: [
        { atSec: 0, toG: 100, style: 'spiral', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Bloem van ongeveer 100 g. Vanuit het midden naar buiten en terug tot alle koffie nat is; een rondje duurt ongeveer een seconde.' },
        { atSec: 45, toG: 300, style: 'spiral', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Hetzelfde patroon, naar de rand van de koffie en weer terug. Niet direct op het filter gieten. Het water moet bijna helemaal doorlopen zijn voor de volgende giet.' },
        { atSec: 110, toG: 500, style: 'spiral', agitationAfter: 'none', waitForDrain: true, drainCue: 'Blue Bottle: het water moet bijna helemaal door de koffie zijn voor je weer giet', tip: 'Hetzelfde patroon. Daarna weer laten doorlopen.' },
        { atSec: 190, toG: 700, style: 'spiral', agitationAfter: 'none', waitForDrain: true, drainCue: 'idem', tip: 'Hetzelfde patroon tot 700 g.' }
      ],
      prep: ['Verwarm de ketel (ongeveer vol) tot 96 tot 99 °C: genoeg om de Chemex voor te verwarmen en te brouwen.', 'De drie lagen van het filter tegen de tuit. Spoel het filter grondig en gooi het water weg (verwarmt de kan, zorgt voor een goede afsluiting, haalt smaak van het papier).', 'Schud het bed vlak en zet de weegschaal op nul.', 'Let op de luchtopening bij de tuit: het papier mag de geul niet dichtplakken (dan valt het doorlopen stil). Gebeurt dat, zet dan een stokje in de kan.'],
      finish: ['Klaar na ongeveer 4 minuten; langer is niet ongewoon, vooral bij lichtgebrande koffie van grote hoogte. Als het water uitgedruppeld is: filter weg.'],
      endSec: { lo: 210, hi: 270 },
      notes: ['Eigen bron van Blue Bottle (klasse A): vier gietbeurten, samen 700 g, 50 g koffie. Moment 0:45, 1:50 en 3:10 komen uit de bron.', 'Gietmomenten 3 en 4 zijn in de bron aan het doorlopen gekoppeld; de klok is een richtlijn.']
    },
    scaling: 'De bron geeft alleen 50/700.',
    role: 'Pulsen voor een grotere portie; het bed blijft laag.',
    open: []
  },
  {
    id: 'chemex_onyx',
    name: 'Chemex Onyx (hele kan, lang)',
    author: 'Onyx Coffee Lab',
    sourceClass: 'A',
    methods: ['chemex'],
    sources: [{ title: 'Onyx Coffee Lab (Dylan Siemens), "How to brew with the Chemex" director\'s cut (transcript op basis van ondertitels, niet op audio gecontroleerd; aangeleverd door Jelle, 9 nov 2026)', url: null, readPrimary: true }, { title: 'Prima Coffee, Comparing Chemex recipes (eerdere bron)', url: null, readPrimary: true }],
    axes: { agitation: 'medium', structure: 'equal_pulses', extraction: 'high' },
    reference: {
      doseG: 55, waterG: 900,
      tempC: 96, tempNote: 'Onyx via Prima Coffee: 205 °F (96 °C); het transcript noemt geen temperatuur.',
      grind: 'aan de grove kant, iets grover dan je denkt (de grootte van het cijfer op een muntje)',
      pours: [
        { atSec: 0, toG: 110, style: 'circles', agitationAfter: 'stir', waitForDrain: false, drainCue: null, tip: 'Bloem van 2 × de dosis. Cirkel van binnen naar buiten, terug naar binnen en weer naar buiten.', after: 'Zet een lepel of stokje diep in het midden van het filter en laat het bed in verschillende richtingen leunen, zodat het water overal in het bed trekt. Laat bloemen tot 0:45.' },
        { atSec: 45, toG: 300, style: 'center', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Raak eerst het midden, cirkel naar buiten en kom terug naar het midden; giet daar vrij zwaar. Het bed komt ongeveer halverwege de kan.' },
        { atSec: 90, toG: 500, style: 'center', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Blijf in het midden gieten; het hoort daar te borrelen. Het bed loopt iets hoger dan de vorige keer.' },
        { atSec: 150, toG: 700, style: 'center', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Blijf in het midden gieten; let op het borrelen. Dit brengt het bed bijna bij de bovenkant van de Chemex.' },
        { atSec: 210, toG: 900, style: 'center', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Giet in het midden tot 850 g, dan langzaam naar buiten cirkelen om alles naar beneden te wassen en terug naar het midden voor de laatste 50 g. Klaar met gieten rond 4:00.' }
      ],
      prep: ['Spoel het filter met heet water en gooi het weg. De drie lagen tegen de tuit.', 'Let op de luchtopening bij de tuit: het papier mag de geul niet dichtplakken (dan valt het doorlopen stil). Gebeurt dat, zet dan een stokje in de kan.'],
      finish: ['Het uitlopen duurt tot ongeveer 6 minuten, maximaal 7. Duurt het langer, maal dan nog grover.'],
      endSec: { lo: 360, hi: 420 },
      notes: ['Eigen bron van Onyx (klasse A): 55 g op 900 g, vijf gietbeurten inclusief de bloem; het midden wordt bewust uitgegraven, zodat een diep bed gelijkmatig extraheert.', 'Redenatie: begin met een laag bed en breng het steeds hoger, want een hoger bed loopt sneller door.', 'De bron noemt totalen van 300, 500, 700 en 900 g.', '900 g water is bijna de rand van een 6-kops Chemex (885 ml).']
    },
    scaling: 'De bron geeft alleen 55/900.',
    role: 'Een hele kan voor meerdere mensen, lange contacttijd.',
    open: []
  },
  {
    id: 'chemex_hedrick',
    name: 'Chemex Hedrick (grote portie)',
    author: 'Lance Hedrick',
    sourceClass: 'A',
    methods: ['chemex'],
    sources: [{ title: 'Lance Hedrick, "Chemex brew guide" (gecorrigeerd transcript van de video; aangeleverd door Jelle, 9 nov 2026)', url: null, readPrimary: true }],
    axes: { agitation: 'medium', structure: 'few_pours', extraction: 'normal' },
    reference: {
      doseG: 40, waterG: 650,
      tempC: 100, tempNote: 'Hedrick: vers kokend water (bij donkerder gebrande koffie koeler, geen getal).',
      grind: 'zeer grof: 30 klikken op een Comandante C40, ongeveer 900 µm',
      pours: [
        { atSec: 0, toG: 100, style: 'spiral', agitationAfter: 'swirl', waitForDrain: false, drainCue: null, tip: 'Bloem van 100 g, vanuit het midden naar buiten.', after: 'Swirl tot de klonten weg zijn en het gas eruit is; niet overdrijven, anders schieten er fijne deeltjes uit het bed en slibt het filter dicht.' },
        { atSec: 30, toG: 200, style: 'spiral', styleGiven: false, agitationAfter: 'swirl', waitForDrain: false, drainCue: null, tip: 'Een tweede bloem van 100 g (de koffie is ongeveer een week oud: er zit gas achter de korst).', after: 'Weer swirlen tot de klonten weg zijn.' },
        { atSec: 60, toG: 400, style: 'circles', agitationAfter: 'gentle_swirl', waitForDrain: false, drainCue: null, tip: 'Een agressieve giet van 200 g, cirkels ongeveer in het midden. Niet te fel, anders slibt het.', after: 'Direct een lichte, zachte swirl, zodat het bed weer kan zakken en kanalen minder kans krijgen.' },
        { atSec: 120, toG: 550, style: 'spiral', styleGiven: false, agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Giet 150 g. Het water koelt in het glas snel af; houd de agitatie laag.' },
        { atSec: 180, toG: 650, style: 'spiral', styleGiven: false, agitationAfter: 'gentle_swirl', waitForDrain: false, drainCue: null, tip: 'De laatste 100 g zachter, zodat er minder fijne deeltjes en bittere stoffen in de kop komen.', after: 'Eén kleine swirl om af te ronden.' }
      ],
      prep: ['Spoel het filter grondig (er zit veel papier, de smaak is merkbaar) en gooi het water weg; Hedrick raadt het gebleekte filter aan.', 'Leg een stokje (glas, eetstokje of dun) in de Chemex voor de luchtopening en zet de weegschaal op nul.', 'Doe de koffie in het filter en draai met een stokje een kuiltje in het bed, zodat het bed met weinig beweging nat wordt.', 'Optioneel (Hedrick): knip het filter bij naar twee en twee lagen, of dek de geul af met een stukje siliconen.', 'Let op de luchtopening bij de tuit: het papier mag de geul niet dichtplakken (dan valt het doorlopen stil). Gebeurt dat, zet dan een stokje in de kan.'],
      finish: ['Het uitlopen duurt hier ongeveer 5 minuten; 4:30 is het snelste dat je verwacht, het kan oplopen tot 7 of 8 minuten en dat is goed. Pas bij 15 tot 20 minuten is er iets mis.'],
      endSec: { lo: 270, hi: 300 },
      notes: ['Eigen bron van Hedrick (klasse A): 40 g op 650 g, de Chemex is voor grote doses. TDS 1,25 tot 1,5 en extractie 18,5 tot 20 %.', 'Hij mat dat de slurry-temperatuur in het glas snel daalt; de lange contacttijd is daarom geen probleem.', 'Wil je meer extractie: fijner malen, meer agitatie of een grotere ratio; hij noemt het een startrecept.', 'De momenten 2:00 en 3:00 zijn afgeleid uit "een minuut tussen elke giet daarna" en uit "klaar met gieten rond 3:10" (plaatshouder).']
    },
    scaling: 'De bron geeft alleen 40/650; hij zegt dat je het aantal gietbeurten en de nadruk kunt verschuiven.',
    role: 'Een grote portie met veel agitatie in het begin en een zachte laatste giet.',
    open: ['Plaatshouder: de momenten van giet 4 en 5 (2:00 en 3:00) zijn afgeleid uit "een minuut tussen elke giet daarna".']
  },
  {
    id: 'chemex_ox',
    name: 'Chemex Ox Coffee (kleine portie)',
    author: 'Isabel Soto, Ox Coffee',
    sourceClass: 'B',
    methods: ['chemex'],
    sources: [{ title: 'Isabel Soto (Ox Coffee), Chemex tutorial, Pennsylvania Kitchen at Home (gecorrigeerd transcript; aangeleverd door Jelle, 9 nov 2026)', url: null, readPrimary: true }],
    axes: { agitation: 'low', structure: 'equal_pulses', extraction: 'normal' },
    reference: {
      doseG: 22, waterG: 360,
      tempC: 98, tempNote: 'Ox Coffee: ongeveer 209 °F (98 °C), net onder de kook.',
      grind: 'grof, zoals koosjer zout',
      pours: [
        { atSec: 0, toG: 65, style: 'center', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Bloem van 65 g, in het midden beginnen; richt de eerste paar gram in het kuiltje.' },
        { atSec: 35, toG: 215, style: 'circles', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'In kleine cirkels. Houd de stroom rustig en gelijkmatig: niet te snel en niet aan de ene kant zwaar en aan de andere dun.' },
        { atSec: 75, toG: 360, style: 'circles', styleGiven: false, agitationAfter: 'swirl', waitForDrain: false, drainCue: null, tip: 'Giet alles voor 2:00 erin.', after: 'Een zachte swirl bovenin, zodat de koffie van de zijkant van het filter terugkomt en het bed vlak is.' }
      ],
      prep: ['Houd de drie lagen van het filter tegen de tuit, anders klapt het in de kan. Spoel het filter (houd het tijdens het spoelen een beetje vast) en gooi het water weg.', 'Vlak het bed en maak met je vinger een kuiltje in het midden, zodat er geen droge plek in het midden blijft.', 'Let op de luchtopening bij de tuit: het papier mag de geul niet dichtplakken (dan valt het doorlopen stil). Gebeurt dat, zet dan een stokje in de kan.'],
      finish: ['Klaar uiterlijk 3:30. Zwenk de kan even en serveer.'],
      endSec: { lo: 210, hi: 210 },
      notes: ['Bron van een kleine roaster in een tv-programma (klasse B): 22 g op 360 g (1:16,4), net onder de kook. De grootte van de Chemex wordt niet genoemd.', 'Tweede bron voor een kleine dosis naast Howell (25 tot 28 g op 390 g).']
    },
    scaling: 'De bron geeft alleen 22/360.',
    role: 'Eén kop in een Chemex, kalm en kort.',
    open: ['De grootte van de Chemex is in de bron niet genoemd.']
  }
];
