// Synchronisatie vanuit de app: verbinden, nu synchroniseren, status. De versleuteling en het protocol zitten in
// engine3/sync; hier zit alleen wat de app bewaart (adres, token, sleutel, voortgang) en hoe de uitkomst terugkomt in de store.
// De wachtwoordzin wordt niet bewaard: alleen de afgeleide, niet-uitleesbare sleutel.

import {
  deriveKey, ensureSalt, fetchSalt, newSalt, newSyncState, syncOnce, SyncError,
  type CryptoDeps, type SyncConfig, type SyncState
} from '../../../engine3/sync/index.ts';
import { factsOf } from '../../../engine3/src/index.ts';
import type { Store } from './store.ts';
import type { PhotoSyncResult, PhotoSyncRun } from './photosync.ts';

export interface SyncSettings { readonly baseUrl: string; readonly token: string; readonly salt: string; readonly lastSyncAt: number | null }

export interface SyncStorage {
  load(): Promise<{ settings: SyncSettings; state: SyncState; key: CryptoKey } | null>;
  save(v: { settings: SyncSettings; state: SyncState; key: CryptoKey }): Promise<void>;
  clear(): Promise<void>;
}

export function memorySyncStorage(): SyncStorage {
  let v: { settings: SyncSettings; state: SyncState; key: CryptoKey } | null = null;
  return { load: async () => v, save: async x => { v = x; }, clear: async () => { v = null; } };
}

const DB = 'brewconsole-app3-sync';
export async function indexedDbSyncStorage(factory: IDBFactory | undefined = globalThis.indexedDB): Promise<SyncStorage | null> {
  if (!factory) return null;
  const open = factory.open(DB, 1);
  open.onupgradeneeded = () => { open.result.createObjectStore('kv'); };
  let db: IDBDatabase;
  try { db = await new Promise<IDBDatabase>((res, rej) => { open.onsuccess = () => res(open.result); open.onerror = () => rej(open.error); }); } catch { return null; }
  const run = <T,>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => new Promise((res, rej) => {
    const r = f(db.transaction('kv', mode).objectStore('kv'));
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return {
    load: async () => ((await run('readonly', s => s.get('sync'))) as { settings: SyncSettings; state: SyncState; key: CryptoKey } | undefined) ?? null,
    save: async v => { await run('readwrite', s => s.put(v, 'sync')); },
    clear: async () => { await run('readwrite', s => s.delete('sync')); }
  };
}

export interface SyncDeps {
  readonly crypto: CryptoDeps;
  readonly fetch: SyncConfig['fetch'];
  readonly storage: SyncStorage;
  readonly store: Store;
  readonly device: string;
  readonly now: () => number;
  /** Foto's meesynchroniseren (zie photosync.ts); zonder dit blijven foto's op het toestel. */
  readonly photoSync?: PhotoSyncRun;
  /** Aantal PBKDF2-rondes (alleen tests verlagen dit). */
  readonly iterations?: number;
}

export type SyncOutcome =
  | { readonly ok: true; readonly pushed: number; readonly fetched: number; readonly added: number; readonly photos?: PhotoSyncResult; readonly photoError?: string }
  | { readonly ok: false; readonly kind: 'not_connected' | 'offline' | 'unauthorised' | 'wrong_passphrase' | 'server' | 'conflict'; readonly message: string };

const clean = (url: string): string => url.trim().replace(/\/+$/, '');

function explain(e: unknown): SyncOutcome {
  if (e instanceof SyncError) {
    const message: Record<string, string> = {
      offline: 'Geen verbinding. Het blijft bewaard en gaat mee bij de volgende keer.',
      unauthorised: 'Het token wordt niet geaccepteerd.',
      conflict: 'De server heeft al iets anders onder dit id.',
      server: 'De server gaf een fout.'
    };
    return { ok: false, kind: e.kind, message: message[e.kind] ?? e.message };
  }
  return { ok: false, kind: 'server', message: (e as Error).message };
}

/** Eerste keer: haalt het zout op (of maakt het bij het eerste toestel), leidt de sleutel af en synchroniseert. */
export async function connect(d: SyncDeps, input: { baseUrl: string; token: string; passphrase: string }): Promise<SyncOutcome> {
  const baseUrl = clean(input.baseUrl);
  if (!/^https:\/\//.test(baseUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(baseUrl)) return { ok: false, kind: 'server', message: 'Het adres moet met https:// beginnen.' };
  if (input.token.trim().length < 16) return { ok: false, kind: 'unauthorised', message: 'Het token is te kort.' };
  if (input.passphrase.length < 8) return { ok: false, kind: 'wrong_passphrase', message: 'Kies een wachtwoordzin van minstens 8 tekens.' };
  const cfg: SyncConfig = { baseUrl, token: input.token.trim(), fetch: d.fetch };
  try {
    let salt = await fetchSalt(cfg);
    if (salt === null) salt = await ensureSalt(cfg, newSalt(d.crypto));
    const key = await deriveKey(d.crypto, input.passphrase, salt, d.iterations);
    const settings: SyncSettings = { baseUrl, token: cfg.token, salt, lastSyncAt: null };
    await d.storage.save({ settings, state: newSyncState(d.device), key });
    return await syncNow(d);
  } catch (e) { return explain(e); }
}

export async function syncNow(d: SyncDeps): Promise<SyncOutcome> {
  const saved = await d.storage.load();
  if (!saved) return { ok: false, kind: 'not_connected', message: 'Synchronisatie staat niet aan.' };
  const cfg: SyncConfig = { baseUrl: saved.settings.baseUrl, token: saved.settings.token, fetch: d.fetch };
  try {
    const before = d.store.snapshot().events;
    const r = await syncOnce(cfg, d.crypto, saved.key, saved.state, before);
    // Ongeopende blokken bij een bestaand logboek: bijna zeker een verkeerde wachtwoordzin.
    if (r.unreadable.length > 0 && r.fetchedBlocks === 0) {
      return { ok: false, kind: 'wrong_passphrase', message: 'De gegevens op de server zijn niet te openen. Controleer de wachtwoordzin.' };
    }
    const merged = await d.store.merge(r.events);
    await d.storage.save({ settings: { ...saved.settings, lastSyncAt: d.now() }, state: r.state, key: saved.key });
    // Foto's na het logboek, zodat alle zakken bekend zijn. Een mislukte fotosynchronisatie maakt de rest niet ongedaan.
    let photos: PhotoSyncResult | undefined; let photoError: string | undefined;
    if (d.photoSync) {
      try { photos = (await d.photoSync(cfg, d.crypto, saved.key, [...factsOf(d.store.snapshot().state).beans.keys()])) ?? undefined; }
      catch (e) { const o = explain(e); photoError = o.ok ? 'niet gesynchroniseerd.' : o.message; }
    }
    return { ok: true, pushed: r.pushed, fetched: r.fetchedBlocks, added: merged.added, ...(photos ? { photos } : {}), ...(photoError ? { photoError } : {}) };
  } catch (e) { return explain(e); }
}

export async function disconnect(d: Pick<SyncDeps, 'storage'>): Promise<void> { await d.storage.clear(); }
