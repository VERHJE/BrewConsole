// Expertreview oktober 2026, Sprint C: tempo, voorbereiding, water en één smaakvraag.
// - R-14: giet rustig (4–8 g/s); per giet een giettijd; de timer houdt "Giet tot" zo lang vast.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './load-app.mjs';

const { api } = loadApp();
const j = (x) => JSON.parse(JSON.stringify(x));

describe('R-14: giet-snelheid 4–8 g/s met een giettijd per beurt', () => {
  test('giettijd = water / 8 … water / 4 seconden; een giet met eindmoment toont zijn eigen venster', () => {
    assert.deepEqual(j(api.POUR_RATE_GPS), { min: 4, max: 8, typical: 6 });
    assert.equal(api.pourTimeLabel({ t: 45, add: 60, to: 120 }), '~8–15 s');
    assert.equal(api.pourTimeLabel({ t: 30, add: 145, to: 205 }), '~18–36 s');
    assert.equal(api.pourTimeLabel({ t: 45, endT: 75, add: 240, to: 300 }), 'in 30 s (~8 g/s)');
    assert.equal(api.pourTimeLabel({ t: 0, add: 0, to: 0 }), '');
  });
  test('de timer houdt "Giet tot" vast zolang de giet bij 6 g/s duurt (minstens 5 s)', () => {
    assert.equal(api.pourSecFor({ t: 0, add: 60, to: 60 }), 10);
    assert.equal(api.pourSecFor({ t: 0, add: 20, to: 20 }), 5);
    assert.equal(api.pourSecFor({ t: 30, add: 145, to: 205 }), 24);
    assert.equal(api.pourSecFor({ t: 45, endT: 75, add: 240, to: 300 }), 30);
    const rec = api.computeRecipe('chemex', 'light', 'klassiek', 500, 'washed', false, 10, null, false, false, null, 0);
    const big = rec.steps.find(s => s.add > 100);
    const p = j(api.brewPhaseAt(rec.steps, rec.totalTime, big.t + 20));
    assert.equal(p.kind, 'pour');
    assert.equal(p.targetG, big.to);
    assert.equal(p.pourSec, api.pourSecFor(big));
  });
});
