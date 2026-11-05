import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { massBalanceTds, ratioForTds, ey, g, tdsPct } from '../src/units.ts';
import { DEFAULT_SCENARIO, WORLDS, rng } from '../eval/simulator.ts';
import { simulate } from '../eval/run.ts';
import { engine2Strategy, staticStrategy } from '../eval/adapters.ts';

test('massabalans en verhouding zijn elkaars omgekeerde', () => {
  fc.assert(fc.property(fc.double({ min: 0.6, max: 2.2, noNaN: true }), fc.double({ min: 0.16, max: 0.24, noNaN: true }), (t, e) => {
    const ratio = ratioForTds(tdsPct(t), 2.1, ey(e));
    const back = massBalanceTds(g(300 / ratio), g(300), 2.1, ey(e));
    assert.ok(back !== null && Math.abs(back - t) < 1e-9);
  }));
  assert.equal(massBalanceTds(g(200), g(300), 2.1, ey(0.2)), null, 'fysiek onmogelijk → null');
});
test('Engine 2 als ijkpunt: 15,8 g op 300 ml is 1,17 % TDS', () => {
  assert.ok(Math.abs(massBalanceTds(g(15.8), g(300), 2.1, ey(0.2))! - 1.17) < 0.005);
});
test('de toevalsgenerator is reproduceerbaar', () => {
  const a = rng(42), b = rng(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});
test('meetopstelling: leren verslaat het vaste recept, en dezelfde seed geeft dezelfde uitkomst', async () => {
  const w = WORLDS[0]!;
  const st = await staticStrategy(DEFAULT_SCENARIO.waterG);
  const e2 = await engine2Strategy(DEFAULT_SCENARIO.waterG);
  let sGood = 0, eGood = 0;
  for (let i = 0; i < 8; i++) { sGood += simulate(st, DEFAULT_SCENARIO, w, 7 + i).goodShare; eGood += simulate(e2, DEFAULT_SCENARIO, w, 7 + i).goodShare; }
  assert.ok(eGood > sGood, `Engine 2 ${eGood / 8} tegen vast ${sGood / 8}`);
  assert.deepEqual(simulate(e2, DEFAULT_SCENARIO, w, 99), simulate(e2, DEFAULT_SCENARIO, w, 99));
});
