import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_V3 } from '../../engine3/test/fixtures.ts';
import { startApp } from './helpers.mjs';

let app;
before(async () => { app = await startApp(); });
after(async () => { await app.close(); });

test('gegevens: back-up van de oude app inlezen, exporteren, wissen', async () => {
  const page = await app.browser.newPage({ acceptDownloads: true });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(app.base + '#/meer/gegevens');
  await page.waitForSelector('h1:has-text("Gegevens")');
  await page.setInputFiles('input[type=file]', { name: 'oud.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(BACKUP_V3)) });
  await page.waitForSelector('button:has-text("toevoegen")');
  assert.match(await page.locator('main').innerText(), /Back-up van de oude app/);
  await page.click('button:has-text("toevoegen")');
  await page.waitForSelector('.banner:has-text("nieuwe gebeurtenissen toegevoegd")');

  await page.goto(app.base + '#/zakken');
  await page.waitForSelector('ul.list .item');
  assert.ok((await page.locator('ul.list .item').count()) >= 1, 'de zakken uit de oude app staan er');

  await page.goto(app.base + '#/meer/gegevens');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Back-up maken")')]);
  assert.match(download.suggestedFilename(), /^brewconsole-\d{4}-\d{2}-\d{2}\.json$/);

  assert.equal(await page.locator('button:has-text("Alles wissen")').isDisabled(), true);
  await page.fill('input[name=confirm]', 'WISSEN');
  await page.click('button:has-text("Alles wissen")');
  await page.waitForSelector('.banner:has-text("gewist")');
  await page.goto(app.base + '#/zakken');
  await page.waitForSelector('text=Nog geen zakken');
  assert.deepEqual(errors, []);
  await page.close();
});

test('synchronisatie-scherm: knop pas actief als alles is ingevuld; slecht adres geeft een melding', async () => {
  const page = await app.browser.newPage();
  await page.goto(app.base + '#/meer/sync');
  await page.waitForSelector('button:has-text("Verbinden")');
  assert.equal(await page.locator('button:has-text("Verbinden")').isDisabled(), true);
  await page.fill('input[name=url]', 'http://evil.example');
  await page.fill('input[name=token]', 'token-voor-de-test-0123456789');
  await page.fill('input[name=phrase]', 'correct paard batterij');
  await page.click('button:has-text("Verbinden")');
  await page.waitForSelector('.banner:has-text("https://")');
  await page.close();
});
