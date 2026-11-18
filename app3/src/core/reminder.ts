// Back-upherinnering (review 17 nov 2026, W3). Eén regel voor Meer en Gegevens: herinneren als er gegevens zijn en de laatste
// back-up ontbreekt of 14 dagen of ouder is. Niet als de synchronisatie in die 14 dagen gelukt is: dan staat er een
// (versleutelde) kopie op de server. 14 dagen is een keuze (zoals al op Gegevens), geen meting.

export const BACKUP_REMIND_DAYS = 14;
const DAY = 86_400_000;
export const LAST_EXPORT_KEY = 'brewconsole.lastExport';

export function readLastExport(ls: Pick<Storage, 'getItem'> | null | undefined): number | null {
  try { return Number(ls?.getItem(LAST_EXPORT_KEY)) || null; } catch { return null; }
}

export function backupReminder(i: { readonly lastExport: number | null; readonly now: number; readonly hasData: boolean; readonly lastSyncAt: number | null }): string | null {
  if (!i.hasData) return null;
  if (i.lastSyncAt !== null && i.now - i.lastSyncAt < BACKUP_REMIND_DAYS * DAY) return null;
  if (i.lastExport === null) return 'Je hebt nog geen back-up gemaakt.';
  const days = Math.floor((i.now - i.lastExport) / DAY);
  return days >= BACKUP_REMIND_DAYS ? `Je laatste back-up is ${days} dagen oud.` : null;
}
