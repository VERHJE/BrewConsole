import test from 'node:test';
import assert from 'node:assert/strict';
import { compressToBudget, fitWithin, fromStoredPhoto, memoryPhotoStore, QUALITY_STEPS, toStoredPhoto } from '../src/core/photos.ts';

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


// Review 17 nov 2026 (O1): WebKit kan in een privévenster geen Blob in IndexedDB bewaren; de foto staat er daarom als bytes met type.
test('foto-record: bytes en type heen en terug; een oud record (Blob) blijft leesbaar; rommel wordt null', async () => {
  const blob = new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/webp' });
  const rec = await toStoredPhoto(blob);
  assert.ok(rec.bytes instanceof ArrayBuffer);
  assert.equal(rec.type, 'image/webp');
  const back = fromStoredPhoto(structuredClone(rec));
  assert.ok(back);
  assert.equal(back.type, 'image/webp');
  assert.deepEqual([...new Uint8Array(await back.arrayBuffer())], [1, 2, 3, 250]);
  assert.equal(fromStoredPhoto(blob), blob, 'oud record');
  for (const junk of [undefined, null, 'tekst', 12, {}, { type: 'image/png' }, { bytes: 'geen buffer' }]) assert.equal(fromStoredPhoto(junk), null);
});
