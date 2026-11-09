// Engine 3 · de zes Chemex-recepten als data (onderzoek_chemex.md, 9 nov 2026).
//
// Gietmomenten, hoeveelheden en tips komen uit de recepten van de makers zelf (Stumptown, Verve, Pull & Pour)
// of uit de Prima Coffee-vergelijking (Barefoot, Blue Bottle, Onyx). Waar de bron een tijd niet noemt, staat
// er een plaatshouder die ook in `open` staat (en dus als melding bij het recept komt). Niets is zelf verzonnen.
// Besluit Jelle (9 nov 2026): een 6-kops Chemex; eerst de recepten uit het onderzoek, leren van eigen koppen volgt.

import type { TechniqueDef } from './techniques.ts';

export const CHEMEX_TECHNIQUES: readonly TechniqueDef[] = [
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
      prep: ['Spoel het filter en verwarm de kan voor; gooi het water weg.', 'De dikke kant (drie lagen) van het filter zit tegen de tuit.'],
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
      prep: ['Spoel het filter en verwarm de kan voor; gooi het water weg.'],
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
      prep: ['Spoel het filter en verwarm de kan voor; gooi het water weg.'],
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
    sources: [{ title: 'Stumptown, Chemex brew guide', url: null, readPrimary: true }],
    axes: { agitation: 'medium', structure: 'few_pours', extraction: 'normal' },
    reference: {
      doseG: 42, waterG: 700,
      tempC: 96, tempNote: 'Stumptown: 205 °F (96 °C).',
      grind: 'medium-grof',
      pours: [
        { atSec: 0, toG: 150, style: 'spiral', styleGiven: false, agitationAfter: 'stir', waitForDrain: false, drainCue: null, tip: 'Bloem van ongeveer 3,5 × de dosis.', after: 'Roer zodat alle koffie nat is. Laat bloemen 45 seconden.' },
        { atSec: 45, toG: 450, style: 'spiral', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Eerst fel wiebelend over de donkere plekken, dan zacht in een spiraal.' },
        { atSec: 105, toG: 700, style: 'spiral', styleGiven: false, agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Giet tot 700 g.' }
      ],
      prep: ['Spoel het filter en verwarm de kan voor; gooi het water weg.', 'De dikke kant (drie lagen) van het filter zit tegen de tuit.'],
      finish: ['Haal het filter eruit op ongeveer 4:00 als het bed bijna droog is; swirl de kan.'],
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
    author: 'Blue Bottle Coffee (via Prima Coffee)',
    sourceClass: 'B',
    methods: ['chemex'],
    sources: [{ title: 'Prima Coffee, Comparing Chemex recipes (de eigen pagina van Blue Bottle was niet bereikbaar)', url: null, readPrimary: true }],
    axes: { agitation: 'low', structure: 'equal_pulses', extraction: 'normal' },
    reference: {
      doseG: 50, waterG: 700,
      tempC: 96, tempNote: 'Blue Bottle: 205 °F (96 °C).',
      grind: 'medium-grof',
      pours: [
        { atSec: 0, toG: 100, style: 'spiral', styleGiven: false, agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Bloem van 2 × de dosis. Laat 45 tot 55 seconden bloemen.' },
        { atSec: 50, toG: 300, style: 'spiral', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Vanuit het midden naar buiten, in een spiraal.' },
        { atSec: 110, toG: 500, style: 'spiral', agitationAfter: 'none', waitForDrain: true, drainCue: 'Blue Bottle: laat het water zakken tot ongeveer 2,5 cm boven het bed voor je weer giet', tip: 'Naar buiten en weer terug naar het midden.' },
        { atSec: 170, toG: 700, style: 'spiral', agitationAfter: 'none', waitForDrain: true, drainCue: 'idem', tip: 'Naar buiten en weer terug naar het midden.' }
      ],
      prep: ['Spoel het filter en verwarm de kan voor; gooi het water weg.'],
      finish: ['Laat het doorlopen; klaar tussen 3:30 en 4:30.'],
      endSec: { lo: 210, hi: 270 },
      notes: ['Drie gietbeurten van 200 g na de bloem; het water zakt tot ongeveer 2,5 cm tussen de gietbeurten.', 'De momenten 0:50, 1:50 en 2:50 zijn een plaatshouder: de bron koppelt de giet aan het zakken, niet aan de klok.']
    },
    scaling: 'De bron geeft alleen 50/700.',
    role: 'Pulsen voor een grotere portie; het bed blijft laag.',
    open: ['Plaatshouder: de momenten van de gietbeurten (de bron koppelt ze aan het zakken van het water).']
  },
  {
    id: 'chemex_onyx',
    name: 'Chemex Onyx (hele kan, lang)',
    author: 'Onyx Coffee Lab (via Prima Coffee)',
    sourceClass: 'B',
    methods: ['chemex'],
    sources: [{ title: 'Prima Coffee, Comparing Chemex recipes (de eigen pagina van Onyx was niet te vinden)', url: null, readPrimary: true }],
    axes: { agitation: 'medium', structure: 'equal_pulses', extraction: 'high' },
    reference: {
      doseG: 55, waterG: 900,
      tempC: 96, tempNote: 'Onyx: 205 °F (96 °C).',
      grind: 'medium-grof',
      pours: [
        { atSec: 0, toG: 110, style: 'spiral', styleGiven: false, agitationAfter: 'stir', waitForDrain: false, drainCue: null, tip: 'Bloem van 2 × de dosis.', after: 'Roer zodat alle koffie nat is. Laat bloemen 45 seconden.' },
        { atSec: 45, toG: 310, style: 'center', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Gericht op het midden.' },
        { atSec: 90, toG: 510, style: 'center', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Gericht op het midden.' },
        { atSec: 150, toG: 710, style: 'center', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'Gericht op het midden.' },
        { atSec: 210, toG: 900, style: 'spiral', agitationAfter: 'none', waitForDrain: false, drainCue: null, tip: 'De laatste giet in een spiraal naar buiten.' }
      ],
      prep: ['Spoel het filter en verwarm de kan voor; gooi het water weg.'],
      finish: ['Het uitlopen duurt 2 tot 3 minuten; klaar tussen 6:00 en 7:00.'],
      endSec: { lo: 360, hi: 420 },
      notes: ['Vier gietbeurten van ongeveer 200 g na de bloem; hele kan, lange contacttijd.', 'In de Prima-vergelijking 8/10: weinig fruit, nauwelijks bitter.', '900 g water is bijna de rand van een 6-kops Chemex (885 ml); de laatste giet vraagt aandacht.']
    },
    scaling: 'De bron geeft alleen 55/900.',
    role: 'Een hele kan voor meerdere mensen, lange contacttijd.',
    open: ['Let op: 900 g water past maar net in een 6-kops Chemex.']
  }
];
