import test from 'node:test';
import assert from 'node:assert/strict';
import { favFirst, groupByMonth, matches, readFavs, restView, toggleFav, monthLabel } from '../src/core/ronde2.ts';

test('matches: alle woorden, zonder hoofdletters en accenten', () => {
  assert.equal(matches('Finca La Esperanza · Colombia', 'colombia esper'), true);
  assert.equal(matches('Ethiopië Guji', 'ethiopie'), true);
  assert.equal(matches('Kenia', 'kenia natuurlijk'), false);
  assert.equal(matches('iets', '   '), true);
});

test('groupByMonth: nieuwste eerst, per kalendermaand', () => {
  const t = (iso: string): { at: number } => ({ at: Date.parse(iso) });
  const g = groupByMonth([t('2026-11-05T10:00:00Z'), t('2026-11-01T10:00:00Z'), t('2026-10-31T23:00:00Z')]);
  assert.deepEqual(g.map(x => [x.label, x.rows.length]), [['november 2026', 2], ['oktober 2026', 1]]);
  assert.equal(monthLabel(Date.parse('2027-01-02T00:00:00Z')), 'januari 2027');
});

test('favorieten: aan/uit, eerst in de lijst, rommel in opslag wordt genegeerd', () => {
  const mem = new Map<string, string>();
  const s = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } };
  assert.equal(toggleFav(s, 'b'), true);
  assert.deepEqual([...readFavs(s)], ['b']);
  assert.deepEqual(favFirst([{ id: 'a' }, { id: 'b' }, { id: 'c' }], readFavs(s)).map(r => r.id), ['b', 'a', 'c']);
  assert.equal(toggleFav(s, 'b'), false);
  mem.set('brewconsole.favs', '{kapot');
  assert.equal(readFavs(s).size, 0);
});

test('restView: grenzen en onbekend', () => {
  assert.equal(restView(null), null);
  assert.equal(restView(2)!.label, 'Nog jong');
  assert.equal(restView(5)!.label, 'Bijna op dreef');
  assert.equal(restView(14)!.label, 'Op dreef');
  assert.equal(restView(40)!.label, 'Nog goed');
  assert.equal(restView(90)!.label, 'Oud');
});
