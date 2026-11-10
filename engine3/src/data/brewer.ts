// Engine 3 · grenzen van de brewer. Bron: de huidige app (brewer-gegevens), klasse C (geschat).
// De Chemex-grens komt uit het onderzoek (onderzoek_chemex.md): het bereik van de brongegeven recepten, geen meting.

import type { Method } from '../types.ts';

export interface DoseLimits { readonly min: number; readonly max: number; readonly source: string }

export const DOSE_LIMITS: Readonly<Record<Method, DoseLimits | null>> = {
  v60: { min: 15, max: 22, source: 'Hario V60 02 in de huidige app, geschat (klasse C)' },
  chemex: { min: 15, max: 57, source: '6-kops Chemex (besluit Jelle 9 nov 2026); de grenzen zijn de laagste en hoogste dosis in de recepten uit het onderzoek (Verve 15 g, George Howell 57 g), klasse C' }
};

/**
 * Kopgrootte per brewer (gram koffie in de kop). Afgeleid uit DOSE_LIMITS bij de referentieverhoudingen:
 * binnen dit bereik hoeft de dosis niet afgekapt te worden, dus de verhouding blijft kloppen (audit 10 nov 2026, P1-01).
 * V60: 15–22 g koffie geeft ongeveer 200–285 g in de kop; afgerond op stappen van 10 g. Chemex: 15–57 g geeft ongeveer 195–745 g.
 */
export interface CupLimits { readonly min: number; readonly max: number }
export const CUP_LIMITS: Readonly<Record<Method, CupLimits>> = {
  v60: { min: 200, max: 280 },
  chemex: { min: 200, max: 700 }
};
