import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { learnFacts } from '../src/state.ts';
import { categoriesOf, chooseTechnique, MIN_CONTROL_CUPS, recurringFeedback, roastClassOf, trialProposalFor, similarBeans } from '../src/technique.ts';
import type { TechniqueRequest } from '../src/technique.ts';
import { buildRecipe } from '../src/recipe.ts';
import { FLAVOR_WHEEL } from '../src/data/flavor-wheel.ts';
import { TECHNIQUES } from '../src/data/techniques.ts';
import { TECH_SCENARIO, TECH_WORLDS, simulateTechnique } from '../eval/technique-sim.ts';
import type { Acidity, EngineEvent, Finish, ProcessBase, RoastLevel, TechniqueId, WheelCategory } from '../src/types.ts';
import type { EpochMs, Grams } from '../src/units.ts';

let clock = 1_790_000_000_000;
let n = 0;
const tick = (): EpochMs => (clock += 1000) as EpochMs;
const tag = (c: WheelCategory): string => FLAVOR_WHEEL.find(x => x.key === c)!.subgroups[0]!.tags[0]!.tag;

function bean(beanId: string, o: { process?: ProcessBase; roast?: RoastLevel; cats?: WheelCategory[] } = {}): EngineEvent {
  return { id: `b:${beanId}:${n++}`, at: tick(), device: 't', v: 1, kind: 'bean.upsert', data: { beanId, sources: {}, legacy: null, fields: {
    name: beanId, ...(o.roast ? { roastLevel: o.roast } : {}),
    process: { base: o.process ?? 'unknown', fermentation: [], experimental: false, decaf: null, ambiguousTerm: null },
    notes: { raw: (o.cats ?? []).map(tag), tags: (o.cats ?? []).map(tag), unmapped: [] } } as never } };
}
function cup(brewId: string, beanId: string | null, o: { tech?: TechniqueId; trialId?: string | null; acidity?: Acidity | null; finish?: Finish[]; tasted?: boolean } = {}): EngineEvent[] {
  const { recipe } = buildRecipe({ technique: o.tech ?? 'kasuya_46', method: 'v60', doseG: 20, waterG: 300 });
  const ev: EngineEvent[] = [{ id: `${brewId}:p${n++}`, at: tick(), device: 't', v: 1, kind: 'brew.plan', data: { brewId, beanId, goal: null, engine: { name: 't', version: '1' }, recipe, trialId: o.trialId ?? null, legacy: null } }];
  if (o.tasted !== false) ev.push({ id: `${brewId}:t${n++}`, at: tick(), device: 't', v: 1, kind: 'tasting', data: { brewId, minutesAfter: null, late: false, strength: 0, acidity: o.acidity ?? null, finish: o.finish ?? [], liking: null, goalHit: null, vsLast: null, missed: null, cata: [], noteHits: [], legacyScores: null, note: '' } });
  return ev;
}
function trial(trialId: string, beanId: string | null, control: TechniqueId, variant: TechniqueId, preferred: 'control' | 'variant' | 'none'): EngineEvent {
  return { id: `${trialId}:r${n++}`, at: tick(), device: 't', v: 1, kind: 'pair.trial', data: { trialId, beanId, method: 'v60', waterG: 300 as Grams, kind: 'technique',
    control: { doseG: 20 as Grams, technique: control, grindClick: null }, variant: { doseG: 20 as Grams, technique: variant, grindClick: null }, preferred, brighter: null } };
}
const two = (id: string, b: string | null): EngineEvent[] => [...cup(`${id}a`, b), ...cup(`${id}b`, b)];
const req = (beanId: string | null, o: Partial<TechniqueRequest> = {}): TechniqueRequest => ({ beanId, method: 'v60', cupG: 300, technique: null, ...o });
const choose = (events: EngineEvent[], r: TechniqueRequest) => chooseTechnique(learnFacts(events), r);

test('Chemex: recept per portie als besluit, direct en zonder proef', () => {
  const want: ReadonlyArray<[number, TechniqueId]> = [[250, 'chemex_howell_cup'], [340, 'chemex_howell_cup'], [400, 'chemex_howell_cup'], [450, 'chemex_stumptown'], [550, 'chemex_stumptown'], [680, 'chemex_barefoot']];
  for (const [cupG, t] of want) {
    const c = choose([bean('z')], req('z', { method: 'chemex', cupG }));
    assert.equal(c.technique, t, `${cupG} g`);
    assert.equal(c.source, 'rule_direct');
    assert.equal(c.trial, null);
  }
});
test('Chemex: na twee geproefde koppen volgt een proef tussen twee Chemex-recepten; de winnaar wordt de keuze voor die zak', () => {
  const ccup = (id: string): EngineEvent[] => cup(id, 'z', { tech: 'chemex_howell_cup' });
  const r = req('z', { method: 'chemex', cupG: 340 });
  assert.equal(choose([bean('z'), ...ccup('a')], r).trial, null);
  const c = choose([bean('z'), ...ccup('a'), ...ccup('b')], r);
  assert.equal(c.technique, 'chemex_howell_cup');
  assert.deepEqual([c.trial?.control, c.trial?.variant], ['chemex_howell_cup', 'chemex_pull_pour']);
  // Gewonnen proef: de winnaar wint, ook als er een V60-proef van dezelfde zak bestaat.
  const won = [bean('z'), ...ccup('a'), ...ccup('b'), trial('t1', 'z', 'chemex_howell_cup', 'chemex_pull_pour', 'variant')];
  assert.equal(choose(won, r).technique, 'chemex_pull_pour');
  const mixed = [...won, trial('t2', 'z', 'kasuya_46', 'gagne', 'variant')];
  assert.equal(choose(mixed, r).technique, 'chemex_pull_pour');
  assert.equal(choose(mixed, req('z')).technique, 'gagne');
});
test('een Chemex-recept wordt op de V60 nooit gekozen, ook niet na een gewonnen proef', () => {
  const events = [bean('z'), ...two('k', 'z'), trial('t1', 'z', 'kasuya_46', 'chemex_stumptown', 'variant')];
  assert.equal(choose(events, req('z')).technique, 'kasuya_46');
  assert.notEqual(choose(events, req('z', { method: 'chemex', cupG: 650 })).technique, 'kasuya_46');
});
test('niets wijst iets anders aan: Kasuya als terugval', () => {
  const c = choose([bean('z')], req('z'));
  assert.deepEqual([c.technique, c.source, c.trial, c.kasuyaFirstPourShare], ['kasuya_46', 'fallback', null, null]);
});
test('onbekende zak (null) en zak zonder gegevens werken ook', () => {
  assert.equal(choose([], req(null)).technique, 'kasuya_46');
  assert.equal(choose([], req('bestaat-niet')).technique, 'kasuya_46');
});
test('zelf gekozen techniek wint altijd, zonder proef', () => {
  const c = choose([bean('z', { cats: ['bloemig'] }), ...two('a', 'z')], req('z', { technique: 'april' }));
  assert.deepEqual([c.technique, c.source, c.trial], ['april', 'user', null]);
});
test('een afwijking van Kasuya is een proef: eerst Kasuya zetten, pas na twee geproefde controlekoppen de proef', () => {
  const b = bean('z', { cats: ['bloemig'] });
  const early = choose([b, ...cup('a', 'z')], req('z'));
  assert.equal(early.technique, 'kasuya_46');
  assert.equal(early.trial, null);
  assert.ok(early.reasons.some(r => r.code === 'technique.trial_later'));
  const late = choose([b, ...two('c', 'z')], req('z'));
  assert.equal(late.technique, 'kasuya_46');
  assert.equal(late.trial?.variant, 'wendelboe');
  assert.equal(late.trial?.control, 'kasuya_46');
  assert.equal(late.trial?.basis, 'rule');
  assert.equal(MIN_CONTROL_CUPS, 2);
});
test('ongeproefde koppen en proefkoppen tellen niet als controle', () => {
  const b = bean('z', { cats: ['bloemig'] });
  const c = choose([b, ...cup('a', 'z', { tasted: false }), ...cup('b', 'z', { tasted: false }), ...cup('c', 'z', { trialId: 'x' }), ...cup('d', 'z', { trialId: 'x' })], req('z'));
  assert.equal(c.trial, null);
});
test('licht gebrand met terugkerend zuur of hol geeft Gagné als proef; één klacht is nog niet terugkerend', () => {
  const b = bean('z', { roast: 'light' });
  const once = choose([b, ...cup('a', 'z', { acidity: 'sharp' }), ...cup('b', 'z')], req('z'));
  assert.equal(once.trial, null);
  const twice = choose([b, ...cup('a', 'z', { acidity: 'sharp' }), ...cup('b', 'z', { finish: ['hollow'] })], req('z'));
  assert.equal(twice.trial?.variant, 'gagne');
  const dark = choose([bean('d', { roast: 'dark' }), ...cup('a', 'd', { acidity: 'sharp' }), ...cup('b', 'd', { acidity: 'sharp' })], req('d'));
  assert.equal(dark.trial, null);
});
test('droge afdronk of ongelijk doorlopen geeft Rao als proef', () => {
  const dry = choose([bean('z'), ...cup('a', 'z', { finish: ['drying'] }), ...cup('b', 'z', { finish: ['drying', 'bitter'] })], req('z'));
  assert.equal(dry.trial?.variant, 'rao');
  const uneven = choose([bean('z'), ...two('a', 'z')], req('z', { feedback: ['uneven_drain'] }));
  assert.equal(uneven.trial?.variant, 'rao');
});
test('natural met fruit: grote eerste giet (0,667), en Osmotic Flow wordt niet voorgesteld (geen schema)', () => {
  const c = choose([bean('z', { process: 'natural', cats: ['fruitig'] }), ...two('a', 'z')], req('z'));
  assert.equal(c.technique, 'kasuya_46');
  assert.equal(c.kasuyaFirstPourShare, 0.667);
  assert.ok(!c.trial || c.trial.variant !== 'osmotic_flow');
  assert.equal(c.trial, null);
});
test('chocolade en karamel: kleinere eerste giet (0,333) en April als proef', () => {
  const c = choose([bean('z', { cats: ['notig_cacao'] }), ...two('a', 'z')], req('z'));
  assert.equal(c.kasuyaFirstPourShare, 0.333);
  assert.equal(c.trial?.variant, 'april');
});
test('een kleine kop (≤ 230 g) geeft Hedrick als proef', () => {
  const c = choose([bean('z'), ...two('a', 'z')], req('z', { cupG: 200 }));
  assert.equal(c.trial?.variant, 'hedrick_one_and_done');
  assert.equal(choose([bean('z'), ...two('a', 'z')], req('z', { cupG: 300 })).trial, null);
});
test('een gewonnen proef wint: voor deze zak voortaan die techniek, zonder nieuwe proef', () => {
  const ev = [bean('z', { cats: ['bloemig'] }), ...two('a', 'z'), trial('tech:z:wendelboe:1', 'z', 'kasuya_46', 'wendelboe', 'variant')];
  const c = choose(ev, req('z'));
  assert.deepEqual([c.technique, c.source, c.trial], ['wendelboe', 'won_trial', null]);
});
test('een gewonnen controle houdt Kasuya en stelt de verliezer niet opnieuw voor', () => {
  const ev = [bean('z', { cats: ['bloemig'] }), ...two('a', 'z'), trial('tech:z:wendelboe:1', 'z', 'kasuya_46', 'wendelboe', 'control')];
  const c = choose(ev, req('z'));
  assert.deepEqual([c.technique, c.source, c.trial], ['kasuya_46', 'won_trial', null]);
});
test('een gelijkspel telt als geprobeerd: dezelfde variant komt niet terug, de volgende kandidaat wel', () => {
  const ev = [bean('z', { cats: ['bloemig'] }), ...two('a', 'z'), trial('tech:z:wendelboe:1', 'z', 'kasuya_46', 'wendelboe', 'none')];
  const c = choose(ev, req('z', { cupG: 200 }));
  assert.equal(c.source, 'rule');
  assert.equal(c.trial?.variant, 'hedrick_one_and_done');
  assert.equal(choose(ev, req('z')).trial, null);
});
test('vergelijkbare zakken: één winst geeft een voorgestelde proef, twee netto winsten de standaard', () => {
  const sim = (id: string, o: { roast?: RoastLevel } = {}): EngineEvent[] => [bean(id, { process: 'washed', roast: o.roast ?? 'light', cats: ['zoet'] })];
  const nieuw = bean('nieuw', { process: 'washed', roast: 'light_medium', cats: ['zoet', 'overig'] });
  const win = (id: string): EngineEvent => trial(`tech:${id}:april:1`, id, 'kasuya_46', 'april', 'variant');
  const one = choose([...sim('a'), nieuw, ...two('x', 'nieuw'), win('a')], req('nieuw'));
  assert.equal(one.source, 'rule');
  assert.deepEqual([one.trial?.variant, one.trial?.basis], ['april', 'similar']);
  const manyEv = [...sim('a'), ...sim('b'), nieuw, win('a'), win('b')];
  const many = choose(manyEv, req('nieuw'));
  assert.deepEqual([many.technique, many.source], ['april', 'similar_wins']);
  // Een andere brandingklasse is niet vergelijkbaar.
  const other = choose([...sim('a', { roast: 'dark' }), ...sim('b', { roast: 'dark' }), nieuw, win('a'), win('b')], req('nieuw'));
  assert.notEqual(other.source, 'similar_wins');
});
test('een verliezer bij vergelijkbare zakken wordt niet de standaard', () => {
  const sim = (id: string): EngineEvent[] => [bean(id, { process: 'washed', roast: 'light', cats: ['zoet'] })];
  const lose = (id: string): EngineEvent => trial(`tech:${id}:april:1`, id, 'kasuya_46', 'april', 'control');
  const c = choose([...sim('a'), ...sim('b'), bean('n', { process: 'washed', roast: 'light', cats: ['zoet'] }), lose('a'), lose('b')], req('n'));
  assert.notEqual(c.technique, 'april');
  assert.notEqual(c.source, 'similar_wins');
});
test('een lopende proef blokkeert een nieuwe; direct na een proef volgt een gewone kop', () => {
  const b = bean('z', { cats: ['bloemig'] });
  const pend = choose([b, ...two('a', 'z'), ...cup('c', 'z', { trialId: 'tech:z:wendelboe:1' })], req('z'));
  assert.equal(pend.trial, null);
  assert.equal(pend.pendingTrialId, 'tech:z:wendelboe:1');
  const done = [b, ...two('a', 'z'), ...cup('c', 'z', { trialId: 'tech:z:wendelboe:1' }), ...cup('d', 'z', { tech: 'wendelboe', trialId: 'tech:z:wendelboe:1' }), trial('tech:z:wendelboe:1', 'z', 'kasuya_46', 'wendelboe', 'none')];
  const cool = choose(done, req('z', { cupG: 200 }));
  assert.equal(cool.trial, null);
  assert.ok(cool.reasons.some(r => r.code === 'technique.trial_cooldown'));
});
test('de proef als twee recepten: gelijke dosis, water en maling, Kasuya met het aandeel van de regel', () => {
  const c = choose([bean('z', { cats: ['notig_cacao'] }), ...two('a', 'z')], req('z'));
  const p = trialProposalFor(c, { doseG: 19, waterG: 300, method: 'v60', roast: 'medium', grindClick: 17 })!;
  assert.equal(p.kind, 'technique');
  assert.equal(p.id, c.trial!.id);
  assert.deepEqual([p.control.technique, p.variant.technique], ['kasuya_46', 'april']);
  assert.deepEqual([p.control.doseG, p.variant.doseG, p.control.waterG, p.variant.waterG, p.control.grindClick, p.variant.grindClick], [19, 19, 300, 300, 17, 17]);
  assert.equal(p.control.pours[0]!.toG, 40); // 0,333 van de eerste 120 g
  assert.equal(trialProposalFor(choose([], req(null)), { doseG: 19, waterG: 300, method: 'v60' }), null);
});
test('elke voorgestelde proefvariant heeft een gietschema in de bron', () => {
  const noSchedule = new Set(TECHNIQUES.filter(t => t.reference.pours === null).map(t => t.id));
  for (const cats of [['bloemig'], ['notig_cacao'], ['fruitig']] as WheelCategory[][]) {
    for (const process of ['washed', 'natural'] as ProcessBase[]) {
      const c = choose([bean('z', { process, cats }), ...two('a', 'z')], req('z', { cupG: 200, feedback: ['uneven_drain'] }));
      if (c.trial) assert.ok(!noSchedule.has(c.trial.variant), c.trial.variant);
    }
  }
});
test('hulpfuncties: categorieën, brandingklasse, vergelijkbaarheid, terugkerende klacht', () => {
  assert.deepEqual(categoriesOf([tag('bloemig'), tag('zoet'), 'onbekende tag']).sort(), ['bloemig', 'zoet']);
  assert.deepEqual(['light', 'light_medium', 'medium', 'medium_dark', 'dark', null].map(r => roastClassOf(r as never)), ['light', 'light', 'medium', 'dark', 'dark', null]);
  const a = { process: 'washed', roast: 'light', roastClass: 'light', categories: ['zoet'] } as never;
  assert.equal(similarBeans(a, { process: 'washed', roast: 'light_medium', roastClass: 'light', categories: ['zoet', 'fruitig'] } as never), true);
  assert.equal(similarBeans(a, { process: 'natural', roast: 'light', roastClass: 'light', categories: ['zoet'] } as never), false);
  assert.equal(similarBeans(a, { process: 'washed', roast: 'light', roastClass: 'light', categories: ['fruitig'] } as never), false);
  assert.equal(recurringFeedback(learnFacts([...cup('a', 'z', { acidity: 'sharp' })]), 'z').size, 0);
});
test('eigenschap: volgorde en dubbelingen in het logboek veranderen de keuze niet', () => {
  const ev = [bean('z', { cats: ['bloemig'], roast: 'light' }), ...cup('a', 'z', { acidity: 'sharp' }), ...cup('b', 'z', { finish: ['hollow'] }), ...cup('c', 'z')];
  const ref = JSON.stringify(choose(ev, req('z')));
  fc.assert(fc.property(fc.shuffledSubarray(ev, { minLength: ev.length }), s => {
    assert.equal(JSON.stringify(choose([...s, ...s], req('z'))), ref);
  }), { numRuns: 40 });
});
test('meetopstelling: Engine 3 heeft nergens meer spijt dan altijd Kasuya, en minder dan alles proberen zodra de regels iets waard zijn', () => {
  const runs = 25;
  for (const w of TECH_WORLDS) {
    let e3 = 0, k = 0, naive = 0, superf = 0, trials = 0;
    for (let i = 0; i < runs; i++) {
      const a = simulateTechnique('Engine 3 (regels + proeven)', w, 7000 + i);
      e3 += a.regret; trials += a.trialsPerBag; superf += a.superfluousTrials;
      k += simulateTechnique('altijd Kasuya', w, 7000 + i).regret;
      naive += simulateTechnique('proef elke techniek', w, 7000 + i).regret;
    }
    assert.ok(e3 / runs <= k / runs + 1e-9, `${w.name}: ${e3 / runs} tegen Kasuya ${k / runs}`);
    // Alles proberen wint alleen als de regels niets waard zijn (0 %): dan is verkennen de enige manier om de beste te vinden.
    if (w.ruleAccuracy > 0) assert.ok(e3 / runs <= naive / runs + 1e-9, `${w.name}: ${e3 / runs} tegen alles proberen ${naive / runs}`);
    assert.ok(trials / runs <= 2, `${w.name}: ${trials / runs} proeven per zak`);
  }
  assert.equal(TECH_SCENARIO.cupsPerBag, 10);
});
