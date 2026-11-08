import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { AI_DAILY_LIMIT, AI_MAX_IMAGE_BYTES, AI_SCAN_MODEL, AI_TOOL, checkAiRequest, validateAiScan } from '../src/bean/ai.ts';
import { handleRequest, MemoryStore, sha256Hex, type ServerEnv } from '../sync/server.ts';
import type { AiEnv, DailyCounter } from '../sync/ai.ts';

const NOW = Date.parse('2026-11-05T12:00:00Z');
const TOKEN = 'token-van-toestel-a-0123456789';
const IMG = Buffer.from('niet echt een foto maar wel base64').toString('base64');

test('validateAiScan: schone velden worden een voorstel met bron ai', () => {
  const v = validateAiScan({ name: 'El Diviso', roaster: 'Blommers', country: 'Colombia', process_base: 'natural', fermentation: ['anaerobic'], roast_level: 'light', altitude_min_m: 1800, altitude_max_m: 1600, roast_date: '2026-10-20', bag_size_g: 250, notes: ['Appel', 'aloe vera'] }, NOW);
  assert.ok(v.ok);
  if (!v.ok) return;
  assert.equal(v.scan.fields.name, 'El Diviso');
  assert.deepEqual(v.scan.fields.altitude, { minM: 1600, maxM: 1800 });
  assert.equal(v.scan.fields.process?.base, 'natural');
  assert.deepEqual(v.scan.fields.process?.fermentation, ['anaerobic']);
  assert.deepEqual(v.scan.fields.notes, { raw: ['Appel', 'aloe vera'], tags: ['Appel'], unmapped: ['aloe vera'] });
  for (const k of Object.keys(v.scan.fields)) assert.equal((v.scan.sources as Record<string, string>)[k], 'ai', k);
  assert.deepEqual(v.dropped, []);
});
test('validateAiScan: wat niet klopt valt af en wordt gemeld, nooit stilletjes overgenomen', () => {
  const v = validateAiScan({
    name: 'x'.repeat(200), roast_level: 'extra dark', intended_use: 'filter', roast_date: '2020-01-01', bag_size_g: 50, harvest_year: 1850,
    altitude_min_m: -5, country: 42, process_base: 'sous-vide', fermentation: ['lactic', 'nonsense'], onzin: 'x', notes: [' ', 'a'.repeat(100), 'Kers']
  }, NOW);
  assert.ok(v.ok);
  if (!v.ok) return;
  const f = v.scan.fields;
  assert.equal(f.name, undefined);
  assert.equal(f.roastLevel, undefined);
  assert.equal(f.intendedUse, 'filter');
  assert.equal(f.roastDate, undefined);
  assert.equal(f.bagSizeG, undefined);
  assert.equal(f.harvestYear, undefined);
  assert.equal(f.altitude, undefined);
  assert.equal(f.country, undefined);
  assert.deepEqual(f.process?.fermentation, ['lactic']);
  assert.equal(f.process?.base, 'unknown');
  assert.deepEqual(f.notes?.raw, ['Kers']);
  for (const k of ['name', 'roast_level', 'roast_date', 'bag_size_g', 'harvest_year', 'country', 'onbekend:onzin']) assert.ok(v.dropped.includes(k === 'roast_level' ? 'roastLevel' : k === 'roast_date' ? 'roastDate' : k === 'bag_size_g' ? 'bagSizeG' : k === 'harvest_year' ? 'harvestYear' : k), k);
});
test('validateAiScan: geen object of niets bruikbaars is geen voorstel', () => {
  for (const x of [null, 'tekst', 5, [], {}, { onzin: 1 }]) assert.equal(validateAiScan(x, NOW).ok, false);
});
test('een onduidelijk proces wordt niet geraden: semi-washed blijft een term', () => {
  const v = validateAiScan({ process_term_unclear: 'semi-washed' }, NOW);
  assert.ok(v.ok && v.scan.fields.process?.base === 'unknown' && v.scan.fields.process.ambiguousTerm === 'semi-washed');
});
test('checkAiRequest: toestemming, mediatype, base64 en grootte', () => {
  const ok = { consent: true, mediaType: 'image/jpeg', imageBase64: IMG };
  assert.equal(checkAiRequest(ok).ok, true);
  assert.equal(checkAiRequest({ ...ok, consent: false }).ok, false);
  assert.equal(checkAiRequest({ ...ok, consent: undefined }).ok, false);
  assert.equal(checkAiRequest({ ...ok, mediaType: 'image/gif' }).ok, false);
  assert.equal(checkAiRequest({ ...ok, imageBase64: 'niet base64!!' }).ok, false);
  assert.equal(checkAiRequest({ ...ok, imageBase64: 'A'.repeat(Math.ceil(AI_MAX_IMAGE_BYTES / 0.75) + 8) }).ok, false);
  assert.equal(checkAiRequest(null).ok, false);
});
test('het schema van het antwoord kent alleen velden die BeanFields kent en geen extra sleutels', () => {
  assert.equal(AI_TOOL.input_schema.additionalProperties, false);
  assert.ok(Object.keys(AI_TOOL.input_schema.properties).length >= 15);
});

// ───────────────────────────── de Worker-route ─────────────────────────────

class MemCounter implements DailyCounter {
  readonly m = new Map<string, number>();
  async get(day: string) { return this.m.get(day) ?? 0; }
  async put(day: string, n: number) { this.m.set(day, n); }
}
interface Call { url: string; headers: Record<string, string>; body: Record<string, unknown> }

async function setup(reply: (call: Call) => Response, o: { limit?: number; withAi?: boolean } = {}) {
  const calls: Call[] = [];
  const counter = new MemCounter();
  const store = new MemoryStore();
  const ai: AiEnv = {
    apiKey: 'sk-geheim-voor-de-test', counter, nowMs: () => NOW, ...(o.limit === undefined ? {} : { dailyLimit: o.limit }),
    fetch: async (url, init) => { const call = { url, headers: init.headers, body: JSON.parse(init.body) as Record<string, unknown> }; calls.push(call); return reply(call); }
  };
  const env: ServerEnv = { store, tokenHashes: [await sha256Hex(webcrypto.subtle, TOKEN)], subtle: webcrypto.subtle, allowOrigin: 'https://app.example', ...(o.withAi === false ? {} : { ai }) };
  const post = (body: unknown, token: string | null = TOKEN) => handleRequest(new Request('https://sync.example/scan', {
    method: 'POST', headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body)
  }), env);
  return { calls, counter, store, post, env };
}
const good = { consent: true, mediaType: 'image/jpeg', imageBase64: IMG };
const toolReply = (input: unknown) => () => new Response(JSON.stringify({ content: [{ type: 'text', text: 'ik lees' }, { type: 'tool_use', id: 't1', name: 'record_bean', input }] }), { status: 200 });

test('Worker /scan: toestemming, token, mediatype en limiet worden afgedwongen vóór er iets naar buiten gaat', async () => {
  const t = await setup(toolReply({ country: 'Colombia' }), { limit: 2 });
  assert.equal((await t.post(good, null)).status, 401);
  assert.equal((await t.post({ ...good, consent: false })).status, 403);
  assert.equal((await t.post({ ...good, mediaType: 'application/pdf' })).status, 400);
  assert.equal((await t.post('geen json')).status, 400);
  assert.equal(t.calls.length, 0);
  assert.equal((await t.post(good)).status, 200);
  assert.equal((await t.post(good)).status, 200);
  const limited = await t.post(good);
  assert.equal(limited.status, 429);
  assert.equal(t.calls.length, 2);
});
test('Worker /scan: vast model, tool-keuze, sleutel alleen in de kop, foto niet bewaard en niet teruggestuurd', async () => {
  const t = await setup(toolReply({ country: 'Colombia', process_base: 'washed' }));
  const res = await t.post(good);
  assert.equal(res.status, 200);
  const call = t.calls[0]!;
  assert.equal(call.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(call.headers['x-api-key'], 'sk-geheim-voor-de-test');
  assert.equal(call.body['model'], AI_SCAN_MODEL);
  assert.deepEqual(call.body['tool_choice'], { type: 'tool', name: 'record_bean' });
  const text = await res.text();
  assert.ok(!text.includes('sk-geheim'));
  assert.ok(!text.includes(IMG));
  const j = JSON.parse(text) as { proposal: boolean; fields: { country: string }; sources: { country: string }; model: string };
  assert.equal(j.proposal, true);
  assert.equal(j.fields.country, 'Colombia');
  assert.equal(j.sources.country, 'ai');
  assert.deepEqual([...t.store.blocks.keys()], []); // niets in de opslag
  assert.equal(t.store.meta, null);
  assert.equal(JSON.stringify([...t.counter.m]).includes(IMG), false);
});
test('Worker /scan: een fout van de API wordt een nette 502 zonder details; onbruikbare antwoorden een 502 of 422; elke poging telt', async () => {
  const bad = await setup(() => new Response('geheime foutdetails sk-geheim', { status: 500 }));
  const r1 = await bad.post(good);
  assert.equal(r1.status, 502);
  assert.ok(!(await r1.text()).includes('geheime'));
  assert.equal([...bad.counter.m.values()][0], 1);

  const noTool = await setup(() => new Response(JSON.stringify({ content: [{ type: 'text', text: 'sorry' }] }), { status: 200 }));
  assert.equal((await noTool.post(good)).status, 502);
  const empty = await setup(toolReply({ onzin: 1 }));
  assert.equal((await empty.post(good)).status, 422);
  const down = await setup(() => { throw new Error('netwerk'); });
  assert.equal((await down.post(good)).status, 502);
  assert.equal(AI_DAILY_LIMIT > 0, true);
});
test('Worker /scan staat uit zonder API-sleutel (404) en accepteert alleen POST', async () => {
  const off = await setup(toolReply({}), { withAi: false });
  assert.equal((await off.post(good)).status, 404);
  const on = await setup(toolReply({}));
  const get = await handleRequest(new Request('https://sync.example/scan', { headers: { authorization: `Bearer ${TOKEN}` } }), on.env);
  assert.equal(get.status, 405);
});
