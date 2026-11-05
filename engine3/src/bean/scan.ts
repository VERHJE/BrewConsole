// Engine 3 · stap 6 · van herkende tekst naar boonvelden.
//
// parseBeanText() (text.ts) geeft de ruwe herkenning; hier wordt dat BeanFields volgens het datamodel
// (03): proces in drie assen, hoogte als bereik, notities als ruw/tags/niet-herkend, en bij elk veld
// waar het vandaan komt (paste, ocr, qr, ai). Niets wordt geraden: een veld dat niet herkend is, ontbreekt.
// Fuzzy treffers (1–2 letters afwijkend) staan in `flags` zodat de frontend ze apart kan markeren.

import type { BeanFieldKey, BeanFields, BeanProcess, DecafMethod, Fermentation, FieldSource, IntendedUse, ProcessBase, RoastLevel } from '../types.ts';
import type { Grams, IsoDate, Metres } from '../units.ts';
import { extractAltitudeRangeFromText, parseBeanText, scanFlavorSourceText, type ParsedBeanText } from './text.ts';

export type ScanSource = Extract<FieldSource, 'paste' | 'ocr' | 'qr' | 'ai'>;

export interface ScanFlags {
  readonly countryFuzzy: boolean;
  readonly regionFuzzy: boolean;
  readonly varietyFuzzy: boolean;
  /** De tekst komt van een webshop: bestelopties (maten, 'espresso prep') zijn genegeerd. */
  readonly webshop: boolean;
  /** Een term die niet eenduidig is (bijv. 'semi-washed') en dus niet is geraden. */
  readonly ambiguousTerm: string | null;
}

export interface BeanScan {
  readonly fields: Partial<BeanFields>;
  readonly sources: Partial<Record<BeanFieldKey, FieldSource>>;
  readonly flags: ScanFlags;
  /** De ruwe herkenning, voor wie die wil tonen of vergelijken. */
  readonly found: ParsedBeanText;
}

const ROASTS: readonly RoastLevel[] = ['light', 'light_medium', 'medium', 'medium_dark', 'dark'];
const USES: readonly IntendedUse[] = ['filter', 'espresso', 'omni'];
const BASES: readonly ProcessBase[] = ['washed', 'natural', 'honey', 'wet_hulled'];

function fermentationOf(text: string, anaerobic: boolean): Fermentation[] {
  const out: Fermentation[] = [];
  if (anaerobic || /anaero/.test(text)) out.push('anaerobic');
  if (/carbonic|co2 maceration|(?:^|[^a-z])cm(?:[^a-z]|$)/.test(text)) out.push('carbonic_maceration');
  if (/yeast/.test(text)) out.push('yeast_inoculated');
  if (/lactic/.test(text)) out.push('lactic');
  if (/co[- ]?ferment/.test(text)) out.push('co_fermented');
  if (/thermal[- ]shock/.test(text)) out.push('thermal_shock');
  if (/double[- ]ferment/.test(text)) out.push('double_fermentation');
  return out;
}
function decafMethodOf(text: string): DecafMethod {
  if (/swiss[- ]water/.test(text)) return 'swiss_water';
  if (/sugar[- ]?cane|ethyl[- ]acetate|(?:^|[^a-z])e\.?a\.?(?:[^a-z]|$)/.test(text)) return 'sugarcane_ea';
  if (/co2/.test(text)) return 'co2';
  return 'other';
}

export function processFromScan(found: ParsedBeanText, rawText: string): BeanProcess | null {
  const text = rawText.toLowerCase().replace(/semi[- ]?washed/g, ' ');
  const anyInfo = found.process !== null || found.experimental || found.decaf || found.processAmbiguous !== null;
  if (!anyInfo) return null;
  let base: ProcessBase = 'unknown';
  if (found.process && (BASES as readonly string[]).includes(found.process)) base = found.process as ProcessBase;
  else if (found.process === 'anaerobic') {
    // 'anaerobic natural' / 'anaerobic washed': de basis staat er dan bij; anders blijft hij onbekend.
    base = /natural|naturel|dry process/.test(text) ? 'natural' : /washed|gewassen/.test(text) ? 'washed' : /honey/.test(text) ? 'honey' : 'unknown';
  }
  return {
    base,
    fermentation: fermentationOf(text, found.process === 'anaerobic'),
    experimental: found.experimental,
    decaf: found.decaf ? decafMethodOf(text) : null,
    ambiguousTerm: found.processAmbiguous
  };
}

/** Herkent een boon in vrije tekst (geplakt, OCR, QR) en maakt er boonvelden van, met de bron per veld. */
export function scanBeanText(rawText: string, opts: { readonly source: ScanSource; readonly nowMs: number }): BeanScan {
  const found = parseBeanText(rawText, opts.nowMs);
  const fields: { -readonly [K in keyof BeanFields]?: BeanFields[K] } = {};
  const sources: { -readonly [K in BeanFieldKey]?: FieldSource } = {};
  const put = <K extends BeanFieldKey>(key: K, value: BeanFields[K] | null | undefined): void => {
    if (value === null || value === undefined) return;
    fields[key] = value;
    sources[key] = opts.source;
  };

  put('name', found.name ?? null);
  put('roaster', found.roaster ?? null);
  put('country', found.country);
  put('region', found.region);
  put('farm', found.farm);
  put('variety', found.variety);
  put('process', processFromScan(found, rawText));
  put('roastLevel', found.roast && (ROASTS as readonly string[]).includes(found.roast) ? (found.roast as RoastLevel) : null);
  put('intendedUse', found.intendedUse && (USES as readonly string[]).includes(found.intendedUse) ? (found.intendedUse as IntendedUse) : null);
  const alt = found.altitude !== null ? extractAltitudeRangeFromText(rawText.toLowerCase()) : null;
  put('altitude', alt ? { minM: alt.minM as Metres, maxM: alt.maxM as Metres } : null);
  put('roastDate', found.roastDate ? (found.roastDate as IsoDate) : null);
  put('bagSizeG', found.bagSizeG ? (found.bagSizeG as Grams) : null);

  const flavor = scanFlavorSourceText(String(rawText || ''));
  const rawNotes = flavor.notes.flatMap(n => n.split(/\s*[,;|]\s*|\s+&\s+/)).map(s => s.replace(/[*.]+$/, '').trim()).filter(Boolean);
  if (rawNotes.length || found.tags.length || found.unmappedNotes.length) {
    put('notes', { raw: rawNotes, tags: found.tags, unmapped: found.unmappedNotes });
  }
  return {
    fields, sources,
    flags: { countryFuzzy: found.countryFuzzy, regionFuzzy: found.regionFuzzy, varietyFuzzy: found.varietyFuzzy, webshop: found.webshop, ambiguousTerm: found.processAmbiguous },
    found
  };
}

/** Kort overzicht van wat er herkend is, voor de controlekaart (zoals summariseScan in de oude app, maar zonder app-teksten). */
export function recognisedKeys(scan: BeanScan): BeanFieldKey[] {
  return (Object.keys(scan.fields) as BeanFieldKey[]);
}
