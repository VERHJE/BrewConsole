import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { deriveKey, newSalt, type CryptoDeps } from '../sync/crypto.ts';
import { newSyncState } from '../sync/blocks.ts';
import { compact, ensureSalt, fetchSalt, listBlockIds, pull, push, SyncError, syncOnce, type SyncConfig } from '../sync/client.ts';
import { handleRequest, MemoryStore, sha256Hex, type ServerEnv } from '../sync/server.ts';
import { KvStore, type KvNamespaceLike } from '../sync/kv-store.ts';
import { migrateBackupV3 } from '../src/migrate/v3.ts';
import { mergeLogs } from '../src/events.ts';
import { BACKUP_V3 } from './fixtures.ts';
import type { EngineEvent } from '../src/types.ts';

const deps: CryptoDeps = { subtle: webcrypto.subtle, randomBytes: n => webcrypto.getRandomValues(new Uint8Array(n)) };
const events = migrateBackupV3(BACKUP_V3).events;
const TOKEN_A = 'token-van-toestel-a-0123456789';
const TOKEN_B = 'token-van-toestel-b-0123456789';

async function setup(store: ServerEnv['store'] = new MemoryStore()) {
  const env: ServerEnv = {
    store,
    tokenHashes: [await sha256Hex(webcrypto.subtle, TOKEN_A), await sha256Hex(webcrypto.subtle, TOKEN_B)],
    subtle: webcrypto.subtle,
    allowOrigin: 'https://app.example'
  };
  const cfgFor = (token: string): SyncConfig => ({
    baseUrl: 'https://sync.example',
    token,
    fetch: (url, init) => handleRequest(new Request(url, init), env)
  });
  const salt = newSalt(deps);
  const key = await deriveKey(deps, 'correct paard', salt, 1000);
  return { env, store, cfgFor, salt, key };
}
const raw = (env: ServerEnv, path: string, init: RequestInit = {}) => handleRequest(new Request('https://sync.example' + path, init), env);
const bearer = (t: string) => ({ authorization: `Bearer ${t}` });

test('zonder geldig token komt er niets in of uit', async () => {
  const { env } = await setup();
  for (const headers of [{}, bearer('verkeerd-token-0123456789'), { authorization: 'Bearer kort' }]) {
    assert.equal((await raw(env, '/blocks', { headers })).status, 401);
    assert.equal((await raw(env, '/meta', { headers })).status, 401);
    assert.equal((await raw(env, '/blocks/blk-x-00000001', { method: 'PUT', headers, body: 'x' })).status, 401);
  }
});
test('CORS-voorvraag zonder token werkt en noemt de toegestane herkomst', async () => {
  const { env } = await setup();
  const r = await raw(env, '/blocks', { method: 'OPTIONS' });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://app.example');
});
test('een blok is onveranderlijk: hetzelfde mag nogmaals, iets anders niet', async () => {
  const { env } = await setup();
  const put = (body: string) => raw(env, '/blocks/blk-a-00000001', { method: 'PUT', headers: bearer(TOKEN_A), body });
  assert.equal((await put('envelop-1')).status, 201);
  assert.equal((await put('envelop-1')).status, 200);
  assert.equal((await put('envelop-2')).status, 409);
});
test('ongeldig id, leeg of te groot blok en onbekende paden worden geweigerd', async () => {
  const { env } = await setup();
  const h = bearer(TOKEN_A);
  assert.equal((await raw(env, '/blocks/' + encodeURIComponent('../geheim'), { method: 'PUT', headers: h, body: 'x' })).status, 400);
  assert.equal((await raw(env, '/blocks/blk-a-1', { method: 'PUT', headers: h, body: '' })).status, 400);
  assert.equal((await raw(env, '/blocks/blk-a-1', { method: 'PUT', headers: h, body: 'x'.repeat(900_001) })).status, 413);
  assert.equal((await raw(env, '/onbekend', { headers: h })).status, 404);
  assert.equal((await raw(env, '/blocks', { method: 'PUT', headers: h, body: 'x' })).status, 405);
});
test('het zout wordt één keer vastgelegd', async () => {
  const { env, cfgFor, salt } = await setup();
  const a = cfgFor(TOKEN_A);
  assert.equal(await fetchSalt(a), null);
  assert.equal(await ensureSalt(a, salt), salt);
  assert.equal(await fetchSalt(cfgFor(TOKEN_B)), salt);
  assert.equal((await raw(env, '/meta', { method: 'PUT', headers: bearer(TOKEN_B), body: JSON.stringify({ v: 1, salt }) })).status, 200);
  assert.equal((await raw(env, '/meta', { method: 'PUT', headers: bearer(TOKEN_B), body: JSON.stringify({ v: 1, salt: newSalt(deps) }) })).status, 409);
  assert.equal((await raw(env, '/meta', { method: 'PUT', headers: bearer(TOKEN_B), body: JSON.stringify({ v: 1, salt: 'x' }) })).status, 400);
});
test('de server bewaart alleen onleesbare tekst', async () => {
  const { store, cfgFor, key } = await setup();
  await push(cfgFor(TOKEN_A), deps, key, newSyncState('a'), events);
  const stored = [...(store as MemoryStore).blocks.values()].join('');
  for (const woord of ['bean', 'brew', 'tasting', events[0]!.id]) assert.ok(!stored.includes(woord), woord);
});
test('twee toestellen: push, pull en opnieuw sturen geven hetzelfde logboek zonder dubbelen', async () => {
  const { cfgFor, key } = await setup();
  const half = Math.floor(events.length / 2);
  const logA = events.slice(0, half + 5);
  const logB = events.slice(half - 5);
  let sa = newSyncState('toestel-a');
  let sb = newSyncState('toestel-b');
  const ra = await syncOnce(cfgFor(TOKEN_A), deps, key, sa, logA);
  sa = ra.state;
  const rb = await syncOnce(cfgFor(TOKEN_B), deps, key, sb, logB);
  sb = rb.state;
  const ra2 = await syncOnce(cfgFor(TOKEN_A), deps, key, sa, ra.events);
  const expected = JSON.stringify(mergeLogs(logA, logB).events);
  assert.equal(JSON.stringify(rb.events), expected);
  assert.equal(JSON.stringify(ra2.events), expected);
  // Opnieuw synchroniseren zonder nieuws stuurt niets en haalt niets op.
  const again = await syncOnce(cfgFor(TOKEN_A), deps, key, ra2.state, ra2.events);
  assert.equal(again.pushed, 0);
  assert.equal(again.fetchedBlocks, 0);
});
test('een toestel dat zijn toestand kwijt is (app gewist) herstelt zonder conflict', async () => {
  const { cfgFor, key } = await setup();
  const first = await syncOnce(cfgFor(TOKEN_A), deps, key, newSyncState('toestel-a'), events.slice(0, 12));
  assert.ok(first.pushed > 0);
  // Nieuwe installatie, zelfde toestel-id, leeg logboek.
  const fresh = await syncOnce(cfgFor(TOKEN_A), deps, key, newSyncState('toestel-a'), []);
  assert.equal(fresh.events.length, 12);
  assert.equal(fresh.state.nextSeq, 2);
  const extra: EngineEvent = { ...events[0]!, id: 'nieuw-1', at: (events[0]!.at + 99999) as EngineEvent['at'] };
  const next = await syncOnce(cfgFor(TOKEN_A), deps, key, fresh.state, [...fresh.events, extra]);
  assert.equal(next.pushed, 1);
});
test('een verkeerde wachtwoordzin geeft onleesbare blokken en laat het logboek ongemoeid', async () => {
  const { cfgFor, key, salt } = await setup();
  await syncOnce(cfgFor(TOKEN_A), deps, key, newSyncState('toestel-a'), events);
  const wrong = await deriveKey(deps, 'verkeerd', salt, 1000);
  const r = await pull(cfgFor(TOKEN_B), deps, wrong, newSyncState('toestel-b'), []);
  assert.equal(r.events.length, 0);
  assert.equal(r.unreadable.length, 1);
  assert.equal(r.state.seenBlockIds.length, 0);
});
test('zonder verbinding of met een ongeldig token blijft de toestand ongewijzigd', async () => {
  const { cfgFor, key } = await setup();
  const st = newSyncState('toestel-a');
  const offline: SyncConfig = { ...cfgFor(TOKEN_A), fetch: async () => { throw new Error('netwerk weg'); } };
  await assert.rejects(push(offline, deps, key, st, events), (e: unknown) => e instanceof SyncError && e.kind === 'offline');
  await assert.rejects(push(cfgFor('verkeerd-token-0123456789'), deps, key, st, events), (e: unknown) => e instanceof SyncError && e.kind === 'unauthorised');
  const ok = await push(cfgFor(TOKEN_A), deps, key, st, events);
  assert.equal(ok.pushed, events.length);
});
test('opruimen: één momentopname, oude blokken weg, een ander toestel leest alles', async () => {
  const { cfgFor, key, store } = await setup();
  let sa = newSyncState('toestel-a');
  let log: EngineEvent[] = [];
  const step = Math.ceil(events.length / 4);
  for (let i = 0; i < 4; i++) {
    log = events.slice(0, (i + 1) * step);
    sa = (await syncOnce(cfgFor(TOKEN_A), deps, key, sa, log)).state;
  }
  assert.equal((await listBlockIds(cfgFor(TOKEN_A))).length, 4);
  const c = await compact(cfgFor(TOKEN_A), deps, key, sa, log);
  assert.equal(c.removed, 4);
  assert.equal((store as MemoryStore).blocks.size, 1);
  const b = await syncOnce(cfgFor(TOKEN_B), deps, key, newSyncState('toestel-b'), []);
  assert.equal(JSON.stringify(b.events), JSON.stringify(mergeLogs(log).events));
});
test('de KV-opslag werkt als BlockStore (pagina\'s en voorvoegsel)', async () => {
  const data = new Map<string, string>();
  const kv: KvNamespaceLike = {
    get: async k => data.get(k) ?? null,
    put: async (k, v) => { data.set(k, v); },
    delete: async k => { data.delete(k); },
    list: async ({ prefix = '', cursor, limit = 1000 }) => {
      const all = [...data.keys()].filter(k => k.startsWith(prefix)).sort().filter(k => cursor === undefined || k > cursor);
      const keys = all.slice(0, limit).map(name => ({ name }));
      const more = all.length > limit;
      return { keys, list_complete: !more, ...(more ? { cursor: keys[keys.length - 1]!.name } : {}) };
    }
  };
  const { cfgFor, key } = await setup(new KvStore(kv));
  let st = newSyncState('toestel-a');
  for (let i = 0; i < 3; i++) st = (await push(cfgFor(TOKEN_A), deps, key, st, events.slice(0, (i + 1) * 4))).state;
  assert.equal((await ensureSalt(cfgFor(TOKEN_A), newSalt(deps))).length > 0, true);
  const ids = await listBlockIds(cfgFor(TOKEN_A));
  assert.equal(ids.length, 3);
  const r = await pull(cfgFor(TOKEN_B), deps, key, newSyncState('toestel-b'), []);
  assert.equal(r.events.length, 12);
});

// ───────────── foto-routes ─────────────

import { beanKey, latestPerBean, openPhoto, parsePhotoId, photoId, sealPhoto } from '../sync/photo-blocks.ts';
import { deletePhotoId, getPhotoBody, listPhotoIds, putPhotoBody } from '../sync/client.ts';

async function withPhotos() {
  const base = await setup();
  const env: ServerEnv = { ...base.env, photos: new MemoryStore() };
  const cfg: SyncConfig = { baseUrl: 'https://sync.example', token: TOKEN_A, fetch: (url, init) => handleRequest(new Request(url, init), env) };
  return { env, cfg, key: base.key };
}

test('foto-routes: bewaren, ophalen, lijst en verwijderen; los van de logboekblokken', async () => {
  const { env, cfg } = await withPhotos();
  const k = await beanKey(deps, 'bean:abc');
  const id = photoId(k, 1_700_000_000_000);
  assert.deepEqual(await listPhotoIds(cfg), []);
  await putPhotoBody(cfg, id, '{"v":1,"iv":"x","ct":"y"}');
  assert.deepEqual(await listPhotoIds(cfg), [id]);
  assert.equal(await getPhotoBody(cfg, id), '{"v":1,"iv":"x","ct":"y"}');
  assert.deepEqual(await listBlockIds(cfg), [], 'foto-blokken staan niet tussen de logboekblokken');
  // onveranderlijk: dezelfde inhoud mag opnieuw, andere inhoud telt als al bewaard (de client behandelt 409 als gelukt)
  await putPhotoBody(cfg, id, '{"v":1,"iv":"x","ct":"y"}');
  const clash = await raw(env, `/photos/${id}`, { method: 'PUT', headers: bearer(TOKEN_A), body: 'iets anders' });
  assert.equal(clash.status, 409);
  await putPhotoBody(cfg, id, 'iets anders');
  assert.equal(await getPhotoBody(cfg, id), '{"v":1,"iv":"x","ct":"y"}');
  await deletePhotoId(cfg, id);
  assert.deepEqual(await listPhotoIds(cfg), []);
  assert.equal(await getPhotoBody(cfg, id), null);
});

test('foto-routes: zonder token niets, zonder foto-opslag een duidelijke 404, te grote of rare blokken geweigerd', async () => {
  const { env } = await withPhotos();
  assert.equal((await raw(env, '/photos')).status, 401);
  assert.equal((await raw(env, '/photos/ph-abc', { headers: bearer(TOKEN_A) })).status, 400);
  assert.equal((await raw(env, `/photos/${photoId('0'.repeat(32), 1)}`, { method: 'PUT', headers: bearer(TOKEN_A), body: '' })).status, 400);
  assert.equal((await raw(env, `/photos/${photoId('0'.repeat(32), 1)}`, { method: 'PUT', headers: bearer(TOKEN_A), body: 'x'.repeat(900_001) })).status, 413);
  assert.equal((await raw(env, '/photos', { method: 'POST', headers: bearer(TOKEN_A) })).status, 405);
  const oldWorker = await setup(); // geen photos in de omgeving
  const res = await raw(oldWorker.env, '/photos', { headers: bearer(TOKEN_A) });
  assert.equal(res.status, 404);
  const cfg: SyncConfig = { baseUrl: 'https://sync.example', token: TOKEN_A, fetch: (url, init) => handleRequest(new Request(url, init), oldWorker.env) };
  assert.equal(await listPhotoIds(cfg), null, 'een oudere Worker: de client weet dat foto-synchronisatie niet kan');
});

test('foto-blokken: id verraadt de zak niet, nieuwste versie per zak, openen controleert id en vorm', async () => {
  const { key } = await withPhotos();
  const a = await beanKey(deps, 'bean:een'); const b = await beanKey(deps, 'bean:twee');
  assert.notEqual(a, b);
  assert.match(photoId(a, 5), /^ph-[0-9a-f]{32}-0000000000005$/);
  assert.deepEqual(parsePhotoId(photoId(a, 42)), { key: a, at: 42 });
  assert.equal(parsePhotoId('blk-web-a-00000001'), null);
  const ids = [photoId(a, 10), photoId(a, 30), photoId(a, 20), photoId(b, 7), 'onzin'];
  const l = latestPerBean(ids);
  assert.equal(l.get(a)!.id, photoId(a, 30));
  assert.deepEqual(l.get(a)!.older.sort(), [photoId(a, 10), photoId(a, 20)].sort());
  assert.equal(l.get(b)!.id, photoId(b, 7));
  assert.equal(l.size, 2);

  const id = photoId(a, 30);
  const body = await sealPhoto(deps, key, id, { v: 1, beanId: 'bean:een', at: 30, deleted: false, type: 'image/webp', data: 'QUJD' });
  assert.equal((await openPhoto(deps, key, id, body)).beanId, 'bean:een');
  await assert.rejects(openPhoto(deps, key, photoId(a, 31), body), 'een blok onder een ander id ontsleutelt niet');
  const wrongAt = await sealPhoto(deps, key, id, { v: 1, beanId: 'bean:een', at: 31, deleted: false, type: 'image/webp', data: 'QUJD' });
  await assert.rejects(openPhoto(deps, key, id, wrongAt), /onbekende vorm/);
  const empty = await sealPhoto(deps, key, id, { v: 1, beanId: 'bean:een', at: 30, deleted: false });
  await assert.rejects(openPhoto(deps, key, id, empty), /zonder inhoud/);
  const tomb = await sealPhoto(deps, key, id, { v: 1, beanId: 'bean:een', at: 30, deleted: true });
  assert.equal((await openPhoto(deps, key, id, tomb)).deleted, true);
});
