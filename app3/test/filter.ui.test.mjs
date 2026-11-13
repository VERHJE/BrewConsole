import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, importLog } from './helpers.mjs';
import { seedLog } from './seed.ts';

// Filterveld (V60): optioneel, wordt bij het zetsel bewaard, staat in het logboekdetail en geeft een neutrale
// melding (zonder getal) als het papier wisselt tegenover de vorige kop.
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(2)).json; });
after(async () => { await app.close(); });

test('filter kiezen, bewaren en terugzien; melding bij wisselen', async () => {
  const page = await app.browser.newPage({ viewport: { width: 1180, height: 820 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zetten');
  await page.waitForSelector('.recipe .numbers');
  assert.equal(await page.locator('.filternote').count(), 0, 'geen melding zonder keuze');
  await page.click('button.chip:has-text("Cafec TH-3")');
  assert.equal(await page.locator('.filternote').count(), 0, 'geen melding bij de eerste kop');
  await page.locator('.startbar button.primary').first().click();
  await page.waitForSelector('.timer .clock');

  await page.goto(app.base + '#/logboek'); await page.waitForSelector('.logrow');
  await page.click('.logrow >> nth=0');
  await page.waitForSelector('.logdetail .numbers');
  assert.match(await page.locator('.logdetail .numbers').innerText(), /Cafec TH-3[\s\S]*filter/i);

  await page.goto(app.base + '#/zetten');
  await page.waitForSelector('.recipe .numbers');
  await page.click('button.chip:has-text("Hario V60-papier")');
  const note = page.locator('.filternote');
  await note.waitFor({ timeout: 3000 });
  const txt = await note.innerText();
  assert.match(txt, /Cafec TH-3/);
  assert.equal(/\d/.test(txt.replace('Cafec TH-3', '')), false, 'de melding bevat geen getal');
  await page.click('button.chip:has-text("Niet bijhouden")');
  assert.equal(await page.locator('.filternote').count(), 0);
  assert.deepEqual(errors, []);
  await page.close();
});

test('Chemex toont geen filterveld', async () => {
  const page = await app.browser.newPage({ viewport: { width: 1180, height: 820 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zetten');
  await page.waitForSelector('.recipe .numbers');
  await page.click('button.chip:has-text("Chemex")');
  assert.equal(await page.locator('button.chip:has-text("Cafec TH-3")').count(), 0);
  await page.close();
});
