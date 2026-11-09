// Engine 3 · synchronisatie · Cloudflare KV als BlockStore.
// De KV-types staan hier structureel beschreven, zodat de code zonder Cloudflare-pakketten typecheckt.

import type { BlockStore } from './server.ts';

export interface KvNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(opts: { prefix?: string; cursor?: string; limit?: number }): Promise<{ keys: Array<{ name: string }>; list_complete: boolean; cursor?: string }>;
}

const META_KEY = 'meta';

export class KvStore implements BlockStore {
  readonly kv: KvNamespaceLike;
  /** Voorvoegsel van de sleutels: 'b:' voor logboekblokken, 'p:' voor foto's. */
  private readonly prefix: string;
  constructor(kv: KvNamespaceLike, prefix = 'b:') { this.kv = kv; this.prefix = prefix; }
  getMeta() { return this.kv.get(META_KEY); }
  async putMetaIfAbsent(meta: string) {
    if ((await this.kv.get(META_KEY)) !== null) return false;
    await this.kv.put(META_KEY, meta);
    return true;
  }
  get(id: string) { return this.kv.get(this.prefix + id); }
  put(id: string, body: string) { return this.kv.put(this.prefix + id, body); }
  delete(id: string) { return this.kv.delete(this.prefix + id); }
  async list(cursor: string | null, limit: number) {
    const r = await this.kv.list({ prefix: this.prefix, limit, ...(cursor === null ? {} : { cursor }) });
    return { ids: r.keys.map(k => k.name.slice(this.prefix.length)), next: r.list_complete ? null : (r.cursor ?? null) };
  }
}
