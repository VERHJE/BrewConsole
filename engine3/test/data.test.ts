import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TECHNIQUES, TECHNIQUE_BY_ID } from '../src/data/techniques.ts';
import { SELECTION_RULES } from '../src/data/selection-rules.ts';
import { FLAVOR_WHEEL } from '../src/data/flavor-wheel.ts';
import { loadApp } from '../../tests/load-app.mjs';

test('zestien recepten (zeven V60, negen Chemex), elk met een bron en een rol', () => {
  assert.equal(TECHNIQUES.length, 16);
  assert.equal(TECHNIQUES.filter(t => t.methods?.includes('chemex')).length, 9);
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
  for (const f of ['units.ts', 'types.ts', 'events.ts', 'migrate/v3.ts', 'state.ts', 'recipe.ts', 'strength.ts', 'grind.ts', 'technique.ts', 'data/grinder.ts', 'profile.ts', 'bean/text.ts', 'bean/scan.ts', 'bean/qr.ts', 'bean/ai.ts', 'data/techniques.ts', 'data/selection-rules.ts']) {
    const src = readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const bad of ['document.', 'window.', 'localStorage', 'indexedDB', 'fetch(', 'Date.now(', 'Math.random(']) {
      assert.ok(!src.includes(bad), `${f} gebruikt ${bad}`);
    }
  }
});

test('gietaanwijzingen: elke swirl of roerbeurt heeft een uitleg, prep en finish zijn gewone tekst, en waar de bron geen patroon noemt staat dat vast', () => {
  const withSchedule = TECHNIQUES.filter(t => t.reference.pours);
  for (const t of withSchedule) {
    for (const [i, p] of t.reference.pours!.entries()) {
      if (p.agitationAfter !== 'none') assert.ok((p.after ?? '').length > 10, `${t.id} giet ${i + 1}: roeren of swirlen zonder uitleg`);
      for (const text of [p.tip, p.after]) if (text !== undefined) assert.ok(text.length > 5 && text === text.trim(), `${t.id} giet ${i + 1}: lege of ongepoetste tekst`);
    }
    for (const line of [...(t.reference.prep ?? []), ...(t.reference.finish ?? [])]) assert.ok(line.length > 5 && line === line.trim(), `${t.id}: ${line}`);
  }
  // Gecontroleerd tegen de bronnen op 9 nov 2026: Kasuya en Hoffmann noemen geen gietpatroon.
  for (const id of ['kasuya_46', 'hoffmann_ultimate'] as const) {
    for (const p of TECHNIQUE_BY_ID.get(id)!.reference.pours!) assert.equal(p.styleGiven, false, id);
  }
  // Hedrick: de hoofdgiet is een spiraal met energie dicht bij het midden (niet 'in het midden').
  const hed = TECHNIQUE_BY_ID.get('hedrick_one_and_done')!.reference.pours!;
  assert.equal(hed[2]!.style, 'spiral');
  assert.match(hed[2]!.tip!, /midden/);
  assert.match(hed[0]!.after!, /Niet roeren/);
  // Hoffmann: swirl na de bloem, roeren na de laatste giet, laatste giet iets langzamer.
  const hof = TECHNIQUE_BY_ID.get('hoffmann_ultimate')!.reference;
  assert.equal(hof.pours![0]!.agitationAfter, 'swirl');
  assert.equal(hof.pours![2]!.agitationAfter, 'stir');
  assert.match(hof.pours![2]!.tip!, /langzamer/);
  assert.match(hof.pours![2]!.after!, /met de klok mee/);
});
test('Chemex-recepten: bron, Chemex-eindtijd, plaatshouders staan in `open`, V60-recepten blijven V60', () => {
  for (const t of TECHNIQUES) {
    const cx = t.methods?.includes('chemex') ?? false;
    if (!cx) { assert.equal(t.methods, undefined, t.id); continue; }
    assert.ok(t.id.startsWith('chemex_'), t.id);
    assert.ok(t.reference.endSec && t.reference.endSec.lo >= 210, `${t.id}: de Chemex loopt langer door dan de V60`);
    assert.ok(t.reference.prep && t.reference.finish, `${t.id}: voor- en nastappen`);
    assert.ok(t.reference.pours!.every(p => p.tip), `${t.id}: tip per giet`);
    assert.ok(t.reference.tempC !== null, t.id);
  }
  // Howell (eigen PDF): 130 g in 20 s, 1:00 naar 260 g, 2:00 naar 390 g.
  assert.deepEqual(TECHNIQUE_BY_ID.get('chemex_howell_cup')!.reference.pours!.map(p => [p.atSec, p.toG]), [[0, 130], [60, 260], [120, 390]]);
  // Barefoot: bloem 75 g, daarna 750 g; Onyx: vier keer 200 g op 0:45, 1:30, 2:30, 3:30 (Prima).
  assert.deepEqual(TECHNIQUE_BY_ID.get('chemex_barefoot')!.reference.pours!.map(p => p.toG), [75, 750]);
  assert.deepEqual(TECHNIQUE_BY_ID.get('chemex_onyx')!.reference.pours!.map(p => p.atSec), [0, 45, 90, 150, 210]);
  // Blue Bottle (eigen transcript): 0:00, 0:45, 1:50, 3:10; 100/300/500/700 g; 205 tot 210 °F.
  const bb = TECHNIQUE_BY_ID.get('chemex_blue_bottle')!;
  assert.deepEqual(bb.reference.pours!.map(p => [p.atSec, p.toG]), [[0, 100], [45, 300], [110, 500], [190, 700]]);
  assert.equal(bb.sourceClass, 'A');
  assert.deepEqual(bb.open, []);
  // Onyx (eigen transcript): totalen 110/300/500/700/900 op 0:00, 0:45, 1:30, 2:30, 3:30.
  assert.deepEqual(TECHNIQUE_BY_ID.get('chemex_onyx')!.reference.pours!.map(p => [p.atSec, p.toG]), [[0, 110], [45, 300], [90, 500], [150, 700], [210, 900]]);
  // Hedrick: 100, 200 (0:30), 400 (1:00), 550, 650; Ox Coffee: 65, 215 (0:35), 360 (1:15).
  assert.deepEqual(TECHNIQUE_BY_ID.get('chemex_hedrick')!.reference.pours!.map(p => p.toG), [100, 200, 400, 550, 650]);
  assert.deepEqual(TECHNIQUE_BY_ID.get('chemex_hedrick')!.reference.pours!.slice(0, 3).map(p => p.atSec), [0, 30, 60]);
  assert.deepEqual(TECHNIQUE_BY_ID.get('chemex_ox')!.reference.pours!.map(p => [p.atSec, p.toG]), [[0, 65], [35, 215], [75, 360]]);
  // Elk Chemex-recept noemt de luchtopening bij de tuit.
  for (const t of TECHNIQUES.filter(t => t.methods?.includes('chemex'))) assert.ok(t.reference.prep!.some(l => /luchtopening/.test(l)), t.id);
});
test('portieregels voor de Chemex dekken elke kopgrootte, zonder gat of overlap', () => {
  const rules = SELECTION_RULES.filter(r => r.when.method === 'chemex');
  for (let cup = 100; cup <= 700; cup += 5) {
    const hit = rules.filter(r => (r.when.minCupG ?? 0) <= cup && cup <= (r.when.maxCupG ?? Infinity));
    assert.equal(hit.length, 1, `${cup} g`);
    for (const t of hit[0]!.suggest) assert.ok(TECHNIQUE_BY_ID.get(t)!.methods?.includes('chemex'), t);
  }
});
