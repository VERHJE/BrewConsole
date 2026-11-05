import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { learnFacts } from '../src/state.ts';
import { currentClickFor, fitGrind, grindPlan, MAX_CLICK_STEP, perClickEffect, predictTail, tailObservationsOf } from '../src/grind.ts';
import { buildRecipe } from '../src/recipe.ts';
import { GRINDER_C3S_PRO, GRIND_PRIORS } from '../src/data/grinder.ts';
import { GRIND_SCENARIO, GRIND_WORLDS, engine3Strategy, fixedClick, simulateGrind } from '../eval/grind-sim.ts';
import type { EngineEvent, TechniqueId } from '../src/types.ts';
import type { Clicks, EpochMs, Seconds } from '../src/units.ts';

const AT0 = 1_790_000_000_000;
const BAND = { lo: 170, mid: 210, hi: 250 };
let n = 0;

interface CupOpts { technique?: TechniqueId; water?: number; dose?: number; click?: number | null; bedDry?: number | null; tap?: number | null; abandon?: boolean }
function cup(brewId: string, beanId: string | null, at: number, o: CupOpts = {}): EngineEvent[] {
  const water = o.water ?? 300;
  const { recipe } = buildRecipe({ technique: o.technique ?? 'kasuya_46', method: 'v60', doseG: o.dose ?? 20, waterG: water, ...(o.click === null ? {} : { grindClick: (o.click ?? 16) as Clicks }) });
  const t = (type: 'start' | 'bed_dry' | 'drained' | 'complete' | 'abandon', tSec: number, pourIndex: number | null = null, k = 0): EngineEvent =>
    ({ id: `${brewId}:${type}${k}${n++}`, at: (at + 1 + k) as EpochMs, device: 't', v: 1, kind: 'brew.timer', data: { brewId, type, tSec: tSec as Seconds, pourIndex } });
  const ev: EngineEvent[] = [{ id: `${brewId}:plan`, at: at as EpochMs, device: 't', v: 1, kind: 'brew.plan', data: { brewId, beanId, goal: null, engine: { name: 't', version: '1' }, recipe, trialId: null, legacy: null } }, t('start', 0)];
  const lastIdx = recipe.pours.length - 1;
  if (o.tap != null) ev.push(t('drained', recipe.pours[lastIdx]!.atSec + o.tap, lastIdx, 1));
  if (o.bedDry != null) ev.push(t('bed_dry', o.bedDry, null, 2));
  ev.push(o.abandon ? t('abandon', 30, null, 3) : t('complete', 240, null, 3));
  return ev;
}
const plan = (events: EngineEvent[], over: Partial<Parameters<typeof grindPlan>[1]> = {}, beanId: string | null = 'b') =>
  grindPlan(learnFacts(events), { method: 'v60', technique: 'kasuya_46', beanId, waterG: 300, lastPourAtSec: 160, targetEnd: BAND, ...over });

test('tail: uit de tik van de laatste giet of uit bed droog; afgebroken, zonder klik of onwaarschijnlijk telt niet', () => {
  const obs = tailObservationsOf(learnFacts([
    ...cup('a', 'b', AT0, { bedDry: 230 }),                         // 230 − 160 = 70
    ...cup('b', 'b', AT0 + 1000, { tap: 55, bedDry: 235 }),        // tik gaat voor: 55
    ...cup('c', 'b', AT0 + 2000, { bedDry: 230, abandon: true }),
    ...cup('d', 'b', AT0 + 3000, { bedDry: 230, click: null }),
    ...cup('e', 'b', AT0 + 4000, { bedDry: 162 }),                   // 2 s: onwaarschijnlijk
    ...cup('f', 'b', AT0 + 5000, {})                                 // geen tijd
  ]));
  assert.deepEqual(obs.map(o => [o.brewId, o.tailSec, o.via]), [['a', 70, 'bed_dry'], ['b', 55, 'drained']]);
});
test('zonder data komt het advies uit de natuurkundige verwachting en zegt dat', () => {
  const p = plan([]);
  assert.equal(p.n, 0);
  assert.equal(p.currentClick, GRINDER_C3S_PRO.defaultStartClick);
  assert.equal(p.clickSource, 'default');
  assert.ok(p.warnings.some(w => /natuurkundige verwachting/.test(w)));
  assert.ok(Math.abs(p.predictedTail.mid - GRIND_PRIORS.interceptLn * 0 - 78) < 1);
  assert.equal(p.perClick.learned, false);
});
test('te langzaam geeft een grovere klik (code too_slow), te snel een fijnere', () => {
  const slow = plan([...cup('a', 'b', AT0, { click: 16, bedDry: 160 + 130 }), ...cup('b', 'b', AT0 + 1000, { click: 16, bedDry: 160 + 125 })]);
  assert.equal(slow.code, 'too_slow');
  assert.ok(slow.advice && slow.advice.delta > 0 && slow.advice.delta <= MAX_CLICK_STEP);
  const fast = plan([...cup('a', 'b', AT0, { click: 16, bedDry: 160 + 20 }), ...cup('b', 'b', AT0 + 1000, { click: 16, bedDry: 160 + 22 })]);
  assert.equal(fast.code, 'too_fast');
  assert.ok(fast.advice && fast.advice.delta < 0 && fast.advice.delta >= -MAX_CLICK_STEP);
});
test('op doel: geen advies; het gewenste einde in dezelfde klik houdt de klik', () => {
  const ok = plan([...cup('a', 'b', AT0, { click: 18, bedDry: 160 + 50 }), ...cup('b', 'b', AT0 + 1000, { click: 18, bedDry: 160 + 49 }), ...cup('c', 'b', AT0 + 2000, { click: 18, bedDry: 160 + 51 })]);
  assert.equal(ok.code, 'ok');
  assert.equal(ok.advice, null);
  assert.equal(ok.currentClick, 18);
});
test('het advies blijft binnen het bereik van de molen', () => {
  const win = GRINDER_C3S_PRO.adviceWindow;
  const p = plan(cup('a', 'b', AT0, { click: win.hi, bedDry: 160 + 300 }), { currentClick: win.hi });
  assert.ok(!p.advice || p.advice.click <= win.hi);
  const q = plan(cup('a', 'b', AT0, { click: win.lo, bedDry: 162 + 8 }), { currentClick: win.lo });
  assert.ok(!q.advice || q.advice.click >= win.lo);
});
test('de data stuurt het klikeffect bij: flauwer effect komt dichter bij de waarheid en de onzekerheid krimpt', () => {
  const trueK = Math.log(0.93);
  const ev: EngineEvent[] = [];
  for (let i = 0; i < 24; i++) {
    const click = 14 + (i % 5) * 2; // 14…22
    const tail = 78 * Math.exp(trueK * (click - 16));
    ev.push(...cup(`c${i}`, 'b', AT0 + i * 1000, { click, bedDry: 160 + tail }));
  }
  const fit = fitGrind(tailObservationsOf(learnFacts(ev)), 'v60', 'kasuya_46', 'b');
  const eff = perClickEffect(fit);
  assert.ok(eff.meanLn > GRIND_PRIORS.perClickLn, 'beweegt richting flauwer');
  assert.ok(Math.abs(eff.meanLn - trueK) < Math.abs(GRIND_PRIORS.perClickLn - trueK) * 0.5);
  assert.ok(eff.sdLn < GRIND_PRIORS.perClickSd);
  assert.equal(eff.learned, true);
});
test('een langzame zak wordt na een paar koppen herkend; een nieuwe zak start bij het gemiddelde', () => {
  // Met één zak kan de techniek het niet van de zak onderscheiden; twee zakken laten het verschil zien.
  const ev = [0, 1, 2].flatMap(i => [
    ...cup(`s${i}`, 'trage', AT0 + i * 2000, { click: 16, bedDry: 160 + 110 }),
    ...cup(`t${i}`, 'vlotte', AT0 + i * 2000 + 1000, { click: 16, bedDry: 160 + 62 })
  ]);
  const fit = fitGrind(tailObservationsOf(learnFacts(ev)), 'v60', 'kasuya_46', 'nieuwe');
  const slow = predictTail(fit, { technique: 'kasuya_46', beanId: 'trage', click: 16, waterG: 300 });
  const fast = predictTail(fit, { technique: 'kasuya_46', beanId: 'vlotte', click: 16, waterG: 300 });
  const fresh = predictTail(fit, { technique: 'kasuya_46', beanId: 'nieuwe', click: 16, waterG: 300 });
  assert.ok(slow.median > fresh.median + 5, `${slow.median} ${fresh.median}`);
  assert.ok(fast.median < fresh.median - 3, `${fast.median} ${fresh.median}`);
  assert.ok(slow.sdLn < fresh.sdLn);
});
test('een klikeffect dat de verkeerde kant op wijst wordt nul, nooit positief', () => {
  const ev = [...cup('a', 'b', AT0, { click: 12, bedDry: 160 + 20 }), ...cup('b', 'b', AT0 + 1000, { click: 15, bedDry: 160 + 115 })];
  const fit = fitGrind(tailObservationsOf(learnFacts(ev)), 'v60', 'kasuya_46', 'b');
  assert.ok(perClickEffect(fit).meanLn <= 1e-6);
});
test('een techniek zonder gelogde tijden geeft een bredere band en een melding', () => {
  const ev = [0, 1, 2, 3].flatMap(i => cup(`k${i}`, 'b', AT0 + i * 1000, { click: 16, bedDry: 160 + 75 }));
  const kas = plan(ev);
  const rao = plan(ev, { technique: 'rao', lastPourAtSec: 100, targetEnd: { lo: 240, mid: 255, hi: 270 } });
  assert.ok(rao.warnings.some(w => /geen doorlooptijden gelogd/.test(w)));
  const wK = kas.predictedTail.hi / kas.predictedTail.lo, wR = rao.predictedTail.hi / rao.predictedTail.lo;
  assert.ok(wR > wK);
});
test('voorrang van de huidige klik: gepland, zak, techniek, laatste, standaard', () => {
  const facts = learnFacts([
    ...cup('a', 'x', AT0, { click: 14, bedDry: 230 }),
    ...cup('b', 'y', AT0 + 1000, { technique: 'rao', click: 20, bedDry: 260 }),
    ...cup('c', 'z', AT0 + 2000, { technique: 'rao', click: 21, bedDry: 260 })
  ]);
  assert.deepEqual(currentClickFor(facts, 'kasuya_46', 'x', 19), { click: 19, source: 'planned' });
  assert.deepEqual(currentClickFor(facts, 'kasuya_46', 'x', null), { click: 14, source: 'bean' });
  assert.deepEqual(currentClickFor(facts, 'kasuya_46', 'nieuw', null), { click: 14, source: 'technique' });
  assert.deepEqual(currentClickFor(facts, 'hoffmann_ultimate', 'nieuw', null), { click: 21, source: 'last' });
  assert.deepEqual(currentClickFor(learnFacts([]), 'kasuya_46', null, null), { click: 16, source: 'default' });
});
test('eigenschap: voorspelde doorloop daalt met de klik; kans in band ligt tussen 0 en 1; volgorde doet er niet toe', () => {
  fc.assert(fc.property(fc.array(fc.record({ click: fc.integer({ min: 12, max: 22 }), tail: fc.integer({ min: 20, max: 160 }) }), { minLength: 0, maxLength: 10 }), rows => {
    const ev = rows.flatMap((r, i) => cup(`r${i}`, i % 2 ? 'a' : 'b', AT0 + i * 1000, { click: r.click, bedDry: 160 + r.tail }));
    const p = plan(ev, { currentClick: 16 });
    assert.ok(p.pInBand >= 0 && p.pInBand <= 1);
    const fit = fitGrind(tailObservationsOf(learnFacts(ev)), 'v60', 'kasuya_46', 'a');
    let prev = Infinity;
    for (let c = 10; c <= 24; c++) { const m = predictTail(fit, { technique: 'kasuya_46', beanId: 'a', click: c, waterG: 300 }).median; assert.ok(m <= prev * (1 + 1e-6)); prev = m; }
    const reversed = plan([...ev].reverse(), { currentClick: 16 });
    assert.equal(JSON.stringify(reversed), JSON.stringify(p));
  }), { numRuns: 40 });
});
test('meetopstelling: in alle werelden vaker op tijd dan een vaste klik, en rustig', () => {
  const runs = 30;
  for (const w of GRIND_WORLDS) {
    let e3 = 0, fx = 0, step = 0, first3 = 0, first0 = 0;
    for (let i = 0; i < runs; i++) {
      const a = simulateGrind(engine3Strategy(), w, 3000 + i);
      const b = simulateGrind(fixedClick, w, 3000 + i);
      e3 += a.inBand; fx += b.inBand; step += a.clickStep; first3 += a.cupsToFirstInBand; first0 += b.cupsToFirstInBand;
    }
    assert.ok(e3 / runs >= fx / runs - 0.005, `${w.name}: ${e3 / runs} tegen ${fx / runs}`);
    assert.ok(e3 / runs >= 0.95, `${w.name} op tijd ${e3 / runs}`);
    assert.ok(first3 <= first0 + 1e-9, `${w.name} tot eerste`);
    assert.ok(step / runs < 0.15, `${w.name} klikstap ${step / runs}`);
  }
  assert.equal(GRIND_SCENARIO.band.mid, 210);
});
