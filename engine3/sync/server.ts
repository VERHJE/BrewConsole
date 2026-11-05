// Engine 3 · synchronisatie · server.
//
// Eén functie, Request → Response, zonder Cloudflare-specifieke types. De opslag is een interface:
// in tests een Map, op Cloudflare een KV-namespace (kv-store.ts). De server ziet alleen
// versleutelde envelop-tekst en het (niet geheime) zout. Blokken zijn onveranderlijk.
//
// Routes
//   GET  /meta              → {salt}                 (404 zolang er nog geen logboek is)
//   PUT  /meta              ← {v:1, salt}            (alleen de eerste keer; hetzelfde zout nogmaals mag)
//   PUT  /blocks/:id        ← envelop-tekst          (zelfde inhoud nogmaals mag; andere inhoud = 409)
//   GET  /blocks/:id        → envelop-tekst
//   GET  /blocks?cursor=&limit=  → {ids, next}
//   DELETE /blocks/:id
// Elke route behalve OPTIONS vereist `Authorization: Bearer <token>`; de server kent alleen de
// SHA-256 van geldige tokens.

import type { webcrypto } from 'node:crypto';
import { BLOCK_ID_PATTERN, MAX_BLOCK_BYTES } from './blocks.ts';

export interface BlockStore {
  getMeta(): Promise<string | null>;
  /** true als er is geschreven, false als er al iets stond. */
  putMetaIfAbsent(meta: string): Promise<boolean>;
  get(id: string): Promise<string | null>;
  put(id: string, body: string): Promise<void>;
  /** `cursor` is ondoorzichtig; null = vanaf het begin. */
  list(cursor: string | null, limit: number): Promise<{ ids: string[]; next: string | null }>;
  delete(id: string): Promise<void>;
}

export interface ServerEnv {
  readonly store: BlockStore;
  /** SHA-256 (hex, kleine letters) van elk geldig token. */
  readonly tokenHashes: readonly string[];
  readonly subtle: webcrypto.SubtleCrypto;
  /** Waarde voor Access-Control-Allow-Origin, bijvoorbeeld het adres van de app. */
  readonly allowOrigin: string;
}

export async function sha256Hex(subtle: webcrypto.SubtleCrypto, text: string): Promise<string> {
  const d = new Uint8Array(await subtle.digest('SHA-256', new TextEncoder().encode(text)));
  return [...d].map(b => b.toString(16).padStart(2, '0')).join('');
}

function sameConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function respond(env: ServerEnv, status: number, body: unknown, contentType = 'application/json'): Response {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return new Response(status === 204 ? null : text, {
    status,
    headers: {
      'content-type': contentType,
      'cache-control': 'no-store',
      'access-control-allow-origin': env.allowOrigin,
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-allow-methods': 'GET, PUT, DELETE, OPTIONS',
      'vary': 'origin'
    }
  });
}

async function authorised(req: Request, env: ServerEnv): Promise<boolean> {
  const h = req.headers.get('authorization') ?? '';
  const m = /^Bearer (.{16,200})$/.exec(h);
  if (!m) return false;
  const hash = await sha256Hex(env.subtle, m[1]!);
  let ok = false;
  for (const t of env.tokenHashes) if (sameConstantTime(t, hash)) ok = true; // geen vroege exit
  return ok;
}

export async function handleRequest(req: Request, env: ServerEnv): Promise<Response> {
  if (req.method === 'OPTIONS') return respond(env, 204, '');
  if (!(await authorised(req, env))) return respond(env, 401, { error: 'niet toegestaan' });

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (path === '/meta') {
    if (req.method === 'GET') {
      const m = await env.store.getMeta();
      return m === null ? respond(env, 404, { error: 'nog geen logboek' }) : respond(env, 200, m);
    }
    if (req.method === 'PUT') {
      const text = await req.text();
      let salt: unknown;
      try { salt = (JSON.parse(text) as { v?: unknown; salt?: unknown }).salt; } catch { return respond(env, 400, { error: 'geen JSON' }); }
      if (typeof salt !== 'string' || !/^[A-Za-z0-9+/]{11,64}={0,2}$/.test(salt)) return respond(env, 400, { error: 'ongeldig zout' });
      const canonical = JSON.stringify({ v: 1, salt });
      if (await env.store.putMetaIfAbsent(canonical)) return respond(env, 201, canonical);
      const existing = await env.store.getMeta();
      return existing === canonical ? respond(env, 200, canonical) : respond(env, 409, { error: 'dit logboek heeft al een ander zout' });
    }
    return respond(env, 405, { error: 'methode niet toegestaan' });
  }

  if (path === '/blocks') {
    if (req.method !== 'GET') return respond(env, 405, { error: 'methode niet toegestaan' });
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') ?? 100) || 100));
    const r = await env.store.list(url.searchParams.get('cursor'), limit);
    return respond(env, 200, r);
  }

  const m = /^\/blocks\/([^/]+)$/.exec(path);
  if (m) {
    const id = decodeURIComponent(m[1]!);
    if (!BLOCK_ID_PATTERN.test(id)) return respond(env, 400, { error: 'ongeldig blok-id' });
    if (req.method === 'GET') {
      const b = await env.store.get(id);
      return b === null ? respond(env, 404, { error: 'onbekend blok' }) : respond(env, 200, b, 'text/plain; charset=utf-8');
    }
    if (req.method === 'PUT') {
      const body = await req.text();
      if (body.length === 0) return respond(env, 400, { error: 'leeg blok' });
      if (body.length > MAX_BLOCK_BYTES) return respond(env, 413, { error: 'blok te groot' });
      const existing = await env.store.get(id);
      if (existing !== null) return existing === body ? respond(env, 200, { status: 'bestond al' }) : respond(env, 409, { error: 'een blok is onveranderlijk' });
      await env.store.put(id, body);
      return respond(env, 201, { status: 'bewaard' });
    }
    if (req.method === 'DELETE') {
      await env.store.delete(id);
      return respond(env, 200, { status: 'verwijderd' });
    }
    return respond(env, 405, { error: 'methode niet toegestaan' });
  }

  return respond(env, 404, { error: 'onbekend pad' });
}

/** Geheugenopslag voor tests en lokaal proberen. */
export class MemoryStore implements BlockStore {
  meta: string | null = null;
  readonly blocks = new Map<string, string>();
  async getMeta() { return this.meta; }
  async putMetaIfAbsent(meta: string) { if (this.meta !== null) return false; this.meta = meta; return true; }
  async get(id: string) { return this.blocks.get(id) ?? null; }
  async put(id: string, body: string) { this.blocks.set(id, body); }
  async list(cursor: string | null, limit: number) {
    const all = [...this.blocks.keys()].sort().filter(id => cursor === null || id > cursor);
    const ids = all.slice(0, limit);
    return { ids, next: all.length > limit ? ids[ids.length - 1]! : null };
  }
  async delete(id: string) { this.blocks.delete(id); }
}
