import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TECHNIQUES, TECHNIQUE_BY_ID } from '../src/data/techniques.ts';
import { SELECTION_RULES } from '../src/data/selection-rules.ts';
import { FLAVOR_WHEEL } from '../src/data/flavor-wheel.ts';
import { loadApp } from '../../tests/load-app.mjs';

test('acht technieken, elk met een bron en een rol', () => {
  assert.equal(TECHNIQUES.length, 8);
  for (const t of TECHNIQUES) {
    assert.ok(t.sources.length > 0, t.id);
    assert.ok(t.role.length > 0, t.id);
  }
});
test('gietschema\'s lopen op in tijd en gewicht en eindigen op het water van de bron', () => {
  for (const t of TECHNIQUES) {
    const p = t.reference.pours;
    if (!p) continue;
    for (let i = 1; i < p.length; i++) {
      assert.ok(p[i]!.atSec > p[i - 1]!.atSec, `${t.id} tijd ${i}`);
      assert.ok(p[i]!.toG > p[i - 1]!.toG, `${t.id} gewicht ${i}`);
    }
    assert.equal(p[p.length - 1]!.toG, t.reference.waterG, `${t.id} eindgewicht`);
  }
});
test('Kasuya volgt de Hario-momenten (besluit Jelle) en 40/60', () => {
  const k = TECHNIQUE_BY_ID.get('kasuya_46')!;
  assert.deepEqual(k.reference.pours!.map(p => p.atSec), [0, 45, 90, 130, 160]);
  assert.equal(k.reference.pours![1]!.toG / k.reference.waterG, 0.4);
});
test('elke regel verwijst naar bestaande technieken; er is precies één terugval', () => {
  for (const r of SELECTION_RULES) for (const id of r.suggest) assert.ok(TECHNIQUE_BY_ID.has(id), `${r.id} → ${id}`);
  const fallback = SELECTION_RULES.filter(r => Object.keys(r.when).length === 0);
  assert.equal(fallback.length, 1);
  assert.equal(fallback[0]!.suggest[0], 'kasuya_46');
  for (const r of SELECTION_RULES) if (r.kasuyaFirstPourShare !== null) assert.ok(r.kasuyaFirstPourShare > 0 && r.kasuyaFirstPourShare < 1);
});
test('het smaakwiel van Engine 3 is gelijk aan dat van de app (opnieuw genereren als dit faalt)', () => {
  const { api } = loadApp() as { api: { SCA_FLAVOR_WHEEL: Array<{ key: string; subgroups: Array<{ tags: Array<{ t: string; h: string | null }> }> }> } };
  const app = api.SCA_FLAVOR_WHEEL.map(c => [c.key, c.subgroups.flatMap(sg => sg.tags.map(t => [t.t, t.h ?? null]))]);
  const e3 = FLAVOR_WHEEL.map(c => [c.key, c.subgroups.flatMap(sg => sg.tags.map(t => [t.tag, t.hint]))]);
  assert.equal(JSON.stringify(e3), JSON.stringify(app));
});
test('de engine-bronbestanden gebruiken geen DOM, opslag, netwerk of klok', () => {
  for (const f of ['units.ts', 'types.ts', 'events.ts', 'migrate/v3.ts', 'state.ts', 'recipe.ts', 'strength.ts', 'grind.ts', 'technique.ts', 'data/grinder.ts', 'data/techniques.ts', 'data/selection-rules.ts']) {
    const src = readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const bad of ['document.', 'window.', 'localStorage', 'indexedDB', 'fetch(', 'Date.now(', 'Math.random(']) {
      assert.ok(!src.includes(bad), `${f} gebruikt ${bad}`);
    }
  }
});
