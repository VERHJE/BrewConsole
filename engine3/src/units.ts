// Engine 3 · eenheden. Eén plek voor alle eenheden en omrekeningen, zodat een getal nooit
// stilzwijgend van betekenis wisselt (g tegenover ml, % tegenover fractie, s tegenover ms).
//
// Afspraken (gelden in het hele contract):
//   gewicht koffie/water/kop ........ gram (g); 1 ml water = 1 g
//   tijd binnen een zetsel .......... seconden (s) vanaf de start van de timer
//   tijdstip ........................ epoch-milliseconden (ms, UTC), veld `at`
//   kalenderdatum ................... 'YYYY-MM-DD' (lokale datum van de gebruiker)
//   temperatuur ..................... graden Celsius (°C)
//   TDS ............................. procent (%), bv. 1.30 = 1,30 %
//   extractie (EY) .................. fractie (0–1), bv. 0.20 = 20 %
//   maalstand ....................... klikken op de Timemore C3S Pro (0 = messen dicht)
//   hoogte .......................... meter boven zeeniveau
//   sterkte-oordeel ................. ordinaal −2 … +2 (veel te slap … veel te sterk)

/** Een merknaam-type: aan de buitenkant een getal, voor de typechecker niet uitwisselbaar. */
type Brand<T, B extends string> = T & { readonly __unit: B };

export type Grams = Brand<number, 'g'>;
export type Seconds = Brand<number, 's'>;
export type EpochMs = Brand<number, 'ms'>;
export type Celsius = Brand<number, '°C'>;
export type TdsPct = Brand<number, 'tds%'>;
export type EyFraction = Brand<number, 'ey'>;
export type Clicks = Brand<number, 'click'>;
export type Metres = Brand<number, 'm'>;
/** 'YYYY-MM-DD' */
export type IsoDate = Brand<string, 'date'>;

export const g = (n: number): Grams => n as Grams;
export const s = (n: number): Seconds => n as Seconds;
export const ms = (n: number): EpochMs => n as EpochMs;
export const celsius = (n: number): Celsius => n as Celsius;
export const tdsPct = (n: number): TdsPct => n as TdsPct;
export const ey = (n: number): EyFraction => n as EyFraction;
export const clicks = (n: number): Clicks => n as Clicks;
export const metres = (n: number): Metres => n as Metres;

const ISO_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export function isoDate(v: string): IsoDate {
  if (!ISO_DATE_RE.test(v)) throw new RangeError(`geen geldige datum (YYYY-MM-DD): ${v}`);
  return v as IsoDate;
}
export function isIsoDate(v: unknown): v is IsoDate {
  return typeof v === 'string' && ISO_DATE_RE.test(v);
}

/** Een band om een schatting: middenwaarde plus onder- en bovengrens (zelfde eenheid). */
export interface Band<T extends number = number> {
  readonly mid: T;
  readonly lo: T;
  readonly hi: T;
}

/**
 * Massabalans voor percolatie (Guinard e.a. 2023; zelfde vorm als Engine 2):
 * TDS = 100·x/(1+x) met x = EY / (water/dosis − R), R = vastgehouden water per gram koffie.
 * Geeft null als de verhouding fysiek onmogelijk is (water/dosis ≤ R).
 */
export function massBalanceTds(doseG: Grams, waterG: Grams, retentionGPerG: number, extraction: EyFraction): TdsPct | null {
  if (!(doseG > 0) || !(waterG > 0) || waterG / doseG <= retentionGPerG) return null;
  const x = extraction / (waterG / doseG - retentionGPerG);
  return tdsPct((100 * x) / (1 + x));
}

/** De omgekeerde: welke verhouding water/dosis hoort bij een doel-TDS. */
export function ratioForTds(target: TdsPct, retentionGPerG: number, extraction: EyFraction): number {
  const t = target / 100;
  return retentionGPerG + (extraction * (1 - t)) / t;
}
