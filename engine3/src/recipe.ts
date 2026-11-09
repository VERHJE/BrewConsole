// Engine 3 · stap 2 · van techniek en hoeveelheden naar een gietschema.
//
// Zuiver: techniekdata + dosis + water (+ branding) in, Recipe + meldingen uit.
// Regels:
//   - Bij de referentiehoeveelheid van de bron komt precies het brongetal terug (test).
//   - Gietmomenten blijven bij elke hoeveelheid gelijk (besluit Jelle); de hoeveelheden schalen.
//   - Kasuya: eerste 40 % in twee gieten, de rest in drie gelijke delen. De verdeling van de eerste
//     40 % is een parameter (Hario 50+70 ≈ 0,417; Gota 40+80 = 0,333 zoeter, 80+40 = 0,667 helderder).
//   - Overige technieken: de bron geeft geen schaalregel (Hoffmann: verhouding), dus de hoeveelheden
//     schalen op verhouding met het water. Dat is een aanname en staat in `warnings`.
//   - Niets verzinnen: waar de bron geen temperatuur of einde noemt, blijft het null of een gemarkeerde terugval.

import { TECHNIQUE_BY_ID, fitsMethod, type TechniqueDef } from './data/techniques.ts';
import type { Method, Pour, Recipe, RoastLevel, TechniqueId } from './types.ts';
import type { Band, Celsius, Clicks, Grams, Seconds } from './units.ts';

export interface RecipeInput {
  readonly technique: TechniqueId;
  readonly method: Method;
  readonly doseG: number;
  /** Water door het bed (zonder bypass). */
  readonly waterG: number;
  readonly bypassG?: number;
  readonly roast?: RoastLevel | null;
  /** Aandeel van de eerste giet in de eerste 40 % (alleen Kasuya). Standaard: Hario-voorbeeld 50 + 70. */
  readonly kasuyaFirstPourShare?: number | null;
  readonly grindClick?: Clicks | null;
}

export interface RecipeBuild {
  readonly recipe: Recipe;
  /** Meldingen voor de gebruiker/engine: aannames, plaatshouders, niet-bronconforme situaties. */
  readonly warnings: readonly string[];
  /** Waar de temperatuur vandaan komt (voor de uitleg). */
  readonly tempSource: string | null;
}

export class RecipeError extends Error {
  readonly code: 'no_schedule' | 'bad_input';
  constructor(code: RecipeError['code'], message: string) { super(message); this.name = 'RecipeError'; this.code = code; }
}

/** Een 6-kops Chemex houdt 30 oz (885 ml); boven dit water komt het niveau te dicht bij de rand (aanname, klasse C). */
export const CHEMEX_6CUP_SAFE_WATER_G = 800;

/** Laagste dosis in de 6-kops-bronnen (Ox Coffee 22 g, Howell 25 g): daaronder wordt het bed dun (Rao: kans op kanalen en astringentie). Aanname. */
export const CHEMEX_THIN_BED_G = 22;
/** Boven deze dosis wordt het bed diep (Gagné: dieper dan 4 tot 5 cm geeft problemen); de bronnen gaan tot 57 g. Aanname. */
export const CHEMEX_DEEP_BED_G = 50;

/** Hario-voorbeeld: 50 van de eerste 120 g. */
export const KASUYA_DEFAULT_FIRST_SHARE = 50 / 120;
/** Eindtijdbewaking uit Gota: buiten 2:50–4:10 is de maalgraad fout. */
export const KASUYA_END_GUARD = { lo: 170, hi: 250 } as const;

const round = (n: number): number => Math.round(n + 1e-9);

function pour(atSec: number, toG: number, prevG: number, style: Pour['style'], agitation: Pour['agitationAfter'], wait: boolean): Pour {
  return { atSec: atSec as Seconds, addG: (toG - prevG) as Grams, toG: toG as Grams, style, agitationAfter: agitation, waitForDrain: wait };
}

/** Branding → temperatuur voor Kasuya (Philocoffea; besluit Jelle 5 nov 2026). */
function kasuyaTemp(roast: RoastLevel | null | undefined): { tempC: number | null; source: string } {
  switch (roast) {
    case 'light': case 'light_medium': return { tempC: 93, source: 'Philocoffea: lichte branding 93 °C' };
    case 'medium': case 'medium_dark': return { tempC: 88, source: 'Philocoffea: medium branding 88 °C' };
    case 'dark': return { tempC: 83, source: 'Philocoffea: donkere branding 83 °C' };
    default: return { tempC: 92, source: 'branding onbekend: Hario-voorbeeld 92 °C' };
  }
}

function temperature(def: TechniqueDef, roast: RoastLevel | null | undefined): { tempC: number | null; source: string | null } {
  if (def.id === 'kasuya_46') return kasuyaTemp(roast);
  const r = def.reference;
  const dark = roast === 'dark' || roast === 'medium_dark';
  // Aannames voor donkere branding (klasse C), besluit Jelle 5 nov 2026.
  if (def.id === 'hoffmann_ultimate') {
    if (roast === 'dark') return { tempC: 88, source: 'donker: 88 °C (secundaire bron, klasse C; aanname)' };
    return { tempC: r.tempC, source: 'Hario USA: zo heet mogelijk, net van de kook' };
  }
  if (def.id === 'wendelboe') {
    if (roast === 'dark') return { tempC: 83, source: 'donker: Philocoffea-regel 83 °C (aanname)' };
    if (dark) return { tempC: 88, source: 'medium-donker: Philocoffea-regel 88 °C (aanname)' };
    return { tempC: r.tempC, source: '96 °C is een aanname (klasse C); de bron noemt geen getal' };
  }
  return { tempC: r.tempC, source: r.tempC === null ? null : (r.tempNote ?? 'bron') };
}

function endBand(def: TechniqueDef): Band<Seconds> | null {
  if (def.id === 'kasuya_46') return { lo: KASUYA_END_GUARD.lo as Seconds, mid: 210 as Seconds, hi: KASUYA_END_GUARD.hi as Seconds };
  const e = def.reference.endSec;
  if (!e) return null;
  return { lo: e.lo as Seconds, mid: ((e.lo + e.hi) / 2) as Seconds, hi: e.hi as Seconds };
}

export function buildRecipe(input: RecipeInput): RecipeBuild {
  const def = TECHNIQUE_BY_ID.get(input.technique);
  if (!def) throw new RecipeError('bad_input', `onbekende techniek ${input.technique}`);
  if (!(input.doseG > 0) || !(input.waterG > 0)) throw new RecipeError('bad_input', 'dosis en water moeten groter dan 0 zijn');
  const ref = def.reference;
  if (!ref.pours) throw new RecipeError('no_schedule', `${def.name} heeft geen gietschema in de bron`);

  const W = input.waterG;
  const warnings: string[] = [];
  let pours: Pour[];

  if (def.id === 'kasuya_46') {
    const share = input.kasuyaFirstPourShare ?? KASUYA_DEFAULT_FIRST_SHARE;
    if (!(share > 0 && share < 1)) throw new RecipeError('bad_input', 'kasuyaFirstPourShare moet tussen 0 en 1 liggen');
    // Eerste 40 % in twee gieten, daarna 3 × 20 %.
    const cum = [W * 0.4 * share, W * 0.4, W * 0.6, W * 0.8, W].map(round);
    pours = ref.pours.map((rp, i) => pour(rp.atSec, cum[i]!, i === 0 ? 0 : cum[i - 1]!, rp.style, rp.agitationAfter, rp.waitForDrain));
  } else {
    const factor = W / ref.waterG;
    const exact = Math.abs(factor - 1) < 1e-9;
    let prev = 0;
    pours = ref.pours.map((rp, i) => {
      const toG = i === ref.pours!.length - 1 ? round(W) : round(rp.toG * factor);
      const p = pour(rp.atSec, toG, prev, rp.style, rp.agitationAfter, rp.waitForDrain);
      prev = toG;
      return p;
    });
    if (!exact && def.id !== 'hoffmann_ultimate') warnings.push(`${def.name}: de bron geeft geen schaalregel; hoeveelheden zijn op verhouding geschaald (aanname).`);
  }

  // Meldingen
  const bloomG = pours[0]!.toG;
  if (bloomG < 2 * input.doseG) warnings.push(`De eerste giet (${bloomG} g) is kleiner dan 2 × de dosis: mogelijk blijft koffie droog.`);
  if (pours.some((p, i) => i > 0 && p.addG <= 0)) warnings.push('Een giet heeft geen water toegevoegd gekregen; controleer de hoeveelheden.');
  if (input.method === 'chemex' && !fitsMethod(def, 'chemex')) warnings.push(`${def.name} is een V60-techniek; op de Chemex loopt het dikkere filter trager door.`);
  if (input.method === 'chemex' && W > CHEMEX_6CUP_SAFE_WATER_G) warnings.push(`Let op: ${W} g water komt dicht bij de rand van een 6-kops Chemex (885 ml); giet laag en houd het niveau onder de rand.`);
  if (input.method === 'chemex' && input.doseG < CHEMEX_THIN_BED_G) warnings.push(`Chemex: dunne laag (${Math.round(input.doseG * 10) / 10} g). De 6-kops-bronnen gebruiken 22 g of meer (Ox Coffee 22 g, Howell 25 tot 28 g); bij een dunne laag is er meer kans op kanalen en een droge, bittere kop (Rao).`);
  else if (input.method === 'chemex' && input.doseG > CHEMEX_DEEP_BED_G) warnings.push(`Chemex: diepe laag (${Math.round(input.doseG * 10) / 10} g). Een bed dieper dan 4 tot 5 cm loopt trager en wordt ongelijk nat (Gagné); zorg voor een goede bloem en een kuiltje.`);
  const placeholders = def.open.filter(o => /plaatshouder|aanname/i.test(o));
  for (const o of placeholders) warnings.push(o);
  if (def.id === 'kasuya_46' && pours.slice(1).some(p => p.waitForDrain)) warnings.push('Kasuya: giet pas als het water bijna helemaal door het filter is; de klok is een richtlijn.');
  if (W !== ref.waterG) warnings.push('Het einde bij deze hoeveelheid is nog niet uit eigen zetsels geleerd; de band komt uit de bron.');

  const t = temperature(def, input.roast);
  const recipe: Recipe = {
    technique: def.id,
    method: input.method,
    doseG: input.doseG as Grams,
    waterG: W as Grams,
    bypassG: (input.bypassG ?? 0) as Grams,
    tempC: t.tempC === null ? null : (t.tempC as Celsius),
    grindClick: input.grindClick ?? null,
    pours,
    expectedEndSec: endBand(def)
  };
  return { recipe, warnings, tempSource: t.source };
}

/** Verhouding water/dosis van de referentie van een techniek (bijv. Kasuya 15), voor de sterktemodule. */
export function referenceRatio(id: TechniqueId): number {
  const d = TECHNIQUE_BY_ID.get(id);
  if (!d) throw new RecipeError('bad_input', `onbekende techniek ${id}`);
  return d.reference.waterG / d.reference.doseG;
}
