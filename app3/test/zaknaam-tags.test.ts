import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sameNameBean, tagLabel } from '../src/core/beans.ts';

test('P3-01: groepstags tonen zonder "(algemeen)"; gewone tags blijven gelijk', () => {
  assert.equal(tagLabel('Bessen (algemeen)'), 'Bessen');
  assert.equal(tagLabel('Tropisch fruit (algemeen)'), 'Tropisch fruit');
  assert.equal(tagLabel('Rode bes'), 'Rode bes');
});

test('P2-06: dezelfde naam wordt herkend los van hoofdletters en spaties, maar niet de zak zelf', () => {
  const rows = [{ id: 'a', name: 'Kenya  Gathaithi AA' }, { id: 'b', name: 'Halo' }];
  assert.equal(sameNameBean(rows, ' kenya gathaithi aa ', null), true);
  assert.equal(sameNameBean(rows, 'Kenya Gathaithi AA', 'a'), false, 'bewerken van dezelfde zak geeft geen melding');
  assert.equal(sameNameBean(rows, 'Kenia', null), false);
  assert.equal(sameNameBean(rows, '   ', null), false);
});
