// Engine 3 · de acht technieken als data (verslag 'Technieken: de keuze voor de herbouw' en
// 'Punt 2 · Bronnenwerk'). Elk getal hieronder komt uit de genoemde bron; waar een bron iets niet
// zegt, staat er null. Niets is aangevuld met eigen schattingen.
//
// Bronklasse: A = eigen tekst/video van de bedenker of diens bedrijf; B = interview of
// receptensite die het recept aan de bedenker toeschrijft, consistent; C = één tweedehands bron.

import type { Agitation, Method, PourStyle, TechniqueId } from '../types.ts';
import { CHEMEX_TECHNIQUES } from './chemex-techniques.ts';

export type SourceClass = 'A' | 'A/B' | 'B' | 'C';
export type AgitationLevel = 'very_low' | 'low' | 'medium' | 'high';
export type PourStructure = 'two_phase' | 'equal_pulses' | 'few_pours' | 'one_main_pour' | 'continuous';
export type ExtractionLevel = 'normal' | 'high';

export interface Source {
  readonly title: string;
  readonly url: string | null;
  /** Zelf gelezen in deze sessie (true) of alleen via een samenvatting (false). */
  readonly readPrimary: boolean;
}

export interface ReferencePour {
  readonly atSec: number;
  /** Totaal op de weegschaal na deze giet. */
  readonly toG: number;
  readonly style: PourStyle;
  readonly agitationAfter: Agitation;
  /** De bron koppelt het moment aan het doorlopen i.p.v. (alleen) aan de klok. */
  readonly drainCue: string | null;
  /** Gieten pas als het bed (bijna) doorgelopen is; de klok is dan alleen een richtlijn. */
  readonly waitForDrain: boolean;
  /**
   * false = de bron noemt geen gietpatroon voor deze giet (dan toont de app er niets over; `style` is dan een
   * neutrale invulling die het recept nodig heeft). Weggelaten = de bron noemt het patroon (of is niet opnieuw gecontroleerd).
   */
  readonly styleGiven?: false;
  /** Wat de bron zegt over HOE je deze giet doet (tempo, hoogte, waar), in gewone taal. */
  readonly tip?: string;
  /** Wat de bron zegt over wat er na deze giet gebeurt, naast `agitationAfter` (hoe, hoe lang, wanneer). */
  readonly after?: string;
}

export interface TechniqueDef {
  readonly id: TechniqueId;
  readonly name: string;
  readonly author: string;
  readonly sourceClass: SourceClass;
  readonly sources: readonly Source[];
  readonly axes: {
    readonly agitation: AgitationLevel;
    readonly structure: PourStructure;
    readonly extraction: ExtractionLevel;
  };
  /** Het recept precies zoals de (beste) bron het geeft. */
  readonly reference: {
    readonly doseG: number;
    readonly waterG: number;
    readonly tempC: number | null;
    /** Tekst uit de bron als er geen getal is ('hoe heter hoe beter'). */
    readonly tempNote: string | null;
    readonly grind: string | null;
    readonly pours: readonly ReferencePour[] | null;
    /** Voor de start (filter spoelen, kuiltje maken, ...), uit de bron. */
    readonly prep?: readonly string[];
    /** Na de laatste giet (uitlopen, roeren voor het serveren, ...), uit de bron. */
    readonly finish?: readonly string[];
    readonly endSec: { readonly lo: number; readonly hi: number } | null;
    readonly notes: readonly string[];
  };
  /** Wat de bron zegt over andere hoeveelheden. */
  readonly scaling: string;
  /** Voor welke brewers het recept gemaakt is; weggelaten = alleen de V60. */
  readonly methods?: readonly Method[];
  /** Rol in de engine (verslag). */
  readonly role: string;
  /** Openstaande punten bij deze techniek. */
  readonly open: readonly string[];
}

export const V60_TECHNIQUES: readonly TechniqueDef[] = [
  {
    id: 'kasuya_46',
    name: 'Kasuya 4:6',
    author: 'Tetsu Kasuya',
    sourceClass: 'A/B',
    sources: [
      { title: 'Hario Europe, ambassadeursinterview Tetsu Kasuya', url: 'https://www.hario-europe.com/blogs/hario-community/v60-ambassadors-tetsu-kasuya', readPrimary: true },
      { title: 'Philocoffea (Kasuya\'s bedrijf), How to Make Coffee Using the 4:6 Brewing Method, 7 maart 2022', url: 'https://en.philocoffea.com/blogs/blog/coffee-brewing-method', readPrimary: true }
    ],
    axes: { agitation: 'medium', structure: 'two_phase', extraction: 'normal' },
    reference: {
      doseG: 20, waterG: 300,
      tempC: null,
      tempNote: 'Besluit Jelle (5 nov 2026): temperatuur per branding volgens Philocoffea — 93 °C licht, 88 °C medium, 83 °C donker. Hario-interview noemt 92 °C.',
      grind: 'grof (Hario); medium-grof tot grof (Philocoffea)',
      pours: [
        { atSec: 0, toG: 50, style: 'spiral', styleGiven: false, agitationAfter: 'none', waitForDrain: false, drainCue: null },
        { atSec: 45, toG: 120, style: 'spiral', styleGiven: false, agitationAfter: 'none', waitForDrain: true, drainCue: 'Philocoffea: pas gieten als het water bijna helemaal door het filter is' },
        { atSec: 90, toG: 180, style: 'spiral', styleGiven: false, agitationAfter: 'none', waitForDrain: true, drainCue: 'idem' },
        { atSec: 130, toG: 240, style: 'spiral', styleGiven: false, agitationAfter: 'none', waitForDrain: true, drainCue: 'idem' },
        { atSec: 160, toG: 300, style: 'spiral', styleGiven: false, agitationAfter: 'none', waitForDrain: true, drainCue: 'idem' }
      ],
      finish: ['Haal de V60 eraf op 3:30.'],
      endSec: { lo: 210, hi: 210 },
      notes: [
        'Eerste 40 % (120 g) in twee gieten: kleinere eerste giet = zoeter, grotere = zuurder/helderder (Hario, Philocoffea).',
        'Rest (60 %) in gelijke delen; minder gieten = lichter, meer = sterker (Philocoffea: bij donkere branding met twee gieten beginnen).',
        'Hario-voorbeeld: 50 + 70; Philocoffea: 5 × 60 g (0:00, 0:45, 1:30, 2:15, 2:45). Besluit Jelle: Hario-momenten als basis.',
        'Filter eraf op 3:30.',
        'Gecontroleerd tegen Philocoffea en het Hario-interview (9 nov 2026): geen van beide noemt een gietpatroon, tempo of hoogte; de app toont dus geen "in spiraal".'
      ]
    },
    scaling: 'Philocoffea: water = dosis × 15, per giet dosis × 3. Besluit Jelle: bij elke hoeveelheid dezelfde gietmomenten; het einde wordt per hoeveelheid uit eigen zetsels geleerd (bronnen bij 15/20/30 g houden ~3:30 aan; de maalgraad schaalt mee).',
    role: 'Kern en terugval; de meeste koffies.',
    open: []
  },
  {
    id: 'hoffmann_ultimate',
    name: 'Hoffmann Ultimate V60',
    author: 'James Hoffmann',
    sourceClass: 'A/B',
    sources: [{ title: 'Hario USA, James Hoffmann Ultimate V60 Technique', url: 'https://www.hario-usa.com/blogs/recipes-and-more-from-friends/james-hoffmann-uitimate-v60-technique', readPrimary: true }],
    axes: { agitation: 'medium', structure: 'few_pours', extraction: 'normal' },
    reference: {
      doseG: 30, waterG: 500,
      tempC: 100, tempNote: "Hario USA: 'the hotter, the better (especially with lighter roasts)' en 'water just off the boil' voor het spoelen; secundaire gidsen: net van de kook. Licht en medium: net van de kook (100 °C op de ketel). Donker: 88 °C (alleen secundair, klasse C; aanname).",
      grind: 'medium-fijn',
      pours: [
        { atSec: 0, toG: 60, style: 'spiral', styleGiven: false, agitationAfter: 'swirl', waitForDrain: false, drainCue: null,
          tip: 'Bloom: twee keer de dosis, zodat alle koffie nat wordt.',
          after: 'Swirl de V60 tot alles gelijkmatig nat is (swirlen werkt beter dan een lepel). Laat bloemen tot 0:45.' },
        { atSec: 45, toG: 300, style: 'spiral', styleGiven: false, agitationAfter: 'none', waitForDrain: false, drainCue: null,
          tip: 'In ongeveer 30 seconden tot 300 g.' },
        { atSec: 75, toG: 500, style: 'spiral', styleGiven: false, agitationAfter: 'stir', waitForDrain: false, drainCue: null,
          tip: 'Iets langzamer dan de vorige giet, niet te fel. Ongeveer 30 seconden.',
          after: 'Roer één keer met de klok mee en één keer tegen de klok in. Laat het even doorlopen en geef dan een zachte swirl.' }
      ],
      prep: ['Spoel het filter met water van net onder de kook.', 'Maak een kuiltje in het midden van de koffie.'],
      finish: ['Laat het doorlopen; klaar voor 3:30.'],
      endSec: { lo: 210, hi: 210 },
      notes: ['Gecontroleerd tegen Hario USA (9 nov 2026): de bron noemt geen gietpatroon en geen hoogte; wel "iets langzamer, niet te fel" bij de laatste giet.', 'Kuiltje in het bed; bloom 2 × de dosis en swirlen; bloom tot 0:45.', '0:45–1:15 tot 300 g (60 %), 1:15–1:45 tot 500 g, iets rustiger.', 'Op 1:45 één keer met en één keer tegen de klok in roeren; daarna even laten zakken en zacht swirlen.', 'Doorgelopen voor 3:30.']
    },
    scaling: 'Bron geeft alleen 30/500; de app-recepten gebruiken ook 15/250. Schalen op verhouding (1:16,7).',
    role: 'Gebalanceerde koffies, grotere hoeveelheden, basis op de Chemex.',
    open: []
  },
  {
    id: 'gagne',
    name: 'Gagné, hoge extractie',
    author: 'Jonathan Gagné',
    sourceClass: 'A',
    sources: [{ title: 'Coffee ad Astra, Brewing better coffee (30 nov 2018)', url: 'https://coffeeadastra.com/2018/11/30/brewing-better-coffee/', readPrimary: true }],
    axes: { agitation: 'medium', structure: 'few_pours', extraction: 'high' },
    reference: {
      doseG: 22, waterG: 352,
      tempC: 100, tempNote: 'kokend water (waterkoker opnieuw aan)',
      grind: 'fijner tot het samentrekkend wordt, dan één klik terug',
      pours: [
        { atSec: 0, toG: 66, style: 'spiral', styleGiven: false, agitationAfter: 'rao_spin', waitForDrain: false, drainCue: null,
          tip: 'Gelijkmatig en wat snel, beginnend in het kuiltje. Maak alles nat, vooral de donkere, droge plekken.',
          after: 'Houd de V60 zacht vast en doe direct de Rao-spin. Bloem en spin zijn klaar binnen 15 tot 20 seconden.' },
        { atSec: 30, toG: 200, style: 'spiral', agitationAfter: 'rao_spin', waitForDrain: false, drainCue: null,
          tip: 'Rustig, in spiralen over het oppervlak, eerst op de donkere plekken. Stop rond 200 g of als het water de bovenkant van de V60 nadert.',
          after: 'Doe een Rao-spin als het water ongeveer tweederde van de hoogte van de V60 staat.' },
        { atSec: 60, toG: 352, style: 'spiral', styleGiven: false, agitationAfter: 'rao_spin', waitForDrain: true, drainCue: 'tweede giet na de eerste (geen vaste tijd in de bron)',
          tip: 'Giet pas weer als het water het bed nadert, tot 352 g. Laat het bed niet droog vallen: dat koelt de koffie af.',
          after: 'Doe een laatste Rao-spin als het water weer laag genoeg is.' }
      ],
      prep: ['Spoel het filter goed met kokend water en gooi dat weg.', 'Schud de V60 zacht om het bed vlak te maken.', 'Maak met een vinger een klein, ondiep kuiltje in het midden.'],
      finish: ['Laat alles doorlopen (meestal tussen 2:30 en 3:30).', 'Swirl de koffie voor het drinken, want hij zakt weg.'],
      endSec: { lo: 150, hi: 210 },
      notes: ['Gecontroleerd tegen Coffee ad Astra (9 nov 2026): beschrijft de spiralen alleen voor de eerste hoofdgiet; de Rao-spins staan bij de bloem, bij tweederde hoogte en aan het eind.', 'Plastic V60, kuiltje (trench) maken.', '1:16, bij minder ontwikkelde branding 1:16,5–1:18.', 'Doel ~1,25 % TDS bij ~20 % EY.', 'Het moment van de laatste giet (60 s) is een aanname van dit bestand: de bron noemt alleen "tot ~200 g" en dan "tot 352 g".']
    },
    scaling: 'Bron: verhouding aanpassen aan de branding; geen hoeveelheidsregel.',
    role: 'Lichte, dichte koffies die zuur of hol smaken.',
    open: ['De tijd van de laatste giet staat niet in de bron (60 s is een plaatshouder; markeren als aanname).']
  },
  {
    id: 'wendelboe',
    name: 'Wendelboe pour-over',
    author: 'Tim Wendelboe',
    sourceClass: 'A',
    sources: [{ title: 'timwendelboe.no, How to brew pourover and filter coffee', url: 'https://timwendelboe.no/pages/how-to-brew-pourover-and-filter-coffee', readPrimary: true }],
    axes: { agitation: 'medium', structure: 'continuous', extraction: 'normal' },
    reference: {
      doseG: 32.5, waterG: 500,
      tempC: 96, tempNote: "Eigen gids zegt alleen 'hot water'. 96 °C is een aanname (klasse C): zijn café zet de AeroPress met 96 °C uit de boiler, en recepten-sites die deze gids overnemen geven 96 °C. Bij donkere branding de Philocoffea-regel (88/83 °C) als terugval.",
      grind: 'filtermaling; kleinere hoeveelheden fijner',
      pours: [
        { atSec: 0, toG: 60, style: 'spiral', styleGiven: false, agitationAfter: 'stir', waitForDrain: false, drainCue: null,
          tip: 'Ongeveer 60 g.',
          after: 'Roer rond met een theelepel, zodat alle koffie nat is.' },
        { atSec: 30, toG: 200, style: 'circles', styleGiven: false, agitationAfter: 'none', waitForDrain: false, drainCue: null,
          tip: 'Tot ongeveer 200 g. Zorg dat alle koffie nat blijft bij elke giet.' },
        { atSec: 60, toG: 500, style: 'circles', agitationAfter: 'none', waitForDrain: false, drainCue: 'doorlopend in rondjes tot 500 g; gieten duurt 2–2,5 min',
          tip: 'Blijf doorgieten in een cirkelbeweging tot 500 g. Het gieten duurt 2 tot 2,5 minuut.' }
      ],
      prep: ['Spoel het filter met heet water en gooi dat weg.', 'Schud het bed vlak.'],
      finish: ['Laat ongeveer 1 minuut uitlopen.', 'Roer de koffie voor het serveren.'],
      endSec: { lo: 180, hi: 210 },
      notes: ['Gecontroleerd tegen timwendelboe.no (9 nov 2026): de cirkelbeweging staat alleen bij de hoofdgiet; bij de bloem en de tweede giet noemt de bron geen patroon.', '65 g per liter.', 'Bloom ~60 g en roeren met een theelepel.', 'Gieten 2–2,5 min, dan ~1 min uitlopen; kan aan het eind roeren.', 'Te lang → bitter (grover); veel korter → slap en zuur (fijner).', 'Het moment 60 s voor de derde stap is een aanname: de bron zegt alleen "doorgaan in rondjes".']
    },
    scaling: 'Bron: kleinere hoeveelheden fijner malen; verhouding 65 g/l.',
    role: "Bloemige en theeachtige koffies (lichte Nordic-branding), met zijn eigen recept: bloom roeren, daarna doorlopend in rondjes. Besluit Jelle (5 nov 2026): geen 'lage agitatie'-variant; de verzonnen namen 'Serene pulse' en 'Nordic light' vervallen.",
    open: ['De temperatuur (96 °C) is een aanname; een eigen proef 96 tegen 100 °C kan dat beslissen.']
  },
  {
    id: 'osmotic_flow',
    name: 'Osmotic Flow',
    author: 'traditioneel Japans (geen bedenker gevonden)',
    sourceClass: 'C',
    sources: [{ title: 'European Coffee Trip, 3 essential Hario V60 recipes (alleen titel/samenvatting; pagina geeft 403)', url: 'https://europeancoffeetrip.com/hario-v60-recipes/', readPrimary: false }],
    axes: { agitation: 'very_low', structure: 'continuous', extraction: 'normal' },
    reference: {
      doseG: 20, waterG: 250,
      tempC: null, tempNote: null,
      grind: null,
      pours: null,
      endSec: null,
      notes: ['Alleen in het midden gieten; het bed blijft een koepel (bolle korst).', 'Ook 15/225 genoemd.', 'Tijden en temperatuur: geen betrouwbare bron.']
    },
    scaling: 'Onbekend.',
    role: 'Naturals en honeys die snel overextraheren; zoet en clean.',
    open: ['Geen primaire bron; gietschema ontbreekt. Pas gebruiken als proef na eigen metingen, of een bron vinden.']
  },
  {
    id: 'april',
    name: 'April (zes pulsen)',
    author: 'April Coffee Roasters (Patrik Rolf)',
    sourceClass: 'A',
    sources: [{ title: 'April Coffee, eigen brew guide (eerder gelezen)', url: null, readPrimary: true }],
    axes: { agitation: 'high', structure: 'equal_pulses', extraction: 'normal' },
    reference: {
      doseG: 20, waterG: 300,
      tempC: 92, tempNote: '92 °C komt uit een gids uit 2018 (tweedehands, klasse C)',
      grind: null,
      pours: [
        { atSec: 0, toG: 50, style: 'circles', agitationAfter: 'none', waitForDrain: false, drainCue: null },
        { atSec: 40, toG: 100, style: 'circles', agitationAfter: 'none', waitForDrain: false, drainCue: null },
        { atSec: 70, toG: 150, style: 'circles', agitationAfter: 'none', waitForDrain: false, drainCue: null },
        { atSec: 100, toG: 200, style: 'circles', agitationAfter: 'none', waitForDrain: false, drainCue: null },
        { atSec: 130, toG: 250, style: 'circles', agitationAfter: 'none', waitForDrain: false, drainCue: null },
        { atSec: 160, toG: 300, style: 'circles', agitationAfter: 'none', waitForDrain: false, drainCue: null }
      ],
      endSec: { lo: 200, hi: 210 },
      notes: ['Zes gieten van 50 g.', 'Niet opnieuw gecontroleerd op 9 nov 2026: de bron heeft geen webadres (eerder gelezen brew guide); de app toont daarom alleen wat al in het recept stond.']
    },
    scaling: 'Niet in de bron.',
    role: 'Volle kop, body, chocolade en karamel.',
    open: ['Temperatuur alleen uit een tweedehands bron.']
  },
  {
    id: 'hedrick_one_and_done',
    name: 'Hedrick One and Done',
    author: 'Lance Hedrick',
    sourceClass: 'B',
    sources: [{ title: 'Gota, One and Done (V60 02), toegeschreven aan Hedrick', url: 'https://gota.cafe/en/recipes/v60-02/hedrick-one-and-done', readPrimary: true }],
    axes: { agitation: 'low', structure: 'one_main_pour', extraction: 'normal' },
    reference: {
      doseG: 15, waterG: 225,
      tempC: 93, tempNote: '93–96 °C bij lichte branding (secundaire bronnen)',
      grind: 'medium-fijn; afstellen op 120–150 s totale doorloop',
      pours: [
        { atSec: 0, toG: 45, style: 'spiral', agitationAfter: 'none', waitForDrain: false, drainCue: null,
          tip: 'In een spiraal, ongeveer 7,5 g per seconde (6 seconden).',
          after: 'Niet roeren of swirlen. Laat bloemen.' },
        { atSec: 30, toG: 90, style: 'spiral', agitationAfter: 'none', waitForDrain: false, drainCue: null,
          tip: 'Tweede bloem: weer in een spiraal, ongeveer 7,5 g per seconde (6 seconden).',
          after: 'Ook nu niet roeren of swirlen, anders slibben trage filters dicht.' },
        { atSec: 60, toG: 225, style: 'spiral', agitationAfter: 'none', waitForDrain: false, drainCue: null,
          tip: 'Met energie, ongeveer 10 g per seconde (13 seconden). Houd de straal dicht bij het midden.',
          after: 'Loopt het te snel door? Een kleine swirl geeft 10 tot 15 seconden extra; pas anders eerst de maalgraad aan.' }
      ],
      finish: ['Klaar als het niet meer druppelt, rond 2:30.'],
      endSec: { lo: 120, hi: 150 },
      notes: ['Gecontroleerd tegen Gota (9 nov 2026): de hoofdgiet is "in een spiraal, met energie, de straal dicht bij het midden" (eerder stond hier alleen "in het midden").', 'Blooms niet swirlen (trage filters slibben anders dicht).', 'Hoofdgiet krachtig in het midden (~10 g/s).', 'Loopt het te snel: kleine swirl na de hoofdgiet geeft 10–15 s extra.']
    },
    scaling: 'Niet in de bron.',
    role: 'Eén kop, snel, alledaags.',
    open: []
  },
  {
    id: 'rao',
    name: 'Rao Spin',
    author: 'Scott Rao',
    sourceClass: 'A/B',
    sources: [{ title: 'Hario UK, ambassadeursinterview Scott Rao', url: 'https://www.hario.co.uk/blogs/hario-ambassadors/hario-v60-recipe-interview-with-hario-ambassador-scott-rao', readPrimary: true }],
    axes: { agitation: 'medium', structure: 'few_pours', extraction: 'high' },
    reference: {
      doseG: 20, waterG: 330,
      tempC: 97, tempNote: null,
      grind: null,
      pours: [
        { atSec: 0, toG: 60, style: 'spiral', styleGiven: false, agitationAfter: 'rao_spin', waitForDrain: false, drainCue: null,
          tip: 'Giet 60 g.',
          after: 'Draai de bloom direct stevig rond (de Rao-spin).' },
        { atSec: 40, toG: 200, style: 'spiral', agitationAfter: 'gentle_swirl', waitForDrain: false, drainCue: null,
          tip: 'Vanaf vrij laag, in een gelijkmatige, bijna verticale straal. Houd de ketel op dezelfde hoogte en beweeg hem rond, zodat het hele bed gelijk nat wordt.',
          after: 'Heel zacht draaien, korter dan een seconde: net genoeg om de groeven van de V60 te vullen.' },
        { atSec: 100, toG: 330, style: 'spiral', agitationAfter: 'gentle_swirl', waitForDrain: true, drainCue: 'als de slurry ~70 % doorgelopen is',
          tip: 'Pas als ongeveer 70 % van het water is doorgelopen. Weer vanaf vrij laag in een gelijkmatige, bijna verticale straal, de ketel rondbewegend.',
          after: 'Nog een heel zachte draai, korter dan een seconde.' }
      ],
      prep: ['Gebruik een plastic V60 (houdt de warmte vast).', 'Maak met je vinger een vogelnestje van het bed.'],
      endSec: { lo: 240, hi: 270 },
      notes: ['Gecontroleerd tegen Hario UK (9 nov 2026): de bron noemt geen gietpatroon, wel "vanaf vrij laag, bijna verticaal, de ketel rondbewegen"; de bloem krijgt een stevige spin, de andere twee een heel zachte (< 1 s).', 'Altijd plastic V60; vogelnestje maken.', 'Laag en verticaal gieten, rondgaand.', 'Rao noemt 22–24,5 % EY.', 'Het moment 100 s voor de laatste giet is een plaatshouder: de bron koppelt hem aan ~70 % doorgelopen.']
    },
    scaling: 'Niet in de bron.',
    role: 'Bij ongelijk doorlopen of een droge afdronk.',
    open: ['De laatste giet hangt aan het doorlopen, niet aan de klok.']
  }
];

/** Alle recepten: de acht V60-technieken en de zes Chemex-recepten. */
export const TECHNIQUES: readonly TechniqueDef[] = [...V60_TECHNIQUES, ...CHEMEX_TECHNIQUES];

/** Past dit recept bij deze brewer? Zonder `methods` is het een V60-recept. */
export const fitsMethod = (def: TechniqueDef, method: Method): boolean => (def.methods ?? ['v60']).includes(method);

/** Perger 80/20 is een beslisregel, geen recept (Barista Hustle/Medium, klasse A). */
export const PERGER_8020_NOTE = 'Perger 80/20: een beslisregel over waar je je moeite in steekt, geen gietschema.';

export const TECHNIQUE_BY_ID: ReadonlyMap<TechniqueId, TechniqueDef> = new Map(TECHNIQUES.map(t => [t.id, t]));
