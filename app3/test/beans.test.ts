import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, scanBeanText } from '../../engine3/src/index.ts';
import type { Env } from '../src/core/ids.ts';
import { memoryStorage } from '../src/core/storage.ts';
import { createStore } from '../src/core/store.ts';
import { beanArchive, beanRestore, beanRows, beanUpsert, daysSinceRoast, editForm, emptyForm, formFromBean, scanText, validateForm } from '../src/core/beans.ts';

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

test('leegmaken wist het veld echt: tekst, proces, branding, datum, zakgrootte en notities', async () => {
  const store = await createStore(memoryStorage(), createEngine());
  const full = validateForm(scanText(env, TEXT), env);
  if (!full.ok) throw new Error('vol');
  const first = beanUpsert(env, null, full);
  await store.append([first]);
  const id = first.data.beanId;
  let form = formFromBean(store.snapshot().state, id)!;
  for (const k of ['region', 'variety', 'process', 'roastLevel', 'roastDate', 'bagSizeG', 'notes'] as const) form = editForm(form, k, '');
  const cleared = validateForm(form, env);
  if (!cleared.ok) throw new Error(JSON.stringify(cleared.problems));
  await store.append([beanUpsert(env, id, cleared)]);
  const after = formFromBean(store.snapshot().state, id)!;
  for (const k of ['region', 'variety', 'process', 'roastLevel', 'roastDate', 'bagSizeG', 'notes'] as const) assert.equal(after.values[k], '', k);
  assert.equal(after.values.country, 'Colombia', 'wat blijft staat er nog');
  assert.equal(after.values.name.length > 0, true);
});

test('koppen per zak: alleen afgeronde koppen tellen, net als de voorraad (audit 15 nov, P3-01)', async () => {
  const { seedLog } = await import('./seed.ts');
  const { factsOf } = await import('../../engine3/src/index.ts');
  const { beanDetail } = await import('../src/core/beans.ts');
  const { DEFAULT_FORM, brewPlanEvent, planBrew } = await import('../src/core/brew.ts');
  const { events } = await seedLog(2);
  const engine = createEngine();
  const beanId = (events.find(e => e.kind === 'bean.upsert') as { data: { beanId: string } }).data.beanId;
  const env2: Env = { now: () => Date.UTC(2026, 10, 1), uuid: () => 'gepland', device: 'test' };
  const form = { ...DEFAULT_FORM, beanId };
  const out = planBrew(engine, engine.learn(events), env2, form);
  assert.ok(out.ok);
  const state = engine.learn([...events, brewPlanEvent(env2, out.advice, form)]); // gepland, nooit gezet
  assert.equal(factsOf(state).beans.get(beanId)!.brewIds.length, 3, 'de engine houdt het geplande zetsel bij de zak');
  assert.equal(beanRows(state).find(r => r.id === beanId)!.cups, 2);
  assert.equal(beanDetail(state, beanId)!.cups, 2);
});

// Review 17 nov 2026, W2: gearchiveerde zakken terugzetten.
test('archiveren en terugzetten: de zak komt terug in de lijst, ook na twee keer archiveren', async () => {
  let t = NOW; let k = 0;
  const env = { now: () => ++t, uuid: () => `r${++k}`, device: 'test' }; // een klok die doorloopt: eerst aanmaken, dan archiveren
  const store = await createStore(memoryStorage(), createEngine());
  const r = validateForm(editForm(scanText(env, ''), 'name', 'Archiefzak'), env);
  assert.ok(r.ok); if (!r.ok) return;
  const bean = beanUpsert(env, null, r);
  await store.append([bean]);
  const id = bean.data.beanId;
  await store.append([beanArchive(env, id)]);
  await store.append([beanArchive(env, id)]);
  assert.equal(beanRows(store.snapshot().state).length, 0);
  assert.deepEqual(beanRows(store.snapshot().state, { archived: true }).map(x => x.name), ['Archiefzak']);
  const back = beanRestore(env, store.snapshot().events, id);
  assert.equal(back.length, 2, 'beide archiveringen ingetrokken');
  assert.ok(back.every(e => e.kind === 'retract'));
  await store.append(back);
  assert.deepEqual(beanRows(store.snapshot().state).map(x => x.name), ['Archiefzak']);
  assert.equal(beanRows(store.snapshot().state, { archived: true }).length, 0);
  assert.equal(beanRestore(env, store.snapshot().events, id).length, 0, 'niets meer in te trekken');
});

// Review 17 nov 2026, U3: de QR-code in de zakfoto vult alleen lege velden.
import { fillEmpty } from '../src/core/beans.ts';
test('fillEmpty: alleen lege velden, met de bron van de scan; wat je typte blijft staan', () => {
  const typed = editForm(editForm(emptyForm(), 'name', 'Mijn naam'), 'country', 'Ethiopië');
  const scan = scanText(env, 'Name: Kenia Kiambu\nOrigin: Kenya\nProcess: Washed\nRoast: Light', 'qr');
  const { form, filled } = fillEmpty(typed, scan);
  assert.equal(form.values.name, 'Mijn naam');
  assert.equal(form.sources.name, 'user');
  assert.equal(form.values.country, 'Ethiopië', 'getypt land blijft');
  assert.equal(form.values.process, 'washed');
  assert.equal(form.sources.process, 'qr');
  assert.equal(form.values.roastLevel, 'light');
  assert.equal(form.values.region, 'Kiambu');
  assert.equal(filled, 3, 'regio, proces en branding');
  assert.ok(form.scanProcess, 'het procesdetail van de scan gaat mee');
  const r = validateForm(form, env);
  assert.ok(r.ok);
  // niets leeg: niets aangevuld
  assert.equal(fillEmpty(form, scan).filled, 0);
});
