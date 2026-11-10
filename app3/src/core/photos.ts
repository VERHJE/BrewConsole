// Foto per zak. De foto staat op het toestel (eigen IndexedDB-database), niet in het logboek en niet in de gebeurtenisblokken van de
// synchronisatie; wel in de back-up (core/backup.ts, versie 2) en, als synchronisatie aanstaat, als eigen versleutelde foto-blokken
// (core/photosync.ts). Zuivere hulpfuncties + een smalle opslag-interface.

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

/** Zes ingetogen, donkere tinten voor het etiket van een zak zonder foto (vast per naam). Altijd donker genoeg voor ivoor tekst. */
export const LABEL_TINTS: ReadonlyArray<readonly [string, string]> = [
  ['#2c2118', '#43321f'], // espresso
  ['#33402a', '#46573a'], // mos
  ['#4a2a2a', '#633838'], // oxbloed
  ['#2b3540', '#3d4c5f'], // leisteen
  ['#3d2b36', '#55394a'], // pruim
  ['#24403d', '#33605a']  // diep teal
];
export function labelTint(name: string): readonly [string, string] {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) { h ^= name.charCodeAt(i); h = Math.imul(h, 16777619); }
  return LABEL_TINTS[Math.abs(h) % LABEL_TINTS.length]!;
}
/** Eerste letter (hoofdletter) van de naam voor het monogram; '·' zonder naam. */
export function monogram(name: string): string {
  const ch = Array.from(name.trim().replace(/^[^\p{L}\p{N}]+/u, ''))[0];
  return ch ? ch.toLocaleUpperCase('nl-NL') : '·';
}

/**
 * Hoogtelijnen voor het etiket van een zak zonder foto: een kleine 'kaart' van een heuvel, vast per naam
 * (dezelfde zak ziet er altijd hetzelfde uit). Geeft SVG-paden in een vlak van 100 × 100.
 * Puur decoratief; er zit geen gegeven van de zak in behalve de naam als zaadje.
 */
export function labelContours(seed: string, rings = 11): string[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  let s = h >>> 0;
  const rnd = (): number => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const cx = 28 + rnd() * 44, cy = 30 + rnd() * 40;
  const waves = [2, 3, 5].map(k => ({ k, amp: 0.05 + rnd() * 0.09, ph: rnd() * Math.PI * 2, drift: (rnd() - 0.5) * 0.5 }));
  const steps = 96;
  const out: string[] = [];
  for (let i = 0; i < rings; i++) {
    const r = 6 + i * 7.5;
    let d = '';
    for (let j = 0; j < steps; j++) {
      const a = (j / steps) * Math.PI * 2;
      let f = 1;
      for (const w of waves) f += w.amp * Math.sin(w.k * a + w.ph + i * w.drift);
      const x = cx + Math.cos(a) * r * f, y = cy + Math.sin(a) * r * f;
      d += `${j ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    out.push(d + 'Z');
  }
  return out;
}

/** Brandingsgraad als stap 1 (licht) tot 5 (donker), voor de schaal op het etiket. */
export const ROAST_STEP = { light: 1, light_medium: 2, medium: 3, medium_dark: 4, dark: 5 } as const;
