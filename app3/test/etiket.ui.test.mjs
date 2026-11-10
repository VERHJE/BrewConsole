import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, importLog } from './helpers.mjs';
import { seedLog, SEED_BEAN } from './seed.ts';

// Een zak zonder foto krijgt een etiket: hoogtelijnen, op het detail brander/naam/herkomst en een brandingsschaal.
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(1)).json; });
after(async () => { await app.close(); });

test('etiket zonder foto: hoogtelijnen in lijst en detail, brandingsschaal op het detail', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zakken'); await page.waitForSelector('ul.thumbs .item');
  assert.ok(await page.locator('ul.thumbs .thumb .bagart.label .l-topo path').count() > 0, 'lijst: hoogtelijnen');
  await page.click(`ul.thumbs .item:has-text("${SEED_BEAN}")`);
  await page.waitForSelector('.beandetail .bagart.label.large');
  assert.ok(await page.locator('.beandetail .l-topo path').count() > 0, 'detail: hoogtelijnen');
  const roast = await page.locator('.beandetail .l-roast').textContent();
  assert.match(roast, /licht/i);
  assert.equal(await page.locator('.beandetail .l-beans i.on').count(), 1, 'licht = één gevuld boontje');
  assert.equal(await page.locator('.beandetail .bagart.label').getAttribute('aria-hidden'), 'true', 'decoratief');
  await page.close();
});
