// De store: het logboek in het geheugen, de toestand die de engine daaruit leert, en opslag.
//
// - Alles wat de gebruiker doet komt hier binnen als gebeurtenissen (append).
// - `state` wordt uit het logboek geleerd (learn), nooit los bijgehouden.
// - Opslaan gebeurt eerst; pas daarna kijkt het scherm. Mislukt opslaan, dan blijft het logboek
//   ongewijzigd en komt de fout terug (geen stille winst in het geheugen die bij herladen verdwijnt).

import { effectiveEvents, mergeLogs, validateEvent, type Engine, type EngineEvent, type EngineState } from '../../../engine3/src/index.ts';
import type { LogStorage } from './storage.ts';

export interface Snapshot {
  readonly events: readonly EngineEvent[];
  readonly state: EngineState;
  /** Wordt bij elke wijziging opgehoogd; handig als sleutel voor memo's. */
  readonly revision: number;
}

export interface Store {
  snapshot(): Snapshot;
  subscribe(listener: (s: Snapshot) => void): () => void;
  /** Voegt gebeurtenissen toe (ongeldige worden geweigerd, dubbele id's genegeerd). */
  append(events: readonly EngineEvent[]): Promise<{ added: number }>;
  /** Voegt een extern logboek samen (import, synchronisatie). */
  merge(events: readonly EngineEvent[]): Promise<{ added: number; conflicts: string[] }>;
  clear(): Promise<void>;
  readonly storage: LogStorage;
}

export class InvalidEventError extends Error {
  readonly issues: readonly string[];
  constructor(issues: readonly string[]) { super(`ongeldige gebeurtenis: ${issues.join('; ')}`); this.name = 'InvalidEventError'; this.issues = issues; }
}

export async function createStore(storage: LogStorage, engine: Engine): Promise<Store> {
  let log: EngineEvent[] = mergeLogs(await storage.load()).events;
  let revision = 0;
  const listeners = new Set<(s: Snapshot) => void>();
  let snap: Snapshot = { events: log, state: engine.learn(effectiveEvents(log)), revision };

  const publish = (): void => {
    revision++;
    snap = { events: log, state: engine.learn(effectiveEvents(log)), revision };
    for (const l of listeners) l(snap);
  };

  async function add(incoming: readonly EngineEvent[]): Promise<{ added: number; conflicts: string[] }> {
    const known = new Set(log.map(e => e.id));
    const fresh = incoming.filter(e => !known.has(e.id));
    if (fresh.length === 0) return { added: 0, conflicts: [] };
    const merged = mergeLogs(log, fresh);
    await storage.append(fresh); // eerst opslaan
    log = merged.events;
    publish();
    return { added: fresh.length, conflicts: merged.conflicts };
  }

  return {
    storage,
    snapshot: () => snap,
    subscribe(l) { listeners.add(l); return () => { listeners.delete(l); }; },
    async append(events) {
      const issues = events.flatMap(e => validateEvent(e).map(i => `${(e as { id?: string }).id ?? '?'}: ${`${i.path} ${i.problem}`}`));
      if (issues.length) throw new InvalidEventError(issues);
      const r = await add(events);
      return { added: r.added };
    },
    merge: add,
    async clear() {
      await storage.clear();
      log = [];
      publish();
    }
  };
}
