import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { createEngine, ENGINE3_VERSION } from '../src/engine.ts';
import { DOSE_LIMITS } from '../src/data/brewer.ts';
import { FLAVOR_WHEEL } from '../src/data/flavor-wheel.ts';
import { migrateBackupV3 } from '../src/migrate/v3.ts';
import { BACKUP_V3 } from './fixtures.ts';
import type { Advice, EngineEvent, Goal, Method, PlanRequest, StrengthOrd, TechniqueId, WheelCategory } from '../src/types.ts';
import type { Clicks, EpochMs, Grams, Seconds } from '../src/units.ts';

const E = createEngine();
let clock = 1_790_000_000_000;
let n = 0;
const tick = (): EpochMs => (clock += 60_000) as EpochMs;
const tag = (c: WheelCategory): string => FLAVOR_WHEEL.find(x => x.key === c)!.subgroups[0]!.tags[0]!.tag;

const req = (o: Partial<PlanRequest> = {}): PlanRequest => ({ at: tick(), beanId: 'z', method: 'v60', cupG: 250 as Grams, goal: null, technique: null, ...o });
const ask = (events: readonly EngineEvent[], o: Partial<PlanRequest> = {}): Advice => E.plan(E.learn(events), req(o));
const bean = (beanId = 'z', cats: WheelCategory[] = []): EngineEvent => ({ id: `b${n++}`, at: tick(), device: 't', v: 1, kind: 'bean.upsert', data: { beanId, sources: {}, legacy: null, fields: {
  name: beanId, process: { base: 'washed', fermentation: [], experimental: false, decaf: null, ambiguousTerm: null },
  notes: { raw: cats.map(tag), tags: cats.map(tag), unmapped: [] } } as never } });

/** Zoals de app het straks doet: het advies zetten, loggen en een oordeel geven. */
function brewAndTaste(events: EngineEvent[], advice: Advice, beanId: string | null, strength: StrengthOrd | null, o: { bedDryTail?: number; click?: number } = {}): EngineEvent[] {
  const brewId = `c${n++}`;
  const recipe = o.click === undefined ? advice.recipe : { ...advice.recipe, grindClick: o.click as Clicks };
  const out: EngineEvent[] = [...events, { id: `${brewId}:p`, at: tick(), device: 't', v: 1, kind: 'brew.plan', data: { brewId, beanId, goal: null, engine: advice.engine, recipe, trialId: advice.trial?.id ?? null, legacy: null } }];
  if (o.bedDryTail !== undefined) {
    const last = recipe.pours[recipe.pours.length - 1]!.atSec;
    out.push({ id: `${brewId}:s`, at: tick(), device: 't', v: 1, kind: 'brew.timer', data: { brewId, type: 'start', tSec: 0 as Seconds, pourIndex: null } });
    out.push({ id: `${brewId}:d`, at: tick(), device: 't', v: 1, kind: 'brew.timer', data: { brewId, type: 'bed_dry', tSec: (last + o.bedDryTail) as Seconds, pourIndex: null } });
  }
  if (strength !== null) out.push({ id: `${brewId}:t`, at: tick(), device: 't', v: 1, kind: 'tasting', data: { brewId, minutesAfter: null, late: false, strength, acidity: null, finish: [], liking: null, goalHit: null, vsLast: null, missed: null, cata: [], noteHits: [], legacyScores: null, note: '' } });
  return out;
}

test('zonder data: Kasuya met een kop van het gevraagde gewicht, uitleg en een gemarkeerde start', () => {
  const a = ask([bean()]);
  assert.deepEqual(a.engine, { name: 'engine3', version: ENGINE3_VERSION });
  assert.equal(a.recipe.technique, 'kasuya_46');
  assert.equal(a.recipe.pours.reduce((s, p) => s + p.addG, 0), a.recipe.waterG);
  // Zonder tijden begint de molen met hooguit één klik verschil van de standaard 16.
  assert.ok(a.recipe.grindClick === 16 || a.recipe.grindClick === 17, `klik ${a.recipe.grindClick}`);
  assert.equal(a.recipe.tempC, 92); // branding onbekend: Hario-voorbeeld
  const codes = a.reasons.map(r => r.code);
  assert.ok(codes.includes('strength.start') && codes.includes('technique.fallback') && (codes.includes('grind_time.keep') || codes.includes('grind_time.coarser')));
  assert.ok(a.warnings.some(w => /Nog geen doorlooptijden/.test(w)));
  assert.equal(a.trial, null);
  assert.equal(a.uncertainty.targetTds, null);
  // kop = water − (vasthouden − extractie) × dosis ≈ gevraagde kop
  const cup = a.recipe.waterG - (2.1 - 0.2) * a.recipe.doseG;
  assert.ok(Math.abs(cup - 250) < 2, `kop ${cup}`);
});
test('de kop blijft ongeveer gelijk aan de vraag bij elke kopgrootte', () => {
  for (const cupG of [150, 200, 250, 300, 400]) {
    const a = ask([bean()], { cupG: cupG as never });
    const cup = a.recipe.waterG - (2.1 - 0.2) * a.recipe.doseG;
    assert.ok(Math.abs(cup - cupG) < 2.5 || a.warnings.some(w => /buiten het bereik/.test(w)), `${cupG}: ${cup}`);
  }
});
test('regel 5: volgorde en dubbelingen in het logboek veranderen het advies niet', () => {
  let ev: EngineEvent[] = [bean()];
  for (const a of [1, 1, 0, -1, 0] as StrengthOrd[]) ev = brewAndTaste(ev, ask(ev, { at: 1 as EpochMs }), 'z', a, { bedDryTail: 70 });
  const ref = JSON.stringify(ask(ev, { at: 5 as EpochMs }));
  fc.assert(fc.property(fc.shuffledSubarray(ev, { minLength: ev.length }), s => {
    assert.equal(JSON.stringify(ask([...s, ...s], { at: 5 as EpochMs })), ref);
  }), { numRuns: 30 });
});
test('regels 1 en 2: na "te sterk" nooit sterker, na "te slap" nooit lichter; regel 3: begrensde stappen', () => {
  fc.assert(fc.property(fc.array(fc.constantFrom<StrengthOrd>(-2, -1, 0, 1, 2), { minLength: 1, maxLength: 10 }), answers => {
    let ev: EngineEvent[] = [bean()];
    let prev = ask(ev);
    answers.forEach(a => {
      ev = brewAndTaste(ev, prev, 'z', a, { bedDryTail: 55 });
      const next = ask(ev);
      const d0 = prev.recipe.doseG, d1 = next.recipe.doseG;
      if (a > 0) assert.ok(d1 <= d0 + 1e-9, `na ${a}: ${d0} → ${d1} (${answers})`);
      if (a < 0) assert.ok(d1 >= d0 - 1e-9, `na ${a}: ${d0} → ${d1} (${answers})`);
      assert.ok(Math.abs(Math.log(d1 / d0)) <= 0.2, `stap te groot ${d0} → ${d1}`);
      prev = next;
    });
  }), { numRuns: 40 });
});
test('regel 4: de dosis blijft binnen de grenzen van de V60, voor elke kopgrootte en elk verloop', () => {
  const lim = DOSE_LIMITS.v60!;
  fc.assert(fc.property(fc.integer({ min: 120, max: 600 }), fc.array(fc.constantFrom<StrengthOrd>(-2, 2), { maxLength: 6 }), (cupG, answers) => {
    let ev: EngineEvent[] = [bean()];
    let a = ask(ev, { cupG: cupG as never });
    for (const o of answers) { ev = brewAndTaste(ev, a, 'z', o); a = ask(ev, { cupG: cupG as never }); }
    assert.ok(a.recipe.doseG >= lim.min - 1e-9 && a.recipe.doseG <= lim.max + 1e-9, `${cupG} g → ${a.recipe.doseG} g`);
  }), { numRuns: 60 });
  const small = ask([bean()], { cupG: 100 as never });
  assert.ok(small.warnings.some(w => /buiten het bereik van de brewer/.test(w)));
});
test('Chemex: eigen recept per portie, eigen dosisgrens, geen V60-melding, Chemex-klik en -eindtijd', () => {
  const pick = (cupG: number, technique: TechniqueId | null = null) => ask([bean()], { method: 'chemex' as Method, cupG: cupG as never, technique });
  assert.equal(pick(340).recipe.technique, 'chemex_howell_cup');
  assert.equal(pick(500).recipe.technique, 'chemex_stumptown');
  assert.equal(pick(680).recipe.technique, 'chemex_barefoot');
  for (const c of [340, 500, 680]) {
    const a = pick(c);
    assert.equal(a.recipe.method, 'chemex');
    assert.ok(!a.warnings.some(w => /V60-techniek/.test(w)), `${c} g`);
    assert.ok(a.recipe.grindClick! >= 15 && a.recipe.grindClick! <= 30, `beginklik Chemex ${a.recipe.grindClick}`);
    assert.ok(a.recipe.doseG >= 15 && a.recipe.doseG <= 57, `${c} g → ${a.recipe.doseG} g`);
    assert.ok(a.recipe.expectedEndSec!.hi >= 210, 'eindtijd van de Chemex, niet van de V60');
  }
  // De beginklik schaalt met de dosis: groter bed, grovere maling.
  const clicks = [340, 500, 680].map(c => pick(c).recipe.grindClick!);
  assert.ok(clicks[0]! < clicks[1]! && clicks[1]! < clicks[2]!, clicks.join(','));
  // Hedrick heeft een eigen beginklik uit de bron (22 bij 40 g).
  const hed = pick(680, 'chemex_hedrick' as TechniqueId);
  assert.equal(hed.recipe.grindClick, Math.round(22 + 9 * Math.log2(hed.recipe.doseG / 40)), `Hedrick ${hed.recipe.grindClick} bij ${hed.recipe.doseG} g`);
  // Een V60-techniek op de Chemex (zelf gekozen) krijgt de melding nog wel.
  assert.ok(pick(500, 'hoffmann_ultimate' as TechniqueId).warnings.some(w => /V60-techniek/.test(w)));
  // Een Chemex-recept op de V60 wordt nooit zelf gekozen.
  assert.notEqual(ask([bean()], { cupG: 250 as never }).recipe.technique.startsWith('chemex_'), true);
});
test('zelf gekozen techniek en doel: Kasuya volgt het doel in de eerste giet', () => {
  const april = ask([bean()], { technique: 'april' as TechniqueId });
  assert.equal(april.recipe.technique, 'april');
  assert.equal(april.recipe.pours.length, 6);
  const first = (goal: Goal | null) => ask([bean()], { goal }).recipe.pours[0]!.addG / ask([bean()], { goal }).recipe.pours[1]!.toG;
  assert.ok(first('bright') > first(null) && first(null) > first('rich'));
});
test('techniek: na twee geproefde Kasuya-koppen van een bloemige zak komt er een proef met twee recepten', () => {
  let ev: EngineEvent[] = [bean('z', ['bloemig'])];
  ev = brewAndTaste(ev, ask(ev), 'z', 0, { bedDryTail: 50 });
  assert.equal(ask(ev).trial, null);
  ev = brewAndTaste(ev, ask(ev), 'z', 0, { bedDryTail: 50 });
  const a = ask(ev);
  assert.equal(a.recipe.technique, 'kasuya_46');
  assert.equal(a.trial?.kind, 'technique');
  assert.deepEqual([a.trial!.control.technique, a.trial!.variant.technique], ['kasuya_46', 'wendelboe']);
  assert.equal(a.trial!.control.doseG, a.recipe.doseG);
  assert.equal(a.trial!.variant.doseG, a.recipe.doseG);
  assert.equal(a.trial!.variant.grindClick, a.recipe.grindClick);
  assert.ok(a.reasons.some(r => r.code === 'technique.trial'));
});
test('molen: een te late doorloop geeft een grovere klik en een einde uit eigen koppen', () => {
  let ev: EngineEvent[] = [bean()];
  const first = ask(ev);
  ev = brewAndTaste(ev, first, 'z', 0, { bedDryTail: 130, click: 16 });
  ev = brewAndTaste(ev, ask(ev), 'z', 0, { bedDryTail: 125, click: 16 });
  const a = ask(ev);
  assert.ok(a.recipe.grindClick! > 16, `klik ${a.recipe.grindClick}`);
  assert.ok(a.reasons.some(r => r.code === 'grind_time.coarser'));
  const last = a.recipe.pours[a.recipe.pours.length - 1]!.atSec;
  assert.ok(a.recipe.expectedEndSec!.mid > last);
  assert.ok(a.uncertainty.endSec !== null);
});
test('onzekerheid en uitleg verschijnen zodra er koppen zijn', () => {
  let ev: EngineEvent[] = [bean()];
  ev = brewAndTaste(ev, ask(ev), 'z', 1, { bedDryTail: 60 });
  const a = ask(ev);
  assert.ok(a.uncertainty.targetTds && a.uncertainty.targetTds.lo < a.uncertainty.targetTds.mid && a.uncertainty.targetTds.mid < a.uncertainty.targetTds.hi);
  assert.ok(a.uncertainty.doseG && a.uncertainty.doseG.lo <= a.uncertainty.doseG.hi);
  assert.ok(a.reasons.some(r => r.module === 'strength' && /strength\./.test(r.code)));
  assert.ok(a.reasons.every(r => r.text.length > 0));
});
test('de gemigreerde back-up geeft voor elke zak een bruikbaar advies', () => {
  const ev = migrateBackupV3(BACKUP_V3).events;
  const st = E.learn(ev);
  for (const beanId of ['bean_1', 'bean_2', null]) {
    const a = E.plan(st, req({ beanId }));
    assert.ok(a.recipe.doseG > 0 && a.recipe.waterG > a.recipe.doseG);
    assert.equal(a.recipe.pours.reduce((s, p) => s + p.addG, 0), a.recipe.waterG);
  }
});
test('een ongeldige kopgrootte geeft een duidelijke fout, geen onzin', () => {
  assert.throws(() => ask([bean()], { cupG: 0 as never }), /cupG/);
  assert.throws(() => E.plan({} as never, req()), /onbekende engine-toestand/);
});
test('dezelfde vraag geeft twee keer exact hetzelfde advies (zuiver)', () => {
  const ev = [bean('z', ['notig_cacao'])];
  const st = E.learn(ev);
  const r = req({ at: 99 as EpochMs });
  assert.equal(JSON.stringify(E.plan(st, r)), JSON.stringify(E.plan(st, r)));
});
