// Engine 3 · synchronisatie · client.
//
// Geen eigen toestand en geen eigen netwerk: `fetch` komt mee en de SyncState wordt teruggegeven,
// zodat de aanroeper hem bewaart. Mislukt een stap, dan blijft de toestand ongewijzigd en kan
// dezelfde stap later opnieuw (blokken zijn onveranderlijk, opnieuw sturen geeft geen dubbelen).

import type { EngineEvent } from '../src/types.ts';
import { afterPull, afterPush, openBlock, pendingEvents, sealBlock, type SyncState } from './blocks.ts';
import type { CryptoDeps } from './crypto.ts';
import type { webcrypto } from 'node:crypto';

export interface SyncConfig {
  /** Adres van de Worker, zonder slash aan het eind. */
  readonly baseUrl: string;
  readonly token: string;
  readonly fetch: (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<Response>;
}

export type SyncErrorKind = 'offline' | 'unauthorised' | 'conflict' | 'server';

export class SyncError extends Error {
  readonly kind: SyncErrorKind;
  constructor(kind: SyncErrorKind, message: string) { super(message); this.name = 'SyncError'; this.kind = kind; }
}

async function call(cfg: SyncConfig, method: string, path: string, body?: string): Promise<Response> {
  let res: Response;
  try {
    res = await cfg.fetch(cfg.baseUrl + path, { method, headers: { authorization: `Bearer ${cfg.token}`, ...(body === undefined ? {} : { 'content-type': 'text/plain; charset=utf-8' }) }, ...(body === undefined ? {} : { body }) });
  } catch (e) {
    throw new SyncError('offline', `geen verbinding: ${(e as Error).message}`);
  }
  if (res.status === 401) throw new SyncError('unauthorised', 'token niet geaccepteerd');
  if (res.status === 409) throw new SyncError('conflict', 'de server heeft al iets anders onder dit id');
  if (res.status >= 500) throw new SyncError('server', `serverfout ${res.status}`);
  return res;
}

/** Zout van het logboek, of null als er nog geen logboek op de server staat. */
export async function fetchSalt(cfg: SyncConfig): Promise<string | null> {
  const res = await call(cfg, 'GET', '/meta');
  if (res.status === 404) return null;
  if (!res.ok) throw new SyncError('server', `onverwachte status ${res.status}`);
  return ((await res.json()) as { salt: string }).salt;
}

/** Zet het zout bij het eerste toestel. Geeft het zout terug dat uiteindelijk geldt. */
export async function ensureSalt(cfg: SyncConfig, salt: string): Promise<string> {
  const res = await call(cfg, 'PUT', '/meta', JSON.stringify({ v: 1, salt }));
  if (res.ok) return salt;
  throw new SyncError('server', `onverwachte status ${res.status}`);
}

export interface PushResult { readonly state: SyncState; readonly pushed: number }

/** Verstuurt de nieuwe gebeurtenissen als één blok. */
export async function push(cfg: SyncConfig, deps: CryptoDeps, key: webcrypto.CryptoKey, state: SyncState, log: readonly EngineEvent[]): Promise<PushResult> {
  const pending = pendingEvents(log, state);
  if (pending.length === 0) return { state, pushed: 0 };
  const sealed = await sealBlock(deps, key, 'delta', state, pending);
  const res = await call(cfg, 'PUT', `/blocks/${encodeURIComponent(sealed.id)}`, sealed.body);
  if (!res.ok) throw new SyncError('server', `onverwachte status ${res.status}`);
  return { state: afterPush(state, sealed), pushed: pending.length };
}

export interface PullResult {
  readonly state: SyncState;
  readonly events: EngineEvent[];
  readonly conflicts: string[];
  readonly fetchedBlocks: number;
  /** Blokken die niet te openen waren (verkeerde zin of beschadigd). Ze blijven 'ongezien'. */
  readonly unreadable: string[];
}

export async function listBlockIds(cfg: SyncConfig): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | null = null;
  for (let guard = 0; guard < 1000; guard++) {
    const res = await call(cfg, 'GET', `/blocks?limit=500${cursor === null ? '' : `&cursor=${encodeURIComponent(cursor)}`}`);
    if (!res.ok) throw new SyncError('server', `onverwachte status ${res.status}`);
    const page = (await res.json()) as { ids: string[]; next: string | null };
    ids.push(...page.ids);
    if (page.next === null) break;
    cursor = page.next;
  }
  return ids;
}

/** Haalt nieuwe blokken op en voegt ze samen met het lokale logboek. */
export async function pull(cfg: SyncConfig, deps: CryptoDeps, key: webcrypto.CryptoKey, state: SyncState, local: readonly EngineEvent[]): Promise<PullResult> {
  const seen = new Set(state.seenBlockIds);
  const fresh = (await listBlockIds(cfg)).filter(id => !seen.has(id));
  const opened: Array<{ id: string; plain: Awaited<ReturnType<typeof openBlock>> }> = [];
  const unreadable: string[] = [];
  for (const id of fresh) {
    const res = await call(cfg, 'GET', `/blocks/${encodeURIComponent(id)}`);
    if (res.status === 404) continue; // intussen opgeruimd
    if (!res.ok) throw new SyncError('server', `onverwachte status ${res.status}`);
    try { opened.push({ id, plain: await openBlock(deps, key, id, await res.text()) }); } catch { unreadable.push(id); }
  }
  const r = afterPull(state, local, opened);
  return { state: r.state, events: r.events, conflicts: r.conflicts, fetchedBlocks: opened.length, unreadable };
}

/** Eerst ophalen, dan versturen. */
export async function syncOnce(cfg: SyncConfig, deps: CryptoDeps, key: webcrypto.CryptoKey, state: SyncState, local: readonly EngineEvent[]): Promise<PullResult & { readonly pushed: number }> {
  const p = await pull(cfg, deps, key, state, local);
  const q = await push(cfg, deps, key, p.state, p.events);
  return { ...p, state: q.state, pushed: q.pushed };
}

/**
 * Ruimt op: schrijft één momentopname van het hele logboek en verwijdert daarna de blokken die
 * erin zijn opgegaan. Alleen blokken die deze client heeft gezien worden verwijderd, dus een
 * blok dat een ander toestel net heeft gestuurd blijft staan.
 */
export async function compact(cfg: SyncConfig, deps: CryptoDeps, key: webcrypto.CryptoKey, state: SyncState, log: readonly EngineEvent[]): Promise<{ state: SyncState; removed: number }> {
  const sealed = await sealBlock(deps, key, 'snapshot', state, log);
  const res = await call(cfg, 'PUT', `/blocks/${encodeURIComponent(sealed.id)}`, sealed.body);
  if (!res.ok) throw new SyncError('server', `onverwachte status ${res.status}`);
  const old = state.seenBlockIds.filter(id => id !== sealed.id);
  for (const id of old) await call(cfg, 'DELETE', `/blocks/${encodeURIComponent(id)}`);
  const next = afterPush(state, sealed);
  return { state: { ...next, seenBlockIds: [sealed.id] }, removed: old.length };
}
