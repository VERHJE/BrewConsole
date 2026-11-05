import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp } from './helpers.mjs';

let app;
before(async () => { app = await startApp(); });
after(async () => { await app.close(); });

test('offline: na de eerste keer start de app zonder netwerk, en de gegevens staan er nog', async () => {
  const context = await app.browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(app.base + '#/zakken/nieuw');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // vanaf nu staat de pagina onder controle van de worker
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.fill('input[name=name]', 'Offlinezak');
  await page.click('button:has-text("Opslaan")');
  await page.waitForSelector('.item:has-text("Offlinezak")');

  await context.setOffline(true);
  await page.goto(app.base + '#/zakken');
  await page.reload();
  await page.waitForSelector('.item:has-text("Offlinezak")');
  assert.equal(await page.locator('nav.tabbar a').count(), 4);
  // een andere URL binnen de scope valt ook terug op de app (geen browserfout)
  await page.goto(app.base.replace(/app3\/$/, 'app3/index.html') + '#/logboek');
  await page.waitForSelector('nav.tabbar');
  assert.deepEqual(errors, []);
  await context.close();
});

test('manifest en iconen zijn bereikbaar', async () => {
  const page = await app.browser.newPage();
  const m = await page.request.get(app.base + 'manifest.webmanifest');
  assert.equal(m.status(), 200);
  const json = await m.json();
  assert.equal(json.display, 'standalone');
  for (const icon of json.icons) assert.equal((await page.request.get(app.base + icon.src)).status(), 200);
  await page.close();
});
