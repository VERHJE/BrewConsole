import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, factsOf, tasteProfile } from '../../engine3/src/index.ts';
import type { Env } from '../src/core/ids.ts';
import { memoryStorage } from '../src/core/storage.ts';
import { createStore } from '../src/core/store.ts';
import { DEFAULT_FORM, brewPlanEvent, planBrew } from '../src/core/brew.ts';
import { editForm, scanText, validateForm, beanUpsert } from '../src/core/beans.ts';
import { finishTimer, startTimer } from '../src/core/timer.ts';
import { actualsProblems, contextFor, draftFromCup, emptyDraft, stepsFor, tastingEvents } from '../src/core/tasting.ts';

let now = Date.UTC(2026, 10, 5, 12);
let n = 0;
const env: Env = { now: () => now, uuid: () => `u${++n}`, device: 'test' };

async function cupWithBean(withNotes: boolean, goal: 'bright' | null = null) {
  const engine = createEngine();
  const store = await createStore(memoryStorage(), engine);
  const form = withNotes ? scanText(env, 'Finca X\nColombia\nProcess: Washed\nNotes: jasmine, peach') : editForm(scanText(env, ''), 'name', 'Zonder notities');
  const r = validateForm(withNotes ? editForm(form, 'name', 'Met notities') : form, env);
  assert.ok(r.ok);
  if (!r.ok) throw new Error('form');
  const bean = beanUpsert(env, null, r);
  await store.append([bean]);
  const f = { ...DEFAULT_FORM, beanId: bean.data.beanId, goal };
  const out = planBrew(engine, store.snapshot().state, env, f);
  assert.ok(out.ok);
  if (!out.ok) throw new Error('plan');
  const plan = brewPlanEvent(env, out.advice, f);
  await store.append([plan]);
  await store.append(startTimer(env, plan.data.brewId));
  now += 200_000;
  await store.append(finishTimer(env, plan.data.brewId, 200, out.advice.recipe.pours.length - 1));
  return { store, brewId: plan.data.brewId };
}

test('stappen: notities alleen als de zak ze heeft; doel-stap alleen met doel of vorige kop', async () => {
  const a = await cupWithBean(true, 'bright');
  const ctxA = contextFor(a.store.snapshot().state, a.store.snapshot().events, a.brewId)!;
  assert.deepEqual(stepsFor(ctxA), ['strength', 'taste', 'blind', 'notes', 'liking', 'goal', 'actuals']);
  const b = await cupWithBean(false, null);
  const ctxB = contextFor(b.store.snapshot().state, b.store.snapshot().events, b.brewId)!;
  assert.deepEqual(stepsFor(ctxB), ['strength', 'taste', 'blind', 'liking', 'actuals']);
  // De blinde keuze komt altijd vóór de notities van de zak.
  assert.ok(stepsFor(ctxA).indexOf('blind') < stepsFor(ctxA).indexOf('notes'));
});

test('opslaan: tasting komt in learn(), cataAsked is waar, ook bij een lege keuze', async () => {
  const { store, brewId } = await cupWithBean(true);
  const ctx = contextFor(store.snapshot().state, store.snapshot().events, brewId)!;
  const d = emptyDraft();
  d.strength = -1; d.acidity = 'lively'; d.finish = ['sweet_clean']; d.liking = 4;
  d.noteHits = { [ctx.bagNotes[0]!]: 'yes' };
  now += 10 * 60_000;
  const out = tastingEvents(env, ctx, d);
  await store.append(out.events);
  const t = factsOf(store.snapshot().state).cups.get(brewId)!.tasting!;
  assert.equal(t.strength, -1);
  assert.equal(t.cataAsked, true);
  assert.deepEqual(t.cata, []);
  assert.equal(t.minutesAfter, 10);
  assert.equal(t.late, false);
  assert.equal(t.noteHits.length, 1);
  assert.ok(tasteProfile(factsOf(store.snapshot().state)));
});

test('later dan twee uur telt als laat; werkelijke waarden worden een brew.actuals', async () => {
  const { store, brewId } = await cupWithBean(false);
  const ctx = contextFor(store.snapshot().state, store.snapshot().events, brewId)!;
  const d = emptyDraft(); d.strength = 0; d.actuals = { doseG: 17, tdsPct: 1.35 };
  now += 130 * 60_000;
  const out = tastingEvents(env, ctx, d);
  assert.equal(out.events.length, 2);
  await store.append(out.events);
  const cup = factsOf(store.snapshot().state).cups.get(brewId)!;
  assert.equal(cup.tasting!.late, true);
  assert.equal(cup.doseG, 17);
  assert.equal(cup.tdsPct, 1.35);
  assert.equal(cup.waterG, ctx.cup.waterG);
});

test('bewerken: eerder opgeslagen antwoorden komen terug in het concept; de laatste proeverij wint', async () => {
  const { store, brewId } = await cupWithBean(false);
  const get = () => contextFor(store.snapshot().state, store.snapshot().events, brewId)!;
  const d1 = emptyDraft(); d1.strength = 2;
  await store.append(tastingEvents(env, get(), d1).events);
  assert.equal(draftFromCup(get().cup).strength, 2);
  now += 1000;
  const d2 = draftFromCup(get().cup); d2.strength = 0;
  await store.append(tastingEvents(env, get(), d2).events);
  assert.equal(factsOf(store.snapshot().state).cups.get(brewId)!.tasting!.strength, 0);
});

test('werkelijke waarden buiten bereik worden gemeld', () => {
  assert.equal(actualsProblems({ doseG: 17, tdsPct: 1.3 }).length, 0);
  assert.equal(actualsProblems({ doseG: 500 }).length, 1);
  assert.equal(actualsProblems({ tdsPct: 9, grindClick: -1 }).length, 2);
});
