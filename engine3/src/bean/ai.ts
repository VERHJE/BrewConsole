// Engine 3 · stap 6 · AI-herkenning van een zak: het contract, zonder netwerk.
//
// Afspraken (besluit Jelle, de veiligste optie):
//   - Alleen met toestemming per scan (`consent: true` in het verzoek); nooit op de achtergrond.
//   - De API-sleutel staat alleen als geheim op de Worker (engine3/sync/ai.ts), nooit in de app.
//   - Een vast model, een dagelijkse limiet, geen foto bewaard.
//   - Wat terugkomt is een VOORSTEL: elk veld krijgt bron 'ai' en wordt pas gebruikt na een bevestiging.
// Hier staat het schema van het antwoord en de schoonmaak ervan. Een antwoord wordt nooit vertrouwd:
// onbekende sleutels vallen af, lijsten worden begrensd, getallen en datums moeten plausibel zijn.

import type { BeanFields, BeanNotes, BeanProcess, DecafMethod, Fermentation, IntendedUse, ProcessBase, RoastLevel } from '../types.ts';
import type { Grams, IsoDate, Metres } from '../units.ts';
import type { BeanScan } from './scan.ts';
import { TAG_CATEGORY } from '../data/flavor-wheel.ts';

export const AI_SCAN_MODEL = 'claude-opus-5-5';
export const AI_MAX_IMAGE_BYTES = 5_000_000;
export const AI_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AiMediaType = typeof AI_MEDIA_TYPES[number];
export const AI_DAILY_LIMIT = 30;

export interface AiScanRequest {
  readonly consent: true;
  readonly mediaType: AiMediaType;
  /** De foto als base64, zonder 'data:'-voorvoegsel. */
  readonly imageBase64: string;
}

const ROASTS: readonly RoastLevel[] = ['light', 'light_medium', 'medium', 'medium_dark', 'dark'];
const USES: readonly IntendedUse[] = ['filter', 'espresso', 'omni'];
const BASES: readonly ProcessBase[] = ['washed', 'natural', 'honey', 'wet_hulled', 'unknown'];
const FERMENTATIONS: readonly Fermentation[] = ['anaerobic', 'carbonic_maceration', 'yeast_inoculated', 'lactic', 'co_fermented', 'thermal_shock', 'double_fermentation', 'other'];
const DECAFS: readonly DecafMethod[] = ['sugarcane_ea', 'swiss_water', 'co2', 'other'];

/** JSON-schema van het antwoord (als 'tool' aan het model gegeven; het model vult alleen wat het ziet). */
export const AI_TOOL = {
  name: 'record_bean',
  description: 'Leg vast wat er op deze koffiezak staat. Vul alleen velden die letterlijk op de zak staan of er ondubbelzinnig uit volgen; laat de rest weg. Raad niets.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: { type: 'string', description: 'Naam van de koffie of het lot (niet de brander).' },
      roaster: { type: 'string' },
      country: { type: 'string' },
      region: { type: 'string' },
      farm: { type: 'string', description: 'Boerderij, estate, wasstation of coöperatie.' },
      producer: { type: 'string' },
      variety: { type: 'string' },
      process_base: { type: 'string', enum: [...BASES] },
      fermentation: { type: 'array', items: { type: 'string', enum: [...FERMENTATIONS] } },
      experimental: { type: 'boolean' },
      decaf_method: { type: 'string', enum: [...DECAFS] },
      process_term_unclear: { type: 'string', description: 'Een procesterm die niet eenduidig is, bijv. "semi-washed". Dan process_base weglaten.' },
      roast_level: { type: 'string', enum: [...ROASTS] },
      intended_use: { type: 'string', enum: [...USES] },
      altitude_min_m: { type: 'number' },
      altitude_max_m: { type: 'number' },
      roast_date: { type: 'string', description: 'YYYY-MM-DD, alleen als er een brand-/roasted-datum staat (geen THT-datum).' },
      bag_size_g: { type: 'number' },
      harvest_year: { type: 'number' },
      cupping_score: { type: 'number' },
      notes: { type: 'array', items: { type: 'string' }, description: 'Smaaknotities precies zoals op de zak, in volgorde.' }
    }
  }
} as const;

export const AI_PROMPT = 'Dit is een foto van een koffiezak of etiket. Roep record_bean aan met wat je kunt lezen. Raad niets en vul niets in wat niet op de zak staat.';

export type AiValidation =
  | { readonly ok: true; readonly scan: BeanScan; readonly dropped: readonly string[] }
  | { readonly ok: false; readonly reason: string };

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const str = (x: unknown, max = 80): string | null => (typeof x === 'string' && x.trim().length > 0 && x.trim().length <= max ? x.trim().replace(/\s+/g, ' ') : null);
const num = (x: unknown, lo: number, hi: number): number | null => (typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi ? x : null);
const oneOf = <T extends string>(x: unknown, list: readonly T[]): T | null => (typeof x === 'string' && (list as readonly string[]).includes(x) ? (x as T) : null);

function isoDate(x: unknown, nowMs: number): IsoDate | null {
  if (typeof x !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return null;
  const t = Date.parse(x + 'T12:00:00Z');
  if (!Number.isFinite(t) || new Date(t).toISOString().slice(0, 10) !== x) return null;
  if (t > nowMs + 86_400_000 || nowMs - t > 400 * 86_400_000) return null; // zelfde grenzen als de tekstherkenning
  return x as IsoDate;
}

/** Maakt van het antwoord van het model een voorstel (bron 'ai'). Onbekende of onbruikbare velden vallen af en worden gemeld. */
export function validateAiScan(input: unknown, nowMs: number): AiValidation {
  if (!isObj(input)) return { ok: false, reason: 'antwoord is geen object' };
  const dropped: string[] = [];
  const fields: { -readonly [K in keyof BeanFields]?: BeanFields[K] } = {};
  const sources: Partial<Record<keyof BeanFields, 'ai'>> = {};
  const put = <K extends keyof BeanFields>(key: K, value: BeanFields[K] | null, given: boolean): void => {
    if (value === null) { if (given) dropped.push(key); return; }
    fields[key] = value;
    sources[key] = 'ai';
  };
  const has = (k: string): boolean => input[k] !== undefined && input[k] !== null;

  put('name', str(input['name'], 80), has('name'));
  put('roaster', str(input['roaster'], 60), has('roaster'));
  put('country', str(input['country'], 40), has('country'));
  put('region', str(input['region'], 60), has('region'));
  put('farm', str(input['farm'], 80), has('farm'));
  put('producer', str(input['producer'], 80), has('producer'));
  put('variety', str(input['variety'], 60), has('variety'));
  put('roastLevel', oneOf(input['roast_level'], ROASTS), has('roast_level'));
  put('intendedUse', oneOf(input['intended_use'], USES), has('intended_use'));
  put('roastDate', isoDate(input['roast_date'], nowMs), has('roast_date'));
  const size = num(input['bag_size_g'], 100, 2500);
  put('bagSizeG', size === null ? null : (size as Grams), has('bag_size_g'));
  const harvest = num(input['harvest_year'], 2000, 2100);
  put('harvestYear', harvest === null ? null : Math.round(harvest), has('harvest_year'));
  put('cuppingScore', num(input['cupping_score'], 60, 100), has('cupping_score'));

  const lo = num(input['altitude_min_m'], 0, 3500), hi = num(input['altitude_max_m'], 0, 3500);
  const a = lo ?? hi, b = hi ?? lo;
  put('altitude', a !== null && b !== null ? { minM: Math.min(a, b) as Metres, maxM: Math.max(a, b) as Metres } : null, has('altitude_min_m') || has('altitude_max_m'));

  const base = oneOf(input['process_base'], BASES);
  const ferm = Array.isArray(input['fermentation']) ? input['fermentation'].map(f => oneOf(f, FERMENTATIONS)).filter((f): f is Fermentation => f !== null) : [];
  const decaf = oneOf(input['decaf_method'], DECAFS);
  const unclear = str(input['process_term_unclear'], 40);
  const experimental = input['experimental'] === true;
  if (base !== null || ferm.length || decaf !== null || unclear !== null || experimental) {
    const process: BeanProcess = { base: base ?? 'unknown', fermentation: [...new Set(ferm)], experimental, decaf, ambiguousTerm: unclear };
    put('process', process, true);
  } else if (has('process_base') || has('fermentation')) dropped.push('process');

  if (Array.isArray(input['notes'])) {
    const raw = input['notes'].map(n => str(n, 40)).filter((n): n is string => n !== null).slice(0, 12);
    const tags = [...new Set(raw.filter(n => TAG_CATEGORY.has(n)))];
    const notes: BeanNotes = { raw, tags, unmapped: raw.filter(n => !TAG_CATEGORY.has(n)).map(n => n.toLowerCase()) };
    if (raw.length) put('notes', notes, true);
  }
  for (const k of Object.keys(input)) if (!(k in AI_TOOL.input_schema.properties)) dropped.push(`onbekend:${k}`);

  if (Object.keys(fields).length === 0) return { ok: false, reason: 'er is niets bruikbaars uit de foto gelezen' };
  const scan: BeanScan = {
    fields, sources,
    flags: { countryFuzzy: false, regionFuzzy: false, varietyFuzzy: false, webshop: false, ambiguousTerm: unclear },
    found: { roast: null, intendedUse: null, process: null, processAmbiguous: unclear, country: null, countryFuzzy: false, region: null, regionFuzzy: false, farm: null, variety: null, varietyFuzzy: false, tags: [], unmappedNotes: [], experimental, decaf: decaf !== null, altitude: null, webshop: false }
  };
  return { ok: true, scan, dropped };
}

/** Controle van een verzoek vóór het verstuurd of verwerkt wordt. */
export function checkAiRequest(x: unknown): { ok: true; req: AiScanRequest } | { ok: false; reason: string } {
  if (!isObj(x)) return { ok: false, reason: 'geen geldig verzoek' };
  if (x['consent'] !== true) return { ok: false, reason: 'toestemming ontbreekt' };
  const mediaType = oneOf(x['mediaType'], AI_MEDIA_TYPES);
  if (!mediaType) return { ok: false, reason: 'alleen jpeg, png of webp' };
  const img = x['imageBase64'];
  if (typeof img !== 'string' || img.length === 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(img)) return { ok: false, reason: 'afbeelding ontbreekt of is geen base64' };
  if (img.length * 0.75 > AI_MAX_IMAGE_BYTES) return { ok: false, reason: 'afbeelding is te groot' };
  return { ok: true, req: { consent: true, mediaType, imageBase64: img } };
}
