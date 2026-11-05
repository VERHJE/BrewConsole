// Engine 3 · foto-herkenning van een zak via de Worker (alleen met toestemming per scan).
//
// De API-sleutel is een geheim van de Worker en verlaat hem nooit. Het model staat vast, er is een
// dagelijkse limiet, en de foto wordt niet bewaard of gelogd: hij gaat door de Worker naar de API en
// is daarna weg. Wat terugkomt wordt door validateAiScan() schoongemaakt tot een voorstel (bron 'ai').

import { AI_DAILY_LIMIT, AI_MAX_IMAGE_BYTES, AI_PROMPT, AI_SCAN_MODEL, AI_TOOL, checkAiRequest, validateAiScan } from '../src/bean/ai.ts';

export interface DailyCounter {
  /** Aantal scans vandaag (UTC-datum `day`, YYYY-MM-DD). */
  get(day: string): Promise<number>;
  put(day: string, count: number): Promise<void>;
}

export interface AiEnv {
  readonly apiKey: string;
  /** fetch naar de Anthropic API; in tests een nepfunctie. */
  readonly fetch: (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<Response>;
  readonly counter: DailyCounter;
  readonly nowMs: () => number;
  readonly dailyLimit?: number;
}

export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

type Out = { status: number; json: unknown };

export async function handleAiScan(req: Request, env: AiEnv, respond: (o: Out) => Response): Promise<Response> {
  const raw = await req.text();
  if (raw.length > AI_MAX_IMAGE_BYTES * 1.4) return respond({ status: 413, json: { error: 'afbeelding is te groot' } });
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return respond({ status: 400, json: { error: 'geen JSON' } }); }
  const checked = checkAiRequest(parsed);
  if (!checked.ok) return respond({ status: checked.reason === 'toestemming ontbreekt' ? 403 : 400, json: { error: checked.reason } });

  const now = env.nowMs();
  const day = new Date(now).toISOString().slice(0, 10);
  const used = await env.counter.get(day);
  if (used >= (env.dailyLimit ?? AI_DAILY_LIMIT)) return respond({ status: 429, json: { error: 'dagelijkse limiet voor foto-herkenning bereikt' } });
  await env.counter.put(day, used + 1); // ook een mislukte poging telt: de limiet beschermt de rekening

  let res: Response;
  try {
    res = await env.fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: { 'x-api-key': env.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: AI_SCAN_MODEL,
        max_tokens: 1024,
        tools: [AI_TOOL],
        tool_choice: { type: 'tool', name: AI_TOOL.name },
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: checked.req.mediaType, data: checked.req.imageBase64 } },
          { type: 'text', text: AI_PROMPT }
        ] }]
      })
    });
  } catch {
    return respond({ status: 502, json: { error: 'foto-herkenning is niet bereikbaar' } });
  }
  if (!res.ok) return respond({ status: 502, json: { error: 'foto-herkenning gaf een fout' } }); // geen details doorgeven
  let body: unknown;
  try { body = await res.json(); } catch { return respond({ status: 502, json: { error: 'onleesbaar antwoord' } }); }
  const blocks = (body as { content?: unknown }).content;
  const tool = Array.isArray(blocks) ? blocks.find((b): b is { type: string; name?: string; input?: unknown } => typeof b === 'object' && b !== null && (b as { type?: unknown }).type === 'tool_use' && (b as { name?: unknown }).name === AI_TOOL.name) : undefined;
  if (!tool) return respond({ status: 502, json: { error: 'geen bruikbaar antwoord' } });
  const v = validateAiScan(tool.input, now);
  if (!v.ok) return respond({ status: 422, json: { error: v.reason } });
  return respond({ status: 200, json: { proposal: true, fields: v.scan.fields, sources: v.scan.sources, flags: v.scan.flags, dropped: v.dropped, model: AI_SCAN_MODEL } });
}

/** Teller in KV (niet atomair; voor één gebruiker ruim voldoende). */
export function kvDailyCounter(kv: { get(k: string): Promise<string | null>; put(k: string, v: string, o?: { expirationTtl: number }): Promise<void> }): DailyCounter {
  return {
    async get(day) { const v = await kv.get(`ai:${day}`); const n = v === null ? 0 : Number(v); return Number.isFinite(n) ? n : 0; },
    async put(day, count) { await kv.put(`ai:${day}`, String(count), { expirationTtl: 172_800 }); }
  };
}
