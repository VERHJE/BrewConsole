// Engine 3 · synchronisatie · ingang voor Cloudflare Workers (zie wrangler.toml in deze map).
// Geheimen en instellingen:
//   TOKEN_HASHES  (secret)  SHA-256 hex van elk geldig toestel-token, gescheiden door komma's
//   ALLOW_ORIGIN  (var)     adres van de app, bijvoorbeeld https://verhje.github.io

import { KvStore, type KvNamespaceLike } from './kv-store.ts';
import { handleRequest } from './server.ts';
import { kvDailyCounter } from './ai.ts';

interface Env {
  BLOCKS: KvNamespaceLike;
  /** Nog niet ingesteld = geen enkel token geldig (alles geeft 401). */
  TOKEN_HASHES?: string;
  ALLOW_ORIGIN: string;
  /** Optioneel geheim: zet je dit, dan werkt POST /scan (foto-herkenning). */
  ANTHROPIC_API_KEY?: string;
}

export default {
  fetch(req: Request, env: Env): Promise<Response> {
    return handleRequest(req, {
      store: new KvStore(env.BLOCKS),
      photos: new KvStore(env.BLOCKS, 'p:'),
      tokenHashes: (env.TOKEN_HASHES ?? '').split(',').map(s => s.trim().toLowerCase()).filter(s => s.length === 64),
      subtle: crypto.subtle,
      allowOrigin: env.ALLOW_ORIGIN,
      ...(env.ANTHROPIC_API_KEY ? { ai: {
        apiKey: env.ANTHROPIC_API_KEY,
        fetch: (url: string, init: { method: string; headers: Record<string, string>; body: string }) => fetch(url, init),
        counter: kvDailyCounter(env.BLOCKS as unknown as Parameters<typeof kvDailyCounter>[0]),
        nowMs: () => Date.now()
      } } : {})
    });
  }
};
