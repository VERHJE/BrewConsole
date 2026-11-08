import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, brewToEnd } from './helpers.mjs';

let app;
before(async () => { app = await startApp(); });
after(async () => { await app.close(); });

test('proeven: stappen in de juiste volgorde, blinde keuze vóór de zaknotities, opslaan verandert het volgende advies', async () => {
  const page = await app.browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await brewToEnd(page, app.base, 'Proefzak');
  const q = async () => (await page.locator('.q').first().innerText());
  assert.match(await q(), /Hoe sterk/);
  await page.click('button.choice:has-text("Iets slap")');
  await page.click('button:has-text("Volgende")');
  assert.match(await q(), /Zuurgraad/);
  await page.click('button.choice:has-text("Levendig")');
  await page.click('button.choice:has-text("Zoet en schoon")');
  await page.click('button:has-text("Volgende")');
  assert.match(await q(), /Welke smaakgroepen/);
  assert.equal(await page.locator('.notehit').count(), 0, 'zaknotities zijn nog niet te zien');
  await page.click('button:has-text("Volgende")'); // niets aanvinken mag
  assert.match(await q(), /Dit staat op de zak/);
  await page.click('.notehit >> nth=0 >> button:text-is("Ja")');
  await page.click('button:has-text("Volgende")');
  assert.match(await q(), /lekker/);
  await page.click('button.star[aria-label="4 sterren"]');
  await page.click('button:has-text("Volgende")');
  assert.match(await q(), /echt gebruikt/);
  await page.fill('input[name=doseG]', '999');
  await page.waitForSelector('[role=alert]:has-text("Koffie")');
  assert.equal(await page.locator('button:has-text("Opslaan")').isDisabled(), true);
  await page.fill('input[name=doseG]', '');
  await page.click('button:has-text("Opslaan")');
  await page.waitForSelector('h1:has-text("Opgeslagen")');
  await page.click('a:has-text("Volgende kop")');
  await page.waitForSelector('.reasons');
  const reasons = await page.locator('.reasons').innerText();
  assert.match(reasons, /sterker/i, 'het oordeel "iets slap" werkt door in het advies');
  assert.deepEqual(errors, []);
  await page.close();
});
