// Ronde 2: zoeken, maandgroepen, favorieten, rustdagen en twee koppen naast elkaar. Zuiver; geen DOM, geen klok.

import { factsOf, type CupFacts, type EngineState } from '../../../engine3/src/index.ts';
import { clock, nl1, techniqueName } from './brew.ts';
import { STRENGTH_LABEL } from './tasting.ts';

/** Alle woorden van de zoekvraag moeten ergens in de tekst staan (hoofdletters en accenten maken niet uit). */
export function matches(text: string, query: string): boolean {
  const norm = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const hay = norm(text);
  return norm(query).split(/\s+/).filter(Boolean).every(w => hay.includes(w));
}

const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

export function monthLabel(ms: number): string {
  const d = new Date(ms);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Groepeert rijen (nieuwste eerst) per kalendermaand, in volgorde van voorkomen. */
export function groupByMonth<T extends { at: number }>(rows: readonly T[]): Array<{ label: string; rows: T[] }> {
  const out: Array<{ label: string; rows: T[] }> = [];
  for (const r of rows) {
    const label = monthLabel(r.at);
    const last = out[out.length - 1];
    if (last && last.label === label) last.rows.push(r); else out.push({ label, rows: [r] });
  }
  return out;
}

// ───────────── favorieten (alleen op dit toestel) ─────────────

export const FAV_KEY = 'brewconsole.favs';
export function readFavs(s: Pick<Storage, 'getItem'>): Set<string> {
  try { const v = JSON.parse(s.getItem(FAV_KEY) ?? '[]') as unknown; return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []); } catch { return new Set(); }
}
export function toggleFav(s: Pick<Storage, 'getItem' | 'setItem'>, id: string): boolean {
  const set = readFavs(s);
  const now = !set.has(id);
  if (now) set.add(id); else set.delete(id);
  try { s.setItem(FAV_KEY, JSON.stringify([...set])); } catch { /* geen opslag */ }
  return now;
}
/** Favorieten eerst, de rest in dezelfde volgorde. */
export function favFirst<T extends { id: string }>(rows: readonly T[], favs: ReadonlySet<string>): T[] {
  return [...rows.filter(r => favs.has(r.id)), ...rows.filter(r => !favs.has(r.id))];
}

// ───────────── rustdagen ─────────────

export interface RestView { readonly label: string; readonly hint: string }
/** Vuistregel voor filterkoffie: de eerste dagen na branding geeft de zak nog veel gas. Geen harde grens. */
export function restView(days: number | null): RestView | null {
  if (days === null) return null;
  if (days < 4) return { label: 'Nog jong', hint: 'Veel gas: bloeit sterk en proeft vaak scherp. Wacht liever een paar dagen.' };
  if (days < 8) return { label: 'Bijna op dreef', hint: 'Prima te zetten; een volle bloei is normaal.' };
  if (days <= 28) return { label: 'Op dreef', hint: 'De meeste filterkoffie smaakt nu op haar best.' };
  if (days <= 56) return { label: 'Nog goed', hint: 'Wat minder levendig; een tikje fijner malen kan helpen.' };
  return { label: 'Oud', hint: 'De zak is ver na branding; verwacht minder zuur en aroma.' };
}

// ───────────── twee koppen vergelijken ─────────────

export interface CompareRow { readonly label: string; readonly a: string; readonly b: string; readonly changed: boolean }

const str = (t: CupFacts['tasting']): string | null => (t?.strength == null ? null : STRENGTH_LABEL[t.strength]);

export function compareCups(a: CupFacts, b: CupFacts): CompareRow[] {
  const dash = '–';
  const row = (label: string, x: string | null, y: string | null): CompareRow => ({ label, a: x ?? dash, b: y ?? dash, changed: (x ?? dash) !== (y ?? dash) });
  return [
    row('Techniek', techniqueName(a.technique), techniqueName(b.technique)),
    row('Koffie', `${nl1(a.doseG)} g`, `${nl1(b.doseG)} g`),
    row('Water', `${Math.round(a.waterG)} g`, `${Math.round(b.waterG)} g`),
    row('Klik', a.grindClick === null ? null : String(a.grindClick), b.grindClick === null ? null : String(b.grindClick)),
    row('Temperatuur', a.planned.tempC === null ? null : `${a.planned.tempC} °C`, b.planned.tempC === null ? null : `${b.planned.tempC} °C`),
    row('Klaar na', a.endSec === null ? null : clock(a.endSec), b.endSec === null ? null : clock(b.endSec)),
    row('Sterkte', str(a.tasting), str(b.tasting)),
    row('Waardering', a.tasting?.liking ? `${a.tasting.liking} van 5` : null, b.tasting?.liking ? `${b.tasting.liking} van 5` : null)
  ];
}

export function compareById(state: EngineState, idA: string, idB: string): { a: CupFacts; b: CupFacts; rows: CompareRow[] } | null {
  const f = factsOf(state);
  const a = f.cups.get(idA); const b = f.cups.get(idB);
  return a && b ? { a, b, rows: compareCups(a, b) } : null;
}
