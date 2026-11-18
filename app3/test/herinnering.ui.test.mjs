import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import { startApp, importLog } from './helpers.mjs';
import { seedLog } from './seed.ts';

let app, json;
before(async () => { app = await startApp(); json = (await seedLog(2)).json; });
after(async () => { await app.close(); });

// Review 17 nov 2026, W3: de back-upherinnering staat ook op het Meer-overzicht.
test('Meer: zonder back-up een herinnering met een link naar Gegevens; na een back-up niet meer; zonder gegevens nooit', async () => {
  const empty = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await empty.goto(app.base + '#/meer'); await empty.waitForSelector('h1:text-is("Meer")');
  await empty.waitForTimeout(300);
  assert.equal(await empty.locator('.backupnudge').count(), 0, 'zonder gegevens geen herinnering');
  await empty.close();

  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/meer'); await page.waitForSelector('h1:text-is("Meer")');
  await page.waitForSelector('.backupnudge');
  assert.match(await page.locator('.backupnudge').innerText(), /nog geen back-up/);
  await page.click('.backupnudge a');
  await page.waitForSelector('h1:text-is("Gegevens")');
  assert.match(await page.locator('.banner').first().innerText(), /nog geen back-up/, 'dezelfde regel op Gegevens');
  const download = page.waitForEvent('download');
  await page.click('button:has-text("Back-up maken")');
  await download;
  await page.goto(app.base + '#/meer'); await page.waitForSelector('h1:text-is("Meer")');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.backupnudge').count(), 0, 'na een back-up geen herinnering');
  await page.close();
});

// Review 17 nov 2026: een foto die niet opgeslagen kon worden, viel stil weg.
test('zak opslaan terwijl de foto niet opgeslagen kan worden: de zak staat er, met een melding over de foto', async () => {
  const png = await QRCode.toBuffer('foto', { margin: 4, scale: 12 });
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  // de foto-database weigert elke foto (zoals WebKit in een privévenster deed vóór 17 nov)
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) { if (this.name === 'photos') throw new DOMException('Error preparing Blob/File data', 'UnknownError'); return put.apply(this, args); };
  });
  await page.goto(app.base + '#/zakken/nieuw');
  await page.fill('input[name=name]', 'Zak zonder foto');
  await page.setInputFiles('input[name=photo]', { name: 'zak.png', mimeType: 'image/png', buffer: png });
  await page.waitForSelector('text=Foto klaar');
  await page.click('button:has-text("Opslaan")');
  await page.waitForSelector('.item:has-text("Zak zonder foto")');
  assert.match(await page.locator('.banner.warn[role=alert]').innerText(), /De zak is opgeslagen, maar de foto niet/);
  assert.equal(await page.locator('img.photo').count(), 0);
  // de melding is eenmalig
  await page.goto(app.base + '#/zetten'); await page.goto(app.base + '#/zakken'); await page.waitForSelector('.item:has-text("Zak zonder foto")');
  assert.equal(await page.locator('.banner.warn[role=alert]').count(), 0);
  await page.close();
});
