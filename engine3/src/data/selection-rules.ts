// Engine 3 · regeltabel voor de starttechniek (verslag punt 1 en 'Technieken: de keuze voor de
// herbouw'). Dit is DATA, geen beslislogica: de engine leest deze regels, en eigen uitkomsten
// gaan er altijd boven (een gewonnen proef wint van elke regel).
//
// Bewijs: vrijwel alles is praktijk (E3), geen gecontroleerde studie. Daarom is elke regel een
// startvoorstel en wordt elke afwijking van Kasuya als proef aangeboden.

import type { Method, ProcessBase, RoastLevel, TechniqueId, WheelCategory } from '../types.ts';

export type Evidence = 'E3_practice' | 'E2_mechanism' | 'decision_jelle';

/** Kenmerken van de boon (of van eerdere proeven) waar een regel op let. Alles moet waar zijn. */
export interface RuleWhen {
  readonly method?: Method;
  readonly processBase?: readonly ProcessBase[];
  readonly roast?: readonly RoastLevel[];
  /** Minstens één van deze wielcategorieën staat in de zaknotities. */
  readonly noteCategoryAny?: readonly WheelCategory[];
  /** Uit eigen proeven: terugkerende klacht (minstens 2 van de laatste 4 koppen van deze zak). */
  readonly feedbackAny?: readonly ('sour_or_hollow' | 'drying' | 'uneven_drain')[];
  /** Kop van deze grootte of kleiner (g in de kop). */
  readonly maxCupG?: number;
  /** Kop van deze grootte of groter (g in de kop). */
  readonly minCupG?: number;
}

export interface SelectionRule {
  readonly id: string;
  readonly when: RuleWhen;
  /** In volgorde van voorkeur; de eerste is het voorstel, de rest de proefkandidaat. */
  readonly suggest: readonly TechniqueId[];
  /**
   * Bij Kasuya: de eerste giet als fractie van de eerste 40 %; null = standaard 50 + 70 (Hario, 0,417).
   * Gota (V60 02, toegeschreven aan Kasuya, klasse B): zoeter 40 + 80 (0,333), helderder omgekeerd
   * 80 + 40 (0,667).
   */
  readonly kasuyaFirstPourShare: number | null;
  readonly evidence: Evidence;
  readonly why: string;
  /** Hoger = eerst bekeken. */
  readonly priority: number;
}

export const SELECTION_RULES: readonly SelectionRule[] = [
  // Chemex (6-kops, besluit Jelle 9 nov 2026): eerst de recepten uit onderzoek_chemex.md, per portie. Een koppie is
  // ongeveer 250 g. Het zijn startvoorstellen uit bronnen; geen bewijs welk recept bij welke boon past.
  {
    id: 'chemex.one_cup', when: { method: 'chemex', maxCupG: 400 }, suggest: ['chemex_howell_cup', 'chemex_pull_pour'], kasuyaFirstPourShare: null,
    evidence: 'decision_jelle', priority: 102,
    why: 'Eén kop in de 6-kops Chemex: George Howell publiceert een eigen recept voor één kop (25 tot 28 g op 390 g water, drie gietbeurten); Pull & Pour is de rustige tweede keuze.'
  },
  {
    id: 'chemex.two_cups', when: { method: 'chemex', minCupG: 401, maxCupG: 550 }, suggest: ['chemex_stumptown', 'chemex_barefoot'], kasuyaFirstPourShare: null,
    evidence: 'decision_jelle', priority: 101,
    why: 'Tussen één en twee koppen op de Chemex: Stumptown (42 g op 700 g water) met drie gietbeurten; Barefoot is de variant met twee.'
  },
  {
    id: 'chemex.full_jug', when: { method: 'chemex', minCupG: 551 }, suggest: ['chemex_barefoot', 'chemex_stumptown', 'chemex_blue_bottle', 'chemex_onyx'], kasuyaFirstPourShare: null,
    evidence: 'decision_jelle', priority: 100,
    why: 'Twee koppen of een hele kan op de Chemex: Barefoot kreeg in de Prima-vergelijking het hoogste cijfer (één boon, één proever); Stumptown, Blue Bottle en Onyx zijn de alternatieven.'
  },
  {
    id: 'feedback.sour_hollow_light', when: { roast: ['light', 'light_medium'], feedbackAny: ['sour_or_hollow'] }, suggest: ['gagne', 'kasuya_46'],
    kasuyaFirstPourShare: null, evidence: 'E3_practice', priority: 90,
    why: 'Licht gebrand en herhaaldelijk zuur of hol: een techniek met hogere extractie (Gagné) als proef.'
  },
  {
    id: 'feedback.uneven_or_drying', when: { feedbackAny: ['uneven_drain', 'drying'] }, suggest: ['rao', 'kasuya_46'],
    kasuyaFirstPourShare: null, evidence: 'E3_practice', priority: 85,
    why: 'Ongelijk doorlopen of een droge afdronk: Rao Spin draait het bed vlak tegen kanaalvorming.'
  },
  {
    id: 'notes.tea_floral', when: { noteCategoryAny: ['bloemig'] }, suggest: ['wendelboe', 'kasuya_46'],
    kasuyaFirstPourShare: null, evidence: 'E3_practice', priority: 60,
    why: 'Thee- of bloemige notities: Wendelboe met zijn eigen recept (bloom roeren, doorlopend in rondjes), met Kasuya als proef.'
  },
  {
    id: 'notes.fruity_natural', when: { processBase: ['natural', 'honey'], noteCategoryAny: ['fruitig'] }, suggest: ['kasuya_46', 'osmotic_flow'],
    kasuyaFirstPourShare: 0.667, evidence: 'E3_practice', priority: 55,
    why: 'Natural/honey met fruit: Kasuya met een grote eerste giet (helderder), Osmotic Flow als proef zodra er een betrouwbaar schema is.'
  },
  {
    id: 'notes.chocolate_caramel', when: { noteCategoryAny: ['notig_cacao', 'zoet'] }, suggest: ['april', 'kasuya_46'],
    kasuyaFirstPourShare: 0.333, evidence: 'E3_practice', priority: 50,
    why: 'Chocolade, karamel, noot: een vollere kop met krachtige pulsen (April); bij Kasuya een kleinere eerste giet (zoeter).'
  },
  {
    id: 'size.single_quick', when: { maxCupG: 230 }, suggest: ['kasuya_46', 'hedrick_one_and_done'],
    kasuyaFirstPourShare: null, evidence: 'E3_practice', priority: 20,
    why: 'Eén kleine kop: Hedrick One and Done is een snelle proefkandidaat naast Kasuya.'
  },
  {
    id: 'fallback', when: {}, suggest: ['kasuya_46'], kasuyaFirstPourShare: null,
    evidence: 'decision_jelle', priority: 0,
    why: 'Niets wijst een andere techniek aan: Kasuya 4:6 (kern en terugval).'
  }
];
