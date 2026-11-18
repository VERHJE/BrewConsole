// Zoeken en groeperen in lijsten (zakken, logboek). Zuiver; geen DOM, geen klok. Tot 18 nov 2026 in core/ronde2.ts (review C3).

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
