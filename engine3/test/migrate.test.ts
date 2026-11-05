import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateBackupV3 } from '../src/migrate/v3.ts';
import { effectiveEvents, validateEvent } from '../src/events.ts';
import type { EngineEvent } from '../src/types.ts';
import { BACKUP_V3 } from './fixtures.ts';

const { events, report } = migrateBackupV3(BACKUP_V3);
const of = <K extends EngineEvent['kind']>(k: K) => events.filter((e): e is Extract<EngineEvent, { kind: K }> => e.kind === k);

test('elke gemigreerde gebeurtenis is geldig', () => {
  assert.deepEqual(events.flatMap(e => validateEvent(e)), []);
});
test('deterministisch: twee keer migreren geeft exact hetzelfde logboek', () => {
  assert.equal(JSON.stringify(migrateBackupV3(BACKUP_V3).events), JSON.stringify(events));
});
test('id\'s zijn uniek', () => {
  assert.equal(new Set(events.map(e => e.id)).size, events.length);
});
test('bonen: velden en proces in drie assen, niets verzonnen', () => {
  const [b1, b2] = of('bean.upsert');
  assert.equal(b1!.data.fields.name, 'Kenia Test');
  assert.deepEqual(b1!.data.fields.altitude, { minM: 1800, maxM: 1800 });
  assert.deepEqual(b1!.data.fields.notes, { raw: ['Zwarte thee', 'Cassis / zwarte bes', 'aloe vera'], tags: ['Zwarte thee', 'Cassis / zwarte bes'], unmapped: ['aloe vera'] });
  assert.equal(b1!.data.sources.name, 'migrated');
  assert.deepEqual(b2!.data.fields.process, { base: 'unknown', fermentation: ['anaerobic'], experimental: true, decaf: 'other', ambiguousTerm: null });
  assert.equal(b2!.data.fields.roastDate, null, 'ongeldige datum wordt null, niet geraden');
});
test('zetsel: plan, giettijden, timer, werkelijke waarden en proef', () => {
  const plan = of('brew.plan').find(e => e.data.brewId === 'brew_a')!;
  assert.equal(plan.data.recipe.technique, 'kasuya_46');
  assert.deepEqual(plan.data.recipe.pours.map(p => [p.atSec, p.toG]), [[0, 50], [45, 120], [90, 180], [130, 240], [160, 300]]);
  assert.equal(plan.data.recipe.grindClick, 16);
  assert.equal(plan.data.engine.version, 'e2-2026.5');
  assert.equal(plan.data.legacy, null, 'geen diagnose of tip in deze kop: niets te bewaren');
  const timer = of('brew.timer').filter(e => e.data.brewId === 'brew_a');
  assert.deepEqual(timer.map(e => e.data.type), ['start', 'drained', 'complete', 'bed_dry'].filter(t => timer.some(e => e.data.type === t)));
  assert.equal(timer.find(e => e.data.type === 'drained')!.data.pourIndex, 2);
  const act = of('brew.actuals').find(e => e.data.brewId === 'brew_a')!;
  assert.equal(act.data.doseG, 16.3);
  const t = of('tasting').find(e => e.data.brewId === 'brew_a')!;
  assert.equal(t.data.strength, 1);
  assert.deepEqual(t.data.finish, ['bitter']);
  assert.equal(t.data.missed, 'sweet');
});
test('verwijderd zetsel valt weg uit het effectieve logboek, maar blijft in het logboek', () => {
  assert.ok(of('brew.delete').some(e => e.data.brewId === 'brew_b'));
  assert.ok(!effectiveEvents(events).some(e => 'brewId' in e.data && (e.data as { brewId: string }).brewId === 'brew_b'));
});
test('niets gaat verloren: oude app-gegevens van boon en kop staan in legacy', () => {
  const withTip = migrateBackupV3({ ...BACKUP_V3, beans: [{ ...BACKUP_V3.beans[0], favorite: true, doseUsedG: 120 }], brews: [{ ...BACKUP_V3.brews[0], recommendation: { lever: 'grind', delta: 1, outcome: 'better' } }] }).events;
  const bean = withTip.find(e => e.kind === 'bean.upsert');
  assert.deepEqual(bean && bean.kind === 'bean.upsert' ? bean.data.legacy : null, { favorite: true, doseUsedG: 120, schemaVersion: 5 });
  const plan = withTip.find(e => e.kind === 'brew.plan' && e.data.brewId === 'brew_a');
  assert.deepEqual(plan && plan.kind === 'brew.plan' ? plan.data.legacy : null, { recommendation: { lever: 'grind', delta: 1, outcome: 'better' } });
});
test('oude logregel: alleen als hij niet al als v6-zetsel bestaat; oude scores blijven bewaard', () => {
  assert.equal(report.counts['legacy_duplicate'], 1);
  const p = of('brew.plan').find(e => e.data.brewId === 'log_old')!;
  assert.equal(p.data.recipe.method, 'chemex');
  const t = of('tasting').find(e => e.data.brewId === 'log_old')!;
  assert.deepEqual(t.data.legacyScores, { aroma: 7, zuur: 6 });
  assert.equal(t.data.strength, null);
});
test('blind paar en instellingen; thema gaat niet mee', () => {
  const [pair] = of('pair.trial');
  assert.equal(pair!.data.preferred, 'variant');
  assert.equal(pair!.data.variant.doseG, 15.8);
  const keys = of('setting').map(e => e.data.key).sort();
  assert.deepEqual(keys, ['brightLighter', 'water']);
  assert.ok(!JSON.stringify(events).includes('"theme"'));
});
test('kapotte invoer: geen crash, wel een melding', () => {
  assert.deepEqual(migrateBackupV3(null).events, []);
  const r = migrateBackupV3({ backupVersion: 2, beans: [{}], brews: [{ id: 'x' }] });
  assert.ok(r.report.warnings.length >= 2);
});
