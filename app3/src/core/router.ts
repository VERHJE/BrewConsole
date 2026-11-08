// Kleine hash-router zonder DOM: een route is een pad met delen, bv. '#/zakken/abc' → ['zakken','abc'].

export type Tab = 'zetten' | 'zakken' | 'logboek' | 'meer';
export const TABS: readonly Tab[] = ['zetten', 'zakken', 'logboek', 'meer'];

export interface Route {
  readonly parts: readonly string[];
  /** Eerste deel als bekende tab; anders 'zetten'. */
  readonly tab: Tab;
  /** Een lopend zetsel of invoer: de tabbalk verdwijnt. */
  readonly focused: boolean;
}

const FOCUSED = new Set(['timer', 'proeven']);

export function parseRoute(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  const parts = clean.split('/').filter(Boolean).map(p => { try { return decodeURIComponent(p); } catch { return p; } });
  const first = parts[0] ?? 'zetten';
  const tab = (TABS as readonly string[]).includes(first) ? (first as Tab) : first === 'timer' || first === 'proeven' ? 'zetten' : 'zetten';
  return { parts: parts.length ? parts : ['zetten'], tab, focused: FOCUSED.has(first) };
}

export const href = (...parts: string[]): string => '#/' + parts.map(encodeURIComponent).join('/');
