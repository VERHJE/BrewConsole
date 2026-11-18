// Favoriete zakken, alleen op dit toestel (localStorage). Tot 18 nov 2026 in core/ronde2.ts (review C3).

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
