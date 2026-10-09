// Expertreview oktober 2026, Sprint B (diag-2026.3): de smaaklus sluiten.
// - R-03: "droog/wrang" blokkeert het advies alleen bij een goede sterkte; bitter + droog + vlak
//   is overextractie; "te sterk" met alleen bitter → eerst minder koffie.
// - R-04/R-09: "Wat miste je?" geeft één doelgerichte stap, ook bij een geslaagde kop van 4/5.
// - R-02: "jouw stand" per boon (standFromRecord/updateBeanStand).
// - R-10: "houd zo" dat de volgende kop weer goed was, telt apart.
// - Simulatie: met een virtuele proever komen bijna alle bonen tot rust op hun beste kop.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './load-app.mjs';

const { api } = loadApp();
const j = (x) => JSON.parse(JSON.stringify(x));
const ctx = (extra) => Object.assign({ actualsConfirmed: true, roastId: 'light', grind: { current: 15, min: 13, max: 18 }, strength: { current: 0, blocked: {} } }, extra || {});
const reco = (t, goal, extra) => j(api.recommendNext({ tasting: t, goal: goal || null, ctx: ctx(extra) }));
const pick = (r) => [r.type, r.lever || null, r.delta || null, r.reasonKey];

describe('R-03: droog/wrang en overextractie (diag-2026.3)', () => {
  test('droog bij een goede sterkte blijft "check eerst je gieten"', () => {
    assert.deepEqual(pick(reco({ strength: 'just_right', acidity: 'lively', finish: ['drying'], liking: 2 })), ['CHECK', null, null, 'uneven']);
  });
  test('droog + te sterk → minder koffie, met de giettip erbij', () => {
    const r = reco({ strength: 'too_strong', acidity: 'sharp', finish: ['drying'], liking: 2 });
    assert.deepEqual(pick(r), ['ADJUST', 'dose', -1, 'matrix']);
    assert.ok(r.notes.includes('uneven_tip'));
    assert.match(api.recommendationTexts(r, api.diagnoseTasting({ strength: 'too_strong', acidity: 'sharp', finish: ['drying'] }, {}), {}).notes.join(' '), /giet rustig/);
  });
  test('veel te slap + droog → meer koffie (vroeger: alleen "check je gieten")', () => {
    assert.deepEqual(pick(reco({ strength: 'much_too_weak', acidity: 'lively', finish: ['drying'], liking: 2 })).slice(0, 2), ['ADJUST', 'dose']);
  });
  test('bitter + droog + vlak = waarschijnlijk overextractie → 1 klik grover', () => {
    const t = { strength: 'just_right', acidity: 'flat', finish: ['bitter', 'drying'], liking: 2 };
    const d = j(api.diagnoseTasting(t, { roastId: 'light' }));
    assert.equal(d.extraction.state, 'over');
    assert.equal(d.confidence, 'likely');
    assert.deepEqual(pick(reco(t)), ['ADJUST', 'grind', 1, 'matrix']);
  });
  test('vlak zuur met hoge alkaliniteit → eerst het water, ook met bitter en droog', () => {
    assert.deepEqual(pick(reco({ strength: 'just_right', acidity: 'flat', finish: ['bitter', 'drying'], liking: 2 }, null, { alkalinityCaCO3: 140 })), ['CHECK', null, null, 'water_buffering']);
  });
  test('ruleset-versie', () => {
    assert.equal(api.DIAGNOSIS_RULESET_VERSION, 'diag-2026.3');
  });
});

describe('R-04/R-09: "Wat miste je?"', () => {
  const okCup = { strength: 'just_right', acidity: 'lively', finish: ['sweet_clean'], liking: 3, goalHit: 'almost' };
  test('de vraag verschijnt bij doel bijna/nee of bij 4 of minder, niet bij een 5 met doel gehaald', () => {
    assert.equal(api.missedQuestionApplies({ liking: 3 }, null), true);
    assert.equal(api.missedQuestionApplies({ liking: 4 }, null), true);
    assert.equal(api.missedQuestionApplies({ liking: 5 }, null), false);
    assert.equal(api.missedQuestionApplies({ liking: 5, goalHit: 'almost' }, 'bright'), true);
    assert.equal(api.missedQuestionApplies({ liking: 5, goalHit: 'yes' }, 'bright'), false);
    assert.equal(api.TASTING_MISSED.length, 5);
  });
  test('zonder antwoord blijft het "herhaal" (zoals vroeger)', () => {
    assert.deepEqual(pick(reco(okCup, 'bright')), ['REPEAT', null, null, 'no_clear_lever']);
  });
  test('meer fruit → een halve stap lichter (−4%)', () => {
    const r = reco(Object.assign({}, okCup, { missed: 'fruit' }), 'bright', { alkalinityCaCO3: 40 });
    assert.deepEqual(pick(r), ['ADJUST', 'dose', -0.5, 'goal_fruit']);
    const tx = api.recommendationTexts(r, null, {});
    assert.match(tx.title, /Een halve stap lichter/);
    assert.match(tx.body, /fruit en helderheid/);
    assert.match(tx.expect, /helderder en fruitiger/);
  });
  test('meer fruit met water dat zuren dempt → eerst het water', () => {
    const r = reco(Object.assign({}, okCup, { missed: 'fruit' }), 'bright', { alkalinityCaCO3: 140 });
    assert.deepEqual(pick(r), ['CHECK', null, null, 'water_fruit']);
    assert.match(api.recommendationTexts(r, null, { alkalinity: 140 }).body, /1:1 te mengen met gedemineraliseerd/);
  });
  test('meer fruit zonder bekend water → de stap, met een watertip', () => {
    const r = reco(Object.assign({}, okCup, { missed: 'fruit' }), 'bright');
    assert.ok(r.notes.includes('water_unknown_fruit'));
  });
  test('meer body → halve stap sterker; meer zoetheid → 1 klik fijner; minder bitter → 1 klik grover', () => {
    assert.deepEqual(pick(reco(Object.assign({}, okCup, { missed: 'body' }), 'bright')), ['ADJUST', 'dose', 0.5, 'goal_body']);
    assert.deepEqual(pick(reco(Object.assign({}, okCup, { missed: 'sweet' }), 'bright')), ['ADJUST', 'grind', -1, 'goal_sweet']);
    assert.deepEqual(pick(reco(Object.assign({}, okCup, { missed: 'less_bitter' }), 'bright')), ['ADJUST', 'grind', 1, 'goal_less_bitter']);
  });
  test('meer zoetheid bij een bittere kop → geen fijnere maling', () => {
    assert.equal(api.goalStepFor({ missed: 'sweet', finish: ['bitter'] }), null);
  });
  test('een duidelijk extractie- of sterktesignaal gaat vóór de wens', () => {
    assert.deepEqual(pick(reco({ strength: 'just_right', acidity: 'sharp', finish: ['hollow'], liking: 3, missed: 'body' })), ['ADJUST', 'grind', -1, 'matrix']);
  });
  test('R-09: een geslaagde kop (4/5) mag je verfijnen — alleen als je zelf zegt wat beter kan', () => {
    const passed = { strength: 'just_right', acidity: 'lively', finish: ['sweet_clean'], liking: 4 };
    assert.equal(reco(passed).type, 'KEEP');
    const r = reco(Object.assign({}, passed, { missed: 'fruit' }), null, { alkalinityCaCO3: 40 });
    assert.deepEqual(pick(r), ['ADJUST', 'dose', -0.5, 'goal_fruit']);
    assert.equal(r.refine, true);
    assert.match(api.recommendationTexts(r, null, {}).body, /^Geslaagde kop\. Je wilde er nog meer uit halen/);
  });
  test('geen heen-en-weer: "meer body" vlak na een stap lichter → eerst herhalen', () => {
    const r = j(api.recommendNext({ tasting: Object.assign({}, okCup, { missed: 'body' }), goal: 'bright', ctx: ctx({ strength: { current: -0.5, blocked: {} } }), lastApplied: { lever: 'dose', delta: -0.5 } }));
    assert.deepEqual(pick(r), ['REPEAT', null, null, 'hysteresis']);
  });
  test('buildTasting bewaart "wat miste je?" alleen als de vraag erbij hoorde', () => {
    assert.equal(api.buildTasting({ strength: 'just_right', acidity: 'lively', finish: ['sweet_clean'], liking: 3, missed: 'fruit' }, 1, 1, null).missed, 'fruit');
    assert.equal(api.buildTasting({ strength: 'just_right', acidity: 'lively', finish: ['sweet_clean'], liking: 5, missed: 'fruit' }, 1, 1, null).missed, null);
  });
});

describe('R-02: jouw stand per boon', () => {
  const rec = (over) => Object.assign({
    id: 'b1', createdAt: 100, plan: { methodId: 'v60', grindTarget: 15, strengthStep: -0.5, waterMl: 300, bypass: null },
    actual: { grindSource: 'U', grindClick: 14, confirmed: true }, tasting: { liking: 4 }, recommendation: { type: 'KEEP' }
  }, over || {});
  test('de stand is de werkelijke klik (bevestigd), de sterkte en het water van die kop', () => {
    const st = j(api.standFromRecord(rec()));
    assert.deepEqual([st.method, st.grindClick, st.strengthStep, st.waterMl, st.liking, st.check], ['v60', 14, -0.5, 300, 4, false]);
  });
  test('niet bevestigd → de geplande klik', () => {
    assert.equal(api.standFromRecord(rec({ actual: { grindSource: 'I', grindClick: 15 } })).grindClick, 15);
  });
  test('een oudere kop overschrijft de stand niet; dezelfde of een nieuwere wel', () => {
    const bean = {};
    assert.equal(api.updateBeanStand(bean, rec({ id: 'b2', createdAt: 200 })), true);
    assert.equal(api.updateBeanStand(bean, rec({ id: 'b1', createdAt: 100 })), false);
    assert.equal(api.beanStandFor(bean, 'v60').fromBrewId, 'b2');
    assert.equal(api.updateBeanStand(bean, rec({ id: 'b2', createdAt: 200, tasting: { liking: 5 } })), true);
    assert.equal(api.beanStandFor(bean, 'v60').liking, 5);
    assert.equal(api.beanStandFor(bean, 'chemex'), null);
  });
});

describe('R-10: "houd zo" bevestigd (apart van de poort)', () => {
  const brew = (id, at, reco, approved) => ({ id, createdAt: at, beanId: 'x', lifecycle: 'logged', plan: { methodId: 'v60', waterMl: 300, bypass: null },
    tasting: { complete: true, approved }, recommendation: { type: reco } });
  test('telt hoe vaak de kop na "houd zo" weer geslaagd was', () => {
    const st = j(api.adviceOutcomeStats([brew('a', 1, 'KEEP', true), brew('b', 2, 'KEEP', true), brew('c', 3, 'KEEP', false), brew('d', 4, 'REPEAT', false)]));
    assert.deepEqual(st.keep, { confirmed: 1, notConfirmed: 2 }); // a→b geslaagd; b→c en c→d niet
    assert.equal(st.tested, 0, 'de poort zelf verandert niet');
  });
});

describe('Simulatie: komt de adviesmotor bij je beste kop?', () => {
  // Virtuele proever (vereenvoudigd model): elke boon heeft een beste klik (13–18) en sterkte
  // (−8%…+8%). De app onthoudt je stand (R-02) en de proever beantwoordt "wat miste je?".
  function taste(g, s, opt, prevLiking){
    const e = g - opt.g, d = (s - opt.s) * 2;
    const strength = d <= -3 ? 'much_too_weak' : d <= -1 ? 'too_weak' : d >= 3 ? 'much_too_strong' : d >= 1 ? 'too_strong' : 'just_right';
    const acidity = e >= 1 ? 'sharp' : e <= -2 ? 'flat' : 'lively';
    let finish;
    if (e >= 1) finish = strength === 'just_right' || d < 0 ? ['hollow'] : ['sweet_clean'];
    else if (e <= -2) finish = ['bitter', 'drying'];
    else if (e === -1) finish = ['bitter'];
    else finish = d === 0 ? ['sweet_clean'] : d < 0 ? ['hollow'] : ['bitter'];
    const liking = Math.max(1, Math.min(5, Math.round(5 - Math.abs(e) - Math.abs(d) * 0.6)));
    const vsLast = prevLiking == null ? null : liking > prevLiking ? 'better' : liking < prevLiking ? 'worse' : 'same';
    let missed = null;
    if (liking <= 4){
      if (d !== 0 && Math.abs(d) >= Math.abs(e) * 1.5) missed = d < 0 ? 'body' : 'fruit';
      else if (e > 0) missed = 'sweet'; else if (e < 0) missed = 'less_bitter'; else if (d !== 0) missed = d < 0 ? 'body' : 'fruit';
    }
    return { strength, acidity, finish, liking, vsLast, missed };
  }
  function run(opt){
    let g = 15, s = 0, pending = null, prevLiking = null, prevKey = null;
    for (let i = 0; i < 12; i++){
      let applied = null;
      if (pending){ if (pending.lever === 'grind') g = pending.toValue; else s = pending.toValue; applied = { lever: pending.lever, delta: pending.delta }; }
      const t = taste(g, s, opt, prevLiking);
      const r = api.recommendNext({ tasting: t, goal: null, ctx: ctx({ alkalinityCaCO3: 40, grind: { current: g, min: 13, max: 18 }, strength: { current: s, blocked: {} } }), lastApplied: applied });
      const key = `${g}/${s}/${r.type}`;
      if (r.type === 'KEEP' && prevKey === key) return { ok: true, cups: i + 1, liking: t.liking };
      prevKey = key; prevLiking = t.liking;
      pending = r.type === 'ADJUST' ? r : null;
    }
    return { ok: false };
  }
  test('minstens 27 van de 30 virtuele bonen komen tot rust, gemiddeld binnen 6 koppen, vrijwel allemaal op 5/5', () => {
    const res = [];
    for (let g = 13; g <= 18; g++) for (const s of [-1, -0.5, 0, 0.5, 1]) res.push(run({ g, s }));
    const ok = res.filter(r => r.ok);
    const avg = ok.reduce((a, r) => a + r.cups, 0) / ok.length;
    assert.ok(ok.length >= 27, `${ok.length}/30 tot rust`);
    assert.ok(avg <= 6, `gemiddeld ${avg.toFixed(1)} koppen`);
    assert.ok(ok.filter(r => r.liking === 5).length >= 25, 'op hun beste kop');
  });
});

describe('R-11: Chemex standaard 500 ml', () => {
  test('Chemex start op 500 ml, de V60 blijft op de engine-standaard', () => {
    assert.equal(api.defaultWaterMlFor('chemex', 'klassiek'), 500);
    assert.equal(api.defaultWaterMlFor('v60', 'klassiek'), 300);
  });
  test('bij 500 ml geen interne engine-code in de uitleg als een schema niet past', () => {
    const r = api.computeRecipe('chemex', 'medium', 'fruitig_clean', 500, 'washed', false, 10, null, false, false, null, 0);
    assert.doesNotMatch(r.notes, /GENERATION_|exceeds|ceiling/);
    assert.match(r.notes, /alleen beschreven voor brouwsels tot \d+ ml/);
  });
});
