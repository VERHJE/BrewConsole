// Engine 2 in de browser: standaard aan, het receptscherm toont en gebruikt je sterkte, de
// schakelaar brengt de oude engine terug, en het advies na het proeven komt van Engine 2.
// Verzonnen voorbeeldkoppen; zie docs/engine2.md.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import fs from 'node:fs';
import { APP_HTML_PATH } from './load-app.mjs';

const FILE_URL = 'file://' + APP_HTML_PATH;
const FIXED_CHROMIUM_PATH = '/opt/pw-browsers/chromium';
const executablePath = fs.existsSync(FIXED_CHROMIUM_PATH) ? FIXED_CHROMIUM_PATH : undefined;

const DAY = 86_400_000;
const T0 = Date.now() - 20 * DAY;
function cup(i, dose, water, strength, extra = {}){
  const at = T0 + i * DAY;
  return {
    id: `e2s_${i}`, schemaVersion: 6, createdAt: at, updatedAt: at, lifecycle: 'logged', beanId: null, beanSnapshot: null,
    equipment: { brewerId: 'v60', grinderId: null, filterId: null }, waterSnapshot: null, goal: null,
    plan: { modelPolicyVersion: '4.0', methodId: 'v60', profileId: 'klassiek', roastId: 'medium', waterMl: water, doseG: dose,
      ratioText: null, tempC: 94, tempBand: null, grindStartingPoint: 16, grindStand: null, grindMicron: null, strengthStep: 0,
      bypass: null, technique: 'Kasuya 4:6', steps: null, expectedTotalSec: 210, expectedDrainEndSec: 210, inputs: null },
    actual: { doseG: dose, doseSource: 'U', grindClick: 16, grindSource: 'U', confirmed: true, events: [], bedDrySec: 255,
      completedAt: at + 255_000, cupWeightG: null, bypassActualG: null },
    derived: {},
    tasting: { at: at + 600_000, minutesAfterBrew: 10, late: false, strength, acidity: 'lively', finish: ['sweet_clean'], liking: 4,
      goal: null, goalHit: null, vsLast: null, note: '', complete: true, approved: false, scores: null, ...extra },
    diagnosis: null, recommendation: null, flags: {}, favorite: false, sideEffectsAppliedAt: at, deletedAt: null
  };
}

describe('Engine 2 in de app', () => {
  let browser;
  before(async () => { browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] }); });
  after(async () => { if (browser) await browser.close(); });

  async function openPrep(seed){
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    if (seed) await page.addInitScript((s) => {
      if (sessionStorage.getItem('e2seed')) return;
      sessionStorage.setItem('e2seed', '1');
      localStorage.setItem('brewconsole_brews', JSON.stringify(s));
    }, seed);
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.evaluate(() => document.querySelector('.navbar [data-nav="method"]').click());
    await page.click('[data-method="v60"]');
    await page.click('#roast-grid [data-roast="medium"]');
    await page.click('#profile-styles > summary');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await page.waitForSelector('#screen-prep.active');
    return { page, errors };
  }

  test('standaard aan; zonder koppen is het startpunt de dosis van de oude engine', async () => {
    const { page, errors } = await openPrep(null);
    assert.equal(await page.evaluate(() => document.getElementById('engine2-toggle').getAttribute('aria-checked')), 'true');
    assert.equal(await page.locator('#e2-line').isVisible(), true);
    assert.match(await page.locator('#e2-line').innerText(), /Engine 2 · startpunt/);
    assert.match(await page.locator('#e2-card').textContent(), /startpunt/i);
    const r = await page.evaluate(() => ({ dose: state.recipe.dose, base: state.e2Plan.baseDoseG, n: state.e2Plan.n }));
    assert.equal(r.n, 0);
    assert.equal(r.dose, r.base);
    assert.deepEqual(errors, []);
    await page.close();
  });

  test('met geproefde koppen: jouw sterkte en je eigen eindtijd; uit = de oude engine terug', async () => {
    const seed = [1, 2, 3, 4].map(i => cup(i, 18.8, 300, 'too_strong'));
    const { page, errors } = await openPrep(seed);
    const on = await page.evaluate(() => ({ dose: state.recipe.dose, base: state.e2Plan.baseDoseG, n: state.e2Plan.n, total: state.recipe.totalTime }));
    assert.equal(on.n, 4);
    assert.ok(on.dose < on.base, `Engine 2 ${on.dose} g tegen oud ${on.base} g`);
    assert.equal(on.total, 255, 'verwacht einde volgt Bed droog (255 s) in plaats van 210 s');
    assert.match(await page.locator('#e2-line').innerText(), /jouw sterkte uit 4 geproefde koppen/);
    assert.match(await page.locator('#ratio-basis').innerText(), /Engine 2: jouw sterkte uit 4 koppen/);
    assert.match(await page.locator('#stats-grid').innerText(), /jouw doorloop · schema 3:30/);
    const card = await page.locator('#e2-card').textContent();
    assert.match(card, /jouw sterkte/i);
    assert.match(card, /4 geproefde koppen/);
    assert.match(card, /Verwacht klaar rond 4:15/);
    assert.match(card, /De oude engine zou/);
    assert.match(await page.locator('#strength-note').textContent(), /Engine 2 zet je sterkte/);

    await page.evaluate(() => document.getElementById('engine2-toggle').click());
    const off = await page.evaluate(() => ({ dose: state.recipe.dose, plan: state.e2Plan, total: state.recipe.totalTime, flag: localStorage.getItem('brewconsole_engine2') }));
    assert.equal(off.flag, '0');
    assert.equal(off.plan, null);
    assert.equal(off.dose, on.base);
    assert.equal(off.total, 210);
    assert.equal(await page.locator('#e2-card').isHidden(), true);
    assert.equal(await page.locator('#e2-line').isHidden(), true);
    assert.deepEqual(errors, []);
    await page.close();
  });

  test('het advies na het proeven komt van Engine 2, met de oude engine ter vergelijking', async () => {
    const seed = [1, 2, 3].map(i => cup(i, 18.8, 300, 'just_right')).concat([cup(4, 18.8, 300, 'just_right', { acidity: 'sharp', finish: [] })]);
    const { page, errors } = await openPrep(seed);
    await page.evaluate(() => renderRecommendationPanel(getBrewRecord('e2s_4')));
    const text = await page.locator('#reco-card').innerText();
    assert.match(text, /Engine 2 · advies voor je volgende kop/i);
    assert.match(text, /Sterkte houden/);
    assert.match(text, /fijner en \d,\d g minder koffie/);
    assert.deepEqual(errors, []);
    await page.close();
  });

  test('een klaargezette dosisstap van de oude engine verandert het Engine 2-recept niet', async () => {
    const { page } = await openPrep(null);
    const r = await page.evaluate(() => {
      const before = state.recipe.dose;
      const bean = { id: 'bean_e2', name: 'Testboon', roastLevel: 'medium', pendingAdjust: { lever: 'dose', delta: -1, fromValue: 0, toValue: -1, method: 'v60', createdAt: Date.now() } };
      beanLibrary.push(bean);
      state.beanId = bean.id;
      applyPendingAdjustToState();
      renderPrep();
      return { before, after: state.recipe.dose, strength: state.strengthAdjust };
    });
    assert.equal(r.strength, 0);
    assert.equal(r.after, r.before);
    await page.close();
  });
});

describe('Engine 2 in de app · e2-2026.2', () => {
  let browser;
  before(async () => { browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] }); });
  after(async () => { if (browser) await browser.close(); });

  async function openPrep(seed){
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript((s) => {
      if (sessionStorage.getItem('e2seed')) return;
      sessionStorage.setItem('e2seed', '1');
      localStorage.setItem('brewconsole_brews', JSON.stringify(s));
    }, seed);
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.evaluate(() => document.querySelector('.navbar [data-nav="method"]').click());
    await page.click('[data-method="v60"]');
    await page.click('#roast-grid [data-roast="medium"]');
    await page.click('#profile-styles > summary');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await page.waitForSelector('#screen-prep.active');
    return { page, errors };
  }

  test('onzeker → kalibratiepaar; de uitslag telt mee in je sterkte', async () => {
    const { page, errors } = await openPrep([cup(1, 18.8, 300, 'too_strong'), cup(2, 17.3, 300, 'too_weak')]);
    const before = await page.evaluate(() => ({ cal: state.e2Plan.calibration, pairs: state.e2Plan.pairs }));
    assert.ok(before.cal, 'Engine 2 stelt een vergelijking voor');
    assert.equal(before.pairs, 0);
    assert.match(await page.locator('#ab-trial').textContent(), /Blinde vergelijking voor je sterkte/);
    assert.match(await page.locator('#e2-card').textContent(), /blinde vergelijking/i);
    await page.evaluate(() => document.getElementById('ab-start-btn').click());
    await page.evaluate(() => document.querySelector('[data-ab-q="preferredCup"][data-ab-a="1"]').click());
    await page.evaluate(() => document.getElementById('ab-reveal-btn').click());
    const after = await page.evaluate(() => ({ pairs: state.e2Plan.pairs, trial: abTrials[abTrials.length - 1], stored: JSON.parse(localStorage.getItem('brewconsole_ab_trials') || '[]').length }));
    assert.equal(after.pairs, 1);
    assert.equal(after.stored, 1);
    assert.equal(after.trial.kind, 'e2');
    assert.ok(['control', 'variant'].includes(after.trial.preferred));
    assert.deepEqual(errors, []);
    await page.close();
  });

  test('lichter dan de dosisgrens: op de grens zetten en heet water toevoegen', async () => {
    const seed = [1, 2, 3, 4, 5, 6].map(i => cup(i, 15, 300, 'too_strong'));
    const { page, errors } = await openPrep(seed);
    const r = await page.evaluate(() => ({ dose: state.recipe.dose, dil: state.recipe.engine2.dilutionG, planDil: state.e2Plan.dilutionG }));
    assert.equal(r.dose, 15);
    assert.ok(r.dil >= 10, String(r.dil));
    assert.equal(r.planDil, r.dil, 'gaat mee in het record (plan.inputs.e2)');
    assert.match(await page.locator('#e2-dilution-tile').innerText(), new RegExp(`\\+${r.dil}\\s*g`));
    assert.match(await page.locator('#e2-card').textContent(), /heet water toe/);
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe('Engine 2 in de app · e2-2026.3', () => {
  let browser;
  before(async () => { browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] }); });
  after(async () => { if (browser) await browser.close(); });

  async function openPrep(seed){
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript((s) => {
      if (sessionStorage.getItem('e2seed')) return;
      sessionStorage.setItem('e2seed', '1');
      localStorage.setItem('brewconsole_brews', JSON.stringify(s));
    }, seed);
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.evaluate(() => document.querySelector('.navbar [data-nav="method"]').click());
    await page.click('[data-method="v60"]');
    await page.click('#roast-grid [data-roast="medium"]');
    await page.click('#profile-styles > summary');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await page.waitForSelector('#screen-prep.active');
    return { page, errors };
  }
  const seedBitter = () => [1, 2, 3].map(i => cup(i, 16.3, 300, 'just_right')).concat([cup(4, 16.3, 300, 'just_right', { finish: ['bitter'] })]);

  test('tip als proef: klaarzetten, op het receptscherm ingesteld, en bij Start in het record', async () => {
    const { page, errors } = await openPrep(seedBitter());
    const before = await page.evaluate(() => state.recipe.dose);
    await page.evaluate(() => renderRecommendationPanel(getBrewRecord('e2s_4')));
    await page.evaluate(() => document.querySelector('[data-e2-tip="bitter"]').click());
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('brewconsole_e2_trial')));
    assert.equal(stored.key, 'bitter');
    assert.equal(stored.fromBrewId, 'e2s_4');
    assert.match(await page.locator('#reco-card').innerText(), /Staat klaar voor je volgende kop/);

    await page.evaluate(() => renderPrep());
    const on = await page.evaluate(() => ({ dose: state.recipe.dose, step: state.strengthAdjust }));
    assert.equal(on.step, -0.5);
    assert.ok(on.dose < before, `${on.dose} g tegen ${before} g`);
    assert.equal(await page.locator('#e2-trial-note').isVisible(), true);
    assert.match(await page.locator('#e2-trial-note').textContent(), /Proef · Bitter → lichter/);
    assert.match(await page.evaluate(() => e2NextCupLine('v60')), /Engine 2 · jouw sterkte 1:\d+,\d · .*proef klaar: Bitter → lichter/);

    const rec = await page.evaluate(() => beginBrewRecord());
    assert.equal(rec.plan.inputs.e2.trial.key, 'bitter');
    assert.equal(rec.plan.strengthStep, -0.5);
    assert.equal(await page.evaluate(() => localStorage.getItem('brewconsole_e2_trial')), null, 'één kop, één proef');
    assert.deepEqual(errors, []);
    await page.close();
  });

  test('"Toch niet" zet de proef en de sterkte terug', async () => {
    const { page, errors } = await openPrep(seedBitter());
    await page.evaluate(() => renderRecommendationPanel(getBrewRecord('e2s_4')));
    await page.evaluate(() => document.querySelector('[data-e2-tip="bitter"]').click());
    await page.evaluate(() => renderPrep());
    assert.equal(await page.evaluate(() => state.strengthAdjust), -0.5);
    await page.click('#e2-trial-cancel');
    assert.equal(await page.evaluate(() => state.strengthAdjust), 0);
    assert.equal(await page.locator('#e2-trial-note').isHidden(), true);
    assert.equal(await page.evaluate(() => localStorage.getItem('brewconsole_e2_trial')), null);
    assert.deepEqual(errors, []);
    await page.close();
  });

  test('gemeten TDS: in het advies, en de meetlat in Statistieken', async () => {
    const seed = seedBitter();
    seed.forEach((r, i) => { r.actual.tdsPct = 1.30 + i * 0.01; r.actual.cupWeightG = 262; });
    seed[3].plan.inputs = { e2: { trial: { key: 'bitter' } } };
    seed[3].tasting.vsLast = 'better';
    const { page, errors } = await openPrep(seed);
    const plan = await page.evaluate(() => ({ ey: state.e2Plan.ey, n: state.e2Plan.eyModel.n }));
    assert.equal(plan.n, 4);
    assert.ok(Math.abs(plan.ey - 0.21) < 0.01, String(plan.ey));
    await page.evaluate(() => renderRecommendationPanel(getBrewRecord('e2s_4')));
    assert.match(await page.locator('#reco-card').innerText(), /Gemeten: TDS 1,33 %, extractie \d+,\d %/);
    await page.evaluate(() => renderInsightsScreen('history-stats-body'));
    const meet = await page.locator('#e2-meetlat').textContent();
    assert.match(meet, /Engine 2 · meetlat/);
    assert.match(meet, /Laatste 4 koppen/);
    assert.match(meet, /Sterkte goed: 4 van de 4/);
    assert.match(meet, /Bitter → lichter: 1× geprobeerd · 1 beter/);
    assert.match(meet, /V60: \d+,\d % gemiddeld uit 4 metingen · Engine 2 rekent hiermee/);
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe('Engine 2 in de app · e2-2026.4', () => {
  let browser;
  before(async () => { browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] }); });
  after(async () => { if (browser) await browser.close(); });

  async function openPrep(seed){
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript((s) => {
      if (sessionStorage.getItem('e2seed')) return;
      sessionStorage.setItem('e2seed', '1');
      localStorage.setItem('brewconsole_brews', JSON.stringify(s));
    }, seed);
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.evaluate(() => document.querySelector('.navbar [data-nav="method"]').click());
    await page.click('[data-method="v60"]');
    await page.click('#roast-grid [data-roast="medium"]');
    await page.click('#profile-styles > summary');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await page.waitForSelector('#screen-prep.active');
    return { page, errors };
  }

  test('een veel tragere doorloop dan je gewone geeft een controle in het advies', async () => {
    const seed = [1, 2, 3].map(i => cup(i, 16.3, 300, 'just_right'));
    const slow = cup(4, 16.3, 300, 'just_right');
    slow.actual.bedDrySec = 330;
    slow.plan.inputs = { e2: { totalTimeSec: 255, baseTotalSec: 210 } };
    const { page, errors } = await openPrep(seed.concat([slow]));
    await page.evaluate(() => renderRecommendationPanel(getBrewRecord('e2s_4')));
    const text = await page.locator('#reco-card').innerText();
    assert.match(text, /Bed droog op 5:30, terwijl je gewoonlijk rond 4:15 zit \(29 % langzamer\)/);
    assert.match(text, /verstopping/);
    assert.deepEqual(errors, []);
    await page.close();
  });

  test('een proef die bij jou 2× slechter uitviel, staat niet meer klaar', async () => {
    const seed = [1, 2].map(i => cup(i, 16.3, 300, 'just_right'));
    [3, 4].forEach(i => {
      const r = cup(i, 16.3, 300, 'just_right', { vsLast: 'worse' });
      r.plan.inputs = { e2: { trial: { key: 'bitter' } } };
      seed.push(r);
    });
    seed.push(cup(5, 16.3, 300, 'just_right', { finish: ['bitter'] }));
    const { page, errors } = await openPrep(seed);
    await page.evaluate(() => renderRecommendationPanel(getBrewRecord('e2s_5')));
    assert.equal(await page.locator('[data-e2-tip="bitter"]').count(), 0);
    assert.match(await page.locator('#reco-card').innerText(), /2× geprobeerd: 0 beter, 0 gelijk, 2 slechter\. Engine 2 zet deze proef daarom niet meer klaar/);
    await page.evaluate(() => renderInsightsScreen('history-stats-body'));
    const meet = await page.locator('#e2-meetlat').textContent();
    assert.match(meet, /Bitter → lichter: 2× geprobeerd .* werkt bij jou niet/);
    assert.match(meet, /Lekker \(4 of 5\): 5 van je laatste 5 koppen/);
    assert.match(meet, /wijzigingen per 10 koppen; het doel is hooguit 2/);
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe('Engine 2 in de app · e2-2026.5', () => {
  test('de meetlat toont het verloop van je sterkte als grafiek, met een uitleg in woorden', async () => {
    const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const seed = [cup(1, 18.8, 300, 'too_strong'), cup(2, 18.8, 300, 'too_strong'), cup(3, 17.6, 300, 'just_right'), cup(4, 17.6, 300, 'too_weak')];
    await page.addInitScript((s) => {
      if (sessionStorage.getItem('e2seed')) return;
      sessionStorage.setItem('e2seed', '1');
      localStorage.setItem('brewconsole_brews', JSON.stringify(s));
    }, seed);
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.evaluate(() => renderInsightsScreen('history-stats-body'));
    const fig = page.locator('#e2-trend');
    assert.equal(await fig.count(), 1);
    assert.equal(await page.locator('#e2-trend .e2-trend-mark').count(), 4);
    assert.match(await fig.locator('svg').getAttribute('aria-label'), /Verloop over 4 waarnemingen; je doel nu 1:\d+,\d/);
    assert.match(await fig.locator('figcaption').textContent(), /▲ te sterk · ● goed · ▼ te slap/);
    assert.match(await page.locator('#e2-trend .e2-trend-mark title').first().textContent(), /kop 1:\d+,\d, te sterk; doel daarna 1:\d+,\d/);
    assert.deepEqual(errors, []);
    await browser.close();
  });
});
