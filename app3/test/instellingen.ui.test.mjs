import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp } from './helpers.mjs';

let app;
before(async () => { app = await startApp(); });
after(async () => { await app.close(); });

test('water: snelkeuze, verdunning, oordeel tegen de SCA-richtwaarde, opslaan en herladen', async () => {
  const page = await app.browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(app.base + '#/meer/water');
  await page.waitForSelector('h1:has-text("Water")');
  assert.equal(await page.locator('button:has-text("Opslaan")').isDisabled(), true, 'niets gewijzigd: geen opslaan');
  await page.click('button.chip:has-text("Dunea")');
  assert.equal(await page.inputValue('input[name=hardness]'), '140');
  assert.equal(await page.inputValue('select[name=alkunit]'), 'HCO3');
  assert.match(await page.locator('.card[aria-live]').innerText(), /140 mg\/L · binnen de SCA-richtwaarde[\s\S]*139,4 mg\/L CaCO3 · boven de SCA-richtwaarde/);
  await page.selectOption('select[name=dilution]', '1:1');
  assert.match(await page.locator('.card[aria-live]').innerText(), /70 mg\/L · binnen de SCA-richtwaarde[\s\S]*69,7 mg\/L CaCO3 · binnen de SCA-richtwaarde/);
  await page.fill('input[name=hardness]', '-3');
  await page.waitForSelector('[role=alert]:has-text("hardheid")');
  assert.equal(await page.locator('button:has-text("Opslaan")').isDisabled(), true);
  await page.fill('input[name=hardness]', '140');
  await page.click('button:has-text("Opslaan")');
  await page.waitForSelector('.banner:has-text("Opgeslagen")');
  await page.reload();
  await page.waitForSelector('h1:has-text("Water")');
  assert.equal(await page.inputValue('input[name=hardness]'), '140');
  assert.equal(await page.inputValue('select[name=dilution]'), '1:1');
  assert.deepEqual(errors, []);
  await page.close();
});

test('molen: nulpunt gecontroleerd wordt onthouden; voorkeur helderder aan/uit', async () => {
  const page = await app.browser.newPage();
  await page.goto(app.base + '#/meer/molen');
  await page.waitForSelector('text=Nog niet gecontroleerd');
  await page.click('button:has-text("Nulpunt zojuist gecontroleerd")');
  await page.waitForSelector('text=(vandaag)');
  await page.reload();
  await page.waitForSelector('text=(vandaag)');
  await page.goto(app.base + '#/meer/voorkeuren');
  const box = page.locator('input[name=lighter]');
  await box.waitFor();
  assert.equal(await box.isChecked(), false);
  await box.check();
  await page.waitForFunction(async () => {
    const open = indexedDB.open('brewconsole-app3', 1);
    const db = await new Promise(r => { open.onsuccess = () => r(open.result); });
    const all = await new Promise(r => { const q = db.transaction('events').objectStore('events').getAll(); q.onsuccess = () => r(q.result); });
    return all.some(e => e.kind === 'setting' && e.data.key === 'brightLighter' && e.data.value === true);
  });
  await page.reload();
  assert.equal(await page.locator('input[name=lighter]').isChecked(), true);
  await page.close();
});
