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

describe('R-13: één smaakvraag (profiel + doel samen), gietstijl als optie', () => {
  test('drie smaken = drie bestaande profielen; Helder & fris en Rond & vol zijn ook het doel, Gebalanceerd vraagt geen doel', () => {
    assert.deepEqual(j(api.TASTE_CHOICES).map(c => [c.taste, c.profile, c.goal]), [
      ['bright', 'heel_fruitig', 'bright'], ['balanced', 'klassiek', null], ['rich', 'zoet', 'rich']
    ]);
  });
  test('op de V60 geven de drie smaken elk een eigen recept (geen schijnkeuze)', () => {
    const fps = api.TASTE_CHOICES.map(c => api.recipeFingerprint(c.profile, 'v60'));
    assert.equal(new Set(fps).size, 3);
  });
  test('de uitleg per smaak komt uit het recept: Kasuya 4:6, minder koffie en een grotere/kleinere eerste giet', () => {
    const [bright, balanced, rich] = api.TASTE_CHOICES;
    assert.equal(api.tasteDetail(balanced, 'v60'), 'Kasuya 4:6');
    assert.match(api.tasteDetail(bright, 'v60'), /^Kasuya 4:6 · iets minder koffie · grotere eerste giet/);
    assert.match(api.tasteDetail(rich, 'v60'), /^Kasuya 4:6 · kleinere eerste giet/);
    // Op de Chemex bestaat Kasuya niet: geen claim over de eerste giet.
    assert.doesNotMatch(api.tasteDetail(bright, 'chemex'), /eerste giet/);
  });
  test('een gietstijl met een naam staat er alleen als hij op die methode een eigen schema heeft', () => {
    assert.deepEqual(j(api.styleChoicesFor('v60')).map(c => c.profile), ['fresh_clean', 'fruitig_clean', 'robuust', 'snel_puur', 'evenwichtig_flex']);
    const chemex = j(api.styleChoicesFor('chemex')).map(c => c.profile);
    assert.ok(!chemex.includes('robuust'), 'April is V60-only');
    assert.ok(chemex.includes('evenwichtig_flex'));
  });
  test('via het methode-advies volgt het doel uit de gekozen smaak', () => {
    assert.equal(api.goalForProfile('heel_fruitig'), 'bright');
    assert.equal(api.goalForProfile('fresh_clean'), 'bright');
    assert.equal(api.goalForProfile('klassiek'), null);
    assert.equal(api.goalForProfile('vol_rond'), 'rich');
    assert.equal(api.goalForProfile('snel_puur'), null);
  });
});

describe('R-12: water — snelkeuzes per waterbedrijf, mengtip, en advies op het water dat je echt gebruikte', () => {
  test('snelkeuzes alleen met een bron; Dunea buffert ±139 mg/L CaCO3, ruim boven de richtwaarde', () => {
    for (const [k, c] of Object.entries(j(api.WATER_COMPANY_PRESETS))){
      assert.match(c.source, /\d{4}/, `${k}: bron met jaartal`);
      assert.equal(c.alkalinity.unit, 'HCO3');
    }
    const dunea = api.effectiveAlkalinityCaCO3(api.WATER_COMPANY_PRESETS.dunea.alkalinity, { tapParts: 1, demiParts: 0 });
    assert.ok(Math.abs(dunea - 139.4) < 0.1);
    assert.ok(dunea > api.KH_HIGH_CACO3);
    const mixed = api.effectiveAlkalinityCaCO3(api.WATER_COMPANY_PRESETS.dunea.alkalinity, { tapParts: 1, demiParts: 1 });
    assert.ok(Math.abs(mixed - 69.7) < 0.1, '1:1 met demiwater halveert de buffer');
    assert.equal(api.effectiveAlkalinityCaCO3({ value: null, unit: 'CaCO3' }, null), null);
  });
  test('de mengtip staat er alleen bij Helder & fris met water dat veel buffert', () => {
    assert.match(api.waterTipFor('bright', 139.4, { tapParts: 1, demiParts: 0 }), /meng je kraanwater 1:1 met gedemineraliseerd water/);
    assert.equal(api.waterTipFor('bright', 69.7, { tapParts: 1, demiParts: 1 }), null);
    assert.match(api.waterTipFor('bright', 84, { tapParts: 2, demiParts: 1 }), /Ook na je verdunning/);
    assert.equal(api.waterTipFor(null, 139.4, null), null, 'Gebalanceerd: geen tip');
    assert.equal(api.waterTipFor('rich', 139.4, null), null, 'Rond & vol: zachte zuren zijn juist welkom');
    assert.equal(api.waterTipFor('bright', null, null), null);
  });
  test('een vlakke kop met 1:1 gemengd water krijgt geen "check eerst je water" meer', () => {
    const t = { strength: 'just_right', acidity: 'flat', finish: ['sweet_clean'], liking: 3 };
    const base = { actualsConfirmed: true, roastId: 'light', grind: { current: 15, min: 13, max: 18 }, strength: { current: 0, blocked: {} } };
    const raw = api.recommendNext({ tasting: t, goal: null, ctx: Object.assign({}, base, { alkalinityCaCO3: api.effectiveAlkalinityCaCO3({ value: 170, unit: 'HCO3' }, { tapParts: 1, demiParts: 0 }) }) });
    assert.equal(raw.reasonKey, 'water_buffering');
    const mixed = api.recommendNext({ tasting: t, goal: null, ctx: Object.assign({}, base, { alkalinityCaCO3: api.effectiveAlkalinityCaCO3({ value: 170, unit: 'HCO3' }, { tapParts: 1, demiParts: 1 }) }) });
    assert.notEqual(mixed.reasonKey, 'water_buffering');
  });
});
