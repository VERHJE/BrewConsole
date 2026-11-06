// Bouwt een logboek met een aantal koppen voor één zak, via dezelfde kern als de app. Voor schermtests.
import { createEngine, type EngineEvent } from '../../engine3/src/index.ts';
import type { Env } from '../src/core/ids.ts';
import { memoryStorage } from '../src/core/storage.ts';
import { createStore } from '../src/core/store.ts';
import { DEFAULT_FORM, brewPlanEvent, planBrew } from '../src/core/brew.ts';
import { beanUpsert, editForm, scanText, validateForm } from '../src/core/beans.ts';
import { finishTimer, startTimer } from '../src/core/timer.ts';
import { contextFor, emptyDraft, tastingEvents } from '../src/core/tasting.ts';
import { exportLog } from '../src/core/backup.ts';

export const SEED_BEAN = 'Verloopzak';

export async function seedLog(cups = 8): Promise<{ events: EngineEvent[]; json: string }> {
  let now = Date.UTC(2026, 9, 1, 8);
  let n = 0;
  const env: Env = { now: () => now, uuid: () => `seed${++n}`, device: 'seed' };
  const engine = createEngine();
  const store = await createStore(memoryStorage(), engine);
  const r = validateForm(editForm(scanText(env, 'Notes: jasmine, peach\nProcess: Washed\nRoast: Light'), 'name', SEED_BEAN), env);
  if (!r.ok) throw new Error('zak');
  const bean = beanUpsert(env, null, r);
  await store.append([bean]);
  const strengths = [-2, -1, -1, 0, 0, 1, 0, 0] as const;
  const likings = [2, 3, 3, 4, 4, 3, 5, 5] as const;
  const ends = [250, 235, 228, 215, 210, 205, 200, 198];
  for (let i = 0; i < cups; i++) {
    const form = { ...DEFAULT_FORM, beanId: bean.data.beanId };
    const out = planBrew(engine, store.snapshot().state, env, form);
    if (!out.ok) throw new Error('plan');
    const plan = brewPlanEvent(env, out.advice, form);
    await store.append([plan, ...startTimer(env, plan.data.brewId)]);
    now += 220_000;
    await store.append(finishTimer(env, plan.data.brewId, ends[i % ends.length]!, plan.data.recipe.pours.length - 1));
    const d = emptyDraft(); d.strength = strengths[i % strengths.length]!; d.liking = likings[i % likings.length]!;
    await store.append(tastingEvents(env, contextFor(store.snapshot().state, store.snapshot().events, plan.data.brewId)!, d).events);
    now += 86_400_000;
  }
  const events = [...store.snapshot().events];
  return { events, json: exportLog(events, now) };
}
