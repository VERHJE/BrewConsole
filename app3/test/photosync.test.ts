import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createEngine, factsOf, type EngineEvent } from '../../engine3/src/index.ts';
import { handleRequest, MemoryStore, sha256Hex, type ServerEnv } from '../../engine3/sync/server.ts';
import { memoryStorage } from '../src/core/storage.ts';
import { createStore } from '../src/core/store.ts';
import { connect, memorySyncStorage, syncNow, type SyncDeps, type SyncOutcome } from '../src/core/sync.ts';
import { memoryPhotoStore } from '../src/core/photos.ts';
import { createPhotoSync, localPhotoMeta, memoryPhotoMeta } from '../src/core/photosync.ts';
import { seedLog } from './seed.ts';

const TOKEN = 'token-voor-de-test-0123456789';
const PASS = 'correct paard batterij';
const crypto = { subtle: webcrypto.subtle as never, randomBytes: (n: number) => webcrypto.getRandomValues(new Uint8Array(n)) };

const webp = (...bytes: number[]): Blob => new Blob([new Uint8Array(bytes)], { type: 'image/webp' });
const bytesOf = async (b: Blob | null): Promise<number[] | null> => (b ? [...new Uint8Array(await b.arrayBuffer())] : null);

async function serverEnv(withPhotos = true): Promise<ServerEnv> {
  return {
    store: new MemoryStore(), ...(withPhotos ? { photos: new MemoryStore() } : {}),
    tokenHashes: [await sha256Hex(webcrypto.subtle as never, TOKEN)], subtle: webcrypto.subtle as never, allowOrigin: '*'
  };
}

async function device(env: ServerEnv, name: string, events: readonly EngineEvent[] = []) {
  const clock = { t: 1_000_000 };
  const raw = memoryPhotoStore();
  const ps = createPhotoSync(raw, memoryPhotoMeta(), () => clock.t);
  const store = await createStore(memoryStorage(events), createEngine());
  const deps: SyncDeps = {
    crypto, store, device: name, now: () => clock.t, iterations: 1000, storage: memorySyncStorage(), photoSync: ps.run,
    fetch: (url, init) => handleRequest(new Request(url, init), env)
  };
  const sync = (): Promise<SyncOutcome> => syncNow(deps);
  const join = (): Promise<SyncOutcome> => connect(deps, { baseUrl: 'https://sync.example', token: TOKEN, passphrase: PASS });
  return { clock, raw, ps, store, deps, sync, join };
}

async function twoDevices(withPhotos = true) {
  const { events } = await seedLog(0);
  const bean = [...factsOf(createEngine().learn(events)).beans.keys()][0]!;
  const env = await serverEnv(withPhotos);
  const a = await device(env, 'web-a', events);
  const b = await device(env, 'web-b');
  return { env, a, b, bean };
}
const photoCount = (env: ServerEnv): number => (env.photos as MemoryStore).blocks.size;
const photos = (r: SyncOutcome) => (r.ok ? r.photos : undefined);

test('een foto op het ene toestel komt op het andere; een tweede keer is er niets meer te doen', async () => {
  const { env, a, b, bean } = await twoDevices();
  await a.ps.store.put(bean, webp(1, 2, 3));
  const ra = await a.join();
  assert.equal(ra.ok, true); assert.equal(photos(ra)?.pushed, 1);
  const rb = await b.join();
  assert.equal(rb.ok, true); assert.equal(photos(rb)?.pulled, 1);
  assert.deepEqual(await bytesOf(await b.raw.get(bean)), [1, 2, 3]);
  assert.equal((await b.raw.get(bean))!.type, 'image/webp');
  assert.deepEqual(photos(await a.sync()), { pushed: 0, pulled: 0, removed: 0, skipped: 0 });
  assert.deepEqual(photos(await b.sync()), { pushed: 0, pulled: 0, removed: 0, skipped: 0 });
  assert.equal(photoCount(env), 1);
});

test('een nieuwe foto vervangt de oude, ook op de server (één blok per zak)', async () => {
  const { env, a, b, bean } = await twoDevices();
  await a.ps.store.put(bean, webp(1)); await a.join(); await b.join();
  a.clock.t += 60_000;
  await a.ps.store.put(bean, webp(9, 9));
  assert.equal(photos(await a.sync())?.pushed, 1);
  assert.equal(photoCount(env), 1, 'de oude versie is opgeruimd');
  assert.equal(photos(await b.sync())?.pulled, 1);
  assert.deepEqual(await bytesOf(await b.raw.get(bean)), [9, 9]);
});

test('verwijderen wordt gesynchroniseerd en blijft verwijderd', async () => {
  const { env, a, b, bean } = await twoDevices();
  await a.ps.store.put(bean, webp(5)); await a.join(); await b.join();
  a.clock.t += 60_000;
  await a.ps.store.remove(bean);
  assert.equal(photos(await a.sync())?.pushed, 1);
  assert.equal(photoCount(env), 1, 'alleen de grafsteen staat nog op de server');
  const rb = await b.sync();
  assert.equal(photos(rb)?.removed, 1);
  assert.equal(await b.raw.get(bean), null);
  assert.deepEqual(photos(await b.sync()), { pushed: 0, pulled: 0, removed: 0, skipped: 0 });
  assert.equal(await a.raw.get(bean), null);
  // en daarna weer een nieuwe foto: wint van de grafsteen
  b.clock.t += 120_000;
  await b.ps.store.put(bean, webp(7));
  await b.sync();
  await a.sync();
  assert.deepEqual(await bytesOf(await a.raw.get(bean)), [7]);
});

test('twee toestellen wijzigen tegelijk: de nieuwste wijziging wint, op beide kanten', async () => {
  const { a, b, bean } = await twoDevices();
  await a.ps.store.put(bean, webp(1)); await a.join(); await b.join();
  a.clock.t = 2_000_000; await a.ps.store.put(bean, webp(2));
  b.clock.t = 3_000_000; await b.ps.store.put(bean, webp(3));
  await a.sync();               // A stuurt zijn wijziging
  await b.sync();               // B is nieuwer en overschrijft die
  await a.sync();               // A neemt die van B over
  assert.deepEqual(await bytesOf(await a.raw.get(bean)), [3]);
  assert.deepEqual(await bytesOf(await b.raw.get(bean)), [3]);
  // andersom: de eerdere wijziging van een toestel dat later synchroniseert verliest
  a.clock.t = 5_000_000; await a.ps.store.put(bean, webp(4));
  b.clock.t = 4_000_000; await b.ps.store.put(bean, webp(5));
  await a.sync(); await b.sync(); await a.sync();
  assert.deepEqual(await bytesOf(await a.raw.get(bean)), [4]);
  assert.deepEqual(await bytesOf(await b.raw.get(bean)), [4]);
});

test('een foto die er al stond zonder markering (van vóór deze functie) wordt bij de eerste keer verstuurd', async () => {
  const { a, b, bean } = await twoDevices();
  await a.raw.put(bean, webp(4, 4));
  assert.equal(photos(await a.join())?.pushed, 1);
  await b.join();
  assert.deepEqual(await bytesOf(await b.raw.get(bean)), [4, 4]);
});

test('een oudere Worker zonder foto-routes: de rest van de synchronisatie werkt gewoon', async () => {
  const { a, b, bean, env } = await twoDevices(false);
  await a.ps.store.put(bean, webp(1));
  const ra = await a.join();
  assert.equal(ra.ok, true); assert.equal(photos(ra), undefined);
  assert.equal((await b.join()).ok, true);
  assert.equal(b.store.snapshot().events.length, a.store.snapshot().events.length);
  assert.equal(await b.raw.get(bean), null);
  assert.equal(env.photos, undefined);
});

test('een mislukte fotosynchronisatie maakt de synchronisatie van het logboek niet ongedaan', async () => {
  const { a, bean } = await twoDevices();
  await a.ps.store.put(bean, webp(1));
  const failing: SyncDeps = { ...a.deps, photoSync: async () => { throw new Error('kapot'); } };
  const r = await connect(failing, { baseUrl: 'https://sync.example', token: TOKEN, passphrase: PASS });
  assert.equal(r.ok, true);
  if (r.ok) assert.match(r.photoError ?? '', /kapot/);
});

test('een foto die te groot is voor een blok, of van een onbekend type, wordt overgeslagen en blijft op het toestel', async () => {
  const { a, bean } = await twoDevices();
  await a.ps.store.put(bean, new Blob([new Uint8Array(900_000)], { type: 'image/webp' }));
  const r1 = await a.join();
  assert.equal(photos(r1)?.skipped, 1); assert.equal(photos(r1)?.pushed, 0);
  assert.equal((await a.raw.get(bean))!.size, 900_000);
  await a.ps.store.put(bean, new Blob([new Uint8Array([1])], { type: 'application/pdf' }));
  assert.equal(photos(await a.sync())?.skipped, 1);
});

test('een foto-blok dat niet te openen is (andere wachtwoordzin) wordt overgeslagen, niet toegepast', async () => {
  const { env, a, b, bean } = await twoDevices();
  await a.ps.store.put(bean, webp(1)); await a.join();
  // een ander toestel met een andere wachtwoordzin zet iets op dezelfde server onder een geldig id
  const other = await device(env, 'web-x');
  const id = [...(env.photos as MemoryStore).blocks.keys()][0]!;
  (env.photos as MemoryStore).blocks.set(id, '{"v":1,"iv":"AAAAAAAAAAAAAAAA","ct":"AAAA"}');
  const rb = await b.join();
  assert.equal(rb.ok, true);
  assert.equal(photos(rb)?.skipped, 1);
  assert.equal(await b.raw.get(bean), null);
  void other;
});

test('markeringen: ze overleven opslaan in localStorage, rommel wordt genegeerd, alles wissen wist ze ook', async () => {
  const mem = new Map<string, string>();
  const ls = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); } };
  const meta = localPhotoMeta(ls);
  const raw = memoryPhotoStore();
  const ps = createPhotoSync(raw, meta, () => 500);
  await ps.store.put('bean:x', webp(1));
  assert.deepEqual(localPhotoMeta(ls).load(), { 'bean:x': { at: 500, deleted: false, dirty: true } });
  await ps.store.remove('bean:x');
  assert.deepEqual(localPhotoMeta(ls).load(), { 'bean:x': { at: 501, deleted: true, dirty: true } }, 'het tijdstip loopt altijd op');
  mem.set('brewconsole.fotosync', '{"a":{"at":"x"},"b":1,"c":{"at":5,"deleted":false,"dirty":false}}');
  assert.deepEqual(localPhotoMeta(ls).load(), { c: { at: 5, deleted: false, dirty: false } });
  mem.set('brewconsole.fotosync', 'geen json');
  assert.deepEqual(localPhotoMeta(ls).load(), {});
  await ps.store.put('bean:y', webp(2));
  await ps.store.clear();
  assert.equal(mem.has('brewconsole.fotosync'), false);
  assert.equal(await raw.get('bean:y'), null);
});
