// NIEUW (Phase 0, stap 0 — vangnet vóór de audit-P0-fixes). De golden fixtures
// (golden-fixtures.test.mjs) leggen de recepten vast voor 'washed', zonder hoogte en
// zonder hardheid. Deze test legt de andere helft van de ontwerpregel vast: proces,
// experimentele fermentatie, hoogteligging en waterhardheid zijn FORBIDDEN edges — ze
// mogen GEEN enkel receptgetal (dosis, ratio, temperatuur, tijd, techniek, schenkschema,
// maalgraad) veranderen. De UI-teksten die dat beloven ("verandert het recept niet")
// leunen op deze test; faalt hij, dan liegt de UI.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './load-app.mjs';

const { api } = loadApp();

function signature(r){
  return JSON.stringify([
    r.dose, r.ratioText, r.temp, r.totalTime, r.technique,
    r.steps.map(s => `${s.t}:${s.add}`),
    r.grindStartingPoint, r.grindStartingRange
  ]);
}

describe('FORBIDDEN edges — proces/hoogte/hardheid veranderen geen receptgetal', () => {
  test('elke methode × profiel × branding × sterkte geeft hetzelfde recept, ongeacht proces/experimenteel/hoogte/hardheid', () => {
    const processes = [null, ...Object.keys(api.PROCESS_INFO)];
    const mismatches = [];
    let checked = 0;
    for (const m of ['v60', 'chemex']){
      for (const p of Object.keys(api.ENGINE_PROFILE_MAP)){
        const only = api.PROFILE_INFO[p].methodOnly;
        if (only && only !== m) continue;
        for (const roast of ['light', 'medium', 'dark']){
          for (const st of [-1, 0, 1]){
            const vol = m === 'v60' ? 300 : 600;
            const base = signature(api.computeRecipe(m, roast, p, vol, 'washed', false, 10, null, false, false, null, st));
            for (const proc of processes){
              for (const exp of [false, true]){
                for (const alt of [null, 800, 2200]){
                  for (const hard of [null, 40, 200]){
                    const r = signature(api.computeRecipe(m, roast, p, vol, proc, exp, 10, alt, false, false, hard, st));
                    checked++;
                    if (r !== base) mismatches.push(`${m}/${p}/${roast}/st=${st} proc=${proc} exp=${exp} alt=${alt} hard=${hard}`);
                  }
                }
              }
            }
          }
        }
      }
    }
    assert.ok(checked > 1000, `sweep te klein (${checked}) — is PROCESS_INFO leeg?`);
    assert.equal(mismatches.length, 0,
      `${mismatches.length} combinatie(s) veranderen een receptgetal via een FORBIDDEN edge:\n  ${mismatches.slice(0, 20).join('\n  ')}`);
  });
});
