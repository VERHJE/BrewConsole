import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../../engine3/src/index.ts';
import type { Env } from '../src/core/ids.ts';
import { memoryStorage } from '../src/core/storage.ts';
import { createStore } from '../src/core/store.ts';
import { DEFAULT_FORM, brewPlanEvent, planBrew } from '../src/core/brew.ts';
import { beanUpsert, editForm, emptyForm, validateForm, scanText } from '../src/core/beans.ts';
import { abandonTimer, finishTimer, startTimer } from '../src/core/timer.ts';
import { contextFor, emptyDraft, tastingEvents } from '../src/core/tasting.ts';
import { fitView, seriesOf, trendPoints } from '../src/core/trends.ts';

let now = Date.UTC(2026, 10, 6, 8);
let n = 0;
const env: Env = { now: () => now, uuid: () => `u${++n}`, device: 'test' };

async function bean(store: Awaited<ReturnType<typeof createStore>>, text: string, name: string) {
  const r = validateForm(editForm(scanText(env, text), 'name', name), env);
  assert.ok(r.ok); if (!r.ok) throw new Error();
  const ev = beanUpsert(env, null, r);
  await store.append([ev]);
  return ev.data.beanId;
}
async function cup(store: Awaited<ReturnType<typeof createStore>>, beanId: string | null, o: { strength?: -2 | -1 | 0 | 1 | 2; liking?: 1 | 2 | 3 | 4 | 5; abandon?: boolean; endAt?: number } = {}) {
  const engine = createEngine();
  const form = { ...DEFAULT_FORM, beanId };
  const out = planBrew(engine, store.snapshot().state, env, form);
  assert.ok(out.ok); if (!out.ok) throw new Error();
  const plan = brewPlanEvent(env, out.advice, form);
  await store.append([plan, ...startTimer(env, plan.data.brewId)]);
  now += 200_000;
  if (o.abandon) { await store.append(abandonTimer(env, plan.data.brewId, 20)); now += 60_000; return plan.data.brewId; }
  await store.append(finishTimer(env, plan.data.brewId, o.endAt ?? 200, plan.data.recipe.pours.length - 1));
  if (o.strength !== undefined || o.liking !== undefined) {
    const d = emptyDraft(); d.strength = o.strength ?? null; d.liking = o.liking ?? null;
    await store.append(tastingEvents(env, contextFor(store.snapshot().state, store.snapshot().events, plan.data.brewId)!, d).events);
  }
  now += 60_000;
  return plan.data.brewId;
}

test('reeksen: op volgorde, afgebroken koppen tellen niet, ontbrekende oordelen worden overgeslagen', async () => {
  const store = await createStore(memoryStorage(), createEngine());
  const a = await bean(store, 'Colombia', 'A');
  const b = await bean(store, 'Kenia', 'B');
  await cup(store, a, { strength: -1, liking: 3, endAt: 190 });
  await cup(store, a, { abandon: true });
  await cup(store, a, { endAt: 215 });              // niet geproefd
  await cup(store, a, { strength: 0, liking: 5, endAt: 205 });
  await cup(store, b, { strength: 2, liking: 1 });
  const pts = trendPoints(store.snapshot().state, a);
  assert.deepEqual(pts.map(p => p.n), [1, 2, 3]);
  assert.deepEqual(pts.map(p => p.endSec), [190, 215, 205]);
  const s = Object.fromEntries(seriesOf(pts).map(x => [x.key, x]));
  assert.deepEqual(s['strength']!.points.map(p => p.y), [-1, 0]);
  assert.deepEqual(s['liking']!.points.map(p => p.n), [1, 3]);
  assert.equal(s['dose']!.points.length, 3);
  assert.equal(trendPoints(store.snapshot().state, null).length, 4, 'alle zakken');
  assert.equal(trendPoints(store.snapshot().state, 'bestaat-niet').length, 0);
});

test('pasvorm: zonder waarderingen "te weinig"; met genoeg waarderingen een verwachting uit beanFit', async () => {
  const store = await createStore(memoryStorage(), createEngine());
  const fruity = await bean(store, 'Notes: peach, berry\nProcess: Natural\nRoast: Light', 'Fruitig');
  assert.equal(fitView(store.snapshot().state, fruity).expectedDelta, null);
  assert.match(fitView(store.snapshot().state, fruity).text, /te weinig/);
  // Drie hoge waarderingen voor fruitig, drie lage voor een andere zak: het gemiddelde ligt ertussen.
  const plain = await bean(store, 'Process: Washed\nRoast: Dark', 'Donker');
  for (let i = 0; i < 3; i++) await cup(store, fruity, { liking: 5 });
  for (let i = 0; i < 3; i++) await cup(store, plain, { liking: 2 });
  const fit = fitView(store.snapshot().state, fruity);
  assert.ok(fit.expectedDelta !== null && fit.expectedDelta > 0, `verwacht boven gemiddeld, kreeg ${fit.expectedDelta}`);
  assert.ok(fit.parts.length >= 1 && fit.parts.every(p => p.n >= 3));
  assert.match(fit.text, /boven je gemiddelde/);
  const dark = fitView(store.snapshot().state, plain);
  assert.ok(dark.expectedDelta !== null && dark.expectedDelta < 0);
  assert.match(dark.text, /onder je gemiddelde/);
});

import { explainSeries } from '../src/core/trends.ts';
const ser = (key: 'dose' | 'end' | 'strength' | 'liking', ys: number[]) => ({ key, points: ys.map((y, i) => ({ n: i + 1, at: i, y, brewId: `b${i}`, note: '' })) });

test('uitleg onder de grafieken: te weinig punten geeft niets; dosis, tijd, sterkte en waardering in gewone taal', () => {
  for (const k of ['dose', 'end', 'strength', 'liking'] as const) { assert.equal(explainSeries(ser(k, [])), null); assert.equal(explainSeries(ser(k, [3])), null); }
  assert.equal(explainSeries(ser('dose', [22, 22.1, 22])), 'Steeds ongeveer 22 g.');
  assert.match(explainSeries(ser('dose', [19, 20, 22]))!, /Van 19 g naar 22 g/);
  // tijd: met genoeg koppen een vergelijking, met weinig alleen de feiten
  assert.equal(explainSeries(ser('end', [250, 240]))!, 'Laatste kop klaar na 4:00, gemiddeld 4:05 over 2 koppen.');
  assert.match(explainSeries(ser('end', [250, 245, 240, 200, 195, 190]))!, /50 seconden sneller/);
  assert.match(explainSeries(ser('end', [200, 205, 200, 203, 201, 202]))!, /ongeveer even lang/);
  assert.match(explainSeries(ser('end', [180, 185, 180, 230, 235, 240]))!, /langzamer/);
  // sterkte: laatste drie koppen
  assert.equal(explainSeries(ser('strength', [-2, -1, 0, 0, 0]))!, 'Je vond de laatste 3 koppen ongeveer goed.');
  assert.match(explainSeries(ser('strength', [0, -1, -1, -2]))!, /te slap \(gemiddeld -1,3\)/);
  assert.match(explainSeries(ser('strength', [0, 1, 2, 1]))!, /te sterk \(gemiddeld \+1,3\)/);
  // waardering: gemiddelde, en alleen een oordeel over 'lekkerder' bij een duidelijk verschil (≥ 0,5)
  assert.equal(explainSeries(ser('liking', [3, 4]))!, 'Gemiddeld 3,5 van 5 over 2 koppen.');
  assert.match(explainSeries(ser('liking', [2, 2, 3, 4, 5, 5]))!, /lekkerder dan de eerdere \(4,67 tegen 2,33\)/);
  assert.match(explainSeries(ser('liking', [5, 5, 4, 3, 2, 2]))!, /minder lekker/);
  assert.match(explainSeries(ser('liking', [4, 4, 4, 4.25, 4, 4]))!, /ongeveer even lekker/);
});
