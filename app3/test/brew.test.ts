import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, plan, ms, g } from '../../engine3/src/index.ts';
import type { Env } from '../src/core/ids.ts';
import { memoryStorage } from '../src/core/storage.ts';
import { createStore } from '../src/core/store.ts';
import { DEFAULT_FORM, brewPlanEvent, clock, planBrew, pourLines } from '../src/core/brew.ts';

const NOW = Date.UTC(2026, 10, 5, 12);
let n = 0;
const env: Env = { now: () => NOW, uuid: () => `u${++n}`, device: 'test' };

test('planBrew geeft exact de uitvoer van plan() terug', async () => {
  const engine = createEngine();
  const store = await createStore(memoryStorage(), engine);
  const state = store.snapshot().state;
  const out = planBrew(engine, state, env, DEFAULT_FORM);
  assert.ok(out.ok);
  if (!out.ok) return;
  const direct = plan(state, { at: ms(NOW), beanId: null, method: 'v60', cupG: g(250), goal: null, technique: null });
  assert.deepEqual(out.advice, direct);
});

test('kopgrootte buiten bereik geeft een melding, geen uitzondering', () => {
  const engine = createEngine();
  for (const cupG of [0, 50, 5000, NaN]) {
    const out = planBrew(engine, engine.learn([]), env, { ...DEFAULT_FORM, cupG });
    assert.equal(out.ok, false);
  }
});

test('elke techniek geeft een gietschema met oplopend gewicht, of een nette melding', () => {
  const engine = createEngine();
  const state = engine.learn([]);
  for (const technique of ['kasuya_46', 'hoffmann_ultimate', 'gagne', 'wendelboe', 'april', 'hedrick_one_and_done', 'rao'] as const) {
    const out = planBrew(engine, state, env, { ...DEFAULT_FORM, technique });
    if (!out.ok) { assert.ok(out.message.length > 0); continue; }
    const lines = pourLines(out.advice.recipe);
    assert.ok(lines.length >= 1);
    const to = out.advice.recipe.pours.map(p => p.toG);
    assert.deepEqual([...to].sort((a, b) => a - b), to);
  }
});

test('brew.plan-gebeurtenis bevat het recept ongewijzigd en is geldig', async () => {
  const engine = createEngine();
  const store = await createStore(memoryStorage(), engine);
  const out = planBrew(engine, store.snapshot().state, env, DEFAULT_FORM);
  assert.ok(out.ok);
  if (!out.ok) return;
  const ev = brewPlanEvent(env, out.advice, DEFAULT_FORM);
  assert.deepEqual(ev.data.recipe, out.advice.recipe);
  await store.append([ev]);
  assert.equal(store.snapshot().events.length, 1);
});

test('klok', () => { assert.equal(clock(0), '0:00'); assert.equal(clock(195), '3:15'); assert.equal(clock(-3), '0:00'); });
