import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, scanBeanText } from '../../engine3/src/index.ts';
import type { Env } from '../src/core/ids.ts';
import { memoryStorage } from '../src/core/storage.ts';
import { createStore } from '../src/core/store.ts';
import { beanArchive, beanRows, beanUpsert, daysSinceRoast, editForm, emptyForm, formFromBean, scanText, validateForm } from '../src/core/beans.ts';

const NOW = Date.UTC(2026, 10, 5, 12);
let n = 0;
const env: Env = { now: () => NOW, uuid: () => `u${++n}`, device: 'test' };

const TEXT = `Finca La Esperanza
Colombia, Huila
Variety: Caturra
Process: Washed
Roast: Light
Roasted on: 2026-10-20
Notes: jasmine, peach, black tea
250g`;

test('plakken geeft dezelfde velden als scanBeanText, elk met herkomst', () => {
  const form = scanText(env, TEXT);
  const scan = scanBeanText(TEXT, { source: 'paste', nowMs: NOW });
  assert.equal(form.values.country, scan.fields.country);
  assert.equal(form.values.roastLevel, scan.fields.roastLevel);
  assert.equal(form.values.roastDate, scan.fields.roastDate);
  assert.equal(form.sources.country, 'paste');
  assert.ok(form.values.notes.length > 0);
});

test('een aangepast veld krijgt bron "user"; een onaangeraakt veld houdt zijn bron', () => {
  let form = scanText(env, TEXT);
  const before = form.values.variety;
  form = editForm(form, 'name', 'Mijn eigen naam');
  form = editForm(form, 'variety', before);
  assert.equal(form.sources.name, 'user');
  assert.equal(form.sources.variety, form.sources.variety === 'user' ? 'user' : 'paste');
  assert.notEqual(form.sources.country, 'user');
});

test('valideren: naam verplicht, datum en gewicht gecontroleerd', () => {
  let form = editForm(emptyForm(), 'roastDate', '2027-01-01');
  form = editForm(form, 'bagSizeG', '5');
  const r = validateForm(form, env);
  assert.equal(r.ok, false);
  if (!r.ok) { assert.ok(r.problems.name && r.problems.roastDate && r.problems.bagSizeG); }
  const ok = validateForm(editForm(editForm(emptyForm(), 'name', 'Test'), 'bagSizeG', '250'), env);
  assert.equal(ok.ok, true);
  if (ok.ok) { assert.equal(ok.fields.bagSizeG, 250); assert.equal(ok.sources.name, 'user'); }
});

test('opslaan → lijst → bewerken → archiveren', async () => {
  const store = await createStore(memoryStorage(), createEngine());
  const r = validateForm(scanText(env, TEXT), env);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const ev = beanUpsert(env, null, r);
  await store.append([ev]);
  const rows = beanRows(store.snapshot().state);
  assert.equal(rows.length, 1);
  const id = rows[0]!.id;
  assert.equal(rows[0]!.bagSizeG, 250);

  let form = formFromBean(store.snapshot().state, id)!;
  form = editForm(form, 'roaster', 'Kleine Brander');
  const r2 = validateForm(form, env);
  assert.ok(r2.ok);
  if (r2.ok) await store.append([beanUpsert(env, id, r2)]);
  assert.equal(beanRows(store.snapshot().state)[0]!.roaster, 'Kleine Brander');
  assert.equal(beanRows(store.snapshot().state)[0]!.country, rows[0]!.country);

  await store.append([beanArchive(env, id)]);
  assert.equal(beanRows(store.snapshot().state).length, 0);
  assert.equal(beanRows(store.snapshot().state, { archived: true }).length, 1);
});

test('dagen sinds branding', () => {
  assert.equal(daysSinceRoast('2026-10-20', '2026-11-05'), 16);
  assert.equal(daysSinceRoast(null, '2026-11-05'), null);
  assert.equal(daysSinceRoast('2026-12-01', '2026-11-05'), null);
});
