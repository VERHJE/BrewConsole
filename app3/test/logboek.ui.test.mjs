import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, brewToEnd } from './helpers.mjs';

let app;
before(async () => { app = await startApp(); });
after(async () => { await app.close(); });

test('logboek: lijst, detail, verwijderen; Meer-schermen zonder fouten', async () => {
  const page = await app.browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await brewToEnd(page, app.base, 'Logzak');
  await page.goto(app.base + '#/logboek');
  await page.waitForSelector('.item:has-text("Logzak")');
  assert.match(await page.locator('.item').first().innerText(), /nog te proeven/);
  await page.click('.item:has-text("Logzak")');
  await page.waitForSelector('h1:has-text("Logzak")');
  assert.ok((await page.locator('table.plain tr').count()) >= 3);
  page.once('dialog', d => d.accept());
  await page.click('button:has-text("Kop verwijderen")');
  await page.waitForSelector('text=Nog geen koppen');
  for (const [path, heading] of [['profiel', 'Smaakprofiel'], ['molen', 'Molen'], ['over', 'Over']]) {
    await page.goto(app.base + '#/meer/' + path);
    await page.waitForSelector(`h1:has-text("${heading}")`);
  }
  assert.deepEqual(errors, []);
  await page.close();
});
