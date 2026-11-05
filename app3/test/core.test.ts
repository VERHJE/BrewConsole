import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, ms } from '../../engine3/src/index.ts';
import type { EngineEvent } from '../../engine3/src/index.ts';
import { memoryStorage } from '../src/core/storage.ts';
import { createStore, InvalidEventError } from '../src/core/store.ts';
import { parseRoute, href } from '../src/core/router.ts';

const bean = (id: string, name: string, at = 1000): EngineEvent => ({
  id: `e:${id}`, at: ms(at), device: 't', v: 1, kind: 'bean.upsert',
  data: { beanId: id, fields: { name }, sources: { name: 'user' }, legacy: null }
});

test('store: toevoegen, herstellen uit opslag, dubbele id telt niet', async () => {
  const storage = memoryStorage();
  const store = await createStore(storage, createEngine());
  assert.deepEqual(await store.append([bean('b1', 'Eén')]), { added: 1 });
  assert.deepEqual(await store.append([bean('b1', 'Eén')]), { added: 0 });
  const again = await createStore(storage, createEngine());
  assert.equal(again.snapshot().events.length, 1);
});

test('store: ongeldige gebeurtenis wordt geweigerd en het logboek blijft gelijk', async () => {
  const store = await createStore(memoryStorage(), createEngine());
  await assert.rejects(store.append([{ id: 'x', kind: 'bean.upsert' } as unknown as EngineEvent]), InvalidEventError);
  assert.equal(store.snapshot().events.length, 0);
});

test('store: mislukt opslaan laat het logboek ongewijzigd', async () => {
  const bad = { ...memoryStorage(), append: async () => { throw new Error('vol'); } };
  const store = await createStore(bad, createEngine());
  await assert.rejects(store.append([bean('b1', 'Eén')]));
  assert.equal(store.snapshot().events.length, 0);
});

test('store: abonnees krijgen een nieuwe revisie; volgorde van toevoegen maakt de toestand niet uit', async () => {
  const a = await createStore(memoryStorage(), createEngine());
  const b = await createStore(memoryStorage(), createEngine());
  let seen = 0; a.subscribe(() => { seen++; });
  const e1 = bean('b1', 'Eén', 1), e2 = bean('b2', 'Twee', 2);
  await a.append([e1]); await a.append([e2]);
  await b.append([e2, e1]);
  assert.equal(seen, 2);
  assert.deepEqual(a.snapshot().events.map(e => e.id), b.snapshot().events.map(e => e.id));
});

test('router: delen, tab en gerichte weergave', () => {
  assert.equal(parseRoute('').tab, 'zetten');
  assert.deepEqual(parseRoute('#/zakken/a%2Fb').parts, ['zakken', 'a/b']);
  assert.equal(parseRoute('#/timer/x').focused, true);
  assert.equal(parseRoute('#/onbekend').tab, 'zetten');
  assert.equal(href('zakken', 'a/b'), '#/zakken/a%2Fb');
});
