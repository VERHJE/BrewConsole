// Engine 3 · grenzen van de brewer. Klasse C: het bereik van de doses in de recepten uit de bronnen, geen meting.
// Chemex: onderzoek_chemex.md. V60: de V60-recepten in techniques.ts (review 17 nov 2026, R1).

import type { Method } from '../types.ts';

export interface DoseLimits { readonly min: number; readonly max: number; readonly source: string }

export const DOSE_LIMITS: Readonly<Record<Method, DoseLimits | null>> = {
  v60: { min: 15, max: 32.5, source: 'Hario V60 02 (besluit Jelle 17 nov 2026); de grenzen zijn de laagste en hoogste dosis in de V60-recepten uit de bronnen (Hedrick 15 g, Wendelboe 32,5 g; Hoffmann 30 g op 500 g in de V60 02), klasse C. Was 22 g, een schatting die de eigen bronnen tegensprak' },
  chemex: { min: 15, max: 57, source: '6-kops Chemex (besluit Jelle 9 nov 2026); de grenzen zijn de laagste en hoogste dosis in de recepten uit het onderzoek (Verve 15 g, George Howell 57 g), klasse C' }
};

/**
 * Kopgrootte per brewer (gram koffie in de kop). Afgeleid uit DOSE_LIMITS bij de referentieverhoudingen:
 * binnen dit bereik hoeft de dosis niet afgekapt te worden, dus de verhouding blijft kloppen (audit 10 nov 2026, P1-01).
 * V60: 15–32,5 g koffie geeft ongeveer 200–425 g in de kop (bij 420 g wil de standaardkeuze 32,1 g); afgerond op stappen van 10 g.
 * Chemex: 15–57 g geeft ongeveer 195–745 g.
 */
export interface CupLimits { readonly min: number; readonly max: number }
export const CUP_LIMITS: Readonly<Record<Method, CupLimits>> = {
  v60: { min: 200, max: 420 },
  chemex: { min: 200, max: 700 }
};
