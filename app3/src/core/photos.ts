// Foto per zak. De foto blijft op het toestel (eigen IndexedDB-database), staat niet in het logboek en niet in de
// synchronisatieblokken, maar wel in de back-up (core/backup.ts, versie 2). Zuivere hulpfuncties + een smalle opslag-interface.

export interface PhotoStore {
  get(beanId: string): Promise<Blob | null>;
  put(beanId: string, blob: Blob): Promise<void>;
  remove(beanId: string): Promise<void>;
  /** Alles wissen (bij 'Alles wissen' in Gegevens). */
  clear(): Promise<void>;
}

export const PHOTO_MAX_SIDE = 1080;
export const PHOTO_MAX_BYTES = 150_000;

/** Verklein binnen een vierkant van `max` px, verhouding behouden, nooit vergroten. */
export function fitWithin(w: number, h: number, max: number = PHOTO_MAX_SIDE): { width: number; height: number } {
  if (!(w > 0) || !(h > 0)) return { width: 1, height: 1 };
  const k = Math.min(1, max / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

/** Kwaliteitstrap voor de codering: begin hoog, daal tot de uitkomst binnen het budget valt. */
export const QUALITY_STEPS: readonly number[] = [0.82, 0.72, 0.62, 0.5, 0.4, 0.3];

/** `encode(quality)` levert de gecodeerde foto; de eerste die klein genoeg is wint, anders de kleinste. */
export async function compressToBudget<T extends { size: number }>(encode: (quality: number) => Promise<T>, maxBytes: number = PHOTO_MAX_BYTES): Promise<T> {
  let best: T | null = null;
  for (const q of QUALITY_STEPS) {
    const out = await encode(q);
    if (!best || out.size < best.size) best = out;
    if (out.size <= maxBytes) return out;
  }
  return best!;
}

export function memoryPhotoStore(): PhotoStore {
  const map = new Map<string, Blob>();
  return {
    get: async id => map.get(id) ?? null,
    put: async (id, b) => { map.set(id, b); },
    remove: async id => { map.delete(id); },
    clear: async () => { map.clear(); }
  };
}

const DB_NAME = 'brewconsole-app3-photos';
const STORE = 'photos';
const req = <T>(r: IDBRequest<T>): Promise<T> => new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
const fin = (tx: IDBTransaction): Promise<void> => new Promise((ok, no) => { tx.oncomplete = () => ok(); tx.onerror = () => no(tx.error); tx.onabort = () => no(tx.error); });

/** Eigen database, los van het logboek. Zonder IndexedDB: geheugen (foto valt weg bij herladen). */
export async function openPhotoStore(factory: IDBFactory | undefined = globalThis.indexedDB): Promise<PhotoStore> {
  if (!factory) return memoryPhotoStore();
  let db: IDBDatabase;
  try {
    const open = factory.open(DB_NAME, 1);
    open.onupgradeneeded = () => { open.result.createObjectStore(STORE); };
    db = await req(open);
  } catch { return memoryPhotoStore(); }
  return {
    async get(id) { return ((await req(db.transaction(STORE, 'readonly').objectStore(STORE).get(id))) as Blob | undefined) ?? null; },
    async put(id, b) { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(b, id); await fin(tx); },
    async remove(id) { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(id); await fin(tx); },
    async clear() { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).clear(); await fin(tx); }
  };
}

/** Een vaste, rustige kleurcombinatie per zaknaam voor de getekende zak. */
export function bagPalette(name: string): { hue: number; hue2: number } {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) { h ^= name.charCodeAt(i); h = Math.imul(h, 16777619); }
  const hue = Math.abs(h) % 360;
  return { hue, hue2: (hue + 28) % 360 };
}
