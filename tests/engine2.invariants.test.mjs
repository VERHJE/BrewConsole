// Engine 2 · invarianten-sweep (ontwerp §4.6, e2-2026.5): eigenschappen die voor élke invoer
// moeten gelden, niet alleen voor de voorbeelden in engine2.test.mjs. Verzonnen data met een vaste
// pseudo-random reeks, zodat een fout altijd reproduceerbaar is.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './load-app.mjs';

const { api } = loadApp();

function rng(seed){
  let x = seed;
  return () => (x = (x * 16807) % 2147483647) / 2147483647;
}
const ANSWERS = ['much_too_weak', 'too_weak', 'just_right', 'too_strong', 'much_too_strong'];
function history(seed, n){
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const dose = 14 + r() * 7;
    return {
      id: `h${seed}_${i}`, createdAt: 1_790_000_000_000 + i * 86_400_000, lifecycle: 'logged', beanId: 'b' + Math.floor(r() * 3), deletedAt: null,
      plan: { methodId: 'v60', waterMl: 250 + 50 * Math.floor(r() * 3), doseG: dose, technique: 'Kasuya 4:6', expectedDrainEndSec: 210, bypass: null, inputs: null },
      actual: { doseG: dose, bedDrySec: 220 + Math.round(r() * 60), grindClick: 14 + Math.floor(r() * 4) },
      tasting: { strength: ANSWERS[Math.floor(r() * ANSWERS.length)], late: r() < 0.15, acidity: 'lively', finish: [] }
    };
  });
}
const json = (x) => JSON.stringify(x);
const base = (profile = 'klassiek', water = 300, method = 'v60') =>
  api.computeRecipe(method, 'medium', profile, water, 'washed', false, 10, null, false, false, null, 0, 30);

describe('Engine 2 · invarianten: de beslisregel', () => {
  test('stapsgewijs (met geheugen) is exact gelijk aan alles opnieuw afspelen, ook na het wijzigen van de laatste kop', () => {
    for (const seed of [1, 7, 42, 99]){
      const store = history(seed, 40);
      const obsOf = (st) => api.e2Observations(st, 2.1);
      for (let n = 1; n <= store.length; n++){
        const obs = obsOf(store.slice(0, n));
        assert.equal(json(api.e2Decide(obs, 0)), json(api.e2DecideFrom(obs, null).end.value), `seed ${seed}, n ${n}`);
      }
      const edited = store.map(r => ({ ...r, tasting: { ...r.tasting } }));
      edited[edited.length - 1].tasting.strength = edited[edited.length - 1].tasting.strength === 'too_strong' ? 'too_weak' : 'too_strong';
      const obs = obsOf(edited);
      assert.equal(json(api.e2Decide(obs, 0)), json(api.e2DecideFrom(obs, null).end.value), `seed ${seed}, gewijzigd`);
    }
  });
  test('een extra "te sterk" maakt je recept nooit sterker, een extra "te slap" nooit lichter', () => {
    for (let seed = 1; seed <= 60; seed++){
      for (const n of [1, 2, 4, 12, 30]){
        const store = history(seed, n);
        const before = api.e2Decide(api.e2Observations(store, 2.1), 0).targetLn;
        const last = store[store.length - 1];
        const add = (strength) => store.concat([{ ...last, id: 'extra', createdAt: last.createdAt + 86_400_000, tasting: { ...last.tasting, strength, late: false } }]);
        for (const s of ['too_strong', 'much_too_strong']){
          const after = api.e2Decide(api.e2Observations(add(s), 2.1), 0).targetLn;
          assert.ok(after <= before + 1e-12, `seed ${seed}, n ${n}: ${s} → sterker`);
        }
        for (const s of ['too_weak', 'much_too_weak']){
          const after = api.e2Decide(api.e2Observations(add(s), 2.1), 0).targetLn;
          assert.ok(after >= before - 1e-12, `seed ${seed}, n ${n}: ${s} → lichter`);
        }
      }
    }
  });
  test('een blind paar: wint de lichtere kop, dan nooit een stap sterker (en omgekeerd)', () => {
    for (let seed = 1; seed <= 30; seed++){
      const store = history(seed, 8);
      const obs = api.e2Observations(store, 2.1);
      const before = api.e2Decide(obs, 0).targetLn;
      const at = obs[obs.length - 1].at + 1000;
      for (const [variantDose, preferred] of [[15.5, 'variant'], [18.5, 'control'], [18.5, 'variant'], [15.5, 'control']]){
        const t = [{ id: 'p', createdAt: at, controlDose: 17, variantDose, waterMl: 300, method: 'v60', preferred }];
        const after = api.e2Decide(api.e2AllObservations(store, t, 2.1), 0).targetLn;
        const lighterWon = (variantDose < 17) === (preferred === 'variant');
        if (lighterWon) assert.ok(after <= before + 1e-12, `seed ${seed}: lichtere kop won, toch sterker`);
        else assert.ok(after >= before - 1e-12, `seed ${seed}: sterkere kop won, toch lichter`);
      }
    }
  });
  test('per kop hooguit 2 halve stappen (1 in de eerste twee), en het doel blijft binnen het rooster', () => {
    for (const seed of [5, 13, 31]){
      const dec = api.e2Decide(api.e2Observations(history(seed, 60), 2.1), 0);
      dec.trail.forEach((e, i) => assert.ok(Math.abs(e.steps) <= (i < 2 ? 1 : 2), `kop ${i}: ${e.steps}`));
      const g = api.E2_GRID;
      assert.ok(dec.targetLn >= g[0] - 1e-9 && dec.targetLn <= g[g.length - 1] + 1e-9);
    }
  });
  test('de volgorde in de opslag maakt niet uit (Engine 2 sorteert op tijd)', () => {
    const store = history(17, 25);
    const a = api.engine2PlanFor(base(), 'v60', store, {});
    const b = api.engine2PlanFor(base(), 'v60', store.slice().reverse(), {});
    assert.equal(a.doseG, b.doseG);
    assert.equal(a.targetTds, b.targetTds);
  });
});

describe('Engine 2 · invarianten: het recept', () => {
  test('de dosis blijft binnen de grens van de brewer, voor elke gewenste dosis en hoeveelheid', () => {
    for (const method of ['v60', 'chemex']){
      for (const water of [250, 300, 350, 400, 500]){
        if (!(base('klassiek', water, method).dose > 0)) continue; // past niet in deze brewer: geen recept
        const lo = api.computeRecipe(method, 'medium', 'klassiek', water, 'washed', false, 10, null, false, false, null, 0, 30, { doseG: 1, targetTds: 1.2 }).dose;
        const hi = api.computeRecipe(method, 'medium', 'klassiek', water, 'washed', false, 10, null, false, false, null, 0, 30, { doseG: 999, targetTds: 1.2 }).dose;
        assert.ok(lo < hi, `${method} ${water}: grens ${lo}–${hi}`);
        for (let d = 8; d <= 45; d += 0.7){
          const rec = api.computeRecipe(method, 'medium', 'klassiek', water, 'washed', false, 10, null, false, false, null, 0, 30, { doseG: d, targetTds: 1.2 });
          assert.ok(rec.dose >= lo - 1e-9 && rec.dose <= hi + 1e-9, `${method} ${water} ml, ${d} g → ${rec.dose}`);
          if (d > lo + 0.1 && d < hi - 0.1) assert.ok(Math.abs(rec.dose - d) <= 0.1, `${method} ${water} ml: ${d} g binnen de grens wordt ${rec.dose}`);
        }
      }
    }
  });
  test('aanvullen onder de dosisgrens geeft (op 5 g na) de doel-TDS', () => {
    for (const target of [0.8, 0.9, 1.0, 1.1]){
      for (const water of [250, 300]){
        const rec = api.computeRecipe('v60', 'medium', 'klassiek', water, 'washed', false, 10, null, false, false, null, 0, 30, { doseG: 5, targetTds: target, rAbs: 2.1, ey: 0.2 });
        const e = rec.engine2;
        if (!e.dilutionG) continue;
        const mb = water - 2.1 * rec.dose + 0.2 * rec.dose;
        const tdsAfter = api.e2Tds(rec.dose, water, 2.1, 0.2) * mb / (mb + e.dilutionG);
        const tolerance = api.e2Tds(rec.dose, water, 2.1, 0.2) * mb * (1 / (mb + e.dilutionG - 2.5) - 1 / (mb + e.dilutionG + 2.5));
        assert.ok(Math.abs(tdsAfter - target) <= tolerance + 1e-9, `${target} % bij ${water} ml: ${tdsAfter.toFixed(3)}`);
      }
    }
  });
  test('het verwachte einde laat na de laatste giet altijd minstens 15 s over', () => {
    for (const f of [0.5, 0.7, 0.9, 1.0, 1.3, 1.6]){
      const b = base();
      const rec = api.computeRecipe('v60', 'medium', 'klassiek', 300, 'washed', false, 10, null, false, false, null, 0, 30, { doseG: b.dose, targetTds: 1.3, totalTimeSec: Math.round(b.totalTime * f) });
      const pours = rec.steps.filter(s => s.add > 0);
      const lastPour = pours[pours.length - 1].t;
      assert.ok(rec.totalTime >= lastPour + 15, `factor ${f}: einde ${rec.totalTime}, laatste giet ${lastPour}`);
    }
  });
  test('met geproefde koppen hangt je sterkte niet af van smaakkeuze, branding of water (alleen van jou)', () => {
    const store = history(29, 15);
    const doses = new Set();
    for (const profile of ['klassiek', 'zoet', 'heel_fruitig', 'robuust']){
      for (const roast of ['light', 'medium', 'dark']){
        const b = api.computeRecipe('v60', roast, profile, 300, 'natural', false, 20, 1500, false, false, 200, 0, 30);
        doses.add(api.engine2PlanFor(b, 'v60', store, {}).doseG);
      }
    }
    assert.equal(doses.size, 1, [...doses].join(', '));
  });
  test('de verhouding is onafhankelijk van de hoeveelheid water', () => {
    const store = history(37, 12);
    const ratios = [250, 300, 350, 400].map(w => { const p = api.engine2PlanFor(base('klassiek', w), 'v60', store, {}); return p.ratio; });
    ratios.forEach(r => assert.ok(Math.abs(r - ratios[0]) < 1e-9));
  });
  test('de afwijking per zak blijft binnen twee halve stappen', () => {
    for (const seed of [2, 19, 44]){
      const store = history(seed, 40);
      const obs = api.e2Observations(store, 2.1);
      const dec = api.e2Decide(obs, 0);
      for (const b of ['b0', 'b1', 'b2']){
        const o = api.e2BeanOffset(obs, b, dec.targetLn, dec.summary.slopeMean);
        assert.ok(Math.abs(o.offsetLn) <= 2 * api.E2_HALF_STEP + 1e-9, `${b}: ${o.offsetLn}`);
      }
    }
  });
});
