// Engine 3 · de acht technieken als data (verslag 'Technieken: de keuze voor de herbouw' en
// 'Punt 2 · Bronnenwerk'). Elk getal hieronder komt uit de genoemde bron; waar een bron iets niet
// zegt, staat er null. Niets is aangevuld met eigen schattingen.
//
// Bronklasse: A = eigen tekst/video van de bedenker of diens bedrijf; B = interview of
// receptensite die het recept aan de bedenker toeschrijft, consistent; C = één tweedehands bron.

import type { Agitation, PourStyle, TechniqueId } from '../types.ts';

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
    readonly endSec: { readonly lo: number; readonly hi: number } | null;
    readonly notes: readonly string[];
  };
  /** Wat de bron zegt over andere hoeveelheden. */
  readonly scaling: string;
  /** Rol in de engine (verslag). */
  readonly role: string;
  /** Openstaande punten bij deze techniek. */
  readonly open: readonly string[];
}

export const TECHNIQUES: readonly TechniqueDef[] = [
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
        { atSec: 0, toG: 50, style: 'spiral', agitationAfter: 'none', drainCue: null },
        { atSec: 45, toG: 120, style: 'spiral', agitationAfter: 'none', drainCue: 'Philocoffea: pas gieten als het water bijna helemaal door het filter is' },
        { atSec: 90, toG: 180, style: 'spiral', agitationAfter: 'none', drainCue: 'idem' },
        { atSec: 130, toG: 240, style: 'spiral', agitationAfter: 'none', drainCue: 'idem' },
        { atSec: 160, toG: 300, style: 'spiral', agitationAfter: 'none', drainCue: 'idem' }
      ],
      endSec: { lo: 210, hi: 210 },
      notes: [
        'Eerste 40 % (120 g) in twee gieten: kleinere eerste giet = zoeter, grotere = zuurder/helderder (Hario, Philocoffea).',
        'Rest (60 %) in gelijke delen; minder gieten = lichter, meer = sterker (Philocoffea: bij donkere branding met twee gieten beginnen).',
        'Hario-voorbeeld: 50 + 70; Philocoffea: 5 × 60 g (0:00, 0:45, 1:30, 2:15, 2:45). Besluit Jelle: Hario-momenten als basis.',
        'Filter eraf op 3:30.'
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
      tempC: null, tempNote: "'the hotter, the better', vooral bij lichte branding (geen getal)",
      grind: 'medium-fijn',
      pours: [
        { atSec: 0, toG: 60, style: 'spiral', agitationAfter: 'swirl', drainCue: null },
        { atSec: 45, toG: 300, style: 'spiral', agitationAfter: 'none', drainCue: null },
        { atSec: 75, toG: 500, style: 'spiral', agitationAfter: 'stir', drainCue: null }
      ],
      endSec: { lo: 210, hi: 210 },
      notes: ['Kuiltje in het bed; bloom 2 × de dosis en swirlen; bloom tot 0:45.', '0:45–1:15 tot 300 g (60 %), 1:15–1:45 tot 500 g, iets rustiger.', 'Op 1:45 één keer met en één keer tegen de klok in roeren; daarna even laten zakken en zacht swirlen.', 'Doorgelopen voor 3:30.']
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
        { atSec: 0, toG: 66, style: 'spiral', agitationAfter: 'rao_spin', drainCue: null },
        { atSec: 30, toG: 200, style: 'spiral', agitationAfter: 'rao_spin', drainCue: null },
        { atSec: 60, toG: 352, style: 'spiral', agitationAfter: 'rao_spin', drainCue: 'tweede giet na de eerste (geen vaste tijd in de bron)' }
      ],
      endSec: { lo: 150, hi: 210 },
      notes: ['Plastic V60, kuiltje (trench) maken.', '1:16, bij minder ontwikkelde branding 1:16,5–1:18.', 'Doel ~1,25 % TDS bij ~20 % EY.', 'Het moment van de laatste giet (60 s) is een aanname van dit bestand: de bron noemt alleen "tot ~200 g" en dan "tot 352 g".']
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
      tempC: null, tempNote: 'geen temperatuur in de bron',
      grind: 'filtermaling; kleinere hoeveelheden fijner',
      pours: [
        { atSec: 0, toG: 60, style: 'spiral', agitationAfter: 'stir', drainCue: null },
        { atSec: 30, toG: 200, style: 'circles', agitationAfter: 'none', drainCue: null },
        { atSec: 60, toG: 500, style: 'circles', agitationAfter: 'none', drainCue: 'doorlopend in rondjes tot 500 g; gieten duurt 2–2,5 min' }
      ],
      endSec: { lo: 180, hi: 210 },
      notes: ['65 g per liter.', 'Bloom ~60 g en roeren met een theelepel.', 'Gieten 2–2,5 min, dan ~1 min uitlopen; kan aan het eind roeren.', 'Te lang → bitter (grover); veel korter → slap en zuur (fijner).', 'Het moment 60 s voor de derde stap is een aanname: de bron zegt alleen "doorgaan in rondjes".']
    },
    scaling: 'Bron: kleinere hoeveelheden fijner malen; verhouding 65 g/l.',
    role: "Verslag: 'thee, bloemig, delicaat' met 'lage agitatie, rustige pulsen'.",
    open: [
      "De namen 'Serene pulse' en 'Nordic light' komen in geen enkele bron voor.",
      'Zijn eigen recept roert de bloom en giet doorlopend: dat is geen lage agitatie. De rol in het verslag past daar niet bij — beslissen of Wendelboe die rol houdt of dat Osmotic Flow/Hedrick (geen swirl) de lage-agitatie-optie wordt.'
    ]
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
        { atSec: 0, toG: 50, style: 'circles', agitationAfter: 'none', drainCue: null },
        { atSec: 40, toG: 100, style: 'circles', agitationAfter: 'none', drainCue: null },
        { atSec: 70, toG: 150, style: 'circles', agitationAfter: 'none', drainCue: null },
        { atSec: 100, toG: 200, style: 'circles', agitationAfter: 'none', drainCue: null },
        { atSec: 130, toG: 250, style: 'circles', agitationAfter: 'none', drainCue: null },
        { atSec: 160, toG: 300, style: 'circles', agitationAfter: 'none', drainCue: null }
      ],
      endSec: { lo: 200, hi: 210 },
      notes: ['Zes gieten van 50 g.']
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
        { atSec: 0, toG: 45, style: 'spiral', agitationAfter: 'none', drainCue: null },
        { atSec: 30, toG: 90, style: 'spiral', agitationAfter: 'none', drainCue: null },
        { atSec: 60, toG: 225, style: 'center', agitationAfter: 'none', drainCue: null }
      ],
      endSec: { lo: 120, hi: 150 },
      notes: ['Blooms niet swirlen (trage filters slibben anders dicht).', 'Hoofdgiet krachtig in het midden (~10 g/s).', 'Loopt het te snel: kleine swirl na de hoofdgiet geeft 10–15 s extra.']
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
        { atSec: 0, toG: 60, style: 'spiral', agitationAfter: 'rao_spin', drainCue: null },
        { atSec: 40, toG: 200, style: 'spiral', agitationAfter: 'gentle_swirl', drainCue: null },
        { atSec: 100, toG: 330, style: 'spiral', agitationAfter: 'gentle_swirl', drainCue: 'als de slurry ~70 % doorgelopen is' }
      ],
      endSec: { lo: 240, hi: 270 },
      notes: ['Altijd plastic V60; vogelnestje maken.', 'Laag en verticaal gieten, rondgaand.', 'Rao noemt 22–24,5 % EY.', 'Het moment 100 s voor de laatste giet is een plaatshouder: de bron koppelt hem aan ~70 % doorgelopen.']
    },
    scaling: 'Niet in de bron.',
    role: 'Bij ongelijk doorlopen of een droge afdronk.',
    open: ['De laatste giet hangt aan het doorlopen, niet aan de klok.']
  }
];

/** Perger 80/20 is een beslisregel, geen recept (Barista Hustle/Medium, klasse A). */
export const PERGER_8020_NOTE = 'Perger 80/20: een beslisregel over waar je je moeite in steekt, geen gietschema.';

export const TECHNIQUE_BY_ID: ReadonlyMap<TechniqueId, TechniqueDef> = new Map(TECHNIQUES.map(t => [t.id, t]));
