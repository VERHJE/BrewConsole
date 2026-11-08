import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, importLog } from './helpers.mjs';
import { seedLog, SEED_BEAN } from './seed.ts';

let app, json;
before(async () => { app = await startApp(); json = (await seedLog(8)).json; });
after(async () => { await app.close(); });

test('zetten: de nieuwste zak staat vooraf gekozen; "geen zak" blijft een bewuste keuze', async () => {
  const page = await app.browser.newPage();
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zetten');
  await page.waitForSelector('select[name=bean]');
  assert.equal(await page.locator('select[name=bean] option:checked').innerText(), SEED_BEAN);
  await page.selectOption('select[name=bean]', '');
  await page.reload();
  await page.waitForSelector('select[name=bean]');
  assert.equal(await page.locator('select[name=bean]').inputValue(), '');
  await page.close();
});

test('timer voor de start: geen ring met "start", wel één startknop', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zetten');
  await page.click('button:has-text("Start zetsel")');
  await page.waitForSelector('.timer.ready');
  assert.equal(await page.locator('.ring').count(), 0);
  assert.equal(await page.locator('button:text-is("Start")').count(), 1);
  const box = await page.locator('button:text-is("Start")').boundingBox();
  assert.ok(box.y + box.height > 844 - 80, 'startknop zit onderaan');
  await page.close();
});

test('zakdetail: neutrale pasvorm krijgt geen grote kop en een ingeklapte tabel; Terug staat op de foto', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zakken');
  await page.click(`.item:has-text("${SEED_BEAN}")`);
  await page.waitForSelector('.fit');
  assert.equal(await page.locator('.fit .delta').count(), 0);
  assert.equal(await page.locator('.fit details').getAttribute('open'), null);
  assert.equal(await page.locator('.hero-photo a:has-text("Terug")').count(), 1);
  await page.close();
});
