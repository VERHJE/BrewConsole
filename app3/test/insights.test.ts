import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, factsOf } from '../../engine3/src/index.ts';
import type { Env } from '../src/core/ids.ts';
import { memoryStorage } from '../src/core/storage.ts';
import { createStore } from '../src/core/store.ts';
import { DEFAULT_FORM, brewPlanEvent, planBrew } from '../src/core/brew.ts';
import { finishTimer, startTimer } from '../src/core/timer.ts';
import { contextFor, emptyDraft, tastingEvents } from '../src/core/tasting.ts';
import { brewDeleteEvent, cupRows, grindView, profileOf } from '../src/core/insights.ts';

let now = Date.UTC(2026, 10, 5, 12);
let n = 0;
const env: Env = { now: () => now, uuid: () => `u${++n}`, device: 'test' };

test('logboek: nieuwste eerst, geproefde koppen met oordeel, verwijderen haalt de kop weg', async () => {
  const engine = createEngine();
  const store = await createStore(memoryStorage(), engine);
  const ids: string[] = [];
  for (let i = 0; i < 3; i++) {
    const out = planBrew(engine, store.snapshot().state, env, DEFAULT_FORM);
    assert.ok(out.ok); if (!out.ok) return;
    const ev = brewPlanEvent(env, out.advice, DEFAULT_FORM);
    ids.push(ev.data.brewId);
    await store.append([ev]);
    await store.append(startTimer(env, ev.data.brewId));
    now += 200_000;
    await store.append(finishTimer(env, ev.data.brewId, 200, ev.data.recipe.pours.length - 1));
    const d = emptyDraft(); d.strength = 1; d.liking = 3;
    await store.append(tastingEvents(env, contextFor(store.snapshot().state, store.snapshot().events, ev.data.brewId)!, d).events);
    now += 60_000;
  }
  const rows = cupRows(store.snapshot().state);
  assert.deepEqual(rows.map(r => r.id), [...ids].reverse());
  assert.ok(rows.every(r => r.tasted && r.strength === 1 && r.liking === 3 && r.status === 'complete'));

  await store.append([brewDeleteEvent(env, ids[1]!)]);
  assert.deepEqual(cupRows(store.snapshot().state).map(r => r.id), [ids[2], ids[0]]);
  assert.equal(factsOf(store.snapshot().state).cups.has(ids[1]!), false);
});

test('inzicht zonder data: profiel is "nog te weinig", molen gebruikt de startwaarde', async () => {
  const store = await createStore(memoryStorage(), createEngine());
  const p = profileOf(store.snapshot().state);
  assert.ok(p.sensitivity.every(s => s.status === 'unknown'));
  const g = grindView(store.snapshot().state);
  assert.equal(g.observations, 0);
  assert.equal(g.learned, false);
  assert.ok(g.pctPerClick < 0, 'grover maalt sneller: negatief percentage per klik');
});
