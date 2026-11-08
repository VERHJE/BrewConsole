// Zakkenlijst: sorteren en filteren. Zuiver; de gegevens per zak (favoriet, voorraad, gemiddelde) komen van buiten.

import type { BeanRow } from './beans.ts';
import { daysSinceRoast } from './beans.ts';

export type SortMode = 'standaard' | 'naam' | 'vers' | 'waardering' | 'gezet';
export type FilterKey = 'favoriet' | 'bijna_op' | 'vers';

export const SORT_LABEL: Readonly<Record<SortMode, string>> = {
  standaard: 'Favorieten eerst, dan nieuwste', naam: 'Naam (A–Z)', vers: 'Vers gebrand eerst', waardering: 'Hoogst gewaardeerd', gezet: 'Meest gezet'
};
export const FILTER_LABEL: Readonly<Record<FilterKey, string>> = { favoriet: 'Favorieten', bijna_op: 'Bijna op', vers: 'Vers (tot 3 weken)' };
export const FILTER_KEYS: readonly FilterKey[] = ['favoriet', 'bijna_op', 'vers'];
export const FRESH_DAYS = 21;

/** Wat de lijst per zak nodig heeft naast de rij zelf. */
export interface BeanFacts { readonly fav: boolean; readonly low: boolean; readonly avg: number | null }
export interface ListCtx { readonly facts: ReadonlyMap<string, BeanFacts>; readonly todayIso: string }

const f = (ctx: ListCtx, id: string): BeanFacts => ctx.facts.get(id) ?? { fav: false, low: false, avg: null };

/** Elk gekozen filter moet kloppen (EN). */
export function filterBeans(rows: readonly BeanRow[], filters: readonly FilterKey[], ctx: ListCtx): BeanRow[] {
  return rows.filter(r => filters.every(k => {
    if (k === 'favoriet') return f(ctx, r.id).fav;
    if (k === 'bijna_op') return f(ctx, r.id).low;
    const age = daysSinceRoast(r.roastDate, ctx.todayIso);
    return age !== null && age <= FRESH_DAYS;
  }));
}

const cmpName = (a: BeanRow, b: BeanRow): number => a.name.localeCompare(b.name, 'nl', { sensitivity: 'base' }) || a.id.localeCompare(b.id);

/** Stabiel en volledig bepaald: bij gelijke waarde beslist de naam. Zonder waarde komt een zak achteraan. */
export function sortBeans(rows: readonly BeanRow[], mode: SortMode, ctx: ListCtx): BeanRow[] {
  const out = [...rows];
  switch (mode) {
    case 'standaard': return [...out.filter(r => f(ctx, r.id).fav), ...out.filter(r => !f(ctx, r.id).fav)]; // `rows` is al nieuwste eerst
    case 'naam': return out.sort(cmpName);
    case 'vers': return out.sort((a, b) => {
      const x = daysSinceRoast(a.roastDate, ctx.todayIso), y = daysSinceRoast(b.roastDate, ctx.todayIso);
      if (x === null && y === null) return cmpName(a, b);
      if (x === null) return 1;
      if (y === null) return -1;
      return x - y || cmpName(a, b);
    });
    case 'waardering': return out.sort((a, b) => {
      const x = f(ctx, a.id).avg, y = f(ctx, b.id).avg;
      if (x === null && y === null) return cmpName(a, b);
      if (x === null) return 1;
      if (y === null) return -1;
      return y - x || cmpName(a, b);
    });
    case 'gezet': return out.sort((a, b) => b.cups - a.cups || cmpName(a, b));
  }
}

// ───────────── onthouden per toestel ─────────────

export interface ListPrefs { readonly sort: SortMode; readonly filters: readonly FilterKey[] }
export const LIST_KEY = 'brewconsole.zakkenlijst';
export const DEFAULT_LIST: ListPrefs = { sort: 'standaard', filters: [] };

export function readListPrefs(s: { getItem(k: string): string | null } | null): ListPrefs {
  try {
    const v = JSON.parse(s?.getItem(LIST_KEY) ?? 'null') as { sort?: unknown; filters?: unknown } | null;
    const sort = typeof v?.sort === 'string' && v.sort in SORT_LABEL ? (v.sort as SortMode) : 'standaard';
    const filters = Array.isArray(v?.filters) ? (v.filters as unknown[]).filter((x): x is FilterKey => typeof x === 'string' && (FILTER_KEYS as readonly string[]).includes(x)) : [];
    return { sort, filters: [...new Set(filters)] };
  } catch { return DEFAULT_LIST; }
}
export function saveListPrefs(s: { setItem(k: string, v: string): void } | null, p: ListPrefs): void {
  try { s?.setItem(LIST_KEY, JSON.stringify(p)); } catch { /* geen opslag: de keuze geldt tot herladen */ }
}
export const isDefault = (p: ListPrefs): boolean => p.sort === 'standaard' && p.filters.length === 0;
