// Back-up: het hele logboek als één bestand, en inlezen van een eigen back-up of de back-up van de oude app.
// Importeren is eerst een voorbeeld (wat zit erin, wat is nieuw); pas daarna wordt samengevoegd.

import { migrateBackupV3, validateEvent, type EngineEvent, type MigrationReport } from '../../../engine3/src/index.ts';

export const BACKUP_FORMAT = 'brewconsole-log';
export const BACKUP_VERSION = 2;

/** Foto van een zak in de back-up (versie 2). Oudere versies kennen dit veld niet en negeren het. */
export interface BackupPhoto { readonly beanId: string; readonly type: string; readonly data: string }
export const PHOTO_TYPES: readonly string[] = ['image/webp', 'image/jpeg', 'image/png'];
const MAX_PHOTO_BYTES = 400_000;
const MAX_PHOTOS = 300;

export function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function exportLog(events: readonly EngineEvent[], nowMs: number, photos: readonly BackupPhoto[] = []): string {
  return JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date(nowMs).toISOString(), events, photos });
}

export type ImportKind = 'log' | 'old-app' | 'unknown';

export interface ImportPreview {
  readonly kind: ImportKind;
  readonly events: readonly EngineEvent[];
  readonly counts: Readonly<Record<string, number>>;
  readonly warnings: readonly string[];
  /** Foto's uit de back-up die bij een bekende zak horen (geldig, niet te groot). */
  readonly photos: readonly BackupPhoto[];
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
    return { kind: 'unknown', events: [], counts: {}, warnings: ['Dit bestand is geen geldige JSON.'], photos: [], known: 0, fresh: 0 };
  }
  const have = new Set(existing.map(e => e.id));
  const finish = (kind: ImportKind, events: EngineEvent[], warnings: string[], counts?: Record<string, number>): ImportPreview => {
    const known = events.filter(e => have.has(e.id)).length;
    return { kind, events, counts: counts ?? countKinds(events), warnings, photos: [], known, fresh: events.length - known };
  };
  const obj = data as { format?: unknown; events?: unknown; backupVersion?: unknown } | null;
  if (obj && obj.format === BACKUP_FORMAT && Array.isArray(obj.events)) {
    const good: EngineEvent[] = [];
    let bad = 0;
    for (const e of obj.events) { if (validateEvent(e).length === 0) good.push(e as EngineEvent); else bad++; }
    const warnings = bad ? [`${bad} ongeldige gebeurtenis${bad === 1 ? '' : 'sen'} overgeslagen.`] : [];
    const known = new Set<string>();
    for (const e of [...existing, ...good]) if (e.kind === 'bean.upsert') known.add((e.data as { beanId: string }).beanId);
    const { photos, skipped } = readPhotos((obj as { photos?: unknown }).photos, known);
    if (skipped) warnings.push(`${skipped} foto${skipped === 1 ? '' : "'s"} overgeslagen (onbekende zak, te groot of geen geldige afbeelding).`);
    return { ...finish('log', good, warnings), photos };
  }
  if (obj && typeof obj === 'object' && 'backupVersion' in obj) {
    const m = migrateBackupV3(data);
    const r: MigrationReport = m.report;
    return finish('old-app', m.events, [...r.warnings], { ...r.counts });
  }
  return { kind: 'unknown', events: [], counts: {}, warnings: ['Dit bestand is geen back-up van Brew Console.'], photos: [], known: 0, fresh: 0 };
}

/** Alleen foto's van bekende zakken, een toegestaan afbeeldingstype, geldige base64 en hoogstens 400 kB. */
export function readPhotos(raw: unknown, knownBeans: ReadonlySet<string>): { photos: BackupPhoto[]; skipped: number } {
  if (raw === undefined) return { photos: [], skipped: 0 };
  if (!Array.isArray(raw)) return { photos: [], skipped: 0 };
  const photos: BackupPhoto[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const p of raw.slice(0, MAX_PHOTOS)) {
    const o = p as { beanId?: unknown; type?: unknown; data?: unknown } | null;
    const ok = !!o && typeof o.beanId === 'string' && knownBeans.has(o.beanId) && !seen.has(o.beanId)
      && typeof o.type === 'string' && PHOTO_TYPES.includes(o.type)
      && typeof o.data === 'string' && o.data.length <= Math.ceil(MAX_PHOTO_BYTES * 4 / 3) + 4 && /^[A-Za-z0-9+/]+={0,2}$/.test(o.data);
    if (!ok) { skipped++; continue; }
    seen.add(o.beanId as string);
    photos.push({ beanId: o.beanId as string, type: o.type as string, data: o.data as string });
  }
  skipped += Math.max(0, raw.length - MAX_PHOTOS);
  return { photos, skipped };
}
