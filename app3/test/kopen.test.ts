import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../../engine3/src/index.ts';
import { memoryStorage } from '../src/core/storage.ts';
import { createStore } from '../src/core/store.ts';
import { beanDetail, beanRows, editForm, emptyForm, stockView, validateForm } from '../src/core/beans.ts';
import { seedLog } from './seed.ts';

const ENV = { now: () => Date.UTC(2026, 10, 6), uuid: () => 'x', device: 't' };

async function stateOf(cups: number, extra: { bagSizeG?: string; shopUrl?: string }) {
  const { events } = await seedLog(cups, extra);
  const store = await createStore(memoryStorage(events), createEngine());
  return store.snapshot().state;
}

test('winkeladres in het formulier: normaliseren, onzin geweigerd', () => {
  const ok = validateForm(editForm(editForm(emptyForm(), 'name', 'Z'), 'shopUrl', 'brander.nl/zak'), ENV);
  assert.ok(ok.ok && ok.fields.shopUrl === 'https://brander.nl/zak');
  const bad = validateForm(editForm(editForm(emptyForm(), 'name', 'Z'), 'shopUrl', 'javascript:alert(1)'), ENV);
  assert.ok(!bad.ok && !!bad.problems.shopUrl);
  const none = validateForm(editForm(emptyForm(), 'name', 'Z'), ENV);
  assert.ok(none.ok && none.fields.shopUrl === null);
});

test('voorraad: zakgrootte min afgeronde koppen; bijna op bij minder dan twee koppen; zonder zakgrootte onbekend', async () => {
  const s = await stateOf(3, { bagSizeG: '250', shopUrl: 'https://brander.nl/zak' });
  const id = beanRows(s)[0]!.id;
  const v = stockView(s, id);
  assert.ok(v.remainingG! > 150 && v.remainingG! < 250, String(v.remainingG));
  assert.equal(v.low, false);
  assert.equal(beanDetail(s, id)!.shopUrl, 'https://brander.nl/zak');
  const low = await stateOf(8, { bagSizeG: '100' });
  const lv = stockView(low, beanRows(low)[0]!.id);
  assert.equal(lv.low, true);
  const unknown = await stateOf(2, {});
  assert.deepEqual(stockView(unknown, beanRows(unknown)[0]!.id), { remainingG: null, cupsLeft: null, low: false });
  assert.equal(beanDetail(unknown, beanRows(unknown)[0]!.id)!.shopUrl, null);
});
