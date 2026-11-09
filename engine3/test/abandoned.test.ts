import { test } from 'node:test';
import assert from 'node:assert/strict';
import { learnFacts } from '../src/state.ts';
import { currentClickFor, tailObservationsOf } from '../src/grind.ts';
import { chooseTechnique } from '../src/technique.ts';
import { buildRecipe } from '../src/recipe.ts';
import type { EngineEvent, TechniqueId } from '../src/types.ts';
import type { EpochMs } from '../src/units.ts';

let n = 0;
let clock = 1_790_000_000_000;
const tick = (): EpochMs => (clock += 1000) as EpochMs;
const bean = (beanId: string): EngineEvent => ({ id: `b${n++}`, at: tick(), device: 't', v: 1, kind: 'bean.upsert', data: { beanId, sources: {}, legacy: null, fields: { name: beanId } as never } });

function cup(brewId: string, beanId: string, click: number, how: 'complete' | 'abandon', o: { tech?: TechniqueId; trialId?: string | null } = {}): EngineEvent[] {
  const { recipe } = buildRecipe({ technique: o.tech ?? 'kasuya_46', method: 'v60', doseG: 20, waterG: 300, grindClick: click as never });
  const t = (type: 'start' | 'bed_dry' | 'complete' | 'abandon', tSec: number): EngineEvent => ({ id: `${brewId}:${type}${n++}`, at: tick(), device: 't', v: 1, kind: 'brew.timer', data: { brewId, type, tSec: tSec as never, pourIndex: null } } as EngineEvent);
  const plan: EngineEvent = { id: `${brewId}:p${n++}`, at: tick(), device: 't', v: 1, kind: 'brew.plan', data: { brewId, beanId, goal: null, engine: { name: 't', version: '1' }, recipe, trialId: o.trialId ?? null, legacy: null } };
  return how === 'complete' ? [plan, t('start', 0), t('bed_dry', 250), t('complete', 250)] : [plan, t('start', 0), t('abandon', 10)];
}

test('een afgebroken zetsel staat niet in de feiten van het advies, alleen in `abandoned`', () => {
  const f = learnFacts([bean('z'), ...cup('a', 'z', 16, 'complete'), ...cup('b', 'z', 22, 'abandon')]);
  assert.deepEqual([...f.cups.keys()], ['a']);
  assert.deepEqual(f.cupOrder, ['a']);
  assert.deepEqual([...f.abandoned.keys()], ['b']);
  assert.deepEqual(f.beans.get('z')!.brewIds, ['a']);
});

test('de beginklik komt niet van een afgebroken zetsel, ook niet als dat het laatste was', () => {
  const f = learnFacts([bean('z'), ...cup('a', 'z', 16, 'complete'), ...cup('b', 'z', 22, 'abandon')]);
  assert.equal(currentClickFor(f, 'kasuya_46', 'z', null, 'v60').click, 16);
  const only = learnFacts([bean('z'), ...cup('b', 'z', 22, 'abandon')]);
  assert.equal(currentClickFor(only, 'kasuya_46', 'z', null, 'v60').source, 'default');
  assert.equal(tailObservationsOf(only).length, 0);
});

test('een afgebroken proefkop houdt de volgende proef niet tegen', () => {
  const ev = [bean('z'), ...cup('a1', 'z', 16, 'complete'), ...cup('a2', 'z', 16, 'complete')]
    .map(e => e);
  const base = learnFacts(ev);
  // Geef de twee controlekoppen een proefuitslag zodat er een proef voorgesteld wordt, en een afgebroken proefkop zonder uitslag.
  const withTrialCup = learnFacts([...ev, ...cup('t1', 'z', 16, 'abandon', { tech: 'rao', trialId: 'tech:z:rao:1' })]);
  const req = { beanId: 'z', method: 'v60' as const, cupG: 300, technique: null };
  assert.equal(chooseTechnique(withTrialCup, req).pendingTrialId, chooseTechnique(base, req).pendingTrialId);
  assert.equal(chooseTechnique(withTrialCup, req).pendingTrialId, null);
});
