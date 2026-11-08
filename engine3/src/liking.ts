// Waardering van een kop: 1 tot 5 sterren in stappen van een kwart (contract e3-contract-1.1).
// Hele sterren uit oudere logboeken blijven geldig.

export const LIKING_MIN = 1;
export const LIKING_MAX = 5;
export const LIKING_STEP = 0.25;

/** Een waardering is een veelvoud van een kwart tussen 1 en 5. */
export function isLiking(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x >= LIKING_MIN && x <= LIKING_MAX && Math.abs(x / LIKING_STEP - Math.round(x / LIKING_STEP)) < 1e-9;
}

/** Rondt af op een kwart en houdt het binnen 1–5; geen getal geeft null. */
export function normaliseLiking(x: unknown): number | null {
  if (typeof x !== 'number' || !Number.isFinite(x)) return null;
  const r = Math.round(x / LIKING_STEP) * LIKING_STEP;
  return Math.min(LIKING_MAX, Math.max(LIKING_MIN, r));
}

/** Eén kwart omhoog (+1) of omlaag (−1); blijft binnen 1–5. */
export function nudgeLiking(current: number, dir: 1 | -1): number {
  return normaliseLiking(current + dir * LIKING_STEP) ?? current;
}
