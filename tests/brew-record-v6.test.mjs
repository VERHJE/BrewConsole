// NIEUW (Brew Intelligence v2, Fase 1): het v6-brouwrecord — levenscyclus, migratie van
// schema 1–5, de afgeleide logboekweergave, zachte verwijdering en herstel na onderbreking.
// Alles hier zijn pure functies (geen DOM, geen opslag); de koppeling met de brouwflow
// wordt in kernflow.smoke.test.mjs getest.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './load-app.mjs';

const { api } = loadApp();
// Objecten uit de vm-sandbox hebben een ander Object.prototype; deepStrictEqual vergelijkt
// ook prototypes. Via JSON normaliseren (records zijn per ontwerp pure JSON).
const j = (x) => JSON.parse(JSON.stringify(x));
const T0 = 1_760_000_000_000;

function sampleRecipe(){
  return api.computeRecipe('v60', 'medium', 'klassiek', 300, 'washed', false, 10, null, false, false, null, 0);
}
function sampleRecord(overrides = {}){
  return api.createBrewRecord(Object.assign({
    id: 'brew_test', nowMs: T0, beanId: 'bean-a',
    bean: { id: 'bean-a', process: 'natural', intendedUse: 'filter', roastLevel: 'light', roastDate: '2026-09-01' },
    method: 'v60', profile: 'klassiek', roast: 'medium', waterMl: 300, recipe: sampleRecipe(),
    strengthAdjust: 0, bypass: false, bypassPct: 30, bypassMoment: 'achteraf',
    water: { hardnessMgL: 120, alkalinity: { value: null, unit: 'CaCO3' }, dilution: { tapParts: 1, demiParts: 0 } }
  }, overrides));
}

// Schema 1–5-fixtures zoals oudere app-versies ze echt schreven.
const LEGACY = {
  v1: { id: 'log_v1', timestamp: T0 - 5e8, beanId: 'bean-a', method: 'v60', profile: 'klassiek', roast: 'medium',
        waterMl: 300, bypass: false, grindMicron: 650, grindStand: null, temp: 94,
        scores: { aroma: 3, zuur: 2, zoet: 3, body: 2, bitter: 1, aftersmaak: 2 }, note: 'oud' },
  v2: { id: 'log_v2', schemaVersion: 2, timestamp: T0 - 4e8, beanId: null, method: 'v60', profile: 'klassiek', roast: 'medium',
        waterMl: 300, bypass: false, grindMicron: 650, grindStand: null, temp: 94, scores: {}, note: '',
        doseG: 17.3, ratioText: '1:17,4', actualGrindClicks: 21, actualTimeSec: 185, cupWeightG: 262.5,
        waterProfileSnapshot: { hardnessMgL: 128 } },
  v3: { id: 'log_v3', schemaVersion: 3, timestamp: T0 - 3e8, beanId: 'bean-a', method: 'chemex', profile: 'klassiek', roast: 'light',
        waterMl: 600, bypass: false, scores: {}, note: '', doseG: 34.6, actualGrindClicks: null, actualTimeSec: 247,
        cupWeightG: null, grindStartingPoint: 15, approved: true },
  v4: { id: 'log_v4', schemaVersion: 4, timestamp: T0 - 2e8, beanId: 'bean-a', method: 'v60', profile: 'klassiek', roast: 'medium',
        waterMl: 300, bypass: false, scores: {}, note: '', doseG: 17.3, approved: false, grindStartingPoint: 16,
        beanSnapshot: { process: 'washed', intendedUse: 'filter', roastLevel: 'medium' }, favorite: true },
  v5: { id: 'log_v5', schemaVersion: 5, timestamp: T0 - 1e8, beanId: 'bean-a', method: 'v60', profile: 'klassiek', roast: 'medium',
        waterMl: 300, bypass: true, bypassPct: 40, pourWaterG: 180, bypassPlannedG: 120, bypassActualG: 115, bypassMoment: 'achteraf',
        scores: {}, note: '', doseG: 17.3, actualGrindClicks: null, actualTimeSec: 200, cupWeightG: null,
        suggestion: { pattern: 'onder_extractie', voorstel: 'fijner' } }
};

describe('Fase 1 — v6-record bij Start', () => {
  test('een nieuw record staat op brewing, met een gemeten start-gebeurtenis en een bevroren plan', () => {
    const rec = sampleRecord();
    const recipe = sampleRecipe();
    assert.equal(rec.schemaVersion, 6);
    assert.equal(rec.lifecycle, 'brewing');
    assert.deepEqual(j(rec.actual.events), [{ type: 'start', at: T0, source: 'M', tSec: 0 }]);
    assert.equal(rec.plan.doseG, recipe.dose);
    assert.equal(rec.plan.expectedTotalSec, recipe.totalTime);
    assert.deepEqual(j(rec.plan.steps), j(recipe.steps.map(s => ({ t: s.t, add: s.add }))));
    assert.equal(rec.beanSnapshot.roastDate, '2026-09-01', 'boon-momentopname bij Start');
    assert.equal(rec.sideEffectsAppliedAt, null, 'bijwerkingen horen niet bij Start');
  });

  test('geen verzonnen werkelijke waarden: dosis, maling en bed-droog zijn onbekend tot iemand ze invult of meet', () => {
    const a = sampleRecord().actual;
    assert.equal(a.doseG, null);
    assert.equal(a.grindClick, null);
    assert.equal(a.bedDrySec, null);
    assert.equal(a.confirmed, false);
  });

  test('het plan is een kopie: het recept achteraf wijzigen verandert het record niet', () => {
    const recipe = sampleRecipe();
    const rec = sampleRecord({ recipe });
    recipe.steps[0].add = 999;
    assert.notEqual(rec.plan.steps[0].add, 999);
  });

  test('een record met gebeurtenissen blijft ruim onder ~3 KB (opslagbudget localStorage)', () => {
    let rec = sampleRecord();
    for (let i = 0; i < 6; i++) rec = api.applyBrewEvent(rec, i % 2 ? 'resume' : 'pause', T0 + i * 1000, { tSec: i * 10 }).rec;
    rec = api.applyBrewEvent(rec, 'complete', T0 + 200000, { source: 'I' }).rec;
    assert.ok(JSON.stringify(rec).length < 3500, `record is ${JSON.stringify(rec).length} bytes`);
  });
});

describe('Fase 1 — levenscyclus', () => {
  const LIFECYCLES = ['brewing', 'completed', 'logged', 'abandoned'];
  const EVENTS = ['complete', 'abandon', 'log', 'pause', 'resume', 'schedule_end', 'recovered'];
  const EXPECTED = {
    brewing:   { complete: 'completed', abandon: 'abandoned', pause: 'brewing', resume: 'brewing', schedule_end: 'brewing', recovered: 'brewing' },
    completed: { log: 'logged' },
    logged:    { log: 'logged' },
    abandoned: {}
  };
  for (const lc of LIFECYCLES){
    for (const ev of EVENTS){
      const expected = EXPECTED[lc][ev];
      test(`${lc} + ${ev} → ${expected || 'geweigerd'}`, () => {
        const rec = Object.assign(sampleRecord(), { lifecycle: lc });
        const before = JSON.stringify(rec);
        const r = api.applyBrewEvent(rec, ev, T0 + 1000);
        assert.equal(JSON.stringify(rec), before, 'het originele record mag nooit gemuteerd worden');
        if (expected){
          assert.equal(r.ok, true);
          assert.equal(r.rec.lifecycle, expected);
          assert.equal(r.rec.actual.events.at(-1).type, ev);
        } else {
          assert.equal(r.ok, false);
          assert.equal(r.rec, rec);
        }
      });
    }
  }

  test('complete zet completedAt; herkomst van een schema-einde is I (afgeleid), nooit M', () => {
    const r = api.applyBrewEvent(sampleRecord(), 'complete', T0 + 180000, { source: 'I', tSec: 180 });
    assert.equal(r.rec.actual.completedAt, T0 + 180000);
    assert.equal(r.rec.actual.events.at(-1).source, 'I');
    assert.equal(r.rec.actual.bedDrySec, null, 'een schema-einde is geen bed-droog-meting');
  });
});

describe('Fase 1 — migratie schema 1–5 → 6', () => {
  for (const [name, entry] of Object.entries(LEGACY)){
    test(`${name}: gemigreerd zonder verzonnen werkelijke waarden, origineel integraal bewaard`, () => {
      const rec = api.migrateLegacyLogEntry(entry, 0);
      assert.equal(rec.schemaVersion, 6);
      assert.equal(rec.lifecycle, 'logged');
      assert.equal(rec.id, entry.id);
      assert.deepEqual(j(rec.legacy.entry), entry);
      assert.equal(rec.actual.doseG, null, 'de oude doseG was de geplande dosis, geen werkelijke');
      assert.equal(rec.plan.doseG, entry.doseG ?? null);
      assert.equal(rec.actual.bedDrySec, null);
      assert.deepEqual(j(rec.actual.events), []);
      assert.equal(rec.actual.grindClick, entry.actualGrindClicks ?? null);
      assert.equal(rec.actual.grindSource, entry.actualGrindClicks != null ? 'U' : null);
      assert.equal(rec.legacy.scheduledSec, typeof entry.actualTimeSec === 'number' ? entry.actualTimeSec : null);
      assert.equal(rec.equipment.grinderId, null, 'molen was toen niet vastgelegd — niet invullen');
      assert.equal(rec.favorite, entry.favorite === true);
    });

    test(`${name}: de logboekweergave is het origineel, met schema-tijd i.p.v. "werkelijke" tijd`, () => {
      const view = api.brewRecordToLogView(api.migrateLegacyLogEntry(entry, 0));
      const expected = JSON.parse(JSON.stringify(entry));
      delete expected.actualTimeSec;
      if (typeof entry.actualTimeSec === 'number') expected.scheduledTimeSec = entry.actualTimeSec;
      expected.beanId = entry.beanId || null;
      if (!entry.favorite) delete expected.favorite;
      assert.deepEqual(j(view), expected);
      assert.equal('actualTimeSec' in view, false);
    });
  }

  test('een ontbrekende beanSnapshot blijft ontbreken (C-2-discipline: live terugval blijft werken)', () => {
    const view = api.brewRecordToLogView(api.migrateLegacyLogEntry(LEGACY.v3, 0));
    assert.equal('beanSnapshot' in view, false);
  });

  test('migreren is deterministisch en idempotent op id (twee keer migreren = zelfde record)', () => {
    assert.deepEqual(j(api.migrateLegacyLogEntry(LEGACY.v5, 0)), j(api.migrateLegacyLogEntry(LEGACY.v5, 0)));
  });
});

describe('Fase 1 — logboekweergave van een nieuw record', () => {
  function loggedRecord(){
    let rec = sampleRecord();
    rec = api.applyBrewEvent(rec, 'complete', T0 + 180000, { source: 'I' }).rec;
    rec = api.applyBrewEvent(rec, 'log', T0 + 400000).rec;
    rec.tasting = { at: T0 + 400000, minutesAfterBrew: 4, scores: { aroma: 3 }, note: 'lekker', approved: true, cuppingSuggestion: null };
    rec.actual.grindClick = 15; rec.actual.grindSource = 'U';
    return rec;
  }
  test('bevat elk veld dat de lezers (historie, leerlus, retentie) verwachten', () => {
    const v = api.brewRecordToLogView(loggedRecord());
    for (const k of ['id', 'schemaVersion', 'timestamp', 'beanId', 'method', 'profile', 'roast', 'waterMl', 'bypass',
      'bypassPct', 'pourWaterG', 'bypassPlannedG', 'bypassActualG', 'bypassMoment', 'grindMicron', 'grindStand', 'temp',
      'scores', 'note', 'doseG', 'ratioText', 'modelPolicyVersion', 'actualGrindClicks', 'cupWeightG',
      'grindStartingPoint', 'approved', 'beanSnapshot', 'waterProfileSnapshot', 'scheduledTimeSec']){
      assert.ok(k in v, `veld ${k} ontbreekt in de weergave`);
    }
    assert.equal(v.schemaVersion, 6);
    assert.equal(v.timestamp, T0 + 400000, 'tijdstempel = moment van proeven, zoals voorheen');
    assert.equal(v.actualGrindClicks, 15);
    assert.equal(v.approved, true);
    assert.equal('actualTimeSec' in v, false, 'nooit meer een schema-tijd als werkelijke tijd');
  });
  test('alleen gelogde, niet-verwijderde records staan in het logboek', () => {
    const rec = loggedRecord();
    assert.equal(api.isBrewInLogView(rec), true);
    assert.equal(api.isBrewInLogView(Object.assign({}, rec, { deletedAt: T0 })), false);
    assert.equal(api.isBrewInLogView(sampleRecord()), false, 'brewing');
    assert.equal(api.isBrewInLogView(api.applyBrewEvent(sampleRecord(), 'abandon', T0).rec), false, 'abandoned');
  });
});

describe('Fase 1 — zachte verwijdering en herstel na onderbreking', () => {
  test('verwijderde records blijven 30 dagen bewaard en verdwijnen daarna', () => {
    const DAY = 24 * 3600 * 1000;
    const store = [
      { id: 'a', deletedAt: null },
      { id: 'b', deletedAt: T0 - 29 * DAY },
      { id: 'c', deletedAt: T0 - 31 * DAY }
    ];
    assert.deepEqual(j(api.purgeDeletedBrews(store, T0).map(r => r.id)), ['a', 'b']);
    assert.equal(api.SOFT_DELETE_RETENTION_MS, 30 * DAY);
  });

  test('een brewing-record blijft staan binnen schema + 15 min, daarna wordt het voltooid', () => {
    const rec = sampleRecord();
    const plan = rec.plan.expectedTotalSec;
    assert.equal(api.staleBrewingOutcome(rec, T0 + (plan + 60) * 1000), 'keep');
    assert.equal(api.staleBrewingOutcome(rec, T0 + (plan + api.STALE_BREWING_GRACE_SEC + 1) * 1000), 'complete');
    assert.equal(api.staleBrewingOutcome(api.applyBrewEvent(rec, 'abandon', T0).rec, T0 + 1e9), 'none');
  });
});
