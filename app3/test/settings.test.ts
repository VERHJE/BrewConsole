import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, plan, ms, g } from '../../engine3/src/index.ts';
import type { Env } from '../src/core/ids.ts';
import { memoryStorage } from '../src/core/storage.ts';
import { createStore } from '../src/core/store.ts';
import { WATER_PRESETS, brightLighterEvent, effectiveWater, grinderEvent, settingsOf, validateWater, verdictOf, waterEvent, SCA_ALKALINITY, SCA_HARDNESS } from '../src/core/settings.ts';

let n = 0;
let clock = Date.UTC(2026, 10, 6);
const env: Env = { now: () => clock, uuid: () => `u${++n}`, device: 'test' };

test('standaard: leeg water, nulpunt niet gecontroleerd, geen helderder-vraag', async () => {
  const store = await createStore(memoryStorage(), createEngine());
  const s = settingsOf(store.snapshot().state);
  assert.equal(s.water.hardnessMgL, null); assert.equal(s.zeroCheckedAt, null); assert.equal(s.brightLighter, false);
});

test('opslaan en terugkrijgen; de laatste wint', async () => {
  const store = await createStore(memoryStorage(), createEngine());
  const dunea = WATER_PRESETS.find(p => p.key === 'dunea')!;
  await store.append([waterEvent(env, dunea.value)]);
  clock = Date.UTC(2026, 10, 7);
  await store.append([waterEvent(env, { ...dunea.value, hardnessMgL: 120 }), grinderEvent(env, Date.UTC(2026, 10, 7)), brightLighterEvent(env, true)]);
  const s = settingsOf(store.snapshot().state);
  assert.equal(s.water.hardnessMgL, 120); assert.equal(s.zeroCheckedAt, Date.UTC(2026, 10, 7)); assert.equal(s.brightLighter, true);
});

test('verdunning en HCO3 → CaCO3 (×0,82): uitkomst zoals in de oude app', () => {
  const e = effectiveWater({ hardnessMgL: 140, alkalinity: { value: 170, unit: 'HCO3' }, dilution: { tapParts: 1, demiParts: 1 } });
  assert.equal(e.hardnessMgL, 70);
  assert.ok(Math.abs(e.alkalinityCaCO3! - 170 * 0.82 / 2) < 1e-9);
  assert.equal(effectiveWater({ hardnessMgL: null, alkalinity: null, dilution: null }).hardnessMgL, null);
  assert.equal(verdictOf(70, SCA_HARDNESS), 'within'); assert.equal(verdictOf(40, SCA_HARDNESS), 'below');
  assert.equal(verdictOf(200, SCA_HARDNESS), 'above'); assert.equal(verdictOf(null, SCA_ALKALINITY), null);
});

test('onmogelijke waarden worden gemeld', () => {
  assert.deepEqual(validateWater({ hardnessMgL: 100, alkalinity: { value: 50, unit: 'CaCO3' }, dilution: null }), {});
  assert.ok(validateWater({ hardnessMgL: -5, alkalinity: null, dilution: null }).hardnessMgL);
  assert.ok(validateWater({ hardnessMgL: null, alkalinity: { value: 9999, unit: 'HCO3' }, dilution: null }).alkalinity);
});

test('water en molen sturen het recept niet: hetzelfde advies met en zonder instellingen', async () => {
  const a = await createStore(memoryStorage(), createEngine());
  const b = await createStore(memoryStorage(), createEngine());
  await b.append([waterEvent(env, WATER_PRESETS[1]!.value), grinderEvent(env, Date.UTC(2026, 10, 6)), brightLighterEvent(env, true)]);
  const req = { at: ms(env.now()), beanId: null, method: 'v60' as const, cupG: g(250), goal: null, technique: null };
  assert.deepEqual(plan(a.snapshot().state, req), plan(b.snapshot().state, req));
});
