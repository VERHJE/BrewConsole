// Back-up: het hele logboek als één bestand, en inlezen van een eigen back-up of de back-up van de oude app.
// Importeren is eerst een voorbeeld (wat zit erin, wat is nieuw); pas daarna wordt samengevoegd.

import { migrateBackupV3, validateEvent, type EngineEvent, type MigrationReport } from '../../../engine3/src/index.ts';

export const BACKUP_FORMAT = 'brewconsole-log';
export const BACKUP_VERSION = 1;

export function exportLog(events: readonly EngineEvent[], nowMs: number): string {
  return JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date(nowMs).toISOString(), events });
}

export type ImportKind = 'log' | 'old-app' | 'unknown';

export interface ImportPreview {
  readonly kind: ImportKind;
  readonly events: readonly EngineEvent[];
  readonly counts: Readonly<Record<string, number>>;
  readonly warnings: readonly string[];
  /** Gebeurtenissen die al in het logboek staan. */
  readonly known: number;
  /** Gebeurtenissen die nieuw zouden zijn. */
  readonly fresh: number;
}

const countKinds = (events: readonly EngineEvent[]): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const e of events) out[e.kind] = (out[e.kind] ?? 0) + 1;
  return out;
};

export function previewImport(text: string, existing: readonly EngineEvent[]): ImportPreview {
  let data: unknown;
  try { data = JSON.parse(text); } catch {
    return { kind: 'unknown', events: [], counts: {}, warnings: ['Dit bestand is geen geldige JSON.'], known: 0, fresh: 0 };
  }
  const have = new Set(existing.map(e => e.id));
  const finish = (kind: ImportKind, events: EngineEvent[], warnings: string[], counts?: Record<string, number>): ImportPreview => {
    const known = events.filter(e => have.has(e.id)).length;
    return { kind, events, counts: counts ?? countKinds(events), warnings, known, fresh: events.length - known };
  };
  const obj = data as { format?: unknown; events?: unknown; backupVersion?: unknown } | null;
  if (obj && obj.format === BACKUP_FORMAT && Array.isArray(obj.events)) {
    const good: EngineEvent[] = [];
    let bad = 0;
    for (const e of obj.events) { if (validateEvent(e).length === 0) good.push(e as EngineEvent); else bad++; }
    return finish('log', good, bad ? [`${bad} ongeldige gebeurtenis${bad === 1 ? '' : 'sen'} overgeslagen.`] : []);
  }
  if (obj && typeof obj === 'object' && 'backupVersion' in obj) {
    const m = migrateBackupV3(data);
    const r: MigrationReport = m.report;
    return finish('old-app', m.events, [...r.warnings], { ...r.counts });
  }
  return { kind: 'unknown', events: [], counts: {}, warnings: ['Dit bestand is geen back-up van Brew Console.'], known: 0, fresh: 0 };
}
