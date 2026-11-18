import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rowLines, type BeanRow, type StockView } from '../src/core/beans.ts';
import { tasteLine } from '../src/core/insights.ts';

const row = (over: Partial<BeanRow> = {}): BeanRow => ({
  id: 'bean:x', name: 'Zak', roaster: null, country: null, roastLevel: null, roastDate: null, bagSizeG: null, cups: 0, addedAt: 0, ...over
}) as BeanRow;
const stock = (over: Partial<StockView> = {}): StockView => ({ remainingG: null, cupsLeft: null, low: false, ...over });

test('zakkenlijst: elke rij heeft dezelfde drie regels, met "onbekend" waar iets ontbreekt', () => {
  const bare = rowLines(row(), undefined, '2026-11-09');
  assert.equal(bare.origin, 'Herkomst onbekend');
  assert.equal(bare.roast, 'Branddatum onbekend');
  assert.equal(bare.stock, 'Nog niet gezet');
  assert.equal(bare.low, false);

  const full = rowLines(row({ roaster: 'Hoppenworth', country: 'Colombia', roastLevel: 'light', roastDate: '2026-10-28', cups: 8 }), stock({ remainingG: 120, cupsLeft: 8 }), '2026-11-09');
  assert.equal(full.origin, 'Hoppenworth · Colombia');
  assert.equal(full.roast, 'Licht · 12 d na branding');
  assert.equal(full.stock, '120 g over · 8 koppen');

  const one = rowLines(row({ cups: 1, roastDate: '2026-11-09' }), undefined, '2026-11-09');
  assert.equal(one.roast, '0 d na branding');
  assert.equal(one.stock, '1 kop');
});

test('zakkenlijst: bijna op staat als label en de resterende gram verdwijnt dan uit de regel', () => {
  const l = rowLines(row({ cups: 6, roastDate: '2026-11-01' }), stock({ remainingG: 20, cupsLeft: 1, low: true }), '2026-11-09');
  assert.equal(l.low, true);
  assert.equal(l.roast, '8 d na branding');
  assert.equal(l.stock, '6 koppen');
});

const tasting = (over: Record<string, unknown>) => ({
  brewId: 'b', minutesAfter: null, late: false, strength: null, acidity: null, finish: [], liking: null, goalHit: null, vsLast: null, missed: null,
  cata: [], noteHits: [], legacyScores: null, note: '', ...over
}) as never;

test('logboekrij: een eigen notitie gaat voor, anders herkende notities met oordeel; niets is null', () => {
  assert.equal(tasteLine(null), null);
  assert.equal(tasteLine(tasting({})), null);
  assert.equal(tasteLine(tasting({ note: '  Fris,   fruitig en zoet  ' })), 'Fris, fruitig en zoet');
  const long = 'a'.repeat(80);
  assert.equal(tasteLine(tasting({ note: long }))!.length, 58);
  assert.match(tasteLine(tasting({ note: long }))!, /…$/);
  assert.equal(tasteLine(tasting({ strength: -1, acidity: 'lively', finish: ['sweet_clean', 'bitter'] })), 'Iets slap · levendig · zoet en schoon');
  assert.equal(
    tasteLine(tasting({ strength: 0, noteHits: [{ note: 'perzik', hit: 'yes' }, { note: 'jasmijn', hit: 'bit' }, { note: 'thee', hit: 'yes' }] })),
    'Herkend: perzik, thee · precies goed'
  );
});
