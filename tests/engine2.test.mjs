// Engine 2 (e2-2026.1): rekenkern, persoonlijke sterkte, beslisregel, tijdmodel en hendeltabel.
// Alleen verzonnen voorbeelddata; zie docs/engine2.md voor de onderbouwing van de constanten.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './load-app.mjs';

const { api } = loadApp();
const ratioOf = (ln) => api.e2RatioForTds(Math.exp(ln));

let seq = 0;
function cup({ dose, water = 300, strength, late = false, bypass = false, method = 'v60', bedDry = null, expected = 210, technique = 'Kasuya 4:6', beanId = 'b1', e2base = null }){
  seq += 1;
  return {
    id: `t_${seq}`, createdAt: 1_790_000_000_000 + seq * 86_400_000, lifecycle: strength ? 'logged' : 'completed', beanId, deletedAt: null,
    plan: { methodId: method, waterMl: water, doseG: dose, technique, expectedDrainEndSec: expected, bypass: bypass ? { pct: 20 } : null,
      inputs: e2base ? { e2: { baseTotalSec: e2base } } : null },
    actual: { doseG: dose, bedDrySec: bedDry },
    tasting: strength ? { strength, late, acidity: 'lively', finish: ['sweet_clean'] } : null
  };
}

describe('Engine 2 · massabalans (Guinard e.a. 2023)', () => {
  test('20 g op 300 g bij EY 20 % en R_abs 2,1 geeft TDS ≈ 1,53 %', () => {
    assert.ok(Math.abs(api.e2Tds(20, 300) - 1.527) < 0.005);
  });
  test('verhouding uit TDS is precies de omgekeerde', () => {
    for (const r of [14, 15.5, 17, 18.5, 21]){
      const t = api.e2Tds(300 / r, 300);
      assert.ok(Math.abs(api.e2RatioForTds(t) - r) < 1e-9, `r=${r}`);
    }
  });
  test('onmogelijke invoer geeft null, geen getal', () => {
    assert.equal(api.e2Tds(0, 300), null);
    assert.equal(api.e2Tds(200, 300), null); // minder water dan het bed vasthoudt
  });
  test('normale verdeling klopt op de bekende punten', () => {
    assert.ok(Math.abs(api.e2Phi(0) - 0.5) < 1e-7);
    assert.ok(Math.abs(api.e2Phi(1.96) - 0.975) < 1e-3);
    assert.ok(Math.abs(api.e2Phi(-1) - 0.1587) < 1e-3);
  });
  test('antwoordkansen tellen per helling op tot 1', () => {
    for (const slope of api.E2_SLOPES){
      const sum = [-2, -1, 0, 1, 2].reduce((a, o) => a + api.e2AnswerProb(o, Math.log(1.3), Math.log(1.2), slope), 0);
      assert.ok(Math.abs(sum - 1) < 1e-6, `helling ${slope}`);
    }
  });
});

describe('Engine 2 · persoonlijke sterkte en beslisregel', () => {
  test('zonder koppen is het doel het recept zelf', () => {
    const dec = api.e2Decide([], Math.log(1.3));
    assert.equal(dec.mode, 'start');
    assert.equal(dec.targetLn, Math.log(1.3));
  });
  test('herhaald "te sterk" bij 1:17,6 schuift het doel lichter, met hooguit een halve stap per kop in het begin', () => {
    const store = [1, 2, 3, 4].map(() => cup({ dose: 17, strength: 'too_strong' }));
    const dec = api.e2Decide(api.e2Observations(store, 2.1), 0);
    assert.ok(dec.trail[0].steps >= -1 && dec.trail[1].steps >= -1, 'de eerste twee koppen: hooguit een halve stap');
    assert.ok(ratioOf(dec.targetLn) > 18.2, `doel 1:${ratioOf(dec.targetLn).toFixed(2)}`);
  });
  test('een te slap en te sterk rond een "goed" houdt het doel ertussen (het voorbeeld uit de back-upanalyse)', () => {
    const store = [
      cup({ dose: 17, strength: 'too_strong' }), cup({ dose: 19.9, water: 350, strength: 'too_strong' }),
      cup({ dose: 18.3, water: 350, strength: 'too_weak' }), cup({ dose: 19.9, water: 350, strength: 'too_strong' }),
      cup({ dose: 16.3, strength: 'just_right', late: true }), cup({ dose: 17, strength: 'just_right', bypass: true }),
      cup({ dose: 17.3, strength: 'just_right' }), cup({ dose: 19.9, water: 350, strength: 'too_strong' })
    ];
    const dec = api.e2Decide(api.e2Observations(store, 2.1), 0);
    const r = ratioOf(dec.targetLn);
    assert.ok(r > 18.0 && r < 19.6, `doel 1:${r.toFixed(2)}`);
    const moves = dec.trail.filter(e => e.steps !== 0).length;
    assert.ok(moves <= 3, `${moves} wijzigingen in 8 koppen`);
  });
  test('één los "te slap" na een reeks "goed" verandert niets (drempel)', () => {
    const store = [1, 2, 3, 4, 5].map(() => cup({ dose: 16.3, strength: 'just_right' })).concat([cup({ dose: 16.3, strength: 'too_weak' })]);
    const dec = api.e2Decide(api.e2Observations(store, 2.1), 0);
    assert.equal(dec.trail[dec.trail.length - 1].steps, 0);
  });
  test('rust na herhaald "goed" op het doel, met de strengere drempel', () => {
    const store = Array.from({ length: 10 }, () => cup({ dose: 16.3, strength: 'just_right' }));
    const dec = api.e2Decide(api.e2Observations(store, 2.1), 0);
    assert.equal(dec.mode, 'rust');
    assert.equal(dec.trail[dec.trail.length - 1].threshold, api.E2_THRESHOLD_REST);
    assert.ok(dec.trail.every(e => e.steps === 0));
  });
  test('"veel te sterk" weegt zwaarder dan "te sterk"', () => {
    const a = api.e2Decide(api.e2Observations([cup({ dose: 17, strength: 'too_strong' })], 2.1), 0);
    const b = api.e2Decide(api.e2Observations([cup({ dose: 17, strength: 'much_too_strong' })], 2.1), 0);
    assert.ok(b.summary.medianLn < a.summary.medianLn);
  });
  test('laat geproefde en bypass-koppen tellen half mee', () => {
    const obs = api.e2Observations([cup({ dose: 17, strength: 'too_strong', late: true }), cup({ dose: 17, strength: 'too_strong', bypass: true }), cup({ dose: 17, strength: 'too_strong' })], 2.1);
    assert.equal(JSON.stringify(obs.map(o => o.weight)), '[0.5,0.5,1]');
  });
  test('verwijderde en niet-geproefde koppen tellen niet', () => {
    const del = cup({ dose: 17, strength: 'too_strong' }); del.deletedAt = Date.now();
    const obs = api.e2Observations([del, cup({ dose: 17 })], 2.1);
    assert.equal(obs.length, 0);
  });
  test('deterministisch: dezelfde geschiedenis geeft hetzelfde doel', () => {
    const store = [cup({ dose: 17, strength: 'too_strong' }), cup({ dose: 16.5, strength: 'just_right' })];
    const a = api.e2Decide(api.e2Observations(store, 2.1), 0);
    const b = api.e2Decide(api.e2Observations(store, 2.1), 0);
    assert.equal(a.targetLn, b.targetLn);
  });
});

describe('Engine 2 · tijdmodel', () => {
  test('minder dan 3 koppen: geen eigen eindtijd', () => {
    const t = api.e2TimeModel([cup({ dose: 17, bedDry: 250 }), cup({ dose: 17, bedDry: 260 })], 'v60', 'Kasuya 4:6');
    assert.equal(t.factor, null);
  });
  test('mediaan van Bed droog tegen het schema, tegen het basisschema van Engine 2-koppen', () => {
    const store = [250, 255, 260].map(s => cup({ dose: 17, bedDry: s })).concat([cup({ dose: 17, bedDry: 262, expected: 260, e2base: 210 })]);
    const t = api.e2TimeModel(store, 'v60', 'Kasuya 4:6');
    assert.equal(t.n, 4);
    assert.ok(Math.abs(t.factor - (257.5 / 210)) < 1e-9, String(t.factor));
  });
  test('bypass-koppen en andere technieken tellen niet', () => {
    const store = [cup({ dose: 17, bedDry: 250, bypass: true }), cup({ dose: 17, bedDry: 250, technique: 'Rao' }), cup({ dose: 17, bedDry: 250, method: 'chemex' })];
    assert.equal(api.e2TimeModel(store, 'v60', 'Kasuya 4:6').n, 0);
  });
  test('onwaarschijnlijke factor wordt niet gebruikt', () => {
    const store = [600, 610, 620].map(s => cup({ dose: 17, bedDry: s }));
    assert.equal(api.e2TimeModel(store, 'v60', 'Kasuya 4:6').factor, null);
  });
});

describe('Engine 2 · recept', () => {
  const args = ['v60', 'medium', 'klassiek', 300, 'washed', false, 10, null, false, false, null, 0, 30];
  test('zonder Engine 2-argument is het recept onveranderd (gouden recepten blijven gelden)', () => {
    const a = api.computeRecipe(...args);
    const b = api.computeRecipe(...args, null);
    assert.equal(a.dose, b.dose);
    assert.equal(a.ratioText, b.ratioText);
    assert.equal(b.engine2, null);
  });
  test('Engine 2 zet de dosis en houdt het water', () => {
    const r = api.computeRecipe(...args, { doseG: 16.2, version: api.ENGINE2_VERSION });
    assert.equal(r.dose, 16.2);
    assert.equal(r.water, 300);
    assert.equal(r.ratioText, '1:18,5');
    assert.equal(r.engine2.clamped, false);
  });
  test('binnen de dosisgrens van de V60 (15–22 g), en dat wordt gemeld', () => {
    const r = api.computeRecipe(...args, { doseG: 12 });
    assert.equal(r.dose, 15);
    assert.equal(r.engine2.clamped, true);
    assert.equal(r.doseEdge.side, 'min');
  });
  test('handmatige sterkte werkt bovenop Engine 2', () => {
    const r = api.computeRecipe('v60', 'medium', 'klassiek', 300, 'washed', false, 10, null, false, false, null, -0.5, 30, { doseG: 17 });
    assert.equal(r.dose, 16.3);
  });
  test('eigen verwachte eindtijd na de laatste giet; giet-momenten blijven staan', () => {
    const base = api.computeRecipe(...args);
    const r = api.computeRecipe(...args, { doseG: base.dose, totalTimeSec: 260 });
    assert.equal(r.totalTime, 260);
    assert.equal(r.steps[r.steps.length - 1].t, 260);
    assert.equal(JSON.stringify(r.steps.slice(0, -1)), JSON.stringify(base.steps.slice(0, -1)));
    assert.equal(r.engine2.baseTotalSec, base.totalTime);
  });
  test('een eindtijd vóór de laatste giet wordt genegeerd', () => {
    const base = api.computeRecipe(...args);
    const r = api.computeRecipe(...args, { doseG: base.dose, totalTimeSec: 60 });
    assert.equal(r.totalTime, base.totalTime);
  });
  test('plan: zonder koppen dezelfde dosis als de oude engine', () => {
    const base = api.computeRecipe(...args);
    const plan = api.engine2PlanFor(base, 'v60', []);
    assert.equal(plan.n, 0);
    assert.ok(Math.abs(plan.doseG - base.dose) <= 0.1, `${plan.doseG} tegen ${base.dose}`);
  });
  test('plan: met koppen de persoonlijke sterkte en de eigen eindtijd', () => {
    const store = [1, 2, 3, 4].map(() => cup({ dose: 18.8, strength: 'too_strong', bedDry: 255, technique: 'Kasuya 4:6' }));
    const base = api.computeRecipe(...args);
    const plan = api.engine2PlanFor(base, 'v60', store);
    assert.ok(plan.doseG < base.dose);
    assert.equal(plan.totalTimeSec, Math.round(base.totalTime * (255 / 210) / 5) * 5);
    const inp = api.e2InputsOf(plan);
    assert.equal(inp.version, api.ENGINE2_VERSION);
    assert.equal(inp.baseTotalSec, base.totalTime);
  });
});

describe('Engine 2 · hendeltabel', () => {
  test('scherp zuur bij goede sterkte: fijner én iets minder koffie, berekend', () => {
    const tips = api.e2TipsFor({ strength: 'just_right', acidity: 'sharp', finish: [] }, { doseG: 18, waterG: 300, rAbs: 2.1 });
    const t = tips.find(x => x.key === 'sharp');
    assert.ok(t && /fijner en 0,\d g minder koffie/.test(t.text), t && t.text);
  });
  test('bitter en zoetheid gemist: sterkte, niet maling', () => {
    const tips = api.e2TipsFor({ strength: 'just_right', acidity: 'lively', finish: ['bitter'], missed: 'sweet' }, {});
    assert.ok(tips.some(x => x.key === 'bitter' && /−4 %/.test(x.text)));
    assert.ok(tips.some(x => x.key === 'sweet' && /−4 %/.test(x.text)));
    assert.ok(!tips.some(x => /suiker/i.test(x.text)));
  });
  test('droog/wrang is een controle, geen receptstap', () => {
    const tips = api.e2TipsFor({ strength: 'too_strong', finish: ['drying'] }, {});
    assert.equal(JSON.stringify(tips.map(x => x.kind)), '["controle"]');
  });
  test('bij een sterkteklacht geen extra smaaktip: dat regelt de sterkte zelf', () => {
    const tips = api.e2TipsFor({ strength: 'too_weak', acidity: 'sharp', finish: ['bitter'] }, {});
    assert.equal(tips.length, 0);
  });
});

describe('Engine 2 · schakelaar en oude stappen', () => {
  test('standaard aan; uit te zetten', () => {
    assert.equal(api.engine2On(), true);
    api.setEngine2(false);
    assert.equal(api.engine2On(), false);
    api.setEngine2(true);
    assert.equal(api.engine2On(), true);
  });
  test('een klaargezette dosisstap van de oude engine geldt niet onder Engine 2, een maalstap wel', () => {
    assert.equal(api.effectivePendingAdjust({ pendingAdjust: { lever: 'dose', delta: -1 } }), null);
    assert.equal(api.effectivePendingAdjust({ pendingAdjust: { lever: 'grind', delta: 1 } }).lever, 'grind');
    api.setEngine2(false);
    assert.equal(api.effectivePendingAdjust({ pendingAdjust: { lever: 'dose', delta: -1 } }).lever, 'dose');
    api.setEngine2(true);
  });
});
