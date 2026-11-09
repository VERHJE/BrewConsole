import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, factsOf } from '../../engine3/src/index.ts';
import type { Env } from '../src/core/ids.ts';
import { memoryStorage } from '../src/core/storage.ts';
import { createStore } from '../src/core/store.ts';
import { DEFAULT_FORM, brewPlanEvent, planBrew } from '../src/core/brew.ts';
import { abandonTimer, drainedTap, drainedUndo, finishTimer, pauseTimer, resumeTimer, startTimer, stepGuide, timerEventsFor, timerView } from '../src/core/timer.ts';

let now = Date.UTC(2026, 10, 5, 12);
let n = 0;
const env: Env = { now: () => now, uuid: () => `u${++n}`, device: 'test' };

async function setup() {
  const engine = createEngine();
  const store = await createStore(memoryStorage(), engine);
  const out = planBrew(engine, store.snapshot().state, env, { ...DEFAULT_FORM, technique: 'kasuya_46' });
  assert.ok(out.ok);
  if (!out.ok) throw new Error('plan');
  const plan = brewPlanEvent(env, out.advice, DEFAULT_FORM);
  await store.append([plan]);
  return { store, brewId: plan.data.brewId, recipe: out.advice.recipe };
}
const view = (s: Awaited<ReturnType<typeof setup>>, at: number) => timerView(s.recipe, timerEventsFor(s.store.snapshot().events, s.brewId), at);

test('voor de start: klaar, niets loopt', async () => {
  const s = await setup();
  const v = view(s, now);
  assert.equal(v.status, 'ready'); assert.equal(v.elapsedSec, 0); assert.equal(v.current, -1);
});

test('lopen, pauzeren, verder: de klok staat stil tijdens pauze', async () => {
  const s = await setup();
  const t0 = now;
  await s.store.append(startTimer(env, s.brewId));
  assert.equal(view(s, t0 + 30_000).elapsedSec, 30);
  now = t0 + 30_000;
  await s.store.append(pauseTimer(env, s.brewId, 30));
  assert.equal(view(s, t0 + 90_000).elapsedSec, 30);
  assert.equal(view(s, t0 + 90_000).status, 'paused');
  now = t0 + 90_000;
  await s.store.append(resumeTimer(env, s.brewId, 30));
  assert.equal(view(s, t0 + 100_000).elapsedSec, 40);
});

test('herladen midden in een zetsel geeft dezelfde klok (afgeleid uit gebeurtenissen)', async () => {
  const s = await setup();
  const t0 = now;
  await s.store.append(startTimer(env, s.brewId));
  const again = await createStore(s.store.storage, createEngine());
  const v = timerView(s.recipe, timerEventsFor(again.snapshot().events, s.brewId), t0 + 12_000);
  assert.equal(v.elapsedSec, 12);
});

test('Kasuya: giet 2 wacht op erdoor tot de tik komt', async () => {
  const s = await setup();
  const t0 = now;
  await s.store.append(startTimer(env, s.brewId));
  const second = s.recipe.pours[1]!;
  const waits = second.waitForDrain;
  const late = t0 + (second.atSec + 5) * 1000;
  const v = view(s, late);
  if (waits) {
    assert.equal(v.phases[1], 'hold');
    now = late;
    await s.store.append(drainedTap(env, s.brewId, second.atSec + 5, 0));
    assert.equal(view(s, late).phases[1], 'go');
  } else assert.equal(v.phases[1], 'go');
});

test('afmaken: toestand krijgt endSec, drainedAtSec en status complete; ongedaan maken haalt de tik weg', async () => {
  const s = await setup();
  await s.store.append(startTimer(env, s.brewId));
  const last = s.recipe.pours.length - 1;
  now += 200_000;
  await s.store.append(drainedTap(env, s.brewId, 190, 0));
  await s.store.append(drainedUndo(env, s.brewId, 191, 0));
  await s.store.append(finishTimer(env, s.brewId, 210, last));
  const cup = factsOf(s.store.snapshot().state).cups.get(s.brewId)!;
  assert.equal(cup.status, 'complete');
  assert.equal(cup.endSec, 210);
  assert.equal(cup.bedDrySec, 210);
  assert.equal(cup.drainedAtSec.get(last), 210);
  assert.equal(cup.drainedAtSec.has(0), false);
  assert.equal(cup.startedAtSec, 0);
});

test('afbreken zet de status op abandoned', async () => {
  const s = await setup();
  await s.store.append(startTimer(env, s.brewId));
  await s.store.append(abandonTimer(env, s.brewId, 20));
  assert.equal(factsOf(s.store.snapshot().state).cups.get(s.brewId)!.status, 'abandoned');
  assert.equal(view(s, now + 99_000).status, 'abandoned');
});

test('stap per stap: klaar → giet met aftelling en "hierna" → wachten op doorlopen → laatste giet → klaar', async () => {
  const s = await setup();
  const pours = s.recipe.pours;
  const guide = (ms: number) => stepGuide(s.recipe, view(s, ms), s.recipe.expectedEndSec?.mid ?? null);
  const t0 = now;
  assert.equal(guide(t0).kind, 'ready');
  assert.match(guide(t0).action, /Eerste giet/);
  assert.equal(guide(t0).progress, null, 'voor de start geen voortgang');
  assert.equal(guide(t0).target, null);
  await s.store.append(startTimer(env, s.brewId));

  const g1 = guide(t0 + 10_000);
  assert.equal(g1.kind, 'pour');
  assert.equal(g1.title, 'Giet 1');
  assert.equal(Math.round(g1.remainingSec!), Math.round(pours[1]!.atSec - 10));
  assert.ok(g1.fraction! > 0 && g1.fraction! < 0.5);
  assert.match(g1.next!, /Hierna giet 2/);
  // voortgang en doel: welke giet het is en tot welk gewicht
  assert.deepEqual(g1.progress, { index: 1, count: pours.length });
  assert.equal(g1.target!.toG, pours[0]!.toG);
  assert.equal(g1.target!.addG, pours[0]!.addG);
  assert.match(g1.target!.how, /spiraal|rondjes|midden/);

  // Aftelling daalt, fractie stijgt, binnen 0..1
  const a = guide(t0 + 20_000), b = guide(t0 + 30_000);
  assert.ok(b.remainingSec! < a.remainingSec!);
  assert.ok(b.fraction! > a.fraction! && b.fraction! <= 1);

  // Kasuya: op het moment van giet 2 wacht de stap op doorlopen (geen aftelling), tot erdoor getikt is
  const atSecond = t0 + (pours[1]!.atSec + 1) * 1000;
  if (pours[1]!.waitForDrain) {
    const h = guide(atSecond);
    assert.equal(h.kind, 'hold'); assert.equal(h.remainingSec, null); assert.equal(h.fraction, null);
    assert.match(h.action, /Erdoor/);
    now = atSecond;
    await s.store.append(drainedTap(env, s.brewId, pours[1]!.atSec + 1, 0));
    assert.equal(guide(atSecond).kind, 'pour');
    assert.equal(guide(atSecond).title, 'Giet 2');
  }

  // Laatste giet: geen volgende, "alles doorgelopen"
  const last = pours.length - 1;
  const lastAt = t0 + (pours[last]!.atSec + 5) * 1000;
  now = lastAt;
  for (let i = 0; i < last; i++) await s.store.append(drainedTap(env, s.brewId, pours[last]!.atSec, i));
  const gl = guide(lastAt);
  assert.equal(gl.kind, 'drain');
  assert.equal(gl.title, `Giet ${last + 1}`);
  assert.deepEqual(gl.progress, { index: last + 1, count: pours.length });
  assert.match(gl.target!.how, /doorlopen/);
  assert.match(gl.next!, /Alles doorgelopen/);

  await s.store.append(finishTimer(env, s.brewId, pours[last]!.atSec + 60, last));
  assert.equal(guide(lastAt + 100_000).kind, 'done');
});
