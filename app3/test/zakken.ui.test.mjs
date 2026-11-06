import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import { startApp } from './helpers.mjs';

let app;
before(async () => { app = await startApp(); });
after(async () => { await app.close(); });

const TEXT = `Finca La Esperanza
Colombia, Huila
Variety: Caturra
Process: Washed
Roast: Light
Roasted on: 2026-10-20
Notes: jasmine, peach, black tea
250g`;

test('zak toevoegen: plakken, controleren, opslaan, herladen', async () => {
  const page = await app.browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(app.base + '#/zakken');
  await page.waitForSelector('text=Nog geen zakken');
  await page.click('text=Zak toevoegen');
  await page.fill('textarea[name=paste]', TEXT);
  await page.click('text=Herken velden');
  assert.equal(await page.inputValue('input[name=country]'), 'Colombia');
  assert.equal(await page.inputValue('select[name=roastLevel]'), 'light');
  assert.equal(await page.inputValue('input[name=bagSizeG]'), '250');
  assert.ok((await page.locator('.badge').allInnerTexts()).some(t => t.includes('geplakte tekst')));
  await page.fill('input[name=name]', 'Esperanza');
  assert.ok((await page.locator('.badge.user').allInnerTexts()).some(t => t.includes('door jou')));
  await page.click('button:has-text("Opslaan")');
  await page.waitForSelector('ul.list .item strong:has-text("Esperanza")');
  await page.reload();
  await page.waitForSelector('ul.list .item strong:has-text("Esperanza")');
  assert.deepEqual(errors, []);
  await page.close();
});

test('zonder naam: foutmelding en niet opgeslagen', async () => {
  const page = await app.browser.newPage();
  await page.goto(app.base + '#/zakken/nieuw');
  await page.click('button:has-text("Opslaan")');
  await page.waitForSelector('[role=alert]:has-text("naam")');
  await page.close();
});

test('QR-foto: tekst in de code wordt herkend', async () => {
  const png = await QRCode.toBuffer('Name: Kenia Kiambu\nOrigin: Kenya\nProcess: Washed\nRoast: Light', { margin: 4, scale: 8 });
  const page = await app.browser.newPage();
  await page.goto(app.base + '#/zakken/nieuw');
  await page.setInputFiles('input[type=file]', { name: 'qr.png', mimeType: 'image/png', buffer: png });
  await page.waitForFunction(() => document.querySelector('input[name=country]')?.value === 'Kenia', null, { timeout: 8000 });
  assert.equal(await page.inputValue('select[name=process]'), 'washed');
  assert.ok((await page.locator('.badge').allInnerTexts()).some(t => t.includes('QR')));
  await page.close();
});

test('zak bewerken en archiveren', async () => {
  const page = await app.browser.newPage();
  await page.goto(app.base + '#/zakken/nieuw');
  await page.fill('input[name=name]', 'Bewerkbaar');
  await page.click('button:has-text("Opslaan")');
  await page.click('.item:has-text("Bewerkbaar")');
  await page.click('a:has-text("Bewerken")');
  await page.fill('input[name=roaster]', 'Kleine Brander');
  await page.click('button:has-text("Opslaan")');
  await page.waitForSelector('.item:has-text("Kleine Brander")');
  await page.click('.item:has-text("Bewerkbaar")');
  await page.click('a:has-text("Bewerken")');
  await page.click('button:has-text("Archiveren")');
  await page.waitForFunction(() => !document.body.innerText.includes('Bewerkbaar'));
  await page.close();
});
