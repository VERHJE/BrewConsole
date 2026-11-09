import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { buildRecipe, KASUYA_DEFAULT_FIRST_SHARE, referenceRatio, RecipeError } from '../src/recipe.ts';
import { TECHNIQUES } from '../src/data/techniques.ts';
import type { RoastLevel } from '../src/types.ts';
import { SELECTION_RULES } from '../src/data/selection-rules.ts';

const withPours = TECHNIQUES.filter(t => t.reference.pours !== null);

test('bij de referentiehoeveelheid komt precies het brongetal terug', () => {
  for (const t of withPours) {
    const b = buildRecipe({ technique: t.id, method: 'v60', doseG: t.reference.doseG, waterG: t.reference.waterG });
    assert.deepEqual(b.recipe.pours.map(p => [p.atSec, p.toG]), t.reference.pours!.map(p => [p.atSec, p.toG]), t.id);
    assert.deepEqual(b.recipe.pours.map(p => p.waitForDrain), t.reference.pours!.map(p => p.waitForDrain), t.id);
    assert.equal(b.recipe.pours.reduce((s, p) => s + p.addG, 0), t.reference.waterG, t.id);
    if (t.reference.endSec) assert.equal(b.recipe.expectedEndSec!.mid, (t.reference.endSec.lo + t.reference.endSec.hi) / 2, t.id);
    assert.equal(b.warnings.some(w => /geschaald|nog niet uit eigen/.test(w)), false, `${t.id} geeft onnodige schaalmelding`);
  }
});
test('Osmotic Flow heeft geen schema en weigert netjes', () => {
  assert.throws(() => buildRecipe({ technique: 'osmotic_flow', method: 'v60', doseG: 20, waterG: 250 }), (e: unknown) => e instanceof RecipeError && e.code === 'no_schedule');
});
test('Kasuya: Hario-momenten bij elke hoeveelheid, 40/60, drie gelijke delen', () => {
  for (const [dose, water] of [[15, 225], [20, 300], [30, 450], [18.5, 277]] as const) {
    const { recipe } = buildRecipe({ technique: 'kasuya_46', method: 'v60', doseG: dose, waterG: water });
    assert.deepEqual(recipe.pours.map(p => p.atSec), [0, 45, 90, 130, 160]);
    assert.equal(recipe.pours[1]!.toG, Math.round(water * 0.4), `${water}`);
    assert.equal(recipe.pours[4]!.toG, water);
    const rest = recipe.pours.slice(2).map(p => p.addG);
    assert.ok(Math.max(...rest) - Math.min(...rest) <= 1, `${water} rest ${rest}`);
    assert.deepEqual(recipe.pours.map(p => p.waitForDrain), [false, true, true, true, true]);
  }
});
test('Kasuya 20/300: standaard 50+70, Gota 40+80 (zoeter) en 80+40 (helderder)', () => {
  const first = (share?: number) => buildRecipe({ technique: 'kasuya_46', method: 'v60', doseG: 20, waterG: 300, ...(share === undefined ? {} : { kasuyaFirstPourShare: share }) }).recipe.pours.slice(0, 2).map(p => p.addG);
  assert.deepEqual(first(), [50, 70]);
  assert.deepEqual(first(1 / 3), [40, 80]);
  assert.deepEqual(first(2 / 3), [80, 40]);
  assert.ok(Math.abs(KASUYA_DEFAULT_FIRST_SHARE - 0.4167) < 1e-3);
  assert.throws(() => buildRecipe({ technique: 'kasuya_46', method: 'v60', doseG: 20, waterG: 300, kasuyaFirstPourShare: 1.2 }));
});
test('de verdelingen uit de regeltabel werken met Kasuya', () => {
  for (const r of SELECTION_RULES) {
    if (r.kasuyaFirstPourShare === null) continue;
    const b = buildRecipe({ technique: 'kasuya_46', method: 'v60', doseG: 20, waterG: 300, kasuyaFirstPourShare: r.kasuyaFirstPourShare });
    assert.equal(b.recipe.pours[1]!.toG, 120);
  }
});
test('temperatuur per branding bij Kasuya en de terugvallen bij Hoffmann en Wendelboe', () => {
  const t = (technique: 'kasuya_46' | 'hoffmann_ultimate' | 'wendelboe', roast: RoastLevel | null, dose = 20, water = 300) =>
    buildRecipe({ technique, method: 'v60', doseG: dose, waterG: water, roast }).recipe.tempC;
  assert.deepEqual(['light', 'light_medium', 'medium', 'medium_dark', 'dark', null].map(r => t('kasuya_46', r as never)), [93, 93, 88, 88, 83, 92]);
  assert.deepEqual(['light', 'medium', 'dark', null].map(r => t('hoffmann_ultimate', r as never, 30, 500)), [100, 100, 88, 100]);
  assert.deepEqual(['light', 'medium', 'medium_dark', 'dark'].map(r => t('wendelboe', r as never, 32.5, 500)), [96, 96, 88, 83]);
  assert.equal(buildRecipe({ technique: 'wendelboe', method: 'v60', doseG: 32.5, waterG: 500 }).tempSource!.includes('aanname'), true);
});
test('Hoffmann schaalt op verhouding en geeft geen schaalaanname', () => {
  const { recipe, warnings } = buildRecipe({ technique: 'hoffmann_ultimate', method: 'v60', doseG: 15, waterG: 250 });
  assert.deepEqual(recipe.pours.map(p => p.toG), [30, 150, 250]);
  assert.equal(warnings.some(w => /geen schaalregel/.test(w)), false);
});
test('technieken zonder schaalregel melden dat de schaling een aanname is', () => {
  const { warnings } = buildRecipe({ technique: 'rao', method: 'v60', doseG: 15, waterG: 250 });
  assert.ok(warnings.some(w => /geen schaalregel/.test(w)));
});
test('waarschuwt als de eerste giet kleiner is dan 2 × de dosis, en bij de Chemex', () => {
  const small = buildRecipe({ technique: 'hedrick_one_and_done', method: 'v60', doseG: 40, waterG: 225 });
  assert.ok(small.warnings.some(w => /2 × de dosis/.test(w)));
  const cx = buildRecipe({ technique: 'hoffmann_ultimate', method: 'chemex', doseG: 30, waterG: 500 });
  assert.ok(cx.warnings.some(w => /V60-techniek/.test(w)));
  const own = buildRecipe({ technique: 'chemex_stumptown', method: 'chemex', doseG: 42, waterG: 700 });
  assert.ok(!own.warnings.some(w => /V60-techniek/.test(w)));
  assert.deepEqual(own.recipe.pours.map(p => [p.atSec, p.toG]), [[0, 150], [45, 450], [105, 700]]);
});
test('ongeldige invoer wordt geweigerd; bypass en klik gaan mee', () => {
  assert.throws(() => buildRecipe({ technique: 'kasuya_46', method: 'v60', doseG: 0, waterG: 300 }), (e: unknown) => e instanceof RecipeError && e.code === 'bad_input');
  const b = buildRecipe({ technique: 'kasuya_46', method: 'v60', doseG: 20, waterG: 300, bypassG: 40, grindClick: 16 as never });
  assert.equal(b.recipe.bypassG, 40);
  assert.equal(b.recipe.grindClick, 16);
});
test('de verhouding van de referentie (Kasuya 15, Hoffmann 16,7)', () => {
  assert.equal(referenceRatio('kasuya_46'), 15);
  assert.ok(Math.abs(referenceRatio('hoffmann_ultimate') - 16.667) < 0.01);
});
test('eigenschap: voor elke hoeveelheid lopen tijd en gewicht op, het totaal klopt en de gietmomenten blijven gelijk', () => {
  fc.assert(fc.property(fc.constantFrom(...withPours.map(t => t.id)), fc.integer({ min: 120, max: 800 }), fc.double({ min: 0.2, max: 0.8, noNaN: true }), (id, water, share) => {
    const def = TECHNIQUES.find(t => t.id === id)!;
    const b = buildRecipe({ technique: id, method: 'v60', doseG: water / 15, waterG: water, kasuyaFirstPourShare: share });
    const p = b.recipe.pours;
    for (let i = 1; i < p.length; i++) {
      assert.ok(p[i]!.atSec > p[i - 1]!.atSec);
      assert.ok(p[i]!.toG > p[i - 1]!.toG, `${id} ${water} ${share}: ${p.map(x => x.toG)}`);
    }
    assert.equal(p[p.length - 1]!.toG, water);
    assert.equal(p.reduce((s, x) => s + x.addG, 0), water);
    assert.deepEqual(p.map(x => x.atSec), def.reference.pours!.map(x => x.atSec));
  }), { numRuns: 400 });
});
