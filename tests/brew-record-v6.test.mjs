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

// ---------------------------------------------------------------------------------------
// NIEUW (Brew Intelligence v2, Fase 2): brouwscherm, bed droog, herstel.
// ---------------------------------------------------------------------------------------
describe('Fase 2 — verstreken tijd uit gebeurtenissen (herstel na herladen)', () => {
  test('zonder pauze: wandklok sinds start', () => {
    const r = api.elapsedFromEvents([{ type: 'start', at: T0 }], T0 + 95_400);
    assert.deepEqual(j(r), { elapsedSec: 95, paused: false });
  });
  test('pauzes tellen niet mee; een gesloten app wel', () => {
    const ev = [
      { type: 'start', at: T0 }, { type: 'pause', at: T0 + 30_000 },
      { type: 'resume', at: T0 + 90_000 }, { type: 'recovered', at: T0 + 200_000 }
    ];
    assert.equal(api.elapsedFromEvents(ev, T0 + 200_000).elapsedSec, 30 + 110);
  });
  test('op pauze gesloten: de tijd blijft staan en paused = true', () => {
    const ev = [{ type: 'start', at: T0 }, { type: 'pause', at: T0 + 42_000 }];
    assert.deepEqual(j(api.elapsedFromEvents(ev, T0 + 999_000)), { elapsedSec: 42, paused: true });
  });
});

describe('Fase 2 — brouwfase: giet tot / wacht / laten doorlopen', () => {
  const rec = api.computeRecipe('v60', 'medium', 'klassiek', 300, 'washed', false, 10, null, false, false, null, 0);
  const phase = (t) => j(api.brewPhaseAt(rec.steps, rec.totalTime, t));
  test('tijdens een giet: het DOEL op de weegschaal, niet een geschat "toegevoegd"-getal', () => {
    const p = phase(5);
    assert.equal(p.kind, 'pour');
    assert.equal(p.targetG, 60);
    assert.equal(p.pourIndex, 1);
    assert.equal(p.pourCount, 5);
    for (const k of Object.keys(p)) assert.doesNotMatch(k, /poured|added|current(?!Target)|sofar/i, `fase bevat een geschatte hoeveelheid: ${k}`);
  });
  test('tussen gieten: wachten met aftellen tot de volgende giet', () => {
    const p = phase(15);
    assert.equal(p.kind, 'wait');
    assert.equal(p.remainingSec, 30);
    assert.equal(p.nextTargetG, 120);
  });
  test('na de laatste giet: laten doorlopen; na de schatting telt de klok door', () => {
    assert.equal(phase(185).kind, 'pour');
    assert.equal(phase(185).targetG, 300);
    assert.equal(phase(195).kind, 'drawdown');
    assert.equal(phase(195).overPlanSec, 0);
    assert.equal(phase(222).overPlanSec, 12);
  });
  test('gieten met een expliciet eindmoment (endT) blijven "giet" tot dat moment', () => {
    const fc = api.computeRecipe('v60', 'medium', 'fresh_clean', 300, 'washed', false, 10, null, false, false, null, 0);
    const p = j(api.brewPhaseAt(fc.steps, fc.totalTime, 70));
    assert.equal(p.kind, 'pour');
    assert.equal(p.targetG, 180);
  });
  test('elke methode × profiel: fasen volgen elkaar logisch op en eindigen in drawdown', () => {
    for (const m of ['v60', 'chemex']){
      for (const prof of Object.keys(api.ENGINE_PROFILE_MAP)){
        const only = api.PROFILE_INFO[prof].methodOnly;
        if (only && only !== m) continue;
        const r = api.computeRecipe(m, 'medium', prof, m === 'v60' ? 300 : 600, 'washed', false, 10, null, false, false, null, 0);
        let lastTarget = 0;
        for (let t = 0; t <= r.totalTime + 30; t++){
          const p = api.brewPhaseAt(r.steps, r.totalTime, t);
          if (p.kind === 'pour'){ assert.ok(p.targetG >= lastTarget, `${m}/${prof} t=${t}: doel daalt`); lastTarget = p.targetG; }
        }
        assert.equal(api.brewPhaseAt(r.steps, r.totalTime, r.totalTime + 30).kind, 'drawdown', `${m}/${prof}`);
        assert.equal(lastTarget, r.steps.at(-1).to, `${m}/${prof}: laatste doel = totaal water`);
      }
    }
  });
  test('Einde: vóór het doorlopen = afgebroken, tijdens het doorlopen = voltooid', () => {
    assert.equal(api.endBrewDecision('pour'), 'abandon');
    assert.equal(api.endBrewDecision('wait'), 'abandon');
    assert.equal(api.endBrewDecision('drawdown'), 'complete');
  });
});

describe('Fase 2 — voltooien met bed droog', () => {
  test('met tik: bedDrySec gemeten (M) en het verschil met de schatting afgeleid', () => {
    const rec = sampleRecord();
    const r = api.completeWithBedDry(rec, T0 + 230_000, 224, 'bed_dry');
    assert.equal(r.ok, true);
    assert.equal(r.rec.lifecycle, 'completed');
    assert.equal(r.rec.actual.bedDrySec, 224);
    assert.equal(r.rec.derived.drainResidualSec, 224 - rec.plan.expectedDrainEndSec);
    const types = r.rec.actual.events.map(e => e.type);
    assert.deepEqual(j(types.slice(-2)), ['bed_dry', 'complete']);
    assert.equal(r.rec.actual.events.at(-2).source, 'M');
  });
  test('zonder tik: bed droog blijft null, geen afgeleid verschil, geen bed_dry-gebeurtenis', () => {
    const r = api.completeWithBedDry(sampleRecord(), T0 + 1e6, null, 'end');
    assert.equal(r.rec.actual.bedDrySec, null);
    assert.equal(r.rec.derived.drainResidualSec, null);
    assert.ok(!r.rec.actual.events.some(e => e.type === 'bed_dry'));
  });
  test('een afgebroken of al voltooid brouwsel kan niet (nog eens) bed droog krijgen', () => {
    const abandoned = api.applyBrewEvent(sampleRecord(), 'abandon', T0).rec;
    assert.equal(api.completeWithBedDry(abandoned, T0 + 1, 200, 'bed_dry').ok, false);
    const done = api.completeWithBedDry(sampleRecord(), T0 + 1, 200, 'bed_dry').rec;
    assert.equal(api.completeWithBedDry(done, T0 + 2, 210, 'bed_dry').ok, false);
  });
  test('de logboekweergave draagt de gemeten bed-droog-tijd mee', () => {
    let rec = api.completeWithBedDry(sampleRecord(), T0 + 230_000, 224, 'bed_dry').rec;
    rec = api.applyBrewEvent(rec, 'log', T0 + 300_000).rec;
    rec.tasting = { at: T0 + 300_000, scores: {}, note: '', approved: false };
    const v = api.brewRecordToLogView(rec);
    assert.equal(v.bedDrySec, 224);
    assert.equal(v.drainResidualSec, 224 - rec.plan.expectedDrainEndSec);
  });
});

describe('Fase 2 — recept terugrekenen voor herstel', () => {
  test('met bewaarde invoer: exact hetzelfde recept als bij Start', () => {
    const inputs = { method: 'v60', roast: 'medium', profile: 'klassiek', waterMl: 300, process: 'washed', experimental: false,
      roastDays: 10, altitude: null, bypass: false, fermentEvidence: false, waterHardnessMgL: null, strengthAdjust: 0, bypassPct: 30, bypassMoment: 'achteraf' };
    const recipe = api.computeRecipe('v60', 'medium', 'klassiek', 300, 'washed', false, 10, null, false, false, null, 0, 30);
    const rec = sampleRecord({ recipe, inputs });
    assert.deepEqual(j(api.recipeInputsFromRecord(rec)), inputs);
    const again = api.recomputeRecipeForRecord(rec);
    assert.deepEqual(j(again.steps), j(recipe.steps));
    assert.equal(again.dose, recipe.dose);
  });
  test('Fase 1-record zonder bewaarde invoer: gereconstrueerd uit het plan, zelfde schema', () => {
    const rec = sampleRecord();
    rec.plan.inputs = null;
    const again = api.recomputeRecipeForRecord(rec);
    assert.deepEqual(j(again.steps.map(s => ({ t: s.t, add: s.add }))), j(rec.plan.steps));
  });
});

// ---------------------------------------------------------------------------------------
// NIEUW (Brew Intelligence v2, Fase 3): proefkaart, gate, actuals-chip, vergelijking.
// ---------------------------------------------------------------------------------------
describe('Fase 3 — de gate "geslaagde kop"', () => {
  const good = { strength: 'just_right', acidity: 'lively', finish: ['sweet_clean'], liking: 4 };
  test('alles beantwoord, ≥4/5, geen "veel te …", geen doel → geslaagd', () => {
    const g = j(api.tastingGate(good, null));
    assert.deepEqual(g, { complete: true, missing: [], passed: true, reasons: [] });
  });
  test('ontbrekende antwoorden → niet compleet, nooit geslaagd', () => {
    const g = j(api.tastingGate({ strength: 'just_right' }, null));
    assert.equal(g.complete, false);
    assert.equal(g.passed, false);
    assert.deepEqual(g.missing, ['zuur', 'afdronk', 'hoe lekker']);
  });
  test('3 van 5 → niet geslaagd', () => {
    assert.equal(api.tastingGate(Object.assign({}, good, { liking: 3 }), null).passed, false);
  });
  test('"veel te sterk/slap" → niet geslaagd, ook bij 5 van 5', () => {
    for (const s of ['much_too_weak', 'much_too_strong']){
      assert.equal(api.tastingGate(Object.assign({}, good, { strength: s, liking: 5 }), null).passed, false, s);
    }
    assert.equal(api.tastingGate(Object.assign({}, good, { strength: 'too_strong' }), null).passed, true, '"te sterk" (niet "veel te") mag nog');
  });
  test('met een doel: pas geslaagd als het doel gehaald is ("bijna" telt niet)', () => {
    assert.deepEqual(j(api.tastingGate(good, 'bright').missing), ['doel']);
    assert.equal(api.tastingGate(Object.assign({}, good, { goalHit: 'almost' }), 'bright').passed, false);
    assert.equal(api.tastingGate(Object.assign({}, good, { goalHit: 'yes' }), 'bright').passed, true);
  });
});

describe('Fase 3 — proefkaart-antwoorden', () => {
  test('afdronk: meerdere mogelijk, maar "zoet & schoon" sluit de rest uit', () => {
    assert.deepEqual(j(api.toggleFinish([], 'bitter')), ['bitter']);
    assert.deepEqual(j(api.toggleFinish(['bitter'], 'drying')), ['bitter', 'drying']);
    assert.deepEqual(j(api.toggleFinish(['bitter', 'drying'], 'sweet_clean')), ['sweet_clean']);
    assert.deepEqual(j(api.toggleFinish(['sweet_clean'], 'hollow')), ['hollow']);
    assert.deepEqual(j(api.toggleFinish(['bitter'], 'bitter')), []);
  });
  test('buildTasting: minuten na voltooien, "laat" na 2 uur, geen 0–5-scores meer', () => {
    const t = api.buildTasting({ strength: 'just_right', acidity: 'lively', finish: ['sweet_clean'], liking: 5 }, T0 + 130 * 60000, T0, null);
    assert.equal(t.minutesAfterBrew, 130);
    assert.equal(t.late, true);
    assert.equal(t.approved, true);
    assert.equal(t.scores, null);
    assert.equal(api.buildTasting({}, T0 + 5 * 60000, T0, null).late, false);
  });
  test('buildTasting: het doelantwoord wordt alleen bewaard als er een doel was', () => {
    assert.equal(api.buildTasting({ goalHit: 'yes' }, T0, T0, null).goalHit, null);
    assert.equal(api.buildTasting({ goalHit: 'yes' }, T0, T0, 'rich').goalHit, 'yes');
  });
  test('drie doelen met een label en een criterium', () => {
    assert.deepEqual(Object.keys(api.BREW_GOALS), ['bright', 'balanced', 'rich']);
    for (const g of Object.values(api.BREW_GOALS)){ assert.ok(g.label && g.criterion); }
  });
});

describe('Fase 3 — actuals: bevestigd = U, niet bevestigd = I (telt niet mee)', () => {
  const plan = { doseG: 17.3, grindStartingPoint: 15 };
  const base = { doseG: null, doseSource: null, grindClick: null, grindSource: null, confirmed: false, cupWeightG: null };
  test('"zoals gepland" → plan-waarden als U, bevestigd', () => {
    const a = j(api.applyActuals(base, plan, 'planned'));
    assert.deepEqual([a.doseG, a.doseSource, a.grindClick, a.grindSource, a.confirmed], [17.3, 'U', 15, 'U', true]);
  });
  test('"anders" → ingevulde waarden als U; leeg blijft leeg', () => {
    const a = j(api.applyActuals(base, plan, 'edited', { doseG: 18, grindClick: null }));
    assert.deepEqual([a.doseG, a.doseSource, a.grindClick, a.grindSource, a.confirmed], [18, 'U', null, null, true]);
  });
  test('niet bevestigd → plan-waarden als I, niet bevestigd', () => {
    const a = j(api.applyActuals(base, plan, null));
    assert.deepEqual([a.doseG, a.doseSource, a.grindClick, a.grindSource, a.confirmed], [17.3, 'I', 15, 'I', false]);
  });
  test('de logboekweergave (en dus de leerlus) ziet een afgeleide maalstand NOOIT als werkelijke', () => {
    let rec = api.completeWithBedDry(sampleRecord(), T0 + 1000, 200, 'bed_dry').rec;
    rec = api.applyBrewEvent(rec, 'log', T0 + 2000).rec;
    rec.actual = api.applyActuals(rec.actual, rec.plan, null);
    rec.tasting = api.buildTasting({ strength: 'just_right', acidity: 'lively', finish: ['sweet_clean'], liking: 5 }, T0 + 2000, T0 + 1000, null);
    let v = api.brewRecordToLogView(rec);
    assert.equal(v.actualGrindClicks, null);
    assert.equal(v.actualsConfirmed, false);
    rec.actual = api.applyActuals(rec.actual, rec.plan, 'planned');
    v = api.brewRecordToLogView(rec);
    assert.equal(v.actualGrindClicks, rec.plan.grindStartingPoint);
    assert.equal(v.approved, true);
    assert.equal(v.scores, null, 'geen 0–5-scores → lezers die op scores filteren slaan deze kop over');
    assert.equal(v.tasting.liking, 5);
  });
});

describe('Fase 3 — vergelijking met de vorige kop', () => {
  function logged(id, beanId, method, createdAt){
    return { id, beanId, lifecycle: 'logged', deletedAt: null, createdAt, plan: { methodId: method } };
  }
  test('de laatste eerdere gelogde kop van dezelfde boon én methode', () => {
    const store = [
      logged('a', 'b1', 'v60', 100), logged('b', 'b1', 'v60', 200), logged('c', 'b1', 'chemex', 250),
      logged('d', 'b2', 'v60', 260), Object.assign(logged('e', 'b1', 'v60', 270), { deletedAt: 1 }),
      Object.assign(logged('f', 'b1', 'v60', 280), { lifecycle: 'abandoned' })
    ];
    const cur = logged('now', 'b1', 'v60', 300);
    assert.equal(api.findPreviousComparableBrew(store, cur).id, 'b');
  });
  test('zonder boon of zonder eerdere kop: geen vergelijkingsvraag', () => {
    assert.equal(api.findPreviousComparableBrew([logged('a', 'b1', 'v60', 100)], logged('n', null, 'v60', 300)), null);
    assert.equal(api.findPreviousComparableBrew([], logged('n', 'b1', 'v60', 300)), null);
  });
});

// ---------------------------------------------------------------------------------------
// NIEUW (Brew Intelligence v2, Fase 4): diagnose + één advies per kop.
// ---------------------------------------------------------------------------------------
describe('Fase 4 — diagnose', () => {
  const diag = (t, ctx) => j(api.diagnoseTasting(t, ctx || {}));
  test('scherp zuur + leeg bij goede sterkte → onderextractie, waarschijnlijk (2 vragen, 3 punten voorsprong)', () => {
    const d = diag({ strength: 'just_right', acidity: 'sharp', finish: ['hollow'], liking: 2 });
    assert.equal(d.extraction.state, 'under');
    assert.equal(d.extraction.lead, 3);
    assert.equal(d.confidence, 'likely');
    assert.equal(d.strength.state, 'ok');
  });
  test('alleen scherp zuur → onder, maar uit één vraag: mogelijk', () => {
    assert.equal(diag({ strength: 'just_right', acidity: 'sharp', finish: ['bitter'], liking: 2 }).extraction.state, 'under');
    assert.equal(diag({ strength: 'just_right', acidity: 'sharp', finish: ['sweet_clean'], liking: 3 }).confidence, 'uncertain', 'scherp (onder 2) tegen zoet & schoon (goed 2) = gelijkspel');
  });
  test('bitter weegt bij donker branden half', () => {
    const light = diag({ strength: 'just_right', acidity: 'lively', finish: ['bitter'], liking: 3 }, { roastId: 'light' });
    const dark = diag({ strength: 'just_right', acidity: 'lively', finish: ['bitter'], liking: 3 }, { roastId: 'dark' });
    assert.equal(light.extraction.points.over, 1);
    assert.equal(dark.extraction.points.over, 0.5);
    assert.equal(dark.confidence, 'uncertain', '0,5 punt is te weinig voor een advies');
  });
  test('droog/wrang → ongelijkmatig + over; leeg + slap → sterkte, geen extractiepunt', () => {
    const d = diag({ strength: 'just_right', acidity: 'lively', finish: ['drying'], liking: 2 });
    assert.equal(d.uneven, true);
    assert.equal(d.extraction.points.over, 1);
    const w = diag({ strength: 'too_weak', acidity: 'lively', finish: ['hollow'], liking: 2 });
    assert.equal(w.extraction.state, 'unknown');
    assert.ok(w.evidence.includes('hollow_weak'));
  });
});

describe('Fase 4 — advies: volgorde en regels', () => {
  const base = { strength: 'just_right', acidity: 'lively', finish: ['sweet_clean'], liking: 4 };
  const ctx = { actualsConfirmed: true, roastId: 'medium', grind: { current: 15, min: 13, max: 18 }, strength: { current: 0, blocked: {} } };
  const reco = (t, extra) => j(api.recommendNext(Object.assign({ tasting: t, goal: null, ctx }, extra || {})));
  test('onvolledig → NONE met wat er ontbreekt', () => {
    const r = reco({ strength: 'just_right' });
    assert.equal(r.type, 'NONE');
    assert.deepEqual(r.missing, ['zuur', 'afdronk', 'hoe lekker']);
  });
  test('gate gehaald → KEEP (niets veranderen), ook als er iets te verbeteren lijkt', () => {
    assert.equal(reco(base).type, 'KEEP');
    assert.equal(reco(Object.assign({}, base, { acidity: 'sharp', liking: 4 })).type, 'KEEP');
  });
  test('heel vers gebrand → CHECK vóór enige receptstap', () => {
    const r = api.recommendNext({ tasting: Object.assign({}, base, { acidity: 'sharp', finish: ['hollow'], liking: 2 }), ctx: Object.assign({}, ctx, { freshnessKey: 'too_fresh' }) });
    assert.equal(r.type, 'CHECK');
    assert.equal(r.reasonKey, 'very_fresh');
  });
  test('vlak zuur + hoge alkaliniteit → CHECK water; zonder bekende alkaliniteit niet', () => {
    const t = Object.assign({}, base, { acidity: 'flat', finish: ['hollow'], liking: 2 });
    assert.equal(api.recommendNext({ tasting: t, ctx: Object.assign({}, ctx, { alkalinityCaCO3: 120 }) }).reasonKey, 'water_buffering');
    assert.notEqual(api.recommendNext({ tasting: t, ctx }).reasonKey, 'water_buffering');
  });
  test('onder + goede sterkte → 1 klik fijner, met van/naar', () => {
    const r = reco({ strength: 'just_right', acidity: 'sharp', finish: ['hollow'], liking: 2 });
    assert.deepEqual([r.type, r.lever, r.delta, r.fromValue, r.toValue, r.confidence], ['ADJUST', 'grind', -1, 15, 14, 'likely']);
  });
  test('veel te slap + onder (overeenstemmend) → 2 klikken fijner', () => {
    const r = reco({ strength: 'much_too_weak', acidity: 'sharp', finish: ['hollow'], liking: 1 });
    assert.equal(r.lever, 'grind');
    assert.equal(r.delta, -2);
  });
  test('te slap zonder extractiesignaal → een stap sterker (dosis); te sterk → lichter', () => {
    assert.deepEqual([reco({ strength: 'too_weak', acidity: 'lively', finish: ['hollow'], liking: 3 }).lever, reco({ strength: 'too_weak', acidity: 'lively', finish: ['hollow'], liking: 3 }).delta], ['dose', 1]);
    const r = reco({ strength: 'too_strong', acidity: 'lively', finish: ['sweet_clean'], liking: 3 });
    assert.deepEqual([r.lever, r.delta], ['dose', -1]);
  });
  test('over + te sterk: grover, maar bij donker branden liever de dosis (matrix)', () => {
    assert.deepEqual(j(api.leverFromMatrix('strong', 'over', false)), { lever: 'grind', dir: 1, basis: 'extraction' });
    assert.deepEqual(j(api.leverFromMatrix('strong', 'over', true)), { lever: 'dose', dir: -1, basis: 'both' });
    const r = reco({ strength: 'too_strong', acidity: 'lively', finish: ['bitter'], liking: 2 });
    assert.deepEqual([r.type, r.lever, r.delta], ['ADJUST', 'grind', 1]);
  });
  test('de volledige matrix', () => {
    const M = (s, e) => { const x = api.leverFromMatrix(s, e, false); return x ? `${x.lever}${x.dir > 0 ? '+' : '-'}` : '—'; };
    assert.deepEqual(['weak', 'ok', 'strong'].map(s => ['under', 'ok', 'over'].map(e => M(s, e))), [
      ['grind-', 'dose+', 'dose+'],
      ['grind-', '—', 'grind+'],
      ['dose-', 'dose-', 'grind+']
    ]);
  });
  test('onzeker → REPEAT, geen stap', () => {
    const r = reco({ strength: 'just_right', acidity: 'sharp', finish: ['sweet_clean'], liking: 3 });
    assert.deepEqual([r.type, r.reasonKey], ['REPEAT', 'uncertain']);
  });
  test('droog/wrang zonder duidelijk beeld → CHECK gieten', () => {
    const r = reco({ strength: 'just_right', acidity: 'lively', finish: ['drying'], liking: 2 });
    assert.deepEqual([r.type, r.reasonKey], ['CHECK', 'uneven']);
  });
  test('onbevestigde actuals: waarschijnlijk → mogelijk, met notitie', () => {
    const r = api.recommendNext({ tasting: { strength: 'just_right', acidity: 'sharp', finish: ['hollow'], liking: 2 }, ctx: Object.assign({}, ctx, { actualsConfirmed: false }) });
    assert.equal(r.confidence, 'possible');
    assert.ok(r.notes.includes('actuals_unconfirmed'));
  });
});

describe('Fase 4 — haalbaarheid en trajectregels', () => {
  const ctx = { actualsConfirmed: true, roastId: 'medium', grind: { current: 13, min: 13, max: 18 }, strength: { current: 0, blocked: {} } };
  const under = { strength: 'just_right', acidity: 'sharp', finish: ['hollow'], liking: 2 };
  test('fijner onder het praktische bereik → CHECK, nooit een onhaalbare stap', () => {
    const r = api.recommendNext({ tasting: under, ctx });
    assert.deepEqual([r.type, r.reasonKey, r.toValue], ['CHECK', 'grind_floor', 12]);
  });
  test('2 klikken passen niet, 1 wel → 1 klik', () => {
    const r = api.recommendNext({ tasting: { strength: 'much_too_weak', acidity: 'sharp', finish: ['hollow'], liking: 1 }, ctx: Object.assign({}, ctx, { grind: { current: 14, min: 13, max: 18 } }) });
    assert.deepEqual([r.type, r.delta, r.toValue], ['ADJUST', -1, 13]);
  });
  test('sterkere stap zonder effect (dosisplafond) → CHECK dose_limit', () => {
    const r = api.recommendNext({ tasting: { strength: 'too_weak', acidity: 'lively', finish: ['hollow'], liking: 3 }, ctx: Object.assign({}, ctx, { strength: { current: 0, blocked: { '1': true } } }) });
    assert.deepEqual([r.type, r.reasonKey], ['CHECK', 'dose_limit']);
    const atMax = api.recommendNext({ tasting: { strength: 'too_weak', acidity: 'lively', finish: ['hollow'], liking: 3 }, ctx: Object.assign({}, ctx, { strength: { current: 1, blocked: {} } }) });
    assert.equal(atMax.reasonKey, 'dose_limit');
  });
  test('de geteste stap maakte het slechter → terugdraaien', () => {
    const r = api.recommendNext({ tasting: Object.assign({}, under, { vsLast: 'worse' }), ctx: Object.assign({}, ctx, { grind: { current: 14, min: 13, max: 18 } }), lastApplied: { lever: 'grind', delta: -1 } });
    assert.deepEqual([r.type, r.lever, r.delta, r.toValue, r.reasonKey], ['ADJUST', 'grind', 1, 15, 'revert_worse']);
  });
  test('niet heen-en-weer: omkeren na één kop alleen bij "waarschijnlijk"', () => {
    const over = { strength: 'just_right', acidity: 'lively', finish: ['bitter'], liking: 2 }; // over, mogelijk
    const c = Object.assign({}, ctx, { grind: { current: 14, min: 13, max: 18 } });
    assert.equal(api.recommendNext({ tasting: over, ctx: c, lastApplied: { lever: 'grind', delta: -1 } }).reasonKey, 'hysteresis');
    const overLikely = { strength: 'just_right', acidity: 'flat', finish: ['bitter', 'drying'], liking: 2 };
    const r = api.recommendNext({ tasting: overLikely, ctx: c, lastApplied: { lever: 'grind', delta: -1 } });
    assert.notEqual(r.reasonKey, 'hysteresis');
  });
  test('insluiten: al beide kanten op gemaald → herhaal de beste stand', () => {
    const c = Object.assign({}, ctx, { grind: { current: 15, min: 13, max: 18 } });
    const r = api.recommendNext({ tasting: under, ctx: c, lastApplied: { lever: 'grind', delta: 1 }, prevApplied: { lever: 'grind', delta: -1 } });
    assert.equal(r.reasonKey, 'bracketed');
  });
});

describe('Fase 4 — eigenschappen over alle proefkaart-combinaties (v2 §15)', () => {
  const STRENGTHS = ['much_too_weak', 'too_weak', 'just_right', 'too_strong', 'much_too_strong'];
  const ACIDITIES = ['flat', 'lively', 'sharp'];
  const FINISHES = [['sweet_clean'], ['bitter'], ['drying'], ['hollow'], ['bitter', 'drying'], ['bitter', 'hollow'], ['drying', 'hollow'], ['bitter', 'drying', 'hollow']];
  const all = [];
  for (const strength of STRENGTHS) for (const acidity of ACIDITIES) for (const finish of FINISHES) for (let liking = 1; liking <= 5; liking++) all.push({ strength, acidity, finish, liking });
  const contexts = [
    { actualsConfirmed: true, roastId: 'medium', grind: { current: 15, min: 13, max: 18 }, strength: { current: 0, blocked: {} } },
    { actualsConfirmed: false, roastId: 'dark', grind: { current: 13, min: 13, max: 18 }, strength: { current: 1, blocked: {} } },
    { actualsConfirmed: true, roastId: 'light', grind: { current: null, min: null, max: null }, strength: { current: -1, blocked: { '0': true } } }
  ];
  test(`${all.length} combinaties × ${contexts.length} contexten: hooguit één hendel, en een ADJUST is altijd haalbaar`, () => {
    for (const ctx of contexts) for (const t of all){
      const r = api.recommendNext({ tasting: t, ctx });
      assert.ok(['NONE', 'KEEP', 'CHECK', 'REPEAT', 'ADJUST'].includes(r.type));
      if (r.type === 'ADJUST'){
        assert.ok(['grind', 'dose'].includes(r.lever));
        assert.ok(Math.abs(r.delta) >= 1 && Math.abs(r.delta) <= 2);
        assert.ok(api.adjustFeasibility(r.lever, r.delta, ctx).ok, `onhaalbare stap bij ${JSON.stringify(t)}`);
        if (r.lever === 'dose') assert.equal(Math.abs(r.delta), 1, 'dosis altijd één stap (8%)');
      }
    }
  });
  test('gate gehaald → nooit ADJUST', () => {
    for (const ctx of contexts) for (const t of all){
      if (api.tastingGate(t, null).passed) assert.equal(api.recommendNext({ tasting: t, ctx }).type, 'KEEP');
    }
  });
  test('zuurder (alles verder gelijk) geeft nooit "grover"', () => {
    for (const ctx of contexts) for (const t of all){
      if (t.acidity !== 'sharp') continue;
      const r = api.recommendNext({ tasting: t, ctx });
      assert.ok(!(r.type === 'ADJUST' && r.lever === 'grind' && r.delta > 0), `scherp zuur gaf grover bij ${JSON.stringify(t)}`);
    }
  });
  test('elk advies heeft een titel en (behalve KEEP/NONE) een uitleg — alleen sjablonen', () => {
    for (const t of all){
      const r = api.recommendNext({ tasting: t, ctx: contexts[0] });
      const tx = api.recommendationTexts(r, api.diagnoseTasting(t, contexts[0]), { grindRange: { min: 13, max: 18 } });
      assert.ok(tx.title && tx.title.length > 3, `geen titel voor ${r.type}/${r.reasonKey}`);
      if (r.type !== 'KEEP' && r.type !== 'NONE') assert.ok(tx.body && tx.body.length > 10, `geen uitleg voor ${r.type}/${r.reasonKey}`);
      assert.doesNotMatch(tx.title + tx.body, /undefined|null|NaN/, `lege plek in sjabloon: ${tx.title} ${tx.body}`);
    }
  });
});

describe('Meetoverzicht — hoe goed werken de adviezen? (gate voor fase 5–7)', () => {
  // Minimale records: alleen de velden die adviceOutcomeStats leest.
  const rec = (id, reco, extra = {}) => Object.assign({ id, recommendation: reco }, extra);
  const tested = (id, outcome, testedByBrewId = null) => rec(id, { type: 'ADJUST', status: 'tested', outcome, testedByBrewId });
  const tester = (id, approved) => ({ id, tasting: { approved } });

  test('drempels zijn die van het ontwerp (≥20 getest, ≥65% gelukt, ≤15% slechter)', () => {
    assert.equal(api.ADVICE_GATE_MIN_TESTED, 20);
    assert.equal(api.ADVICE_GATE_SUCCESS_MIN, 0.65);
    assert.equal(api.ADVICE_GATE_HARM_MAX, 0.15);
  });

  test('lege of ontbrekende opslag → niets geteld, oordeel "onvoldoende"', () => {
    for (const store of [[], null, undefined]){
      const s = j(api.adviceOutcomeStats(store));
      assert.equal(s.tested, 0);
      assert.equal(s.successRate, null);
      assert.equal(s.harmRate, null);
      assert.equal(s.gate, 'insufficient');
      assert.equal(s.needed, 20);
    }
  });

  test('telt per type en per status; alleen ADJUST telt mee voor de statussen', () => {
    const store = [
      rec('k', { type: 'KEEP', status: 'proposed' }),
      rec('r', { type: 'REPEAT', status: 'proposed' }),
      rec('c', { type: 'CHECK', status: 'proposed' }),
      rec('n', { type: 'NONE' }),
      rec('a1', { type: 'ADJUST', status: 'proposed' }),
      rec('a2', { type: 'ADJUST', status: 'applied' }),
      rec('a3', { type: 'ADJUST', status: 'ignored' }),
      tested('a4', 'better'),
      { id: 'geen-advies' }
    ];
    const s = j(api.adviceOutcomeStats(store));
    assert.deepEqual(s.byType, { KEEP: 1, REPEAT: 1, CHECK: 1, ADJUST: 4, NONE: 1 });
    assert.equal(s.proposed, 1);
    assert.equal(s.applied, 1);
    assert.equal(s.ignored, 1);
    assert.equal(s.tested, 1);
    assert.equal(s.better, 1);
  });

  test('"gelukt" = beter, óf een geslaagde testkop zolang de uitkomst niet "slechter" is', () => {
    const store = [
      tested('a', 'better'),                 // gelukt
      tested('b', 'same', 'tb'), tester('tb', true),   // gelukt: testkop geslaagd
      tested('c', 'same', 'tc'), tester('tc', false),  // niet gelukt
      tested('d', null, 'td'), tester('td', true),     // geen antwoord, maar testkop geslaagd → gelukt
      tested('e', 'worse', 'te'), tester('te', true),  // slechter wint van geslaagd → niet gelukt, wel schade
      tested('f', 'same', 'weg')                      // testkop bestaat niet → niet gelukt
    ];
    const s = j(api.adviceOutcomeStats(store));
    assert.equal(s.tested, 6);
    assert.equal(s.better, 1);
    assert.equal(s.same, 3);
    assert.equal(s.worse, 1);
    assert.equal(s.unanswered, 1);
    assert.equal(s.success, 3);
    assert.equal(s.successRate, 3 / 6);
    assert.equal(s.harmRate, 1 / 6);
  });

  test('een verwijderde testkop telt niet als geslaagd; een verwijderd advies telt helemaal niet', () => {
    const store = [
      tested('a', 'same', 'tb'), { id: 'tb', deletedAt: T0, tasting: { approved: true } },
      Object.assign(tested('b', 'better'), { deletedAt: T0 })
    ];
    const s = j(api.adviceOutcomeStats(store));
    assert.equal(s.tested, 1);
    assert.equal(s.success, 0);
    assert.equal(s.byType.ADJUST, 1);
  });

  const many = (nBetter, nSame, nWorse) => {
    const out = [];
    let i = 0;
    for (let k = 0; k < nBetter; k++) out.push(tested(`x${i++}`, 'better'));
    for (let k = 0; k < nSame; k++) out.push(tested(`x${i++}`, 'same'));
    for (let k = 0; k < nWorse; k++) out.push(tested(`x${i++}`, 'worse'));
    return out;
  };

  test('onder de 20 geteste stappen blijft het oordeel "onvoldoende", hoe goed ook', () => {
    const s = j(api.adviceOutcomeStats(many(19, 0, 0)));
    assert.equal(s.successRate, 1);
    assert.equal(s.gate, 'insufficient');
    assert.equal(s.needed, 1);
  });

  test('precies op de drempels → gehaald (13/20 = 65% gelukt, 3/20 = 15% slechter)', () => {
    const s = j(api.adviceOutcomeStats(many(13, 4, 3)));
    assert.equal(s.tested, 20);
    assert.equal(s.gate, 'passed');
    assert.equal(s.needed, 0);
  });

  test('net onder de succesdrempel of net boven de schadedrempel → niet gehaald', () => {
    assert.equal(api.adviceOutcomeStats(many(12, 5, 3)).gate, 'failed');  // 60% gelukt
    assert.equal(api.adviceOutcomeStats(many(16, 0, 4)).gate, 'failed');  // 80% gelukt, maar 20% slechter
  });
});

describe('BC-10 — blinde helder-proef: oordeel', () => {
  const t = (preferred) => ({ preferred });
  test('antwoord per kop → arm (variant/controle/geen)', () => {
    assert.equal(api.abArmForAnswer('1', 1), 'variant');
    assert.equal(api.abArmForAnswer('2', 1), 'control');
    assert.equal(api.abArmForAnswer('none', 2), 'none');
    assert.equal(api.abArmForAnswer(null, 2), null);
  });
  test('onder de 5 proeven: onvoldoende, hoe duidelijk ook', () => {
    const v = j(api.abTrialVerdict([t('variant'), t('variant'), t('variant'), t('variant')]));
    assert.equal(v.verdict, 'insufficient');
    assert.equal(v.needed, 1);
  });
  test('variant wint pas bij ≥70% van de beslissende proeven én minstens 4 keer', () => {
    assert.equal(api.abTrialVerdict([t('variant'), t('variant'), t('variant'), t('variant'), t('control')]).verdict, 'variant');
    assert.equal(api.abTrialVerdict([t('variant'), t('variant'), t('variant'), t('none'), t('control')]).verdict, 'unclear', '3 keer is te weinig');
    assert.equal(api.abTrialVerdict([t('variant'), t('variant'), t('variant'), t('control'), t('control')]).verdict, 'unclear');
    assert.equal(api.abTrialVerdict([t('control'), t('control'), t('control'), t('control'), t('none')]).verdict, 'control');
  });
  test('onbeantwoorde proeven tellen niet mee', () => {
    const v = j(api.abTrialVerdict([t(null), t('variant'), { }, null]));
    assert.equal(v.n, 1);
  });
});

describe('Oude brouwsels nakijken — welke gemigreerde brouwsels zijn verdacht', () => {
  const BEANS = [
    { id: 'eth', name: 'Ethiopia', roastLevel: 'light', addedAt: T0 - 10 * 86400000 },
    { id: 'bra', name: 'Brazil', roastLevel: 'medium', addedAt: T0 - 10 * 86400000 },
    { id: 'new', name: 'Later gekocht', roastLevel: 'light', addedAt: T0 + 30 * 86400000 }
  ];
  const legacyRec = (id, beanId, roastId, extra = {}) => Object.assign({
    id, lifecycle: 'logged', createdAt: T0, beanId, beanSnapshot: null, plan: { roastId }, legacy: { entry: {} }
  }, extra);

  test('zonder boon → verdacht, met de enige passende boon (die toen al bestond) als voorstel', () => {
    const s = j(api.legacyBrewSuspects([legacyRec('a', null, 'light')], BEANS));
    assert.equal(s.length, 1);
    assert.equal(s[0].reason, 'no_bean');
    assert.deepEqual(s[0].candidates, ['eth'], 'de later gekochte boon kan het niet zijn geweest');
    assert.equal(s[0].suggested, 'eth');
  });
  test('branding past niet bij de gekoppelde boon (snapshot of huidige boon) → verdacht', () => {
    const viaSnap = legacyRec('b', 'bra', 'light', { beanSnapshot: { roastLevel: 'medium' } });
    const viaBean = legacyRec('c', 'bra', 'light');
    const s = j(api.legacyBrewSuspects([viaSnap, viaBean], BEANS));
    assert.deepEqual(s.map(x => x.reason), ['roast_mismatch', 'roast_mismatch']);
    assert.equal(s[0].suggested, 'eth');
  });
  test('klopt, nieuw, verwijderd of al nagekeken → niet verdacht', () => {
    const store = [
      legacyRec('ok', 'eth', 'light'),
      Object.assign(legacyRec('fresh', null, 'light'), { legacy: undefined }),
      legacyRec('del', null, 'light', { deletedAt: T0 }),
      legacyRec('rev', null, 'light', { reviewedAt: T0 }),
      legacyRec('abandoned', null, 'light', { lifecycle: 'abandoned' }),
      legacyRec('gone', 'weg', 'light')
    ];
    assert.deepEqual(j(api.legacyBrewSuspects(store, BEANS)), []);
  });
  test('meerdere passende bonen → geen voorstel, wel kandidaten', () => {
    const beans = BEANS.concat([{ id: 'ken', name: 'Kenya', roastLevel: 'light', addedAt: T0 - 86400000 }]);
    const s = j(api.legacyBrewSuspects([legacyRec('a', null, 'light')], beans));
    assert.deepEqual(s[0].candidates.sort(), ['eth', 'ken']);
    assert.equal(s[0].suggested, null);
  });
  test('beanSnapshotOf neemt precies de velden van een nieuw record over', () => {
    assert.deepEqual(j(api.beanSnapshotOf({ id: 'x', name: 'X', process: 'washed', roastLevel: 'light', roastDate: '2026-09-01', extra: 1 })),
      { process: 'washed', intendedUse: null, roastLevel: 'light', roastDate: '2026-09-01' });
    assert.equal(api.beanSnapshotOf(null), null);
  });
});

describe('Oude brouwsels nakijken — voorraadcorrectie bij opnieuw koppelen', () => {
  const BEANS = [
    { id: 'eth', name: 'Ethiopia', roastLevel: 'light', addedAt: T0 - 10 * 86400000, doseUsedG: 0 },
    { id: 'bra', name: 'Brazil', roastLevel: 'medium', addedAt: T0 - 10 * 86400000, doseUsedG: 40 },
    { id: 'low', name: 'Bijna leeg geteld', roastLevel: 'medium', addedAt: T0 - 10 * 86400000, doseUsedG: 5 },
    { id: 'new', name: 'Later gekocht', roastLevel: 'light', addedAt: T0 + 30 * 86400000, doseUsedG: 0 }
  ];
  // De oude versie schreef bij Start plan.doseG af van de boon in legacy.entry.beanId.
  const rec = (entryBeanId, extra = {}) => Object.assign({
    id: 'r', lifecycle: 'logged', createdAt: T0, beanId: entryBeanId, plan: { roastId: 'light', doseG: 18 },
    legacy: { entry: { beanId: entryBeanId } }
  }, extra);

  test('verkeerde boon → de gram gaan van die boon naar de juiste', () => {
    assert.deepEqual(j(api.legacyStockMove(rec('bra'), 'eth', BEANS)), { g: 18, fromId: 'bra', toId: 'eth', takeG: 18, addG: 18 });
  });
  test('zonder boon opgeslagen → er was niets afgeschreven, dus alleen bij de juiste boon erbij', () => {
    assert.deepEqual(j(api.legacyStockMove(rec(''), 'eth', BEANS)), { g: 18, fromId: null, toId: 'eth', takeG: 0, addG: 18 });
  });
  test('terugboeken gaat nooit onder 0', () => {
    assert.equal(j(api.legacyStockMove(rec('low'), 'eth', BEANS)).takeG, 5);
  });
  test('een boon die pas later is gekocht krijgt niets; "Geen boon" boekt alleen terug', () => {
    assert.deepEqual(j(api.legacyStockMove(rec('bra'), 'new', BEANS)), { g: 18, fromId: 'bra', toId: null, takeG: 18, addG: 0 });
    assert.deepEqual(j(api.legacyStockMove(rec('bra'), null, BEANS)), { g: 18, fromId: 'bra', toId: null, takeG: 18, addG: 0 });
  });
  test('geen dosis bekend, dezelfde boon of geen oud brouwsel → niets verplaatsen', () => {
    assert.equal(api.legacyStockMove(rec('bra', { plan: { roastId: 'light' } }), 'eth', BEANS), null);
    assert.equal(api.legacyStockMove(rec('bra'), 'bra', BEANS), null);
    assert.equal(api.legacyStockMove(rec(''), null, BEANS), null);
    assert.equal(api.legacyStockMove(rec('bra', { legacy: undefined }), 'eth', BEANS), null);
  });
  test('na een eerdere correctie telt waar de gram nu staan (stockBeanId), niet de oude koppeling', () => {
    assert.equal(api.legacyStockBeanId(rec('bra')), 'bra');
    assert.equal(api.legacyStockBeanId(rec('bra', { stockBeanId: 'eth' })), 'eth');
    assert.equal(api.legacyStockBeanId(rec('bra', { stockBeanId: null })), null);
    assert.deepEqual(j(api.legacyStockMove(rec('bra', { stockBeanId: 'eth' }), 'bra', BEANS)), { g: 18, fromId: 'eth', toId: 'bra', takeG: 0, addG: 18 },
      'eth staat in deze lijst op 0 → er valt niets terug te boeken');
  });
});
