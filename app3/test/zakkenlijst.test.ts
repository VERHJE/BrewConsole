import test from 'node:test';
import assert from 'node:assert/strict';
import type { BeanRow } from '../src/core/beans.ts';
import { filterBeans, isDefault, readListPrefs, saveListPrefs, sortBeans, type BeanFacts, type ListCtx } from '../src/core/zakkenlijst.ts';

const row = (id: string, name: string, o: Partial<BeanRow> = {}): BeanRow => ({ id, name, roaster: null, country: null, roastLevel: null, roastDate: null, bagSizeG: null, cups: 0, addedAt: 0, ...o });
// nieuwste eerst, zoals beanRows() levert
const rows = [
  row('d', 'Delta', { roastDate: '2026-10-30', cups: 1 }),
  row('c', 'charlie', { roastDate: '2026-09-01', cups: 5 }),
  row('b', 'Bravo', { cups: 5 }),
  row('a', 'Alfa', { roastDate: '2026-11-05', cups: 0 })
];
const facts = new Map<string, BeanFacts>([['a', { fav: false, low: true, avg: null }], ['b', { fav: true, low: false, avg: 4.5 }], ['c', { fav: false, low: false, avg: 3 }], ['d', { fav: true, low: true, avg: 4.5 }]]);
const ctx: ListCtx = { facts, todayIso: '2026-11-07' };
const ids = (rs: readonly BeanRow[]): string => rs.map(r => r.id).join('');

test('sorteren: standaard = favorieten eerst, de rest nieuwste eerst', () => {
  assert.equal(ids(sortBeans(rows, 'standaard', ctx)), 'dbca');
});
test('sorteren op naam zonder hoofdletters en met gelijke namen stabiel', () => {
  assert.equal(ids(sortBeans(rows, 'naam', ctx)), 'abcd');
  assert.equal(ids(sortBeans([row('2', 'Zelfde'), row('1', 'Zelfde')], 'naam', ctx)), '12');
});
test('sorteren op versheid: vers eerst, zonder brandingsdatum achteraan', () => {
  assert.equal(ids(sortBeans(rows, 'vers', ctx)), 'adcb');
});
test('sorteren op waardering: hoogste eerst, onbekend achteraan, gelijk op naam; meest gezet op aantal koppen', () => {
  assert.equal(ids(sortBeans(rows, 'waardering', ctx)), 'bdca');
  assert.equal(ids(sortBeans(rows, 'gezet', ctx)), 'bcda');
});
test('sorteren verandert de invoer niet', () => {
  const copy = ids(rows); sortBeans(rows, 'naam', ctx); assert.equal(ids(rows), copy);
});
test('filteren: elk gekozen filter moet kloppen; vers = hoogstens 21 dagen na branding', () => {
  assert.equal(ids(filterBeans(rows, ['favoriet'], ctx)), 'db');
  assert.equal(ids(filterBeans(rows, ['bijna_op'], ctx)), 'da');
  assert.equal(ids(filterBeans(rows, ['vers'], ctx)), 'da');
  assert.equal(ids(filterBeans(rows, ['favoriet', 'bijna_op'], ctx)), 'd');
  assert.equal(ids(filterBeans(rows, ['favoriet', 'bijna_op', 'vers'], ctx)), 'd');
  assert.equal(ids(filterBeans(rows, [], ctx)), ids(rows), 'zonder filter blijft alles over');
  assert.equal(ids(filterBeans(rows, ['vers'], { facts, todayIso: '2026-11-20' })), 'da', 'precies 21 dagen telt nog mee');
  assert.equal(ids(filterBeans(rows, ['vers'], { facts, todayIso: '2026-11-21' })), 'a', 'een dag later valt de zak van 30 okt (22 dagen) af');
});
test('onthouden: terugkomen na opslaan, rommel en kapotte opslag geven de standaard', () => {
  const mem = new Map<string, string>();
  const s = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } };
  assert.equal(isDefault(readListPrefs(s)), true);
  saveListPrefs(s, { sort: 'naam', filters: ['bijna_op', 'favoriet'] });
  assert.deepEqual(readListPrefs(s), { sort: 'naam', filters: ['bijna_op', 'favoriet'] });
  mem.set('brewconsole.zakkenlijst', JSON.stringify({ sort: 'onzin', filters: ['favoriet', 'x', 'favoriet', 3] }));
  assert.deepEqual(readListPrefs(s), { sort: 'standaard', filters: ['favoriet'] });
  mem.set('brewconsole.zakkenlijst', '{kapot');
  assert.equal(isDefault(readListPrefs(s)), true);
  assert.equal(isDefault(readListPrefs({ getItem: () => { throw new Error('x'); } })), true);
});
