// Zakken: lijst uit de toestand, en het formulier (plakken/QR → controlekaart → opslaan) als zuivere functies.
// Elk veld houdt zijn herkomst bij; zodra de gebruiker een veld aanpast wordt de bron 'user'.

import {
  factsOf, isoDate, scanBeanText, g,
  type BeanFieldKey, type BeanFields, type BeanProcess, type BeanScan, type BeanUpsertEvent, type EngineState,
  type FieldSource, type ProcessBase, type RoastLevel, type BeanArchiveEvent, type ScanSource
} from '../../../engine3/src/index.ts';
import { newId, type Env } from './ids.ts';

export const ROAST_LABEL: Readonly<Record<RoastLevel, string>> = {
  light: 'Licht', light_medium: 'Licht-medium', medium: 'Medium', medium_dark: 'Medium-donker', dark: 'Donker'
};
export const PROCESS_LABEL: Readonly<Record<ProcessBase, string>> = {
  washed: 'Gewassen', natural: 'Natuurlijk', honey: 'Honey', wet_hulled: 'Nat gepeld', unknown: 'Onbekend'
};
export const SOURCE_LABEL: Readonly<Record<FieldSource, string>> = {
  user: 'door jou', paste: 'uit geplakte tekst', ocr: 'uit foto', qr: 'uit QR', ai: 'door AI', migrated: 'uit oude app'
};

export interface BeanRow {
  readonly id: string;
  readonly name: string;
  readonly roaster: string | null;
  readonly country: string | null;
  readonly roastLevel: RoastLevel | null;
  readonly roastDate: string | null;
  readonly bagSizeG: number | null;
  readonly cups: number;
  readonly addedAt: number;
}

export function beanRows(state: EngineState, opts: { archived?: boolean } = {}): BeanRow[] {
  const facts = factsOf(state);
  const rows: BeanRow[] = [];
  for (const b of facts.beans.values()) {
    if (b.archived !== (opts.archived ?? false)) continue;
    rows.push({
      id: b.beanId, name: b.fields.name ?? '(zonder naam)', roaster: b.fields.roaster ?? null, country: b.fields.country ?? null,
      roastLevel: b.fields.roastLevel ?? null, roastDate: b.fields.roastDate ?? null, bagSizeG: b.fields.bagSizeG ?? null,
      cups: b.brewIds.length, addedAt: b.firstAt
    });
  }
  return rows.sort((a, b) => b.addedAt - a.addedAt || a.id.localeCompare(b.id));
}

/** Dagen sinds branding, of null. `todayIso` komt van buiten (geen klok in de kern). */
export function daysSinceRoast(roastDate: string | null, todayIso: string): number | null {
  if (!roastDate) return null;
  const d = (Date.parse(todayIso + 'T00:00:00Z') - Date.parse(roastDate + 'T00:00:00Z')) / 86_400_000;
  return Number.isFinite(d) && d >= 0 ? Math.round(d) : null;
}

// ───────────── het formulier ─────────────

export interface BeanForm {
  readonly values: Readonly<Record<FormKey, string>>;
  readonly sources: Readonly<Partial<Record<FormKey, FieldSource>>>;
  /** Wat de herkenning als proces/notities vond, zodat onaangeraakte velden hun detail houden. */
  readonly scanProcess: BeanProcess | null;
  readonly scanNotes: BeanFields['notes'] | null;
  readonly scanned: BeanFields | null;
  readonly warnings: readonly string[];
}

export type FormKey = 'name' | 'roaster' | 'country' | 'region' | 'farm' | 'variety' | 'process' | 'roastLevel' | 'roastDate' | 'bagSizeG' | 'notes';
export const FORM_KEYS: readonly FormKey[] = ['name', 'roaster', 'country', 'region', 'farm', 'variety', 'process', 'roastLevel', 'roastDate', 'bagSizeG', 'notes'];
export const FORM_LABEL: Readonly<Record<FormKey, string>> = {
  name: 'Naam', roaster: 'Brander', country: 'Land', region: 'Regio', farm: 'Boerderij', variety: 'Variëteit', process: 'Proces',
  roastLevel: 'Branding', roastDate: 'Brandingsdatum', bagSizeG: 'Zakgrootte (g)', notes: 'Smaaknotities'
};

const EMPTY: Record<FormKey, string> = { name: '', roaster: '', country: '', region: '', farm: '', variety: '', process: '', roastLevel: '', roastDate: '', bagSizeG: '', notes: '' };

export function emptyForm(): BeanForm {
  return { values: { ...EMPTY }, sources: {}, scanProcess: null, scanNotes: null, scanned: null, warnings: [] };
}

function valueOf(fields: Partial<BeanFields>, k: FormKey): string {
  switch (k) {
    case 'process': return fields.process && fields.process.base !== 'unknown' ? fields.process.base : '';
    case 'bagSizeG': return fields.bagSizeG ? String(fields.bagSizeG) : '';
    case 'notes': return fields.notes ? fields.notes.raw.join(', ') : '';
    case 'roastLevel': return fields.roastLevel ?? '';
    default: return (fields[k] as string | null | undefined) ?? '';
  }
}

export function formFromScan(scan: BeanScan): BeanForm {
  const values: Record<FormKey, string> = { ...EMPTY };
  const sources: Partial<Record<FormKey, FieldSource>> = {};
  for (const k of FORM_KEYS) {
    const v = valueOf(scan.fields, k);
    if (v) { values[k] = v; const s = scan.sources[k as BeanFieldKey]; if (s) sources[k] = s; }
  }
  const warnings: string[] = [];
  if (scan.flags.countryFuzzy) warnings.push('Land is op een gelijkenis herkend; controleer het.');
  if (scan.flags.regionFuzzy) warnings.push('Regio is op een gelijkenis herkend; controleer het.');
  if (scan.flags.varietyFuzzy) warnings.push('Variëteit is op een gelijkenis herkend; controleer het.');
  if (scan.flags.ambiguousTerm) warnings.push(`"${scan.flags.ambiguousTerm}" is niet eenduidig; het proces is niet geraden.`);
  if (scan.flags.webshop) warnings.push('Dit lijkt een webshoptekst: bestelopties zoals maten zijn genegeerd.');
  return { values, sources, scanProcess: scan.fields.process ?? null, scanNotes: scan.fields.notes ?? null, scanned: { ...scan.fields } as BeanFields, warnings };
}

export function scanText(env: Env, text: string, source: ScanSource = 'paste'): BeanForm {
  return formFromScan(scanBeanText(text, { source, nowMs: env.now() }));
}

/** Past één veld aan; de bron wordt 'user' zodra de waarde afwijkt van wat herkend was. */
export function editForm(form: BeanForm, key: FormKey, value: string): BeanForm {
  const recognised = form.scanned ? valueOf(form.scanned, key) : '';
  const sources = { ...form.sources };
  if (value === '') delete sources[key];
  else if (value !== recognised || !sources[key]) sources[key] = 'user';
  return { ...form, values: { ...form.values, [key]: value }, sources };
}

export interface FormResult { readonly ok: true; readonly fields: Partial<BeanFields>; readonly sources: Partial<Record<BeanFieldKey, FieldSource>> }
export interface FormProblem { readonly ok: false; readonly problems: Readonly<Partial<Record<FormKey, string>>> }

export function validateForm(form: BeanForm, env: Env): FormResult | FormProblem {
  const v = form.values;
  const problems: Partial<Record<FormKey, string>> = {};
  const fields: { -readonly [K in keyof BeanFields]?: BeanFields[K] } = {};
  const sources: Partial<Record<BeanFieldKey, FieldSource>> = {};
  const src = (k: FormKey): FieldSource => form.sources[k] ?? 'user';
  const text = (k: 'name' | 'roaster' | 'country' | 'region' | 'farm' | 'variety'): void => {
    const t = v[k].trim();
    if (t) { fields[k] = t.slice(0, 120); sources[k] = src(k); }
  };
  if (!v.name.trim()) problems.name = 'Geef de zak een naam.';
  (['name', 'roaster', 'country', 'region', 'farm', 'variety'] as const).forEach(text);

  if (v.process) {
    const base = v.process as ProcessBase;
    const same = form.scanProcess && form.scanProcess.base === base;
    fields.process = same ? form.scanProcess! : { base, fermentation: [], experimental: false, decaf: null, ambiguousTerm: null };
    sources.process = src('process');
  }
  if (v.roastLevel) { fields.roastLevel = v.roastLevel as RoastLevel; sources.roastLevel = src('roastLevel'); }
  if (v.roastDate) {
    try {
      const d = isoDate(v.roastDate);
      if (Date.parse(d) > env.now() + 86_400_000) problems.roastDate = 'Deze datum ligt in de toekomst.';
      else { fields.roastDate = d; sources.roastDate = src('roastDate'); }
    } catch { problems.roastDate = 'Gebruik een datum als 2026-11-05.'; }
  }
  if (v.bagSizeG.trim()) {
    const n = Number(v.bagSizeG.replace(',', '.'));
    if (!Number.isFinite(n) || n < 20 || n > 5000) problems.bagSizeG = 'Geef een gewicht tussen 20 en 5000 gram.';
    else { fields.bagSizeG = g(Math.round(n)); sources.bagSizeG = src('bagSizeG'); }
  }
  if (v.notes.trim()) {
    const unchanged = form.scanNotes && form.scanNotes.raw.join(', ') === v.notes.trim();
    fields.notes = unchanged ? form.scanNotes! : (scanBeanText(`Notes: ${v.notes}`, { source: 'paste', nowMs: env.now() }).fields.notes ?? { raw: [v.notes.trim()], tags: [], unmapped: [v.notes.trim()] });
    sources.notes = src('notes');
  }
  return Object.keys(problems).length ? { ok: false, problems } : { ok: true, fields, sources };
}

export function beanUpsert(env: Env, beanId: string | null, r: FormResult): BeanUpsertEvent {
  const id = beanId ?? newId(env, 'bean');
  return { id: newId(env, 'ev'), at: env.now() as BeanUpsertEvent['at'], device: env.device, v: 1, kind: 'bean.upsert', data: { beanId: id, fields: r.fields, sources: r.sources, legacy: null } };
}

export function beanArchive(env: Env, beanId: string): BeanArchiveEvent {
  return { id: newId(env, 'ev'), at: env.now() as BeanArchiveEvent['at'], device: env.device, v: 1, kind: 'bean.archive', data: { beanId } };
}

/** Het formulier voor een bestaande zak (bewerken). */
export function formFromBean(state: EngineState, beanId: string): BeanForm | null {
  const b = factsOf(state).beans.get(beanId);
  if (!b) return null;
  const f = formFromScan({ fields: b.fields, sources: b.sources, flags: { countryFuzzy: false, regionFuzzy: false, varietyFuzzy: false, webshop: false, ambiguousTerm: null }, found: undefined as never });
  return { ...f, warnings: [] };
}
