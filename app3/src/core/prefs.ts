// Weergavevoorkeuren per toestel (lettertype voor koppen). Bewust niet in het logboek: ze horen bij dit scherm,
// niet bij je koffie, en hoeven niet te synchroniseren. Opslag en element komen van buiten zodat dit in Node te testen is.
// Het thema is geen keuze meer: de app heeft één thema (groen-espresso met goud, 10 nov 2026).

export type TypePref = 'serif' | 'sans';

export const TYPE_KEY = 'brewconsole.type';

export const TYPE_LABEL: Readonly<Record<TypePref, string>> = { serif: 'Met schreef (standaard)', sans: 'Schreefloos' };

export interface PrefStorage { getItem(k: string): string | null; setItem(k: string, v: string): void }
export interface PrefTarget { setAttribute(k: string, v: string): void; removeAttribute(k: string): void }

function read<T extends string>(s: PrefStorage | null, key: string, allowed: readonly T[], fallback: T): T {
  try { const v = s?.getItem(key); return (allowed as readonly string[]).includes(v ?? '') ? (v as T) : fallback; } catch { return fallback; }
}
export const readType = (s: PrefStorage | null): TypePref => read(s, TYPE_KEY, ['serif', 'sans'], 'serif');

export function applyPrefs(el: PrefTarget, type: TypePref): void {
  if (type === 'serif') el.removeAttribute('data-type'); else el.setAttribute('data-type', type);
}

export function savePref(s: PrefStorage | null, key: string, value: string): void {
  try { s?.setItem(key, value); } catch { /* geen opslag: de keuze geldt dan alleen tot herladen */ }
}

/** De kleur voor de statusbalk van de browser: de achtergrond van het thema. */
export const THEME_COLOR = '#1e3128';
