import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createEngine, migrateBackupV3 } from '../../engine3/src/index.ts';
import { handleRequest, MemoryStore, sha256Hex, type ServerEnv } from '../../engine3/sync/server.ts';
import { BACKUP_V3 } from '../../engine3/test/fixtures.ts';
import { memoryStorage } from '../src/core/storage.ts';
import { createStore } from '../src/core/store.ts';
import { exportLog, previewImport } from '../src/core/backup.ts';
import { connect, disconnect, memorySyncStorage, syncNow, type SyncDeps } from '../src/core/sync.ts';
import type { EngineEvent } from '../../engine3/src/index.ts';

const TOKEN = 'token-voor-de-test-0123456789';
const crypto = { subtle: webcrypto.subtle as never, randomBytes: (n: number) => webcrypto.getRandomValues(new Uint8Array(n)) };

test('back-up: exporteren en weer inlezen geeft hetzelfde; tweede keer is alles bekend', async () => {
  const events = migrateBackupV3(BACKUP_V3).events;
  const text = exportLog(events, Date.UTC(2026, 10, 5));
  const first = previewImport(text, []);
  assert.equal(first.kind, 'log'); assert.equal(first.fresh, events.length); assert.equal(first.known, 0);
  const again = previewImport(text, events);
  assert.equal(again.fresh, 0); assert.equal(again.known, events.length);
});

test('back-up van de oude app wordt gemigreerd, met dezelfde tellingen als migrateBackupV3', () => {
  const direct = migrateBackupV3(BACKUP_V3);
  const p = previewImport(JSON.stringify(BACKUP_V3), []);
  assert.equal(p.kind, 'old-app');
  assert.equal(p.events.length, direct.events.length);
  assert.deepEqual(p.counts, direct.report.counts);
});

test('rommel wordt netjes geweigerd', () => {
  assert.equal(previewImport('geen json', []).kind, 'unknown');
  assert.equal(previewImport('{"iets":1}', []).kind, 'unknown');
  const bad = previewImport(JSON.stringify({ format: 'brewconsole-log', events: [{ id: 'x' }] }), []);
  assert.equal(bad.kind, 'log'); assert.equal(bad.events.length, 0); assert.equal(bad.warnings.length, 1);
});

async function device(serverEnv: ServerEnv, name: string, events: readonly EngineEvent[] = []) {
  const store = await createStore(memoryStorage(events), createEngine());
  const deps: SyncDeps = {
    crypto, store, device: name, now: () => 1000, iterations: 1000, storage: memorySyncStorage(),
    fetch: (url, init) => handleRequest(new Request(url, init), serverEnv)
  };
  return { store, deps };
}

test('synchronisatie: twee toestellen komen op hetzelfde logboek uit; verkeerde wachtwoordzin en token worden herkend', async () => {
  const serverEnv: ServerEnv = { store: new MemoryStore(), tokenHashes: [await sha256Hex(webcrypto.subtle as never, TOKEN)], subtle: webcrypto.subtle as never, allowOrigin: 'https://app.example' };
  const all = migrateBackupV3(BACKUP_V3).events;
  const half = Math.floor(all.length / 2);
  const a = await device(serverEnv, 'web-a', all.slice(0, half));
  const b = await device(serverEnv, 'web-b', all.slice(half));
  const url = 'https://sync.example/';

  const ra = await connect(a.deps, { baseUrl: url, token: TOKEN, passphrase: 'correct paard batterij' });
  assert.equal(ra.ok, true);
  const rb = await connect(b.deps, { baseUrl: url, token: TOKEN, passphrase: 'correct paard batterij' });
  assert.equal(rb.ok, true);
  assert.equal((await syncNow(a.deps)).ok, true);
  const ids = (d: typeof a) => d.store.snapshot().events.map(e => e.id).sort();
  assert.deepEqual(ids(a), ids(b));
  assert.equal(ids(a).length, all.length);

  const c = await device(serverEnv, 'web-c');
  const wrong = await connect(c.deps, { baseUrl: url, token: TOKEN, passphrase: 'een heel andere zin' });
  assert.equal(wrong.ok, false);
  if (!wrong.ok) assert.equal(wrong.kind, 'wrong_passphrase');
  assert.equal(c.store.snapshot().events.length, 0);

  const badToken = await connect((await device(serverEnv, 'web-d')).deps, { baseUrl: url, token: 'verkeerd-token-0123456789', passphrase: 'correct paard batterij' });
  assert.equal(badToken.ok, false);
  if (!badToken.ok) assert.equal(badToken.kind, 'unauthorised');

  await disconnect(a.deps);
  const off = await syncNow(a.deps);
  assert.equal(off.ok, false);
  if (!off.ok) assert.equal(off.kind, 'not_connected');
});

test('offline: een mislukte synchronisatie laat het logboek ongemoeid', async () => {
  const serverEnv: ServerEnv = { store: new MemoryStore(), tokenHashes: [await sha256Hex(webcrypto.subtle as never, TOKEN)], subtle: webcrypto.subtle as never, allowOrigin: '*' };
  const a = await device(serverEnv, 'web-a', migrateBackupV3(BACKUP_V3).events);
  assert.equal((await connect(a.deps, { baseUrl: 'https://sync.example', token: TOKEN, passphrase: 'correct paard batterij' })).ok, true);
  const before = a.store.snapshot().events.length;
  const r = await syncNow({ ...a.deps, fetch: async () => { throw new Error('netwerk weg'); } });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.kind, 'offline');
  assert.equal(a.store.snapshot().events.length, before);
});

test('adres en zwakke invoer worden afgewezen vóór er iets verstuurd wordt', async () => {
  const serverEnv: ServerEnv = { store: new MemoryStore(), tokenHashes: [], subtle: webcrypto.subtle as never, allowOrigin: '*' };
  const a = await device(serverEnv, 'web-a');
  for (const input of [
    { baseUrl: 'http://evil.example', token: TOKEN, passphrase: 'correct paard batterij' },
    { baseUrl: 'https://x.example', token: 'kort', passphrase: 'correct paard batterij' },
    { baseUrl: 'https://x.example', token: TOKEN, passphrase: 'kort' }
  ]) assert.equal((await connect(a.deps, input)).ok, false);
});

test('back-up met foto\'s: heen en terug; onbekende zak, vreemd type, kapotte base64 en te groot worden overgeslagen', async () => {
  const { bytesToBase64, base64ToBytes, readPhotos, BACKUP_VERSION } = await import('../src/core/backup.ts');
  const events = migrateBackupV3(BACKUP_V3).events;
  const beanId = (events.find(e => e.kind === 'bean.upsert')!.data as { beanId: string }).beanId;
  const bytes = new Uint8Array([1, 2, 3, 250, 251, 252]);
  assert.deepEqual([...base64ToBytes(bytesToBase64(bytes))], [...bytes]);
  const big = new Uint8Array(40_000).map((_, i) => i % 256);
  assert.deepEqual([...base64ToBytes(bytesToBase64(big))], [...big]);

  const text = exportLog(events, 1, [{ beanId, type: 'image/webp', data: bytesToBase64(bytes) }]);
  assert.equal(JSON.parse(text).version, BACKUP_VERSION);
  const p = previewImport(text, []);
  assert.equal(p.photos.length, 1);
  assert.equal(p.photos[0]!.beanId, beanId);
  assert.deepEqual(p.warnings, []);

  const known = new Set([beanId]);
  const r = readPhotos([
    { beanId, type: 'image/webp', data: 'AQID' },
    { beanId, type: 'image/webp', data: 'AQID' }, // dubbel
    { beanId: 'onbekend', type: 'image/webp', data: 'AQID' },
    { beanId, type: 'text/html', data: 'AQID' },
    { beanId, type: 'image/png', data: '<script>' },
    { beanId, type: 'image/png', data: 'A'.repeat(600_000) },
    null
  ], known);
  assert.equal(r.photos.length, 1);
  assert.equal(r.skipped, 6);
  assert.deepEqual(readPhotos('geen lijst', known), { photos: [], skipped: 0 });
  // een back-up van vóór de foto's (versie 1, zonder veld) leest gewoon
  const v1 = JSON.stringify({ format: 'brewconsole-log', version: 1, events });
  assert.equal(previewImport(v1, []).photos.length, 0);
  assert.equal(previewImport(v1, []).fresh, events.length);
});
