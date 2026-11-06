import test from 'node:test';
import assert from 'node:assert/strict';
import { bagPalette, compressToBudget, fitWithin, memoryPhotoStore, QUALITY_STEPS } from '../src/core/photos.ts';

test('fitWithin: verkleint tot 1080 px, behoudt verhouding, vergroot nooit', () => {
  assert.deepEqual(fitWithin(4000, 3000), { width: 1080, height: 810 });
  assert.deepEqual(fitWithin(3000, 4000), { width: 810, height: 1080 });
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 });
  assert.deepEqual(fitWithin(0, 0), { width: 1, height: 1 });
});

test('compressToBudget: stopt bij de eerste die past, anders de kleinste', async () => {
  const sizes = new Map(QUALITY_STEPS.map((q, i) => [q, 400_000 - i * 60_000]));
  const seen: number[] = [];
  const hit = await compressToBudget(async q => { seen.push(q); return { size: sizes.get(q)! }; }, 200_000);
  assert.ok(hit.size <= 200_000);
  assert.ok(seen.length < QUALITY_STEPS.length);
  const none = await compressToBudget(async () => ({ size: 900_000 }), 100);
  assert.equal(none.size, 900_000);
  let k = 1000;
  const smallest = await compressToBudget(async () => ({ size: k-- }), 1);
  assert.equal(smallest.size, 1000 - (QUALITY_STEPS.length - 1));
});

test('geheugenopslag: opslaan, ophalen, verwijderen', async () => {
  const s = memoryPhotoStore();
  assert.equal(await s.get('a'), null);
  await s.put('a', new Blob(['x']));
  assert.equal((await s.get('a'))?.size, 1);
  await s.remove('a');
  assert.equal(await s.get('a'), null);
});

test('bagPalette: vast per naam, binnen 0–359', () => {
  assert.deepEqual(bagPalette('Esperanza'), bagPalette('Esperanza'));
  const p = bagPalette('Kenia Kiambu');
  assert.ok(p.hue >= 0 && p.hue < 360 && p.hue2 >= 0 && p.hue2 < 360);
});
