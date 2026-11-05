import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { countsBy, cupsOf, factsOf, learnFacts } from '../src/state.ts';
import { migrateBackupV3 } from '../src/migrate/v3.ts';
import { BACKUP_V3 } from './fixtures.ts';
import type { BrewPlanEvent, EngineEvent, Recipe, TimerType } from '../src/types.ts';
import type { Clicks, EpochMs, Grams, Seconds } from '../src/units.ts';

const migrated = migrateBackupV3(BACKUP_V3).events;
const g = (n: number) => n as Grams;
const s = (n: number) => n as Seconds;
let n = 0;
const ev = <K extends EngineEvent['kind']>(kind: K, at: number, data: Extract<EngineEvent, { kind: K }>['data']): EngineEvent =>
  ({ id: `t${++n}`, at: at as EpochMs, device: 'test', v: 1, kind, data } as unknown as EngineEvent);

const recipe: Recipe = {
  technique: 'kasuya_46', method: 'v60', doseG: g(20), waterG: g(300), bypassG: g(0), tempC: null, grindClick: 16 as Clicks,
  pours: [
    { atSec: s(0), addG: g(50), toG: g(50), style: 'spiral', agitationAfter: 'none', waitForDrain: false },
    { atSec: s(45), addG: g(250), toG: g(300), style: 'spiral', agitationAfter: 'none', waitForDrain: true }
  ],
  expectedEndSec: null
};
const plan = (brewId: string, beanId: string | null, at: number, r: Recipe = recipe): EngineEvent =>
  ev('brew.plan', at, { brewId, beanId, goal: null, engine: { name: 'e2', version: '1' }, recipe: r, trialId: null, legacy: null });
const timer = (brewId: string, at: number, type: TimerType, tSec: number, pourIndex: number | null = null): EngineEvent =>
  ev('brew.timer', at, { brewId, type, tSec: s(tSec), pourIndex });
const bean = (beanId: string, at: number, fields: object, sources: object = {}): EngineEvent =>
  ev('bean.upsert', at, { beanId, fields, sources, legacy: null } as never);

test('de gemigreerde back-up geeft dezelfde tellingen als de bron', () => {
  const st = learnFacts(migrated);
  assert.equal(st.beans.size, 2);
  assert.equal(st.cups.size, 2);
  assert.deepEqual(st.notes, []);
  assert.equal(st.trials.size, 1);
  assert.equal(st.settings.brightLighter, false);
  assert.equal(cupsOf(st, { beanId: 'bean_1', tasted: true }).length, 2);
  assert.equal(cupsOf(st, { tasted: true }).filter(c => c.tasting!.strength !== null).length, 1);
  assert.equal(countsBy(st, c => c.technique).get('kasuya_46'), 1);
});
test('dezelfde toestand bij elke volgorde en dubbeling', () => {
  const ref = JSON.stringify(strip(learnFacts(migrated)));
  fc.assert(fc.property(fc.shuffledSubarray(migrated, { minLength: migrated.length }), fc.boolean(), (shuffled, dup) => {
    const log = dup ? [...shuffled, ...shuffled] : shuffled;
    assert.equal(JSON.stringify(strip(learnFacts(log))), ref);
  }), { numRuns: 100 });
});
test('boonvelden: de laatste wint per veld, de rest blijft', () => {
  const st = learnFacts([
    bean('b1', 1, { name: 'Eerste', roaster: 'Rooster A' }, { name: 'user' }),
    bean('b1', 2, { name: 'Tweede' }, { name: 'ocr' }),
    ev('bean.archive', 3, { beanId: 'b1' })
  ]);
  const b = st.beans.get('b1')!;
  assert.equal(b.fields.name, 'Tweede');
  assert.equal(b.fields.roaster, 'Rooster A');
  assert.equal(b.sources.name, 'ocr');
  assert.equal(b.archived, true);
});
test('timer: erdoor per giet, ongedaan maken, einde en laatste doorlooptijd', () => {
  const st = learnFacts([
    bean('b1', 1, { name: 'Zak' }), plan('c1', 'b1', 10),
    timer('c1', 11, 'start', 0), timer('c1', 12, 'drained', 40, 0), timer('c1', 13, 'drained_undo', 41, 0), timer('c1', 14, 'drained', 44, 0),
    timer('c1', 15, 'drained', 210, 1), timer('c1', 16, 'bed_dry', 205), timer('c1', 17, 'complete', 215)
  ]);
  const c = st.cups.get('c1')!;
  assert.deepEqual([...c.drainedAtSec], [[0, 44], [1, 210]]);
  assert.equal(c.lastDrainSec, 165); // 210 − 45
  assert.equal(c.bedDrySec, 205);
  assert.equal(c.endSec, 215);
  assert.equal(c.status, 'complete');
  assert.equal(c.startedAtSec, 0);
});
test('afgebroken en nog niet gestarte zetsels hebben de juiste status', () => {
  const st = learnFacts([plan('c1', null, 1), plan('c2', null, 2), timer('c2', 3, 'start', 0), plan('c3', null, 4), timer('c3', 5, 'start', 0), timer('c3', 6, 'abandon', 20)]);
  assert.deepEqual(['c1', 'c2', 'c3'].map(id => st.cups.get(id)!.status), ['planned', 'brewing', 'abandoned']);
});
test('werkelijke waarden gaan boven het plan; zonder actuals geldt het plan', () => {
  const st = learnFacts([
    plan('c1', null, 1), plan('c2', null, 2),
    ev('brew.actuals', 3, { brewId: 'c1', doseG: g(19.4), waterG: g(300), grindClick: 17 as Clicks, bypassG: null, cupG: g(260), tdsPct: 1.2 as never, technique: null })
  ]);
  const c1 = st.cups.get('c1')!; const c2 = st.cups.get('c2')!;
  assert.equal(c1.doseG, 19.4); assert.equal(c1.grindClick, 17); assert.equal(c1.bypassG, 0); assert.equal(c1.cupG, 260); assert.equal(c1.actualsGiven, true);
  assert.equal(c2.doseG, 20); assert.equal(c2.grindClick, 16); assert.equal(c2.actualsGiven, false);
});
test('verwijderen en intrekken halen een zetsel of oordeel weg; een tweede oordeel vervangt het eerste', () => {
  const t1 = ev('tasting', 5, { brewId: 'c1', minutesAfter: null, late: false, strength: 1, acidity: null, finish: [], liking: null, goalHit: null, vsLast: null, missed: null, cata: [], noteHits: [], legacyScores: null, note: '' });
  const t2 = ev('tasting', 6, { brewId: 'c1', minutesAfter: null, late: false, strength: 0, acidity: null, finish: [], liking: null, goalHit: null, vsLast: null, missed: null, cata: [], noteHits: [], legacyScores: null, note: '' });
  assert.equal(learnFacts([plan('c1', null, 1), t1, t2]).cups.get('c1')!.tasting!.strength, 0);
  assert.equal(learnFacts([plan('c1', null, 1), t1, t2, ev('retract', 7, { targetId: t2.id, reason: 'x' })]).cups.get('c1')!.tasting!.strength, 1);
  assert.equal(learnFacts([plan('c1', null, 1), t1, ev('brew.delete', 8, { brewId: 'c1' })]).cups.size, 0);
});
test('gebeurtenissen zonder plan of zonder zak worden gemeld, niet verzonnen', () => {
  const st = learnFacts([timer('weg', 1, 'start', 0), plan('c1', 'onbekend', 2), ev('bean.archive', 3, { beanId: 'nergens' })]);
  assert.equal(st.cups.size, 1);
  assert.equal(st.notes.length, 3);
});
test('filters: per zak, techniek, hoeveelheid, status; volgorde op tijd', () => {
  const r15: Recipe = { ...recipe, doseG: g(15), waterG: g(225) };
  const st = learnFacts([bean('b1', 0, { name: 'A' }), plan('late', 'b1', 30), plan('vroeg', 'b1', 10, r15), plan('andere', null, 20)]);
  assert.deepEqual(cupsOf(st).map(c => c.brewId), ['vroeg', 'andere', 'late']);
  assert.deepEqual(cupsOf(st, { beanId: 'b1', waterG: g(225) }).map(c => c.brewId), ['vroeg']);
  assert.deepEqual(st.beans.get('b1')!.brewIds, ['vroeg', 'late']);
  assert.equal(cupsOf(st, { status: 'complete' }).length, 0);
});
test('een vreemde toestand wordt geweigerd', () => {
  assert.throws(() => factsOf({} as never), /onbekende engine-toestand/);
});

function strip(st: ReturnType<typeof learnFacts>) {
  return {
    beans: [...st.beans].sort(), cups: [...st.cups].map(([k, v]) => [k, { ...v, drainedAtSec: [...v.drainedAtSec] }]).sort(),
    order: st.cupOrder, trials: [...st.trials], settings: st.settings, notes: st.notes, count: st.eventCount, last: st.lastEventAt
  };
}
// Typecontrole dat een Plan-gebeurtenis de verwachte vorm heeft.
void (null as unknown as BrewPlanEvent);
