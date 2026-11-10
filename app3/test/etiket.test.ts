import { test } from 'node:test';
import assert from 'node:assert/strict';
import { labelContours, ROAST_STEP } from '../src/core/photos.ts';

test('etiket: hoogtelijnen liggen vast per naam en verschillen tussen namen', () => {
  const a = labelContours('Kenya Gathaithi AA');
  assert.deepEqual(a, labelContours('Kenya Gathaithi AA'), 'dezelfde zak ziet er altijd hetzelfde uit');
  assert.notDeepEqual(a, labelContours('Halo Ethiopia'));
  assert.equal(a.length, 11);
  for (const d of a) assert.match(d, /^M[\d.\- ]+(L[\d.\- ]+)+Z$/, 'een gesloten pad zonder NaN');
});

test('etiket: brandingsschaal loopt van 1 (licht) tot 5 (donker)', () => {
  assert.deepEqual(Object.values(ROAST_STEP), [1, 2, 3, 4, 5]);
});
