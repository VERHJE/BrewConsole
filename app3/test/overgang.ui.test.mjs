import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, importLog } from './helpers.mjs';
import { seedLog } from './seed.ts';

// Schermovergangen (View Transitions): snel achter elkaar navigeren laat de browser overgangen overslaan.
// Dat mag geen onafgehandelde fout geven, en het laatste scherm moet gewoon verschijnen.
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(2)).json; });
after(async () => { await app.close(); });

test('snel wisselen tussen schermen: geen paginafouten, het laatste scherm staat er', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zetten');
  await page.evaluate(async () => {
    for (const h of ['#/zakken', '#/logboek', '#/meer', '#/meer/profiel', '#/zakken', '#/logboek', '#/meer/water', '#/zetten', '#/logboek']) {
      location.hash = h; await new Promise(r => setTimeout(r, 15));
    }
  });
  await page.waitForSelector('h1:has-text("Logboek")');
  await page.waitForTimeout(400);
  assert.deepEqual(errors, []);
  await page.close();
});
