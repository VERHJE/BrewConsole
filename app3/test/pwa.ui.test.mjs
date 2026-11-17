import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, BROWSER } from './helpers.mjs';

let app;
before(async () => { app = await startApp(); });
after(async () => { await app.close(); });

test('offline: na de eerste keer start de app zonder netwerk, en de gegevens staan er nog', async () => {
  const app = await startApp(); // een eigen server: die wordt hieronder uitgezet
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

  // Zonder netwerk: de server gaat echt uit, dus elk verzoek dat niet uit de worker komt mislukt. In Chromium ook Playwrights
  // offline-stand. In WebKit gaf die stand bij elke navigatie "WebKit encountered an internal error", ook als de worker de pagina
  // levert (review 17 nov 2026, O1); daar alleen de uitgezette server.
  await app.stopServer();
  if (BROWSER === 'chromium') await context.setOffline(true);
  await page.evaluate(() => { location.hash = '#/zakken'; });
  await page.reload();
  await page.waitForSelector('.item:has-text("Offlinezak")');
  assert.equal(await page.locator('nav.tabbar a').count(), 4);
  // een andere URL binnen de scope valt ook terug op de app (geen browserfout)
  await page.goto(app.base.replace(/app3\/$/, 'app3/index.html') + '#/logboek');
  await page.waitForSelector('nav.tabbar');
  assert.deepEqual(errors, []);
  await context.close();
  await app.close();
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
