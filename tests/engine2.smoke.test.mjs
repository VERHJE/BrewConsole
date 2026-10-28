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
