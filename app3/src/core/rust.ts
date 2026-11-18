// Rustdagen na branding: een vuistregel voor filterkoffie. Zuiver. Tot 18 nov 2026 in core/ronde2.ts (review C3).

export interface RestView { readonly label: string; readonly hint: string }
/** Vuistregel voor filterkoffie: de eerste dagen na branding geeft de zak nog veel gas. Geen harde grens. */
export function restView(days: number | null): RestView | null {
  if (days === null) return null;
  if (days < 4) return { label: 'Nog jong', hint: 'Veel gas: bloeit sterk en proeft vaak scherp. Wacht liever een paar dagen.' };
  if (days < 8) return { label: 'Bijna op dreef', hint: 'Prima te zetten; een volle bloei is normaal.' };
  if (days <= 28) return { label: 'Op dreef', hint: 'De meeste filterkoffie smaakt nu op haar best.' };
  if (days <= 56) return { label: 'Nog goed', hint: 'Wat minder levendig; een tikje fijner malen kan helpen.' };
  return { label: 'Oud', hint: 'De zak is ver na branding; verwacht minder zuur en aroma.' };
}
