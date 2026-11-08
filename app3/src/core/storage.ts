// Opslag van het logboek. Een smalle interface, zodat de store in Node met geheugen getest wordt
// en in de browser op IndexedDB draait. Er wordt alleen toegevoegd; wissen is een aparte, bewuste actie.

import type { EngineEvent } from '../../../engine3/src/index.ts';

export interface LogStorage {
  load(): Promise<EngineEvent[]>;
  /** Voegt toe; een id dat al bestaat wordt overschreven met dezelfde inhoud (idempotent). */
  append(events: readonly EngineEvent[]): Promise<void>;
  clear(): Promise<void>;
  /** Of de opslag blijvend is (false: geheugen, valt weg bij herladen). */
  readonly persistent: boolean;
}

export function memoryStorage(initial: readonly EngineEvent[] = []): LogStorage {
  const map = new Map<string, EngineEvent>(initial.map(e => [e.id, e]));
  return {
    persistent: false,
    load: async () => [...map.values()],
    append: async events => { for (const e of events) map.set(e.id, e); },
    clear: async () => { map.clear(); }
  };
}

const DB_NAME = 'brewconsole-app3';
const STORE = 'events';

function request<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}
function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
}

/** IndexedDB; geeft null als de browser het niet toestaat (privévenster, geblokkeerd). */
export async function openIndexedDbStorage(factory: IDBFactory | undefined = globalThis.indexedDB): Promise<LogStorage | null> {
  if (!factory) return null;
  let db: IDBDatabase;
  try {
    const open = factory.open(DB_NAME, 1);
    open.onupgradeneeded = () => { open.result.createObjectStore(STORE, { keyPath: 'id' }); };
    db = await request(open);
  } catch { return null; }
  return {
    persistent: true,
    async load() {
      const tx = db.transaction(STORE, 'readonly');
      return (await request(tx.objectStore(STORE).getAll())) as EngineEvent[];
    },
    async append(events) {
      const tx = db.transaction(STORE, 'readwrite');
      const os = tx.objectStore(STORE);
      for (const e of events) os.put(e);
      await done(tx);
    },
    async clear() {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      await done(tx);
    }
  };
}
