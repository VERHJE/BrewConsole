import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { learnFacts } from '../src/state.ts';
import { decide, observationsOf, retentionFor, strengthPlan, tdsOf, ratioForTdsPct } from '../src/strength.ts';
import { buildRecipe } from '../src/recipe.ts';
import { DEFAULT_SCENARIO, WORLDS, makeBags, rng, tasteCup } from '../eval/simulator.ts';
import { baseRecipe, engine2Strategy, engine3StrengthStrategy } from '../eval/adapters.ts';
import type { EngineEvent, StrengthOrd } from '../src/types.ts';
import type { EpochMs, Grams } from '../src/units.ts';

const W = 300;
const AT0 = 1_790_000_000_000;
let n = 0;

function cup(brewId: string, beanId: string | null, at: number, doseG: number, strength: StrengthOrd | null, extra: { late?: boolean; bypassG?: number; tdsPct?: number; cupG?: number; legacy?: Record<string, unknown> } = {}): EngineEvent[] {
  const { recipe } = buildRecipe({ technique: 'kasuya_46', method: 'v60', doseG, waterG: W, bypassG: extra.bypassG ?? 0 });
  const out: EngineEvent[] = [{ id: `${brewId}:p${n++}`, at: at as EpochMs, device: 't', v: 1, kind: 'brew.plan', data: { brewId, beanId, goal: null, engine: { name: 't', version: '1' }, recipe, trialId: null, legacy: extra.legacy ?? null } }];
  if (extra.tdsPct !== undefined || extra.cupG !== undefined) {
    out.push({ id: `${brewId}:a`, at: (at + 1) as EpochMs, device: 't', v: 1, kind: 'brew.actuals', data: { brewId, doseG: null, waterG: null, grindClick: null, bypassG: null, cupG: (extra.cupG ?? null) as Grams | null, tdsPct: (extra.tdsPct ?? null) as never, technique: null } });
  }
  if (strength !== null) {
    out.push({ id: `${brewId}:t`, at: (at + 2) as EpochMs, device: 't', v: 1, kind: 'tasting', data: { brewId, minutesAfter: null, late: extra.late ?? false, strength, acidity: null, finish: [], liking: null, goalHit: null, vsLast: null, missed: null, cata: [], noteHits: [], legacyScores: null, note: '' } });
  }
  return out;
}
const plan = (events: EngineEvent[], base = 18.8, beanId: string | null = null) => strengthPlan(learnFacts(events), { method: 'v60', waterG: W, beanId, baselineDoseG: base });

test('zonder koppen blijft het advies de startdosis', () => {
  const p = plan([])!;
  assert.equal(p.doseG, 18.8);
  assert.equal(p.mode, 'start');
  assert.equal(p.n, 0);
  assert.equal(p.band, null);
});
test('massabalans heen en terug', () => {
  const t = tdsOf(18.8, 300)!;
  assert.ok(Math.abs(300 / ratioForTdsPct(t) - 18.8) < 1e-9);
  assert.equal(tdsOf(100, 200), null); // water/dosis ≤ vasthouden
});
test('te sterk geeft minder koffie, te slap meer, en nooit tegen het antwoord in', () => {
  const strong = plan(cup('a', null, AT0, 18.8, 2))!;
  assert.ok(strong.doseG <= 18.8);
  const weak = plan(cup('a', null, AT0, 18.8, -2))!;
  assert.ok(weak.doseG >= 18.8);
});
test('vier keer "te sterk" geeft duidelijk minder koffie dan de start', () => {
  let ev: EngineEvent[] = [];
  let dose = 18.8;
  for (let i = 0; i < 4; i++) {
    ev = ev.concat(cup(`c${i}`, null, AT0 + i * 1000, dose, 1));
    const next = plan(ev)!.doseG;
    assert.ok(next <= dose, `stap ${i}: ${dose} → ${next}`);
    dose = next;
  }
  assert.ok(dose < 18.8 - 1);
});
test('eigenschap: de dosis gaat nooit omhoog na "te sterk" of omlaag na "te slap" (binnen een zak)', () => {
  fc.assert(fc.property(fc.array(fc.constantFrom<StrengthOrd>(-2, -1, 0, 1, 2), { minLength: 1, maxLength: 14 }), answers => {
    let ev: EngineEvent[] = [];
    let dose = plan([])!.doseG;
    answers.forEach((a, i) => {
      ev = ev.concat(cup(`c${i}`, 'b', AT0 + i * 1000, dose, a));
      const next = plan(ev, 18.8, 'b')!.doseG;
      if (a > 0) assert.ok(next <= dose + 1e-9, `na ${a}: ${dose} → ${next} (${answers.slice(0, i + 1)})`);
      if (a < 0) assert.ok(next >= dose - 1e-9, `na ${a}: ${dose} → ${next} (${answers.slice(0, i + 1)})`);
      dose = next;
    });
  }), { numRuns: 60 });
});
test('volgorde en dubbelingen in het logboek veranderen het advies niet', () => {
  const ev = [0, 1, 2, 3, 4, 5].flatMap(i => cup(`c${i}`, 'b', AT0 + i * 1000, 18 - i * 0.3, ([1, 1, 0, -1, 0, 0] as StrengthOrd[])[i]!));
  const ref = JSON.stringify(plan(ev, 18.8, 'b'));
  fc.assert(fc.property(fc.shuffledSubarray(ev, { minLength: ev.length }), dup => {
    assert.equal(JSON.stringify(plan([...dup, ...dup], 18.8, 'b')), ref);
  }), { numRuns: 40 });
});
test('het geheugen van de beslisregel verandert nooit de uitkomst', () => {
  const ev = [0, 1, 2, 3, 4, 5, 6].flatMap(i => cup(`c${i}`, null, AT0 + i * 1000, 17 + (i % 3), ([1, 0, -1, 0, 1, 0, 0] as StrengthOrd[])[i]!));
  const facts = learnFacts(ev);
  const obs = observationsOf(facts);
  const base = Math.log(1.2);
  const cold = decide(obs, base);                      // opbouwen vanaf het begin
  for (let k = 1; k <= obs.length; k++) decide(obs.slice(0, k), base); // oplopend door het geheugen
  const warm = decide(obs, base);
  assert.equal(JSON.stringify(warm), JSON.stringify(cold));
  // en in omgekeerde volgorde van lengte
  for (let k = obs.length; k >= 1; k--) decide(obs.slice(0, k), base);
  assert.equal(JSON.stringify(decide(obs, base)), JSON.stringify(cold));
});
test('laat geproefd en bypass tellen half mee; ongeproefde koppen tellen niet', () => {
  const obs = observationsOf(learnFacts([
    ...cup('a', null, AT0, 18, 1),
    ...cup('b', null, AT0 + 1000, 18, 1, { late: true }),
    ...cup('c', null, AT0 + 2000, 18, 1, { bypassG: 40 }),
    ...cup('d', null, AT0 + 3000, 18, null)
  ]));
  assert.deepEqual(obs.map(o => o.weight), [1, 0.5, 0.5]);
});
test('een gemeten TDS gaat boven de berekende; buiten 0,4–2,5 % wordt hij genegeerd', () => {
  const obs = observationsOf(learnFacts([
    ...cup('a', null, AT0, 18, 1, { tdsPct: 1.3 }),
    ...cup('b', null, AT0 + 1000, 18, 1, { tdsPct: 9 })
  ]));
  assert.equal(obs[0]!.type === 'jar' && obs[0]!.measured, true);
  assert.ok(Math.abs((obs[0] as { tds: number }).tds - 1.3) < 1e-12);
  assert.equal(obs[1]!.type === 'jar' && obs[1]!.measured, false);
});
test('bijgevuld water maakt de kop lichter dan het bed', () => {
  const plain = observationsOf(learnFacts(cup('a', null, AT0, 18, 1)))[0] as { tds: number };
  const diluted = observationsOf(learnFacts(cup('a', null, AT0, 18, 1, { legacy: { inputs: { e2: { dilutionG: 60 } } } })))[0] as { tds: number };
  assert.ok(diluted.tds < plain.tds);
});
test('gemeten vasthouden vanaf 5 koppen met kopgewicht, anders 2,1', () => {
  const four = [0, 1, 2, 3].flatMap(i => cup(`c${i}`, null, AT0 + i * 1000, 18, 0, { cupG: 250 }));
  assert.deepEqual(retentionFor(learnFacts(four), 'v60'), { value: 2.1, n: 4, measured: false });
  const five = [0, 1, 2, 3, 4].flatMap(i => cup(`c${i}`, null, AT0 + i * 1000, 18, 0, { cupG: 250 }));
  const r = retentionFor(learnFacts(five), 'v60');
  assert.equal(r.measured, true);
  assert.equal(r.value, Math.round((Math.round((300 - 250) / 18 * 100) / 100 + 0.2) * 100) / 100);
});
test('een blind paar telt mee en wint van niets', () => {
  const pair: EngineEvent = { id: 'tr1', at: (AT0 + 5) as EpochMs, device: 't', v: 1, kind: 'pair.trial', data: {
    trialId: 'tr1', beanId: null, method: 'v60', waterG: W as Grams, kind: 'strength',
    control: { doseG: 18 as Grams, technique: null, grindClick: null }, variant: { doseG: 16 as Grams, technique: null, grindClick: null }, preferred: 'variant', brighter: null } };
  const p = plan([...cup('a', null, AT0, 18, 0), pair])!;
  assert.equal(p.pairs, 1);
  assert.equal(p.n, 2);
  // Een paar met alleen een technieklabel telt niet als sterkteproef.
  const other = { ...pair, id: 'tr2', data: { ...(pair as { data: object }).data, trialId: 'tr2', kind: 'technique' } } as EngineEvent;
  assert.equal(plan([...cup('a', null, AT0, 18, 0), other])!.pairs, 0);
});
test('een ongeldige vraag geeft null in plaats van onzin', () => {
  assert.equal(strengthPlan(learnFacts([]), { method: 'v60', waterG: 0, beanId: null, baselineDoseG: 18 }), null);
  assert.equal(strengthPlan(learnFacts([]), { method: 'v60', waterG: 300, beanId: null, baselineDoseG: 0 }), null);
});

test('gelijk aan Engine 2: dezelfde dosis, kop voor kop, in alle zes werelden', async () => {
  const sc = DEFAULT_SCENARIO;
  const e2 = await engine2Strategy(sc.waterG);
  const e3 = await engine3StrengthStrategy(sc.waterG);
  void (await baseRecipe(sc.waterG));
  for (const w of WORLDS) {
    for (const seed of [11, 12]) {
      const r = rng(seed);
      const bags = makeBags(sc, w, r);
      e2.reset(); e3.reset();
      let idx = 0;
      for (const bag of bags) {
        for (let k = 0; k < sc.cupsPerBag; k++, idx++) {
          const ctx = { beanId: bag.beanId, waterG: sc.waterG, cupIndex: idx, at: AT0 + idx * 86_400_000 };
          const d2 = e2.dose(ctx);
          const d3 = e3.dose(ctx);
          assert.equal(d3, d2, `${w.name} seed ${seed} kop ${idx}`);
          const cupRes = tasteCup(d2, bag, idx, sc, w, r);
          e2.observe(ctx, d2, cupRes.answer);
          e3.observe(ctx, d2, cupRes.answer);
        }
      }
    }
  }
});
