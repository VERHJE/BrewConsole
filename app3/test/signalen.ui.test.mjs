import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { startApp } from './helpers.mjs';

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let app;
before(async () => { app = await startApp(); });
after(async () => { await app.close(); });

const SPY = () => {
  window.__cueLog = []; window.__osc = 0; window.__vib = [];
  navigator.vibrate = p => { window.__vib.push(p); return true; };
  window.AudioContext = class {
    constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
    resume() { return Promise.resolve(); }
    createOscillator() { window.__osc++; return { type: '', frequency: { value: 0 }, connect() {}, start() {}, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  };
};

async function startBrew(page, prefs) {
  await page.addInitScript(SPY);
  if (prefs) await page.addInitScript(p => { for (const [k, v] of Object.entries(p)) localStorage.setItem(k, v); }, prefs);
  await page.goto(app.base + '#/zakken/nieuw');
  await page.fill('input[name=name]', 'Signaalzak');
  await page.click('button:has-text("Opslaan")');
  await page.waitForSelector('.item:has-text("Signaalzak")');
  await page.goto(app.base + '#/zetten');
  await page.waitForSelector('.welkom, select[name=bean], .zsummary');
  if (await page.locator('button:has-text("Zonder zak beginnen")').count()) await page.click('button:has-text("Zonder zak beginnen")');
  if (!(await page.locator('select[name=bean]').isVisible())) await page.click('.zsummary');
  await page.selectOption('select[name=bean]', { label: 'Signaalzak' });
  await page.click('button:has-text("Start zetsel")');
  await page.waitForSelector('.timer .clock');
  await page.clock.install({ time: new Date('2026-11-07T12:00:00Z') });
  await page.click('button:has-text("Start")');
}

test('timer: tikjes vóór de volgende giet, dan een giet-signaal met geluid en trillen; start geeft geen signaal', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await startBrew(page);
  assert.deepEqual(await page.evaluate(() => window.__cueLog), [], 'start is zelf een tik van jou');
  await page.clock.fastForward(40_000); await page.waitForTimeout(400);
  for (let i = 0; i < 6; i++) await page.clock.runFor(1000);
  const log = await page.evaluate(() => window.__cueLog);
  assert.deepEqual(log.slice(0, 3), ['tick', 'tick', 'tick'], JSON.stringify(log));
  assert.ok(['pour', 'hold'].includes(log[3]), JSON.stringify(log));
  assert.ok((await page.evaluate(() => window.__osc)) >= 3 + 2, 'er is geluid gemaakt');
  const vib = await page.evaluate(() => window.__vib);
  assert.equal(vib.length, 1, 'alleen de giet trilt, de tikken niet');
  await page.close();
});

test('voorkeuren: geluid en trillen apart uit te zetten, de keuze blijft; test-knop en axe in licht en donker', async () => {
  for (const scheme of ['light', 'dark']) {
    const page = await app.browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    await page.addInitScript(SPY);
    await page.goto(app.base + '#/meer/voorkeuren');
    await page.waitForSelector('input[name=cueSound]');
    assert.equal(await page.isChecked('input[name=cueSound]'), true);
    assert.equal(await page.isChecked('input[name=cueVibrate]'), true);
    await page.click('button[name=cueTest]');
    assert.ok((await page.evaluate(() => window.__osc)) >= 2 && (await page.evaluate(() => window.__vib.length)) === 1);
    await page.uncheck('input[name=cueSound]');
    await page.reload();
    await page.waitForSelector('input[name=cueSound]');
    assert.equal(await page.isChecked('input[name=cueSound]'), false);
    assert.equal(await page.isChecked('input[name=cueVibrate]'), true);
    await page.evaluate(axeSource);
    const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
    assert.deepEqual(r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`), []);
    await page.close();
  }
});

test('timer met geluid en trillen uit: de signalen komen wel voor maar maken geen geluid en trillen niet', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await startBrew(page, { 'brewconsole.cueSound': '0', 'brewconsole.cueVibrate': '0' });
  await page.clock.fastForward(40_000); await page.waitForTimeout(400);
  for (let i = 0; i < 6; i++) await page.clock.runFor(1000);
  assert.ok((await page.evaluate(() => window.__cueLog.length)) >= 4);
  assert.equal(await page.evaluate(() => window.__osc), 0);
  assert.equal(await page.evaluate(() => window.__vib.length), 0);
  await page.close();
});
