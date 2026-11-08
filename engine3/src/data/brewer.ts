// Engine 3 · grenzen van de brewer. Bron: de huidige app (brewer-gegevens), klasse C (geschat).
// De Chemex heeft daar nog geen grens (onderzoeksgat): geen begrenzing, geen verzonnen getal.

import type { Method } from '../types.ts';

export interface DoseLimits { readonly min: number; readonly max: number; readonly source: string }

export const DOSE_LIMITS: Readonly<Record<Method, DoseLimits | null>> = {
  v60: { min: 15, max: 22, source: 'Hario V60 02 in de huidige app, geschat (klasse C)' },
  chemex: null
};
