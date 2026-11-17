import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { ratioForTdsPct, tdsOf } from '../src/strength.ts';
import { DEFAULT_SCENARIO, WORLDS, rng } from '../eval/simulator.ts';
import { simulate } from '../eval/run.ts';
import { engine3StrengthStrategy, staticStrategy } from '../eval/adapters.ts';

test('massabalans en verhouding zijn elkaars omgekeerde', () => {
  fc.assert(fc.property(fc.double({ min: 0.6, max: 2.2, noNaN: true }), fc.double({ min: 0.16, max: 0.24, noNaN: true }), (t, e) => {
    const ratio = ratioForTdsPct(t, 2.1, e);
    const back = tdsOf(300 / ratio, 300, 2.1, e);
    assert.ok(back !== null && Math.abs(back - t) < 1e-9);
  }));
  assert.equal(tdsOf(200, 300, 2.1, 0.2), null, 'fysiek onmogelijk → null');
});
test('Engine 2 als ijkpunt: 15,8 g op 300 ml is 1,17 % TDS', () => {
  assert.ok(Math.abs(tdsOf(15.8, 300, 2.1, 0.2)! - 1.17) < 0.005);
});
test('de toevalsgenerator is reproduceerbaar', () => {
  const a = rng(42), b = rng(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});
test('meetopstelling: leren verslaat het vaste recept, en dezelfde seed geeft dezelfde uitkomst', async () => {
  const w = WORLDS[0]!;
  const st = await staticStrategy(DEFAULT_SCENARIO.waterG);
  // Engine 2 (oude app) is op 17 nov 2026 uit de meetopstelling gehaald; de lerende strategie is nu Engine 3.
  const e3 = await engine3StrengthStrategy(DEFAULT_SCENARIO.waterG);
  let sGood = 0, eGood = 0;
  for (let i = 0; i < 8; i++) { sGood += simulate(st, DEFAULT_SCENARIO, w, 7 + i).goodShare; eGood += simulate(e3, DEFAULT_SCENARIO, w, 7 + i).goodShare; }
  assert.ok(eGood > sGood, `Engine 3 ${eGood / 8} tegen vast ${sGood / 8}`);
  assert.deepEqual(simulate(e3, DEFAULT_SCENARIO, w, 99), simulate(e3, DEFAULT_SCENARIO, w, 99));
  assert.equal((await staticStrategy(DEFAULT_SCENARIO.waterG)).dose({ beanId: 'x', waterG: 300, cupIndex: 0, at: 0 }), 18.8, 'het vastgelegde basisrecept van de oude app');
});
