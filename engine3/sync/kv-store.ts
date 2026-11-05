// Engine 3 · synchronisatie · Cloudflare KV als BlockStore.
// De KV-types staan hier structureel beschreven, zodat de code zonder Cloudflare-pakketten typecheckt.

import type { BlockStore } from './server.ts';

export interface KvNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(opts: { prefix?: string; cursor?: string; limit?: number }): Promise<{ keys: Array<{ name: string }>; list_complete: boolean; cursor?: string }>;
}

const BLOCK_PREFIX = 'b:';
const META_KEY = 'meta';

export class KvStore implements BlockStore {
  readonly kv: KvNamespaceLike;
  constructor(kv: KvNamespaceLike) { this.kv = kv; }
  getMeta() { return this.kv.get(META_KEY); }
  async putMetaIfAbsent(meta: string) {
    if ((await this.kv.get(META_KEY)) !== null) return false;
    await this.kv.put(META_KEY, meta);
    return true;
  }
  get(id: string) { return this.kv.get(BLOCK_PREFIX + id); }
  put(id: string, body: string) { return this.kv.put(BLOCK_PREFIX + id, body); }
  delete(id: string) { return this.kv.delete(BLOCK_PREFIX + id); }
  async list(cursor: string | null, limit: number) {
    const r = await this.kv.list({ prefix: BLOCK_PREFIX, limit, ...(cursor === null ? {} : { cursor }) });
    return { ids: r.keys.map(k => k.name.slice(BLOCK_PREFIX.length)), next: r.list_complete ? null : (r.cursor ?? null) };
  }
}
