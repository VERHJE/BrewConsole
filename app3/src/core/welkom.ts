// Eerste start: de welkomstkaart staat op Zetten zolang er nog niets is vastgelegd en je hem niet hebt weggeklikt.

export const WELKOM_KEY = 'brewconsole.welkom';

export function welkomGezien(s: Pick<Storage, 'getItem'>): boolean {
  try { return s.getItem(WELKOM_KEY) === '1'; } catch { return false; }
}
export function markeerWelkomGezien(s: Pick<Storage, 'setItem'>): void {
  try { s.setItem(WELKOM_KEY, '1'); } catch { /* geen opslag: de kaart komt dan bij een volgende start terug */ }
}
/** Tonen alleen bij een lege app die je nog niet hebt weggeklikt. */
export function toonWelkom(eventCount: number, gezien: boolean): boolean {
  return eventCount === 0 && !gezien;
}
