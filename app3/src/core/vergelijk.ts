// Twee koppen naast elkaar (Logboek → Vergelijken). Zuiver. Tot 18 nov 2026 in core/ronde2.ts (review C3).

import { factsOf, type CupFacts, type EngineState } from '../../../engine3/src/index.ts';
import { clock, nl1, techniqueName } from './brew.ts';
import { STRENGTH_LABEL, formatLiking } from './tasting.ts';

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
    row('Waardering', a.tasting?.liking ? `${formatLiking(a.tasting.liking)} van 5` : null, b.tasting?.liking ? `${formatLiking(b.tasting.liking)} van 5` : null)
  ];
}

export function compareById(state: EngineState, idA: string, idB: string): { a: CupFacts; b: CupFacts; rows: CompareRow[] } | null {
  const f = factsOf(state);
  const a = f.cups.get(idA); const b = f.cups.get(idB);
  return a && b ? { a, b, rows: compareCups(a, b) } : null;
}
