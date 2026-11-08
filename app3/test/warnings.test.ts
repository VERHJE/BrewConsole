import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visibleWarnings } from '../src/core/brew.ts';

const dose = (a: string, b: string): string => `De gewenste dosis (${a} g) ligt buiten het bereik van de brewer (15–22 g); het recept gebruikt ${b} g.`;

test('een dosis die minder dan 1 g buiten het bereik ligt wordt niet getoond', () => {
  assert.deepEqual(visibleWarnings([dose('22,3', '22')]), []);
});

test('een grotere afwijking en andere waarschuwingen blijven staan', () => {
  const big = dose('26,5', '22');
  const other = 'De eerste giet (40 g) is kleiner dan 2 × de dosis: mogelijk blijft koffie droog.';
  assert.deepEqual(visibleWarnings([big, other, dose('22,3', '22')]), [big, other]);
});
