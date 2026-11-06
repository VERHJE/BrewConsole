// Verloop en pasvorm: alleen lezen uit de feiten van de engine. Er wordt hier niets zelf gemodelleerd;
// de reeksen zijn de koppen op volgorde, en de pasvorm komt uit beanFit().

import { factsOf, tasteProfile, beanFit, type EngineState, type WheelCategory } from '../../../engine3/src/index.ts';
import { PROCESS_LABEL } from './beans.ts';
import { CATEGORIES } from './tasting.ts';

export interface TrendPoint {
  readonly brewId: string;
  readonly at: number;
  /** Volgnummer binnen deze reeks (1 = eerste kop). */
  readonly n: number;
  readonly technique: string;
  readonly doseG: number;
  readonly click: number | null;
  /** Seconden tot klaar. */
  readonly endSec: number | null;
  /** Seconden van de laatste giet tot doorgelopen. */
  readonly lastDrainSec: number | null;
  /** −2 … +2, null als niet geproefd of niet ingevuld. */
  readonly strength: number | null;
  readonly liking: number | null;
  readonly tdsPct: number | null;
}

/** Afgeronde koppen op volgorde (afgebroken en nog niet gestarte koppen tellen niet). `beanId` null = alle zakken. */
export function trendPoints(state: EngineState, beanId: string | null): TrendPoint[] {
  const facts = factsOf(state);
  const out: TrendPoint[] = [];
  for (const id of facts.cupOrder) {
    const c = facts.cups.get(id)!;
    if (beanId !== null && c.beanId !== beanId) continue;
    if (c.status !== 'complete') continue;
    out.push({
      brewId: c.brewId, at: c.at, n: out.length + 1, technique: c.technique, doseG: c.doseG, click: c.grindClick,
      endSec: c.endSec, lastDrainSec: c.lastDrainSec, strength: c.tasting?.strength ?? null, liking: c.tasting?.liking ?? null, tdsPct: c.tdsPct
    });
  }
  return out;
}

export interface Series { readonly key: 'dose' | 'end' | 'strength' | 'liking'; readonly title: string; readonly unit: string; readonly points: ReadonlyArray<{ n: number; at: number; y: number; brewId: string; note: string }> }

const num1 = (n: number): string => (Math.round(n * 10) / 10).toString().replace('.', ',');
const clock = (s: number): string => `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;
export const STRENGTH_WORD: Readonly<Record<string, string>> = { '-2': 'veel te slap', '-1': 'iets slap', '0': 'precies goed', '1': 'iets sterk', '2': 'veel te sterk' };

export function seriesOf(points: readonly TrendPoint[]): Series[] {
  const take = (f: (p: TrendPoint) => number | null, note: (p: TrendPoint) => string): Series['points'] =>
    points.flatMap(p => { const y = f(p); return y === null ? [] : [{ n: p.n, at: p.at, y, brewId: p.brewId, note: note(p) }]; });
  return [
    { key: 'dose', title: 'Koffie per kop', unit: 'g', points: take(p => p.doseG, p => `${num1(p.doseG)} g${p.click !== null ? ` · klik ${p.click}` : ''}`) },
    { key: 'end', title: 'Klaar na', unit: 'min:sec', points: take(p => p.endSec, p => `${clock(p.endSec!)}${p.lastDrainSec !== null ? ` · laatste giet na ${clock(p.lastDrainSec)}` : ''}${p.click !== null ? ` · klik ${p.click}` : ''}`) },
    { key: 'strength', title: 'Sterkte-oordeel', unit: '', points: take(p => p.strength, p => STRENGTH_WORD[String(p.strength)] ?? '') },
    { key: 'liking', title: 'Waardering', unit: 'van 5', points: take(p => p.liking, p => `${p.liking} van 5`) }
  ];
}

// ───────────── pasvorm ─────────────

export interface FitView {
  /** null: te weinig om iets te zeggen. */
  readonly expectedDelta: number | null;
  readonly parts: ReadonlyArray<{ label: string; delta: number; n: number }>;
  readonly text: string;
}

const ROAST_CLASS: Readonly<Record<string, string>> = { light: 'licht gebrand', medium: 'medium gebrand', dark: 'donker gebrand' };

function labelOf(key: string): string {
  const [kind, value = ''] = key.split(':');
  if (kind === 'categorie') return `Smaakgroep ${CATEGORIES.find(c => c.key === (value as WheelCategory))?.name.toLowerCase() ?? value}`;
  if (kind === 'proces') return `Proces ${(PROCESS_LABEL as Record<string, string>)[value]?.toLowerCase() ?? value}`;
  if (kind === 'branding') return `Branding ${ROAST_CLASS[value] ?? value}`;
  return key;
}

export function fitView(state: EngineState, beanId: string): FitView {
  const facts = factsOf(state);
  const fit = beanFit(facts, tasteProfile(facts), beanId);
  const parts = fit.parts.map(p => ({ label: labelOf(p.key), delta: p.delta, n: p.n }));
  if (fit.expectedDelta === null) {
    return { expectedDelta: null, parts, text: 'Nog te weinig om iets te zeggen: een kenmerk telt pas mee na minstens 3 waarderingen.' };
  }
  const d = fit.expectedDelta;
  const size = Math.abs(d) < 0.15 ? 'ongeveer op je gemiddelde' : `${num1(Math.abs(d))} punt ${d > 0 ? 'boven' : 'onder'} je gemiddelde`;
  return { expectedDelta: d, parts, text: `Verwachte waardering: ${size} (op basis van ${fit.basis} ${fit.basis === 1 ? 'kenmerk' : 'kenmerken'}).` };
}
