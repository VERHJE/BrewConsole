// Engine 3 · grenzen van de brewer. Bron: de huidige app (brewer-gegevens), klasse C (geschat).
// De Chemex-grens komt uit het onderzoek (onderzoek_chemex.md): het bereik van de brongegeven recepten, geen meting.

import type { Method } from '../types.ts';

export interface DoseLimits { readonly min: number; readonly max: number; readonly source: string }

export const DOSE_LIMITS: Readonly<Record<Method, DoseLimits | null>> = {
  v60: { min: 15, max: 22, source: 'Hario V60 02 in de huidige app, geschat (klasse C)' },
  chemex: { min: 15, max: 57, source: '6-kops Chemex (besluit Jelle 9 nov 2026); de grenzen zijn de laagste en hoogste dosis in de recepten uit het onderzoek (Verve 15 g, George Howell 57 g), klasse C' }
};
