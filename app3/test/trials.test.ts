import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, factsOf, plan, ms, g } from '../../engine3/src/index.ts';
import type { Env } from '../src/core/ids.ts';
import { memoryStorage } from '../src/core/storage.ts';
import { createStore } from '../src/core/store.ts';
import { DEFAULT_FORM, brewPlanEvent, planBrew } from '../src/core/brew.ts';
import { beanUpsert, editForm, scanText, validateForm } from '../src/core/beans.ts';
import { finishTimer, startTimer } from '../src/core/timer.ts';
import { contextFor, emptyDraft, tastingEvents } from '../src/core/tasting.ts';
import { pairTrialEvent, pendingTrialFor, trialPlanEvent } from '../src/core/trials.ts';

let now = Date.UTC(2026, 10, 5, 12);
let n = 0;
const env: Env = { now: () => now, uuid: () => `u${++n}`, device: 'test' };

async function brewAndTaste(store: Awaited<ReturnType<typeof createStore>>, ev: ReturnType<typeof brewPlanEvent>) {
  await store.append([ev]);
  await store.append(startTimer(env, ev.data.brewId));
  now += 200_000;
  await store.append(finishTimer(env, ev.data.brewId, 200, ev.data.recipe.pours.length - 1));
  const ctx = contextFor(store.snapshot().state, store.snapshot().events, ev.data.brewId)!;
  const d = emptyDraft(); d.strength = 0; d.liking = 4;
  await store.append(tastingEvents(env, ctx, d).events);
  now += 60_000;
}

test('proef: twee koppen met trialId, daarna pair.trial; de engine ziet de uitkomst en stelt niet opnieuw voor', async () => {
  const engine = createEngine();
  const store = await createStore(memoryStorage(), engine);
  const r = validateForm(editForm(scanText(env, 'Notes: jasmine, rose\nProcess: Washed\nRoast: Light'), 'name', 'Bloemig'), env);
  assert.ok(r.ok); if (!r.ok) return;
  const bean = beanUpsert(env, null, r);
  await store.append([bean]);
  const form = { ...DEFAULT_FORM, beanId: bean.data.beanId };

  // Genoeg gewone Kasuya-koppen, zodat de engine een proef durft voor te stellen.
  let advice = null as ReturnType<typeof plan> | null;
  for (let i = 0; i < 6 && !advice?.trial; i++) {
    const out = planBrew(engine, store.snapshot().state, env, form);
    assert.ok(out.ok); if (!out.ok) return;
    advice = out.advice;
    if (!advice.trial) await brewAndTaste(store, brewPlanEvent(env, advice, form));
  }
  assert.ok(advice?.trial, 'de engine moet na genoeg Kasuya-koppen van een bloemige zak een proef voorstellen');
  if (!advice?.trial) return;

  const c = trialPlanEvent(env, advice, form, 'control');
  const v = trialPlanEvent(env, advice, form, 'variant');
  assert.equal(c.data.trialId, advice.trial.id);
  assert.deepEqual(c.data.recipe, advice.trial.control);
  assert.deepEqual(v.data.recipe, advice.trial.variant);

  await brewAndTaste(store, c);
  assert.equal(pendingTrialFor(store.snapshot().state, c.data.brewId), null, 'pas na beide koppen');
  await brewAndTaste(store, v);
  const pending = pendingTrialFor(store.snapshot().state, v.data.brewId)!;
  assert.ok(pending);
  assert.equal(pending.variant.brewId, v.data.brewId);
  assert.equal(pending.control.brewId, c.data.brewId);

  await store.append([pairTrialEvent(env, pending, 'variant', null)]);
  assert.equal(pendingTrialFor(store.snapshot().state, v.data.brewId), null);
  assert.ok(factsOf(store.snapshot().state).trials.has(advice.trial.id));
  const next = planBrew(engine, store.snapshot().state, env, form);
  assert.ok(next.ok);
  if (next.ok) assert.notEqual(next.advice.trial?.id, advice.trial.id);
});
