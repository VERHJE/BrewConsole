// Engine 2 (e2-2026.1–.3): rekenkern, persoonlijke sterkte, beslisregel, tijdmodel, hendeltabel, metingen.
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

describe('Engine 2 · e2-2026.2: blinde paren', () => {
  const pair = (i, cDose, vDose, preferred, extra = {}) => ({ id: `p_${i}`, createdAt: 1_790_000_000_000 + i * 3_600_000, method: 'v60', waterMl: 300,
    controlDose: cDose, variantDose: vDose, preferred, ...extra });
  test('uitkomstkansen tellen op tot 1 en volgen het doel', () => {
    const a = Math.log(api.e2Tds(18, 300)), b = Math.log(api.e2Tds(16, 300));
    const sum = ['A', 'B', 'none'].reduce((s, o) => s + api.e2PairProb(o, a, b, a), 0);
    assert.ok(Math.abs(sum - 1) < 1e-9);
    assert.ok(api.e2PairProb('A', a, b, a) > api.e2PairProb('B', a, b, a), 'doel op kop A: A wint vaker');
    assert.ok(api.e2PairProb('B', a, b, b) > api.e2PairProb('A', a, b, b), 'doel op kop B: B wint vaker');
  });
  test('te sterk kost meer dan te slap (asymmetrie)', () => {
    const g = 0;
    assert.ok(api.e2Utility(0.1, g) < api.e2Utility(-0.1, g));
  });
  test('paren uit de A/B-opslag worden waarnemingen, ook de oudere "helder"-proeven', () => {
    const obs = api.e2PairObservations([pair(1, 18, 17.3, 'variant', { variantStep: -0.5 }), pair(2, 18, 20.7, 'control', { kind: 'e2' }), pair(3, 18, 18, 'control'), { id: 'x', preferred: null }], 2.1);
    assert.equal(obs.length, 2, 'gelijke doses en onbeantwoorde proeven tellen niet');
    assert.equal(JSON.stringify(obs.map(o => o.outcome)), '["B","A"]');
  });
  test('herhaald de lichtere kop gekozen → het doel schuift lichter', () => {
    const trials = [1, 2, 3, 4].map(i => pair(i, 18.8, 16.3, 'variant'));
    const dec = api.e2Decide(api.e2AllObservations([], trials, 2.1), 0);
    assert.ok(ratioOf(dec.targetLn) > 17.0, `doel 1:${ratioOf(dec.targetLn).toFixed(2)}`);
  });
  test('herhaald het eigen recept gekozen, tegen lichter én sterker → de schatting ligt op dat recept', () => {
    const trials = Array.from({ length: 8 }, (_, i) => pair(i + 1, 17, i % 2 ? 15.5 : 18.6, 'control'));
    const dec = api.e2Decide(api.e2AllObservations([], trials, 2.1), 0);
    const a = Math.log(api.e2Tds(17, 300));
    assert.ok(Math.abs(dec.summary.medianLn - a) < api.E2_HALF_STEP / 2, 'mediaan op kop A');
    assert.ok(Math.abs(dec.targetLn - a) <= api.E2_HALF_STEP + 1e-9, 'doel binnen een halve stap (de rustzone)');
    assert.ok(dec.trail.filter(e => e.steps !== 0).length <= 1, 'hooguit één verschuiving');
  });
  test('rust alleen als doel en schatting overeenkomen', () => {
    const trials = Array.from({ length: 8 }, (_, i) => pair(i + 1, 17, i % 2 ? 15.5 : 18.6, 'control'));
    const dec = api.e2Decide(api.e2AllObservations([], trials, 2.1), 0);
    if (dec.mode === 'rust') assert.ok(Math.abs(dec.summary.medianLn - dec.targetLn) < api.E2_HALF_STEP / 2);
  });
  test('paren en sterkte-antwoorden lopen samen, op tijd gesorteerd', () => {
    const all = api.e2AllObservations([cup({ dose: 17, strength: 'too_strong' })], [pair(0, 18, 17, 'variant')], 2.1);
    assert.equal(JSON.stringify(all.map(o => o.type)), '["pair","jar"]');
  });
});

describe('Engine 2 · e2-2026.2: afwijking per zak', () => {
  test('pas vanaf 3 koppen van die zak', () => {
    const store = [cup({ dose: 17, strength: 'too_strong', beanId: 'z' }), cup({ dose: 17, strength: 'too_strong', beanId: 'z' })];
    const obs = api.e2Observations(store, 2.1);
    assert.equal(api.e2BeanOffset(obs, 'z', Math.log(api.e2Tds(17, 300)), 5).applies, false);
  });
  test('een zak die consequent "te sterk" is op je doel → iets lichter voor die zak', () => {
    const g = Math.log(api.e2Tds(17, 300));
    const store = [1, 2, 3, 4, 5].map(() => cup({ dose: 17, strength: 'too_strong', beanId: 'z' }));
    const off = api.e2BeanOffset(api.e2Observations(store, 2.1), 'z', g, 8);
    assert.equal(off.applies, true);
    assert.ok(off.offsetLn < 0);
  });
  test('gemengde antwoorden → geen afwijking (terughoudend)', () => {
    const g = Math.log(api.e2Tds(17, 300));
    const store = ['too_strong', 'just_right', 'too_weak', 'just_right'].map(s => cup({ dose: 17, strength: s, beanId: 'z' }));
    assert.equal(api.e2BeanOffset(api.e2Observations(store, 2.1), 'z', g, 5).applies, false);
  });
});

describe('Engine 2 · e2-2026.2: kalibratiepaar', () => {
  test('alleen bij genoeg onzekerheid en minstens 2 koppen', () => {
    assert.equal(api.e2CalibrationFor({ sdLn: 0.2, p: api.E2_GRID.map(() => 1 / api.E2_GRID.length) }, Math.log(1.3), 1), null);
    assert.equal(api.e2CalibrationFor({ sdLn: 0.05, p: api.E2_GRID.map(() => 1 / api.E2_GRID.length) }, Math.log(1.3), 5), null);
    const c = api.e2CalibrationFor({ sdLn: 0.15, p: api.E2_GRID.map(() => 1 / api.E2_GRID.length) }, Math.log(1.3), 3);
    assert.ok(c && c.pct === 15);
  });
  test('het plan geeft de dosis van kop B', () => {
    const store = [cup({ dose: 18.8, strength: 'too_strong' }), cup({ dose: 17.5, strength: 'too_weak' })];
    const base = api.computeRecipe('v60', 'medium', 'klassiek', 300, 'washed', false, 10, null, false, false, null, 0, 30);
    const plan = api.engine2PlanFor(base, 'v60', store, { trials: [] });
    if (plan.calibration){
      assert.ok(plan.calibration.variantDoseG > 0 && Math.abs(plan.calibration.variantDoseG - plan.doseG) > 0.5);
    } else {
      assert.ok(plan.sdLn <= api.E2_CAL_SD);
    }
  });
});

describe('Engine 2 · e2-2026.2: lichter dan de dosisgrens', () => {
  const args = ['v60', 'medium', 'klassiek', 300, 'washed', false, 10, null, false, false, null, 0, 30];
  test('op de grens zetten en aanvullen tot je sterkte', () => {
    const r = api.computeRecipe(...args, { doseG: 13, targetTds: 1.0, rAbs: 2.1 });
    assert.equal(r.dose, 15);
    assert.ok(r.engine2.dilutionG >= 10, String(r.engine2.dilutionG));
    // narekenen: na aanvullen ligt de kop op ±1,0 %
    const mb = 300 - 2.1 * 15 + 0.2 * 15;
    const tNow = api.e2Tds(15, 300);
    const after = tNow * mb / (mb + r.engine2.dilutionG);
    assert.ok(Math.abs(after - 1.0) < 0.03, after.toFixed(3));
  });
  test('niet bij bypass en niet als de dosis binnen de grens past', () => {
    assert.equal(api.computeRecipe(...args, { doseG: 17, targetTds: 1.3, rAbs: 2.1 }).engine2.dilutionG, 0);
    const bp = api.computeRecipe('v60', 'medium', 'klassiek', 300, 'washed', false, 10, null, true, false, null, 0, 30, { doseG: 13, targetTds: 1.0 });
    assert.equal(bp.engine2.dilutionG, 0);
  });
  test('een aangevulde kop telt lichter mee', () => {
    const plain = cup({ dose: 15, strength: 'just_right' });
    const diluted = cup({ dose: 15, strength: 'just_right' });
    diluted.plan.inputs = { e2: { dilutionG: 60 } };
    const [a, b] = api.e2Observations([plain, diluted], 2.1);
    assert.ok(b.tds < a.tds);
  });
});

describe('Engine 2 · e2-2026.2: maling en doorloop', () => {
  test('te weinig standen → onbekend', () => {
    const pts = [1, 2, 3, 4, 5, 6].map(i => ({ ratio: 1.2, click: 16 }));
    assert.equal(api.e2GrindEffect(pts).perClick, null);
  });
  test('grover malen → kortere doorloop wordt herkend', () => {
    const pts = [];
    for (const c of [15, 16, 17]) for (let i = 0; i < 3; i++) pts.push({ ratio: Math.exp(0.2 - 0.06 * (c - 15)) * (1 + 0.01 * (i - 1)), click: c });
    const g = api.e2GrindEffect(pts);
    assert.ok(g.perClick != null && g.perClick < 0, JSON.stringify(g));
  });
  test('het plan zegt hoeveel klikken naar de schematijd', () => {
    const store = [];
    for (const c of [15, 16, 17]) for (let i = 0; i < 3; i++){
      const r = cup({ dose: 18.8, bedDry: Math.round(210 * Math.exp(0.35 - 0.07 * (c - 15)) + (i - 1)) });
      r.actual.grindClick = c;
      store.push(r);
    }
    const base = api.computeRecipe('v60', 'medium', 'klassiek', 300, 'washed', false, 10, null, false, false, null, 0, 30);
    const plan = api.engine2PlanFor(base, 'v60', store, {});
    assert.ok(plan.time.grind.perClick < 0);
    assert.ok(plan.grindToSchedule && plan.grindToSchedule.clicks > 0, JSON.stringify(plan.grindToSchedule));
  });
});

describe('Engine 2 · e2-2026.3: gemeten TDS en extractie', () => {
  const measured = (o) => {
    const r = cup({ dose: o.dose || 17, water: o.water || 300, strength: o.strength || 'just_right', method: o.method || 'v60' });
    r.actual.tdsPct = o.tds;
    if (o.cup != null) r.actual.cupWeightG = o.cup;
    if (o.click != null) r.actual.grindClick = o.click;
    return r;
  };
  test('alleen een plausibele meting telt', () => {
    assert.equal(api.e2MeasuredTds(measured({ tds: 1.42 })), 1.42);
    assert.equal(api.e2MeasuredTds(measured({ tds: 0.2 })), null);
    assert.equal(api.e2MeasuredTds(measured({ tds: 14 })), null, 'tikfout (Brix of zonder komma)');
    assert.equal(api.e2MeasuredTds(cup({ dose: 17, strength: 'just_right' })), null);
  });
  test('een gemeten kop telt met de gemeten TDS, niet met de berekende', () => {
    const [o] = api.e2Observations([measured({ tds: 1.5 })], 2.1);
    assert.equal(o.tds, 1.5);
    assert.equal(o.measured, true);
    const [p] = api.e2Observations([cup({ dose: 17, strength: 'just_right' })], 2.1);
    assert.equal(p.measured, false);
    assert.ok(Math.abs(p.tds - api.e2Tds(17, 300)) < 1e-12);
  });
  test('extractie met kopgewicht is exact: TDS · kop / dosis', () => {
    const store = [1, 2, 3].map(() => measured({ tds: 1.4, cup: 255, dose: 17 }));
    const m = api.e2EyModel(store, 'v60', 2.1);
    assert.equal(m.n, 3);
    assert.ok(Math.abs(m.eyMean - 0.014 * 255 / 17) < 1e-9);
    assert.ok(Math.abs(api.e2EyFor(store, 'v60', 2.1) - 0.21) < 1e-9);
  });
  test('onder 3 metingen rekent Engine 2 met de nominale 20 %', () => {
    const store = [1, 2].map(() => measured({ tds: 1.4, cup: 255 }));
    assert.equal(api.e2EyFor(store, 'v60', 2.1), api.E2_EY_NOMINAL);
    assert.equal(api.e2EyModel(store, 'chemex', 2.1).n, 0, 'per brewer');
  });
  test('wat één klik met de extractie doet, vanaf twee standen met elk twee metingen', () => {
    const store = [
      measured({ tds: 1.47, cup: 255, click: 14 }), measured({ tds: 1.48, cup: 255, click: 14 }),
      measured({ tds: 1.33, cup: 255, click: 16 }), measured({ tds: 1.34, cup: 255, click: 16 })
    ];
    const m = api.e2EyModel(store, 'v60', 2.1);
    assert.ok(m.perClick != null && m.perClick < 0, JSON.stringify(m));
    assert.ok(Math.abs(m.perClick + 0.0105) < 0.002, String(m.perClick));
  });
  test('een andere extractie verschuift de TDS, niet de dosis die je sterkte geeft', () => {
    const store = [cup({ dose: 17, strength: 'too_strong' }), cup({ dose: 17, strength: 'too_strong' }), cup({ dose: 16.3, strength: 'just_right' }), cup({ dose: 16.3, strength: 'just_right' })];
    const r20 = api.e2Decide(api.e2Observations(store, 2.1, 0.20), 0);
    const r22 = api.e2Decide(api.e2Observations(store, 2.1, 0.22), 0);
    const a = api.e2RatioForTds(Math.exp(r20.targetLn), 2.1, 0.20);
    const b = api.e2RatioForTds(Math.exp(r22.targetLn), 2.1, 0.22);
    assert.ok(Math.abs(a - b) < 0.1, `1:${a.toFixed(2)} tegen 1:${b.toFixed(2)}`);
  });
});

describe('Engine 2 · e2-2026.3: tips als proef en de meetlat', () => {
  test('scherp zuur: met een gemeten extractie per klik wordt de dosiscorrectie groter of kleiner', () => {
    const t = { strength: 'just_right', acidity: 'sharp', finish: [] };
    const grams = (tips) => Number((tips.find(x => x.key === 'sharp').text.match(/(\d+,\d) g minder/) || [0, '0'])[1].replace(',', '.'));
    const base = api.e2TipsFor(t, { doseG: 17, waterG: 300, rAbs: 2.1 });
    const strong = api.e2TipsFor(t, { doseG: 17, waterG: 300, rAbs: 2.1, ey: 0.20, eyPerClick: -0.02 });
    assert.ok(grams(strong) > grams(base), `${grams(strong)} tegen ${grams(base)}`);
    assert.match(strong.find(x => x.key === 'sharp').text, /Volgens je eigen metingen/);
    assert.deepEqual(JSON.parse(JSON.stringify(strong.find(x => x.key === 'sharp').trial)), { strength: -0.5, grind: -1 });
  });
  test('elke proeftip heeft een klaarzetbare proef; controles niet', () => {
    const tips = api.e2TipsFor({ strength: 'just_right', acidity: 'sharp', finish: ['bitter', 'dry'], missed: 'body' }, { doseG: 17, waterG: 300 });
    tips.forEach(x => assert.equal(!!x.trial, x.kind === 'proef', x.key));
  });
  test('een proef uit een tip onthoudt de maalstand van de kop', () => {
    const r = cup({ dose: 17, strength: 'just_right' });
    r.actual.grindClick = 15;
    const trial = api.e2TrialFromTip(r, { key: 'sharp', trial: { strength: -0.5, grind: -1 } }, 123);
    assert.equal(trial.id, 'e2t_123');
    assert.equal(trial.fromGrindClick, 15);
    assert.equal(trial.grind, -1);
    assert.equal(trial.method, 'v60');
    assert.equal(api.e2TrialFromTip(r, { key: 'x' }, 1), null, 'zonder proef geen proef');
  });
  test('klaargezette proef: opslaan en weer weghalen', () => {
    api.setE2PendingTrial({ id: 'e2t_1', key: 'bitter', method: 'v60' });
    assert.equal(api.e2PendingTrial().key, 'bitter');
    api.setE2PendingTrial(null);
    assert.equal(api.e2PendingTrial(), null);
  });
  test('meetlat telt wijzigingen, goede koppen en proefuitkomsten', () => {
    const store = [1, 2, 3, 4].map(() => cup({ dose: 18.8, strength: 'too_strong' }))
      .concat([1, 2, 3].map(() => cup({ dose: 16.3, strength: 'just_right' })));
    store[1].recommendation = { type: 'ADJUST' };
    store[5].plan.inputs = { e2: { trial: { key: 'bitter' } } };
    store[5].tasting.vsLast = 'better';
    store[6].plan.inputs = { e2: { trial: { key: 'bitter' } } };
    store[6].tasting.vsLast = 'same';
    const m = api.e2Meetlat(store, []);
    assert.equal(m.n, 7);
    assert.equal(m.good, 3);
    assert.equal(m.oldChanges, 1);
    assert.ok(m.e2Changes >= 1 && m.e2Changes <= 4, String(m.e2Changes));
    assert.deepEqual(JSON.parse(JSON.stringify(m.outcomes.bitter)), { tested: 2, better: 1, same: 1, worse: 0 });
    assert.deepEqual(JSON.parse(JSON.stringify(m.ey)), {});
  });
});

describe('Engine 2 · e2-2026.4: doorloop per zak en per klik', () => {
  const timed = (bedDry, beanId, click) => {
    const r = cup({ dose: 18.8, bedDry, beanId });
    if (click != null) r.actual.grindClick = click;
    return r;
  };
  test('een zak die langzamer doorloopt, krijgt een eigen einde, gekrompen naar je gewone', () => {
    const store = [1, 2, 3, 4, 5, 6].map(() => timed(252, 'b1')).concat([timed(294, 'b2'), timed(294, 'b2')]);
    const all = api.e2TimeModel(store, 'v60', 'Kasuya 4:6');
    const b2 = api.e2TimeModel(store, 'v60', 'Kasuya 4:6', { beanId: 'b2' });
    assert.equal(b2.bean.n, 2);
    const own = 294 / 210, f = all.factor;
    const expected = Math.exp((2 * Math.log(own) + api.E2_TIME_BEAN_K * Math.log(f)) / (2 + api.E2_TIME_BEAN_K));
    assert.ok(Math.abs(b2.bean.factor - expected) < 1e-9);
    assert.ok(b2.expectedFactor > f && b2.expectedFactor < own);
    assert.equal(api.e2TimeModel(store.concat([timed(300, 'b3')]), 'v60', 'Kasuya 4:6', { beanId: 'b3' }).bean.factor, null, 'één kop is te weinig');
  });
  test('fijner malen dan je laatste koppen: met een bekend klikeffect schuift het einde mee', () => {
    const store = [];
    for (const c of [15, 16, 17]) for (let i = 0; i < 3; i++) store.push(timed(Math.round(210 * Math.exp(0.35 - 0.07 * (c - 15)) + (i - 1)), 'b1', c));
    const same = api.e2TimeModel(store, 'v60', 'Kasuya 4:6', { plannedClick: 16 });
    const finer = api.e2TimeModel(store, 'v60', 'Kasuya 4:6', { plannedClick: 14 });
    assert.ok(same.grind.perClick < 0);
    assert.ok(Math.abs(same.clickShift) < 1e-9);
    assert.ok(finer.expectedFactor > same.expectedFactor * 1.1, `${finer.expectedFactor} tegen ${same.expectedFactor}`);
  });
});

describe('Engine 2 · e2-2026.4: processignaal en leren van proeven', () => {
  const t = { strength: 'just_right', acidity: 'lively', finish: [] };
  test('Bed droog ver na je gewone einde → controle, ook bij een sterkteklacht', () => {
    const slow = api.e2TipsFor({ ...t, strength: 'too_strong' }, { drain: { actualSec: 330, expectedSec: 255, spreadRel: 0.03 } });
    assert.equal(slow.length, 1);
    assert.equal(slow[0].key, 'drain_slow');
    assert.equal(slow[0].kind, 'controle');
    const fast = api.e2TipsFor(t, { drain: { actualSec: 190, expectedSec: 255, spreadRel: 0.03 } });
    assert.equal(fast[0].key, 'drain_fast');
  });
  test('binnen je gewone spreiding geen signaal', () => {
    assert.equal(api.e2TipsFor(t, { drain: { actualSec: 280, expectedSec: 255, spreadRel: 0.03 } }).length, 0);
    assert.equal(api.e2TipsFor(t, { drain: { actualSec: 320, expectedSec: 255, spreadRel: 0.09 } }).length, 0, '3× een grote spreiding');
  });
  test('uitkomsten per tip tellen uit de records', () => {
    const recs = ['better', 'worse', 'same', null].map(v => {
      const r = cup({ dose: 16.3, strength: 'just_right' });
      r.plan.inputs = { e2: { trial: { key: 'bitter' } } };
      r.tasting.vsLast = v;
      return r;
    });
    assert.deepEqual(JSON.parse(JSON.stringify(api.e2TrialOutcomes(recs))), { bitter: { tested: 4, better: 1, same: 1, worse: 1 } });
  });
  test('oordeel: 2× slechter en vaker slechter dan beter → niet meer klaarzetten; 2× beter → voorop', () => {
    assert.equal(api.e2TrialVerdict({ tested: 3, better: 0, same: 1, worse: 2 }), 'niet');
    assert.equal(api.e2TrialVerdict({ tested: 4, better: 2, same: 0, worse: 2 }), 'open');
    assert.equal(api.e2TrialVerdict({ tested: 2, better: 2, same: 0, worse: 0 }), 'werkt');
    assert.equal(api.e2TrialVerdict(null), null);
    const tasting = { strength: 'just_right', acidity: 'sharp', finish: ['bitter', 'drying'], missed: 'body' };
    const tips = api.e2TipsFor(tasting, { doseG: 17, waterG: 300, outcomes: {
      bitter: { tested: 3, better: 0, same: 1, worse: 2 }, body: { tested: 2, better: 2, same: 0, worse: 0 } } });
    assert.equal(tips.map(x => x.key).join(','), 'drying,body,sharp,bitter');
    const bitter = tips.find(x => x.key === 'bitter');
    assert.equal(bitter.trial, null);
    assert.match(bitter.text, /niet meer klaar/);
    assert.match(tips.find(x => x.key === 'body').text, /Bij jou: 2× geprobeerd: 2 beter/);
  });
});

describe('Engine 2 · e2-2026.4: meetlat', () => {
  test('lekker over de laatste 10 en koppen tot de eerste lekkere per zak', () => {
    const likes = { b1: [2, 3, 4, 5], b2: [4], b3: [2, 3] };
    const store = [];
    for (const [beanId, ls] of Object.entries(likes)) ls.forEach(l => {
      const r = cup({ dose: 16.3, strength: 'just_right', beanId });
      r.tasting.liking = l;
      store.push(r);
    });
    const m = api.e2Meetlat(store, []);
    assert.deepEqual(JSON.parse(JSON.stringify(m.lekker)), { n: 7, hits: 3 });
    assert.deepEqual(JSON.parse(JSON.stringify(m.firstLekker)), { beans: 3, median: 2, notYet: 1 });
  });
});
