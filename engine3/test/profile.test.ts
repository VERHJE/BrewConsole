import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { beanFit, tasteProfile, ALL_CATEGORIES, MIN_N } from '../src/profile.ts';
import { learnFacts } from '../src/state.ts';
import { createEngine } from '../src/engine.ts';
import { validateEvent } from '../src/events.ts';
import { buildRecipe } from '../src/recipe.ts';
import { FLAVOR_WHEEL } from '../src/data/flavor-wheel.ts';
import { migrateBackupV3 } from '../src/migrate/v3.ts';
import { BACKUP_V3 } from './fixtures.ts';
import { rng } from '../eval/simulator.ts';
import type { EngineEvent, Finish, Acidity, Liking, Missed, NoteHit, ProcessBase, RoastLevel, WheelCategory } from '../src/types.ts';
import type { EpochMs, Grams } from '../src/units.ts';

let clock = 1_790_000_000_000;
let n = 0;
const tick = (): EpochMs => (clock += 60_000) as EpochMs;
const tag = (c: WheelCategory): string => FLAVOR_WHEEL.find(x => x.key === c)!.subgroups[0]!.tags[0]!.tag;

function bean(beanId: string, cats: WheelCategory[], o: { process?: ProcessBase; roast?: RoastLevel } = {}): EngineEvent {
  return { id: `b${n++}`, at: tick(), device: 't', v: 1, kind: 'bean.upsert', data: { beanId, sources: {}, legacy: null, fields: {
    name: beanId, ...(o.roast ? { roastLevel: o.roast } : {}),
    process: { base: o.process ?? 'unknown', fermentation: [], experimental: false, decaf: null, ambiguousTerm: null },
    notes: { raw: cats.map(tag), tags: cats.map(tag), unmapped: [] } } as never } };
}
interface T { cata?: WheelCategory[]; asked?: boolean; hits?: Array<[string, NoteHit]>; liking?: Liking | null; acidity?: Acidity | null; finish?: Finish[]; missed?: Missed | null; late?: boolean; note?: string }
function cup(beanId: string | null, t: T = {}): EngineEvent[] {
  const brewId = `c${n++}`;
  const { recipe } = buildRecipe({ technique: 'kasuya_46', method: 'v60', doseG: 20, waterG: 300 });
  return [
    { id: `${brewId}:p`, at: tick(), device: 't', v: 1, kind: 'brew.plan', data: { brewId, beanId, goal: null, engine: { name: 't', version: '1' }, recipe, trialId: null, legacy: null } },
    { id: `${brewId}:t`, at: tick(), device: 't', v: 1, kind: 'tasting', data: {
      brewId, minutesAfter: null, late: t.late ?? false, strength: 0, acidity: t.acidity ?? null, finish: t.finish ?? [], liking: t.liking ?? null, goalHit: null, vsLast: null, missed: t.missed ?? null,
      cata: t.cata ?? [], ...(t.asked === undefined ? {} : { cataAsked: t.asked }), noteHits: (t.hits ?? []).map(([note, hit]) => ({ note, hit })), legacyScores: null, note: t.note ?? '' } }
  ];
}
const prof = (ev: EngineEvent[]) => tasteProfile(learnFacts(ev));
const sens = (p: ReturnType<typeof prof>, c: WheelCategory) => p.sensitivity.find(s => s.category === c)!;

test('zonder koppen: een leeg profiel zonder fouten', () => {
  const p = prof([]);
  assert.equal(p.cups, 0);
  assert.equal(p.cataCups, 0);
  assert.equal(p.sensitivity.length, ALL_CATEGORIES.length);
  assert.ok(p.sensitivity.every(s => s.status === 'unknown' && s.recall === null && s.skill === null));
  assert.equal(p.liking.overall, null);
  assert.deepEqual(p.liking.byCategory, []);
  assert.equal(p.tendencies.lateShare, null);
});
test('blinde keuze: treffers en valse alarmen tegenover wat de zak vermeldt', () => {
  const ev = [bean('a', ['fruitig', 'zoet']), bean('b', ['bloemig']),
    ...cup('a', { cata: ['fruitig', 'zoet'] }), ...cup('a', { cata: ['fruitig'] }), ...cup('b', { cata: ['fruitig'] }), ...cup('b', { cata: ['bloemig'] })];
  const p = prof(ev);
  assert.equal(p.cataCups, 4);
  const f = sens(p, 'fruitig');
  assert.deepEqual([f.nExpected, f.hits, f.nNotExpected, f.falseAlarms], [2, 2, 2, 1]);
  assert.equal(f.recall, 1);
  assert.equal(f.falseAlarmRate, 0.5);
  assert.equal(f.skill, 0.5);
  const z = sens(p, 'zoet');
  assert.deepEqual([z.nExpected, z.hits, z.falseAlarms], [2, 1, 0]);
});
test('gesteld of niet gesteld: een lege keuze telt alleen als de vraag gesteld is', () => {
  const ev = [bean('a', ['fruitig']), ...cup('a', { asked: true }), ...cup('a', { asked: false, cata: ['fruitig'] }), ...cup('a', {}), ...cup('a', { cata: ['fruitig'] }), ...cup('a', { hits: [['kers', 'yes']] })];
  const p = prof(ev);
  // gesteld: asked=true (leeg), niets gezegd + geen vlag → niet gesteld, cata gevuld → gesteld, noteHits → gesteld
  assert.equal(p.cataCups, 3);
  assert.deepEqual([sens(p, 'fruitig').nExpected, sens(p, 'fruitig').hits], [3, 1]);
});
test('status: pakt op, mist, te veel, onbekend', () => {
  const evs: EngineEvent[] = [bean('f', ['fruitig']), bean('l', ['bloemig']), bean('n', ['zoet'])];
  for (let i = 0; i < 4; i++) evs.push(...cup('f', { cata: ['fruitig', 'groen_plantaardig'] })); // fruitig: 4/4, nooit vals
  for (let i = 0; i < 4; i++) evs.push(...cup('l', { cata: ['groen_plantaardig'], asked: true })); // bloemig: 0/4 gemist
  for (let i = 0; i < 4; i++) evs.push(...cup('n', { cata: ['groen_plantaardig'] })); // groen: nooit vermeld maar steeds aangevinkt
  const p = prof(evs);
  assert.equal(sens(p, 'fruitig').status, 'picks_up');
  assert.equal(sens(p, 'bloemig').status, 'misses');
  assert.equal(sens(p, 'groen_plantaardig').status, 'overcalls');
  assert.equal(sens(p, 'specerijen').status, 'unknown');
  assert.equal(sens(prof([bean('x', ['fruitig']), ...cup('x', { cata: ['fruitig'] })]), 'fruitig').status, 'unknown');
  assert.equal(MIN_N, 3);
});
test('herkende notities: ja/beetje/nee per notitie en een woordenschat van wat je steeds herkent', () => {
  const ev = [bean('a', ['fruitig']),
    ...cup('a', { hits: [['Kers', 'yes'], ['honing', 'no']] }), ...cup('a', { hits: [['kers', 'yes'], ['honing', 'bit']] }), ...cup('a', { hits: [['kers ', 'bit'], ['honing', 'no']] })];
  const p = prof(ev);
  const kers = p.notes.find(x => x.note === 'kers')!;
  assert.deepEqual([kers.n, kers.yes, kers.bit, kers.no], [3, 2, 1, 0]);
  assert.equal(kers.score, 2.5 / 3);
  assert.deepEqual(p.vocabulary, ['kers']);
  assert.equal(p.notes[0]!.n, 3);
});
test('waardering: kleine aantallen worden bijgetrokken en gemarkeerd; zakken die passen krijgen een positief verschil', () => {
  const ev: EngineEvent[] = [bean('fr', ['fruitig'], { process: 'natural', roast: 'light' }), bean('ch', ['notig_cacao'], { process: 'washed', roast: 'dark' }), bean('bl', ['bloemig'], { process: 'honey', roast: 'medium' })];
  for (let i = 0; i < 4; i++) ev.push(...cup('fr', { liking: 5 }));
  for (let i = 0; i < 4; i++) ev.push(...cup('ch', { liking: 2 }));
  ev.push(...cup('bl', { liking: 5 }));
  const p = prof(ev);
  assert.equal(p.liking.overall!.n, 9);
  const by = (k: string) => p.liking.byCategory.find(x => x.key === k)!;
  assert.ok(by('fruitig').delta > 0 && by('notig_cacao').delta < 0);
  assert.equal(by('fruitig').reliable, true);
  assert.equal(by('bloemig').reliable, false);
  assert.ok(by('bloemig').shrunk < by('bloemig').mean && by('bloemig').shrunk > p.liking.overall!.mean); // naar het gemiddelde getrokken
  assert.equal(p.liking.byCategory[0]!.key, 'fruitig'); // gesorteerd op verschil
  assert.equal(p.liking.byProcess.find(x => x.key === 'natural')!.reliable, true);
  assert.equal(p.liking.byRoast.find(x => x.key === 'dark')!.n, 4);
  const facts = learnFacts(ev);
  const nieuw = bean('nieuw', ['fruitig'], { process: 'natural', roast: 'light_medium' });
  const fit = beanFit(learnFacts([...ev, nieuw]), p, 'nieuw');
  assert.ok(fit.expectedDelta! > 0 && fit.basis === 3);
  const slecht = beanFit(learnFacts([...ev, bean('s', ['notig_cacao'], { process: 'washed', roast: 'dark' })]), p, 's');
  assert.ok(slecht.expectedDelta! < 0);
  assert.equal(beanFit(facts, p, 'bestaat-niet').expectedDelta, null);
  assert.equal(beanFit(learnFacts([...ev, bean('b2', ['bloemig'])]), p, 'b2').expectedDelta, null); // geen betrouwbaar kenmerk
});
test('tendensen: zuurgraad, afdronk, gemist en laat geproefd', () => {
  const p = prof([bean('a', []), ...cup('a', { acidity: 'lively', finish: ['sweet_clean'], missed: 'fruit' }), ...cup('a', { acidity: 'lively', finish: ['bitter', 'drying'], late: true }), ...cup('a', { acidity: 'sharp' })]);
  assert.deepEqual(p.tendencies.acidity, { lively: 2, sharp: 1 });
  assert.deepEqual(p.tendencies.finish, { sweet_clean: 1, bitter: 1, drying: 1 });
  assert.deepEqual(p.tendencies.missed, { fruit: 1 });
  assert.equal(p.tendencies.lateShare, 1 / 3);
});
test('volgorde en dubbelingen in het logboek veranderen het profiel niet', () => {
  const ev = [bean('a', ['fruitig']), bean('b', ['bloemig']), ...cup('a', { cata: ['fruitig'], liking: 4, hits: [['kers', 'yes']] }), ...cup('b', { cata: [], asked: true, liking: 2 }), ...cup('a', { cata: ['zoet'], liking: 5 })];
  const ref = JSON.stringify(prof(ev));
  fc.assert(fc.property(fc.shuffledSubarray(ev, { minLength: ev.length }), s => { assert.equal(JSON.stringify(prof([...s, ...s])), ref); }), { numRuns: 30 });
});
test('een simulatie met een bekende proever: de schatting komt dicht bij de waarheid', () => {
  const r = rng(77);
  const truth: Record<string, { recall: number; fa: number }> = { fruitig: { recall: 0.9, fa: 0.05 }, bloemig: { recall: 0.2, fa: 0.05 }, zoet: { recall: 0.8, fa: 0.5 } };
  const catsPool: WheelCategory[] = ['fruitig', 'bloemig', 'zoet', 'geroosterd'];
  const ev: EngineEvent[] = [];
  const beans: Array<{ id: string; cats: WheelCategory[] }> = [];
  for (let b = 0; b < 12; b++) {
    const cats = catsPool.filter(() => r() < 0.5);
    beans.push({ id: `z${b}`, cats });
    ev.push(bean(`z${b}`, cats));
  }
  for (let i = 0; i < 240; i++) {
    const b = beans[i % beans.length]!;
    const cata = (Object.keys(truth) as WheelCategory[]).filter(c => r() < (b.cats.includes(c) ? truth[c]!.recall : truth[c]!.fa));
    ev.push(...cup(b.id, { cata, asked: true }));
  }
  const p = prof(ev);
  for (const c of Object.keys(truth)) {
    const s = sens(p, c as WheelCategory);
    assert.ok(Math.abs(s.recall! - truth[c]!.recall) < 0.12, `${c} recall ${s.recall} tegen ${truth[c]!.recall}`);
    assert.ok(Math.abs(s.falseAlarmRate! - truth[c]!.fa) < 0.12, `${c} valse alarmen ${s.falseAlarmRate} tegen ${truth[c]!.fa}`);
  }
  assert.equal(sens(p, 'fruitig').status, 'picks_up');
  assert.equal(sens(p, 'bloemig').status, 'misses');
  assert.equal(sens(p, 'zoet').status, 'overcalls');
});
test('het smaakprofiel stuurt het recept niet: plan() is gelijk met en zonder keuzevakjes, herkende notities, waardering en notitie', () => {
  const E = createEngine();
  const base = (variant: boolean): EngineEvent[] => {
    const ev: EngineEvent[] = [bean('z', ['fruitig', 'bloemig'], { process: 'natural', roast: 'light' })];
    for (let i = 0; i < 4; i++) ev.push(...cup('z', variant ? { cata: ['fruitig'], asked: true, hits: [['kers', 'yes']], liking: 5, note: 'heerlijk', missed: 'sweet' } : {}));
    return ev;
  };
  // gelijke id's en tijden: alleen de smaakvelden verschillen
  const a = base(false), b = base(true).map((e, i) => ({ ...e, id: a[i]!.id, at: a[i]!.at }) as EngineEvent);
  const req = { at: 1 as EpochMs, beanId: 'z', method: 'v60' as const, cupG: 250 as Grams, goal: null, technique: null };
  assert.equal(JSON.stringify(E.plan(E.learn(a), req)), JSON.stringify(E.plan(E.learn(b), req)));
});
test('de validator weigert een cataAsked die geen waar/onwaar is', () => {
  const ev = cup('a', { asked: true })[1]!;
  assert.deepEqual(validateEvent(ev), []);
  assert.ok(validateEvent({ ...ev, data: { ...(ev as { data: object }).data, cataAsked: 'ja' } }).some(i => i.path === 'data.cataAsked'));
});
test('de gemigreerde back-up geeft een bruikbaar (mogelijk leeg) profiel', () => {
  const p = tasteProfile(learnFacts(migrateBackupV3(BACKUP_V3).events));
  assert.ok(p.cups >= 1);
  assert.equal(p.cataCups, 0);
  assert.ok(p.sensitivity.every(s => s.status === 'unknown'));
});
