// Engine 3 · synchronisatie · ingang voor Cloudflare Workers (zie wrangler.toml in deze map).
// Geheimen en instellingen:
//   TOKEN_HASHES  (secret)  SHA-256 hex van elk geldig toestel-token, gescheiden door komma's
//   ALLOW_ORIGIN  (var)     adres van de app, bijvoorbeeld https://verhje.github.io

import { KvStore, type KvNamespaceLike } from './kv-store.ts';
import { handleRequest } from './server.ts';

interface Env {
  BLOCKS: KvNamespaceLike;
  TOKEN_HASHES: string;
  ALLOW_ORIGIN: string;
}

export default {
  fetch(req: Request, env: Env): Promise<Response> {
    return handleRequest(req, {
      store: new KvStore(env.BLOCKS),
      tokenHashes: env.TOKEN_HASHES.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length === 64),
      subtle: crypto.subtle,
      allowOrigin: env.ALLOW_ORIGIN
    });
  }
};
