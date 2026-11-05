// Engine 3 · synchronisatie · blokken.
//
// Een blok bevat gebeurtenissen die nog niet verstuurd zijn ('delta') of een momentopname van het
// hele logboek ('snapshot'). Het blok-id is afgeleid van toestel en volgnummer: opnieuw versturen
// overschrijft hetzelfde blok met dezelfde inhoud, dus geeft geen dubbelen.

import { mergeLogs, validateEvent } from '../src/events.ts';
import type { EngineEvent } from '../src/types.ts';
import { open, seal, type CryptoDeps } from './crypto.ts';
import type { webcrypto } from 'node:crypto';

export type BlockKind = 'delta' | 'snapshot';

export interface BlockPlain {
  readonly v: 1;
  readonly kind: BlockKind;
  readonly device: string;
  readonly seq: number;
  readonly events: readonly EngineEvent[];
}

/** Wat de client onthoudt tussen twee synchronisaties. Wordt door de aanroeper bewaard. */
export interface SyncState {
  readonly device: string;
  readonly nextSeq: number;
  /** Id's van gebeurtenissen die al in een verstuurd blok zitten. */
  readonly pushedEventIds: readonly string[];
  /** Id's van blokken die al zijn opgehaald en samengevoegd. */
  readonly seenBlockIds: readonly string[];
}

export const BLOCK_ID_PATTERN = /^[A-Za-z0-9._-]{1,96}$/;
export const MAX_BLOCK_BYTES = 900_000;

export function newSyncState(device: string): SyncState {
  if (!BLOCK_ID_PATTERN.test(device)) throw new Error('ongeldig toestel-id');
  return { device, nextSeq: 1, pushedEventIds: [], seenBlockIds: [] };
}

export function blockId(kind: BlockKind, device: string, seq: number): string {
  return `${kind === 'snapshot' ? 'snap' : 'blk'}-${device}-${String(seq).padStart(8, '0')}`;
}

/** Gebeurtenissen die nog niet in een verstuurd blok zitten. */
export function pendingEvents(log: readonly EngineEvent[], state: SyncState): EngineEvent[] {
  const pushed = new Set(state.pushedEventIds);
  return log.filter(e => !pushed.has(e.id));
}

export interface SealedBlock {
  readonly id: string;
  readonly body: string;
  readonly eventIds: readonly string[];
}

export async function sealBlock(deps: CryptoDeps, key: webcrypto.CryptoKey, kind: BlockKind, state: SyncState, events: readonly EngineEvent[]): Promise<SealedBlock> {
  const id = blockId(kind, state.device, state.nextSeq);
  const plain: BlockPlain = { v: 1, kind, device: state.device, seq: state.nextSeq, events };
  const body = await seal(deps, key, id, JSON.stringify(plain));
  if (body.length > MAX_BLOCK_BYTES) throw new Error(`blok te groot (${body.length} tekens); gebruik kleinere blokken`);
  return { id, body, eventIds: events.map(e => e.id) };
}

/** Pakt een blok uit en keurt elke gebeurtenis; een kapotte gebeurtenis maakt het hele blok ongeldig. */
export async function openBlock(deps: CryptoDeps, key: webcrypto.CryptoKey, id: string, body: string): Promise<BlockPlain> {
  const text = await open(deps, key, id, body);
  let plain: BlockPlain;
  try { plain = JSON.parse(text) as BlockPlain; } catch { throw new Error('blok bevat geen geldige JSON'); }
  if (plain.v !== 1 || !Array.isArray(plain.events)) throw new Error('blok heeft een onbekende vorm');
  for (const e of plain.events) {
    const issues = validateEvent(e);
    if (issues.length > 0) throw new Error(`ongeldige gebeurtenis in blok ${id}: ${issues[0]!.path} ${issues[0]!.problem}`);
  }
  return plain;
}

/** Na een geslaagde push: de verstuurde gebeurtenissen en het volgnummer bijwerken. */
export function afterPush(state: SyncState, sealed: SealedBlock): SyncState {
  const pushed = new Set(state.pushedEventIds);
  for (const id of sealed.eventIds) pushed.add(id);
  const seen = new Set(state.seenBlockIds);
  seen.add(sealed.id);
  return { device: state.device, nextSeq: state.nextSeq + 1, pushedEventIds: [...pushed], seenBlockIds: [...seen] };
}

/** Voegt opgehaalde blokken samen met het lokale logboek. Opgehaalde gebeurtenissen gelden als al verstuurd. */
export function afterPull(state: SyncState, local: readonly EngineEvent[], fetched: ReadonlyArray<{ id: string; plain: BlockPlain }>): { state: SyncState; events: EngineEvent[]; conflicts: string[] } {
  const merged = mergeLogs(local, ...fetched.map(f => f.plain.events));
  const pushed = new Set(state.pushedEventIds);
  const seen = new Set(state.seenBlockIds);
  // Eigen blokken die we niet meer kennen (bijvoorbeeld na het wissen van de app): volgnummer doortellen,
  // zodat een nieuw blok nooit een bestaand blok-id raakt.
  let nextSeq = state.nextSeq;
  for (const f of fetched) {
    seen.add(f.id);
    for (const e of f.plain.events) pushed.add(e.id);
    if (f.plain.device === state.device) nextSeq = Math.max(nextSeq, f.plain.seq + 1);
  }
  return { state: { device: state.device, nextSeq, pushedEventIds: [...pushed], seenBlockIds: [...seen] }, events: merged.events, conflicts: merged.conflicts };
}
