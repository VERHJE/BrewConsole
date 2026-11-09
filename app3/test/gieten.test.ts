import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRecipe, TECHNIQUES, type Recipe, type TechniqueId } from '../../engine3/src/index.ts';
import { finishLines, pourGuide, pourNotes, prepLines } from '../src/core/gieten.ts';
import { pourLines } from '../src/core/brew.ts';

const recipe = (id: TechniqueId, dose = 20, water = 300): Recipe => buildRecipe({ technique: id, method: 'v60', doseG: dose, waterG: water }).recipe;

test('Hoffmann: swirl na de bloem, roeren na de laatste giet, laatste giet iets langzamer; de bron noemt geen patroon', () => {
  const r = recipe('hoffmann_ultimate', 30, 500);
  const g0 = pourGuide(r, 0), g1 = pourGuide(r, 1), g2 = pourGuide(r, 2);
  assert.equal(g0.style, null); assert.equal(g1.style, null); assert.equal(g2.style, null);
  assert.match(g0.tip!, /twee keer de dosis/);
  assert.equal(g0.after!.todo, 'swirl de V60');
  assert.match(g0.after!.detail!, /0:45/);
  assert.equal(g1.after, null);
  assert.match(g2.tip!, /langzamer/);
  assert.equal(g2.after!.todo, 'roer');
  assert.match(g2.after!.detail!, /met de klok mee.*tegen de klok in.*zachte swirl/);
  assert.deepEqual(prepLines(r), ['Spoel het filter met water van net onder de kook.', 'Maak een kuiltje in het midden van de koffie.']);
  assert.deepEqual(finishLines(r), ['Laat het doorlopen; klaar voor 3:30.']);
  assert.deepEqual(pourLines(r).map(l => l.how), ['swirl', '', 'roeren'], 'in het schema geen "in spiraal" waar de bron geen patroon noemt');
});

test('Hedrick: twee bloemen in een spiraal zonder te roeren, de hoofdgiet krachtig in een spiraal dicht bij het midden', () => {
  const r = recipe('hedrick_one_and_done', 15, 225);
  assert.deepEqual([0, 1, 2].map(i => pourGuide(r, i).style), ['in spiraal', 'in spiraal', 'in spiraal']);
  assert.equal(pourGuide(r, 0).after!.todo, null);
  assert.match(pourGuide(r, 0).after!.detail!, /Niet roeren of swirlen/);
  assert.match(pourGuide(r, 1).after!.detail!, /slibben/);
  assert.match(pourGuide(r, 2).tip!, /energie.*midden/);
  assert.match(pourGuide(r, 2).after!.detail!, /kleine swirl/);
  assert.deepEqual(finishLines(r), ['Klaar als het niet meer druppelt, rond 2:30.']);
});

test('Rao: stevige spin na de bloem, daarna heel zachte draaien; laag en bijna verticaal gieten', () => {
  const r = recipe('rao', 20, 330);
  assert.equal(pourGuide(r, 0).after!.todo, 'doe de Rao-spin');
  assert.match(pourGuide(r, 0).after!.detail!, /stevig/);
  for (const i of [1, 2]) {
    assert.equal(pourGuide(r, i).after!.todo, 'geef een zachte swirl');
    assert.match(pourGuide(r, i).after!.detail!, /korter dan een seconde/);
    assert.match(pourGuide(r, i).tip!, /bijna verticale straal/);
    assert.equal(pourGuide(r, i).style, 'in spiraal');
  }
  assert.match(pourGuide(r, 2).tip!, /70 %/);
  assert.deepEqual(prepLines(r), ['Gebruik een plastic V60 (houdt de warmte vast).', 'Maak met je vinger een vogelnestje van het bed.']);
});

test('Gagné: bloem vanuit het kuiltje, Rao-spin na elke giet, spiralen alleen bij de eerste hoofdgiet', () => {
  const r = recipe('gagne', 22, 352);
  assert.deepEqual([0, 1, 2].map(i => pourGuide(r, i).style), [null, 'in spiraal', null]);
  assert.deepEqual([0, 1, 2].map(i => pourGuide(r, i).after!.todo), ['doe de Rao-spin', 'doe de Rao-spin', 'doe de Rao-spin']);
  assert.match(pourGuide(r, 0).tip!, /kuiltje/);
  assert.match(pourGuide(r, 0).after!.detail!, /15 tot 20 seconden/);
  assert.match(pourGuide(r, 1).after!.detail!, /tweederde/);
  assert.match(pourGuide(r, 2).tip!, /bed.*droog/);
  assert.equal(prepLines(r).length, 3);
  assert.equal(finishLines(r).length, 2);
});

test('Wendelboe: bloem roeren met een theelepel, hoofdgiet in een cirkel van 2 tot 2,5 minuut, roeren voor het serveren', () => {
  const r = recipe('wendelboe', 32.5, 500);
  assert.deepEqual([0, 1, 2].map(i => pourGuide(r, i).style), [null, null, 'in rondjes']);
  assert.equal(pourGuide(r, 0).after!.todo, 'roer');
  assert.match(pourGuide(r, 0).after!.detail!, /theelepel/);
  assert.match(pourGuide(r, 2).tip!, /2 tot 2,5 minuut/);
  assert.match(finishLines(r).join(' '), /Roer de koffie voor het serveren/);
});

test('Kasuya en April: Kasuya zegt niets over een patroon; April blijft zoals het was', () => {
  const k = recipe('kasuya_46');
  for (let i = 0; i < k.pours.length; i++) { const g = pourGuide(k, i); assert.equal(g.style, null); assert.equal(g.tip, null); assert.equal(g.after, null); }
  assert.deepEqual(pourNotes(k), []);
  assert.deepEqual(finishLines(k), ['Haal de V60 eraf op 3:30.']);
  const a = recipe('april');
  assert.deepEqual([0, 5].map(i => pourGuide(a, i).style), ['in rondjes', 'in rondjes']);
  assert.equal(pourGuide(a, 0).tip, null);
});

test('een eigen of oud recept zonder bijpassende brondata valt terug op wat het recept zelf zegt', () => {
  const base = recipe('hoffmann_ultimate', 30, 500);
  const legacy = { ...base, technique: 'legacy:oude-app' } as Recipe;
  assert.equal(pourGuide(legacy, 0).style, 'in spiraal');
  assert.equal(pourGuide(legacy, 0).tip, null);
  assert.equal(pourGuide(legacy, 0).after!.todo, 'swirl de V60', 'swirl uit het recept zelf blijft');
  assert.deepEqual(prepLines(legacy), []);
  // een schema met een ander aantal gieten past niet op de brondata: geen aanwijzingen van een andere giet
  const longer = { ...base, pours: [...base.pours, base.pours[2]!] } as Recipe;
  assert.equal(pourGuide(longer, 0).tip, null);
});

test('elke techniek met een schema geeft per giet een uitkomst zonder fouten, en bij elke swirl of roerbeurt staat een opdracht', () => {
  for (const t of TECHNIQUES) {
    if (!t.reference.pours) continue;
    const r = recipe(t.id, t.reference.doseG, t.reference.waterG);
    for (let i = 0; i < r.pours.length; i++) {
      const g = pourGuide(r, i);
      if (r.pours[i]!.agitationAfter !== 'none') assert.ok(g.after?.todo, `${t.id} giet ${i + 1}`);
    }
  }
});
