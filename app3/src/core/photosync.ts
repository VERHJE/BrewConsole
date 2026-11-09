// Foto's synchroniseren (de foto zelf blijft een gewone Blob per zak in de eigen database, zie photos.ts).
//
// Per zak houden we een markering bij: wanneer de foto het laatst veranderde (tijdstip), of het een verwijdering was, en of die
// wijziging al naar de server is. Bij het synchroniseren geldt de nieuwste wijziging (ook een verwijdering). De wijzigingen reizen als
// versleutelde foto-blokken (engine3/sync/photo-blocks.ts); de server ziet alleen een kenmerk per zak en een tijdstip.
// Zonder foto-routes op de server (een oudere Worker) doet dit niets en gaat de rest van de synchronisatie gewoon door.

import {
  beanKey, deletePhotoId, getPhotoBody, latestPerBean, listPhotoIds, MAX_BLOCK_BYTES, openPhoto, photoId, putPhotoBody, sealPhoto,
  type CryptoDeps, type PhotoPlain, type SyncConfig
} from '../../../engine3/sync/index.ts';
import type { webcrypto } from 'node:crypto';
import { PHOTO_TYPES, base64ToBytes, bytesToBase64 } from './backup.ts';
import type { PhotoStore } from './photos.ts';

export interface PhotoMark { at: number; deleted: boolean; dirty: boolean }
export type PhotoMarks = Record<string, PhotoMark>;

export interface PhotoMetaStore { load(): PhotoMarks; save(m: PhotoMarks): void }

const META_KEY = 'brewconsole.fotosync';

export function localPhotoMeta(ls: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): PhotoMetaStore {
  return {
    load() {
      try {
        const raw = JSON.parse(ls.getItem(META_KEY) ?? '{}') as unknown;
        if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return {};
        const out: PhotoMarks = {};
        for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
          const m = v as Partial<PhotoMark> | null;
          if (m && Number.isFinite(m.at) && typeof m.deleted === 'boolean' && typeof m.dirty === 'boolean') out[k] = { at: m.at as number, deleted: m.deleted, dirty: m.dirty };
        }
        return out;
      } catch { return {}; }
    },
    save(m) { try { if (Object.keys(m).length === 0) ls.removeItem(META_KEY); else ls.setItem(META_KEY, JSON.stringify(m)); } catch { /* geen opslag: de volgende keer opnieuw */ } }
  };
}

export function memoryPhotoMeta(): PhotoMetaStore {
  let m: PhotoMarks = {};
  return { load: () => structuredClone(m), save: x => { m = structuredClone(x); } };
}

export interface PhotoSyncResult { readonly pushed: number; readonly pulled: number; readonly removed: number; readonly skipped: number }

export type PhotoSyncRun = (cfg: SyncConfig, deps: CryptoDeps, key: webcrypto.CryptoKey, beanIds: readonly string[]) => Promise<PhotoSyncResult | null>;

export interface PhotoSync {
  /** De fotoruimte voor de app: schrijft ook de markeringen bij. */
  readonly store: PhotoStore;
  readonly run: PhotoSyncRun;
}

export function createPhotoSync(inner: PhotoStore, meta: PhotoMetaStore, now: () => number): PhotoSync {
  const stamp = (m: PhotoMarks, beanId: string): number => Math.max(now(), (m[beanId]?.at ?? 0) + 1);

  const store: PhotoStore = {
    get: id => inner.get(id),
    async put(id, blob) { await inner.put(id, blob); const m = meta.load(); m[id] = { at: stamp(m, id), deleted: false, dirty: true }; meta.save(m); },
    async remove(id) { await inner.remove(id); const m = meta.load(); m[id] = { at: stamp(m, id), deleted: true, dirty: true }; meta.save(m); },
    async clear() { await inner.clear(); meta.save({}); }
  };

  const run: PhotoSyncRun = async (cfg, deps, key, beanIds) => {
    const keys = new Map<string, string>();
    for (const id of beanIds) keys.set(await beanKey(deps, id), id);
    const ids = await listPhotoIds(cfg);
    if (ids === null) return null;
    const latest = latestPerBean(ids);
    const m = meta.load();
    let pushed = 0, pulled = 0, removed = 0, skipped = 0;
    try {
      // Een foto die hier staat zonder markering (van vóór deze functie) telt als een eigen wijziging.
      for (const id of beanIds) if (!m[id] && await inner.get(id)) m[id] = { at: now(), deleted: false, dirty: true };

      // Ophalen: waar de server een nieuwere wijziging heeft dan wij, die overnemen.
      for (const [k, info] of latest) {
        const beanId = keys.get(k);
        if (!beanId) continue; // een zak die hier nog niet bekend is
        const mark = m[beanId];
        if (mark && info.at <= mark.at) continue;
        const body = await getPhotoBody(cfg, info.id);
        if (body === null) continue;
        let plain: PhotoPlain;
        try { plain = await openPhoto(deps, key, info.id, body); } catch { skipped++; continue; }
        if (plain.beanId !== beanId) { skipped++; continue; }
        if (plain.deleted) {
          if (await inner.get(beanId)) removed++;
          await inner.remove(beanId);
        } else {
          if (!PHOTO_TYPES.includes(plain.type ?? '')) { skipped++; continue; }
          await inner.put(beanId, new Blob([base64ToBytes(plain.data!) as BlobPart], { type: plain.type! }));
          pulled++;
        }
        m[beanId] = { at: info.at, deleted: plain.deleted, dirty: false };
      }

      // Versturen: eigen wijzigingen die de server nog niet kent.
      const known = new Set(beanIds);
      for (const [beanId, mark] of Object.entries(m)) {
        if (!mark.dirty || !known.has(beanId)) continue;
        const k = await beanKey(deps, beanId);
        const remote = latest.get(k);
        let plain: PhotoPlain;
        if (mark.deleted) plain = { v: 1, beanId, at: mark.at, deleted: true };
        else {
          const blob = await inner.get(beanId);
          if (!blob) { mark.dirty = false; continue; }
          if (!PHOTO_TYPES.includes(blob.type)) { skipped++; mark.dirty = false; continue; }
          plain = { v: 1, beanId, at: mark.at, deleted: false, type: blob.type, data: bytesToBase64(new Uint8Array(await blob.arrayBuffer())) };
        }
        const id = photoId(k, mark.at);
        const sealed = await sealPhoto(deps, key, id, plain);
        if (sealed.length > MAX_BLOCK_BYTES) { skipped++; mark.dirty = false; continue; }
        await putPhotoBody(cfg, id, sealed);
        if (remote) for (const old of [remote.id, ...remote.older]) if (old !== id) await deletePhotoId(cfg, old);
        latest.delete(k);
        mark.dirty = false;
        pushed++;
      }

      // Opruimen: oudere versies naast een nieuwere die een ander toestel heeft achtergelaten.
      for (const info of latest.values()) for (const old of info.older) { try { await deletePhotoId(cfg, old); } catch { /* de volgende keer */ } }
    } finally {
      meta.save(m);
    }
    return { pushed, pulled, removed, skipped };
  };

  return { store, run };
}
