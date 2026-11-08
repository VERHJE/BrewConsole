import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import fc from 'fast-check';
import { deriveKey, newSalt, open, seal, type CryptoDeps } from '../sync/crypto.ts';
import { afterPull, afterPush, newSyncState, openBlock, pendingEvents, sealBlock } from '../sync/blocks.ts';
import { mergeLogs } from '../src/events.ts';
import { migrateBackupV3 } from '../src/migrate/v3.ts';
import { BACKUP_V3 } from './fixtures.ts';
import type { EngineEvent } from '../src/types.ts';

const deps: CryptoDeps = { subtle: webcrypto.subtle, randomBytes: n => webcrypto.getRandomValues(new Uint8Array(n)) };
const ITER = 1000; // alleen in tests laag
const salt = newSalt(deps);
const key = await deriveKey(deps, 'correct paard', salt, ITER);
const events = migrateBackupV3(BACKUP_V3).events;

test('inpakken en uitpakken geeft de tekst terug, met een nieuwe IV per keer', async () => {
  const a = await seal(deps, key, 'blk-x', 'hallo ☕');
  const b = await seal(deps, key, 'blk-x', 'hallo ☕');
  assert.notEqual(a, b);
  assert.equal(await open(deps, key, 'blk-x', a), 'hallo ☕');
});
test('verkeerde zin, ander id of gewijzigd blok worden geweigerd', async () => {
  const env = await seal(deps, key, 'blk-x', 'geheim');
  const other = await deriveKey(deps, 'verkeerd', salt, ITER);
  await assert.rejects(open(deps, other, 'blk-x', env));
  await assert.rejects(open(deps, key, 'blk-y', env));
  const o = JSON.parse(env) as { ct: string };
  const flipped = o.ct.slice(0, 4) === 'AAAA' ? 'BBBB' + o.ct.slice(4) : 'AAAA' + o.ct.slice(4);
  await assert.rejects(open(deps, key, 'blk-x', JSON.stringify({ ...o, ct: flipped })));
  await assert.rejects(open(deps, key, 'blk-x', 'geen json'));
});
test('dezelfde zin en zout geven dezelfde sleutel; ander zout niet', async () => {
  const k2 = await deriveKey(deps, 'correct paard', salt, ITER);
  const env = await seal(deps, key, 'a', 'x');
  assert.equal(await open(deps, k2, 'a', env), 'x');
  const k3 = await deriveKey(deps, 'correct paard', newSalt(deps), ITER);
  await assert.rejects(open(deps, k3, 'a', env));
});
test('een leeg wachtwoord wordt geweigerd', async () => {
  await assert.rejects(deriveKey(deps, '', salt, ITER));
});
test('een blok bevat gebeurtenissen en id/volgnummer; bijwerken van de toestand', async () => {
  let st = newSyncState('iphone');
  const first = events.slice(0, 10);
  const sealed = await sealBlock(deps, key, 'delta', st, first);
  assert.match(sealed.id, /^blk-iphone-00000001$/);
  const plain = await openBlock(deps, key, sealed.id, sealed.body);
  assert.deepEqual(plain.events.map(e => e.id), first.map(e => e.id));
  st = afterPush(st, sealed);
  assert.equal(st.nextSeq, 2);
  assert.equal(pendingEvents(events, st).length, events.length - 10);
});
test('een blok met een kapotte gebeurtenis wordt geweigerd', async () => {
  const st = newSyncState('iphone');
  const bad = { id: 'x', at: 1, device: 'd', v: 1, kind: 'onzin', data: {} } as unknown as EngineEvent;
  const sealed = await sealBlock(deps, key, 'delta', st, [bad]);
  await assert.rejects(openBlock(deps, key, sealed.id, sealed.body), /ongeldige gebeurtenis/);
});
test('twee toestellen in willekeurige volgorde komen op hetzelfde logboek uit', async () => {
  await fc.assert(fc.asyncProperty(
    fc.shuffledSubarray(events, { minLength: 1 }),
    fc.shuffledSubarray(events, { minLength: 1 }),
    fc.boolean(),
    async (a, b, aFirst) => {
      // Toestel A en B sturen elk hun deel naar de 'server' (een lijst blokken).
      const server: Array<{ id: string; body: string }> = [];
      let sa = newSyncState('toestel-a'); let sb = newSyncState('toestel-b');
      const push = async (st: typeof sa, log: EngineEvent[]) => {
        const p = pendingEvents(log, st);
        if (p.length === 0) return st;
        const s = await sealBlock(deps, key, 'delta', st, p);
        server.push({ id: s.id, body: s.body });
        return afterPush(st, s);
      };
      const pull = async (st: typeof sa, log: EngineEvent[]) => {
        const fresh = server.filter(s => !st.seenBlockIds.includes(s.id));
        const got = await Promise.all(fresh.map(async f => ({ id: f.id, plain: await openBlock(deps, key, f.id, f.body) })));
        return afterPull(st, log, got);
      };
      let la = [...a], lb = [...b];
      if (aFirst) { sa = await push(sa, la); sb = await push(sb, lb); } else { sb = await push(sb, lb); sa = await push(sa, la); }
      const ra = await pull(sa, la); la = ra.events;
      const rb = await pull(sb, lb); lb = rb.events;
      assert.equal(JSON.stringify(la), JSON.stringify(lb));
      assert.equal(JSON.stringify(la), JSON.stringify(mergeLogs(a, b).events));
    }
  ), { numRuns: 25 });
});
test('de synchronisatiecode gebruikt geen eigen klok of toeval en geen vaste netwerkaanroep', async () => {
  const { readFileSync } = await import('node:fs');
  for (const f of ['crypto.ts', 'blocks.ts', 'client.ts', 'server.ts', 'kv-store.ts', 'ai.ts']) {
    const src = readFileSync(new URL(`../sync/${f}`, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const bad of ['Date.now(', 'Math.random(', 'localStorage', 'document.', 'window.', 'globalThis.fetch', ' fetch(']) {
      assert.ok(!src.includes(bad), `${f} gebruikt ${bad}`);
    }
  }
});
