// Engine 3 · stap 7 · smaakprofiel.
//
// Wat de proever over alle zakken heen opmerkt en waardeert, volledig herleidbaar uit het logboek:
//   - BLINDE KEUZE (CATA): welke smaakcategorieën vink je aan vóór je de notities van de zak ziet, en hoe
//     vaak klopt dat met wat de zak vermeldt (treffers) of niet (valse alarmen)? Dat zegt waar je gevoelig
//     voor bent, en waar je te veel of te weinig opmerkt.
//   - HERKENDE NOTITIES: na het zien van de notities: herken je ze (ja, een beetje, nee)?
//   - WAARDERING: welke categorieën, processen en brandingen vind je lekker (liking, 1–5)?
//   - TENDENSEN: zuurgraad, afdronk en wat je miste.
// Dit stuurt het recept NIET: plan() leest niets hiervan (een test bewaakt dat). Het is bedoeld om te tonen,
// en om zakken te vinden die bij je passen. Kleine aantallen worden gemarkeerd, niet gladgestreken.

import { categoriesOf, roastClassOf } from './technique.ts';
import type { CupFacts, FactState } from './state.ts';
import type { Acidity, Finish, Missed, WheelCategory } from './types.ts';

export const PROFILE_MODEL_VERSION = 'e3-profile-0.1';

export const ALL_CATEGORIES: readonly WheelCategory[] = ['fruitig', 'zuur_gefermenteerd', 'groen_plantaardig', 'overig', 'geroosterd', 'specerijen', 'notig_cacao', 'zoet', 'bloemig'];

/** Minimaal aantal koppen vóór een uitspraak over een categorie. */
export const MIN_N = 3;
/** Gewicht van het algemene gemiddelde bij de waardering (hoe hard een klein aantal wordt bijgetrokken). */
export const LIKING_SHRINK_K = 3;

export type SensitivityStatus = 'unknown' | 'picks_up' | 'misses' | 'overcalls' | 'mixed';

export interface CategorySensitivity {
  readonly category: WheelCategory;
  /** Koppen waarbij de zak deze categorie vermeldt en de keuzevraag is gesteld. */
  readonly nExpected: number;
  readonly hits: number;
  /** Koppen waarbij de zak de categorie niet vermeldt. */
  readonly nNotExpected: number;
  readonly falseAlarms: number;
  readonly recall: number | null;
  readonly falseAlarmRate: number | null;
  /** Treffers min valse alarmen (−1…1); null zolang een van beide ontbreekt. */
  readonly skill: number | null;
  readonly status: SensitivityStatus;
}

export interface NoteRecognition {
  readonly note: string;
  readonly n: number;
  readonly yes: number;
  readonly bit: number;
  readonly no: number;
  /** (ja + ½ beetje) / aantal. */
  readonly score: number;
}

export interface LikingStat {
  readonly key: string;
  readonly n: number;
  readonly mean: number;
  /** Gemiddelde naar het algemene gemiddelde getrokken (kleine aantallen tellen minder). */
  readonly shrunk: number;
  /** Verschil met het algemene gemiddelde, na bijtrekken. */
  readonly delta: number;
  readonly reliable: boolean;
}

export interface TasteProfile {
  readonly version: string;
  readonly cups: number;
  /** Koppen met een gestelde keuzevraag. */
  readonly cataCups: number;
  readonly sensitivity: readonly CategorySensitivity[];
  readonly notes: readonly NoteRecognition[];
  /** Notities die je minstens twee keer herkende (score ≥ 0,67). */
  readonly vocabulary: readonly string[];
  readonly liking: {
    readonly overall: { readonly mean: number; readonly n: number } | null;
    readonly byCategory: readonly LikingStat[];
    readonly byProcess: readonly LikingStat[];
    readonly byRoast: readonly LikingStat[];
  };
  readonly tendencies: {
    readonly acidity: Readonly<Partial<Record<Acidity, number>>>;
    readonly finish: Readonly<Partial<Record<Finish, number>>>;
    readonly missed: Readonly<Partial<Record<Missed, number>>>;
    readonly lateShare: number | null;
  };
}

const norm = (s: string): string => s.trim().toLowerCase();

function beanCategories(facts: FactState, c: CupFacts): WheelCategory[] {
  const b = c.beanId ? facts.beans.get(c.beanId) : undefined;
  return categoriesOf(b?.fields.notes?.tags ?? []);
}

function wasAsked(c: CupFacts): boolean {
  const t = c.tasting;
  if (!t) return false;
  return t.cataAsked ?? (t.cata.length > 0 || t.noteHits.length > 0);
}

function status(s: Omit<CategorySensitivity, 'status'>): SensitivityStatus {
  const enoughExp = s.nExpected >= MIN_N, enoughNot = s.nNotExpected >= MIN_N;
  if (enoughExp && s.recall! < 1 / 3) return 'misses';
  if (enoughNot && s.falseAlarmRate! > 0.5) return 'overcalls';
  if (!enoughExp) return 'unknown'; // zonder genoeg zakken met deze categorie weten we niet of je hem opmerkt
  if (s.recall! >= 2 / 3 && (!enoughNot || s.falseAlarmRate! <= 1 / 3)) return 'picks_up';
  return 'mixed';
}

function likingStats(groups: Map<string, number[]>, overall: number | null): LikingStat[] {
  if (overall === null) return [];
  const out: LikingStat[] = [];
  for (const [key, xs] of groups) {
    const n = xs.length;
    const mean = xs.reduce((a, b) => a + b, 0) / n;
    const shrunk = (mean * n + overall * LIKING_SHRINK_K) / (n + LIKING_SHRINK_K);
    out.push({ key, n, mean, shrunk, delta: shrunk - overall, reliable: n >= MIN_N });
  }
  return out.sort((a, b) => b.delta - a.delta || b.n - a.n || (a.key < b.key ? -1 : 1));
}
const push = (m: Map<string, number[]>, k: string, v: number): void => { const a = m.get(k); if (a) a.push(v); else m.set(k, [v]); };
const bump = <K extends string>(o: Partial<Record<K, number>>, k: K): void => { o[k] = (o[k] ?? 0) + 1; };

export function tasteProfile(facts: FactState): TasteProfile {
  const tasted = facts.cupOrder.map(id => facts.cups.get(id)!).filter(c => c.tasting !== null);

  // Blinde keuze
  const asked = tasted.filter(wasAsked);
  const sensitivity: CategorySensitivity[] = ALL_CATEGORIES.map(category => {
    let nExpected = 0, hits = 0, nNotExpected = 0, falseAlarms = 0;
    for (const c of asked) {
      const has = beanCategories(facts, c).includes(category);
      const ticked = c.tasting!.cata.includes(category);
      if (has) { nExpected++; if (ticked) hits++; } else { nNotExpected++; if (ticked) falseAlarms++; }
    }
    const recall = nExpected ? hits / nExpected : null;
    const falseAlarmRate = nNotExpected ? falseAlarms / nNotExpected : null;
    const base = { category, nExpected, hits, nNotExpected, falseAlarms, recall, falseAlarmRate, skill: recall !== null && falseAlarmRate !== null ? recall - falseAlarmRate : null };
    return { ...base, status: status(base) };
  });

  // Herkende notities
  const acc = new Map<string, { yes: number; bit: number; no: number }>();
  for (const c of tasted) for (const h of c.tasting!.noteHits) {
    const k = norm(h.note);
    if (!k) continue;
    const a = acc.get(k) ?? { yes: 0, bit: 0, no: 0 };
    a[h.hit]++;
    acc.set(k, a);
  }
  const notes: NoteRecognition[] = [...acc].map(([note, a]) => {
    const n = a.yes + a.bit + a.no;
    return { note, n, yes: a.yes, bit: a.bit, no: a.no, score: (a.yes + 0.5 * a.bit) / n };
  }).sort((x, y) => y.n - x.n || (x.note < y.note ? -1 : 1));
  const vocabulary = notes.filter(n => n.n >= 2 && n.score >= 2 / 3).map(n => n.note);

  // Waardering
  const liked = tasted.filter(c => c.tasting!.liking !== null);
  const overall = liked.length ? liked.reduce((a, c) => a + c.tasting!.liking!, 0) / liked.length : null;
  const byCat = new Map<string, number[]>(), byProc = new Map<string, number[]>(), byRoast = new Map<string, number[]>();
  for (const c of liked) {
    const v = c.tasting!.liking!;
    const bean = c.beanId ? facts.beans.get(c.beanId) : undefined;
    for (const cat of beanCategories(facts, c)) push(byCat, cat, v);
    const base = bean?.fields.process?.base;
    if (base && base !== 'unknown') push(byProc, base, v);
    const rc = roastClassOf(bean?.fields.roastLevel);
    if (rc) push(byRoast, rc, v);
  }

  // Tendensen
  const acidity: Partial<Record<Acidity, number>> = {}, finish: Partial<Record<Finish, number>> = {}, missed: Partial<Record<Missed, number>> = {};
  let late = 0;
  for (const c of tasted) {
    const t = c.tasting!;
    if (t.acidity) bump(acidity, t.acidity);
    for (const f of t.finish) bump(finish, f);
    if (t.missed) bump(missed, t.missed);
    if (t.late) late++;
  }

  return {
    version: PROFILE_MODEL_VERSION, cups: tasted.length, cataCups: asked.length,
    sensitivity, notes, vocabulary,
    liking: {
      overall: overall === null ? null : { mean: overall, n: liked.length },
      byCategory: likingStats(byCat, overall), byProcess: likingStats(byProc, overall), byRoast: likingStats(byRoast, overall)
    },
    tendencies: { acidity, finish, missed, lateShare: tasted.length ? late / tasted.length : null }
  };
}

export interface BeanFit {
  readonly beanId: string;
  /** Verwachte afwijking van je gemiddelde waardering (in punten van 1–5), of null als er te weinig is om iets te zeggen. */
  readonly expectedDelta: number | null;
  /** Aantal kenmerken (categorieën, proces, branding) waarop dit gebaseerd is. */
  readonly basis: number;
  readonly parts: ReadonlyArray<{ readonly key: string; readonly delta: number; readonly n: number }>;
}

/** Hoe goed een zak past bij wat je waardeert. Alleen kenmerken met minstens MIN_N waarderingen tellen mee. Toont alleen; stuurt geen recept. */
export function beanFit(facts: FactState, profile: TasteProfile, beanId: string): BeanFit {
  const bean = facts.beans.get(beanId);
  const parts: Array<{ key: string; delta: number; n: number }> = [];
  const take = (stats: readonly LikingStat[], key: string, label: string): void => {
    const s = stats.find(x => x.key === key);
    if (s && s.reliable) parts.push({ key: label, delta: s.delta, n: s.n });
  };
  for (const cat of categoriesOf(bean?.fields.notes?.tags ?? [])) take(profile.liking.byCategory, cat, `categorie:${cat}`);
  const base = bean?.fields.process?.base;
  if (base && base !== 'unknown') take(profile.liking.byProcess, base, `proces:${base}`);
  const rc = roastClassOf(bean?.fields.roastLevel);
  if (rc) take(profile.liking.byRoast, rc, `branding:${rc}`);
  const expectedDelta = parts.length ? parts.reduce((a, p) => a + p.delta, 0) / parts.length : null;
  return { beanId, expectedDelta, basis: parts.length, parts };
}
