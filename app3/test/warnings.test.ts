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

import { splitWarnings } from '../src/core/brew.ts';

test('uitleg gaat naar de rustige lijst, echte aandachtspunten blijven waarschuwing', () => {
  const info1 = 'Kasuya: giet pas als het water bijna helemaal door het filter is; de klok is een richtlijn.';
  const info2 = 'Het einde bij deze hoeveelheid is nog niet uit eigen zetsels geleerd; de band komt uit de bron.';
  const real = 'Een giet heeft geen water toegevoegd gekregen; controleer de hoeveelheden.';
  const r = splitWarnings([info1, real, info2, dose('22,3', '22')]);
  assert.deepEqual(r.notes, [info1, info2]);
  assert.deepEqual(r.cautions, [real]);
});
