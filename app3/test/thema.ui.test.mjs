import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp } from './helpers.mjs';

let app;
before(async () => { app = await startApp(); });
after(async () => { await app.close(); });

const bg = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test('thema: volgt het toestel tot je kiest; donker en licht zijn eigen thema\'s en blijven na herladen', async () => {
  const page = await app.browser.newPage({ colorScheme: 'light' });
  await page.goto(app.base + '#/meer/voorkeuren');
  await page.waitForSelector('input[name=theme]');
  assert.equal(await bg(page), 'rgb(246, 241, 231)', 'licht = ivoor en espresso met messing');
  assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-theme')), false);
  await page.check('input[name=theme][value=dark]');
  assert.equal(await bg(page), 'rgb(18, 14, 10)', 'donker = Quiet Luxury (warm bruin)');
  await page.reload();
  await page.waitForSelector('input[name=theme]');
  assert.equal(await bg(page), 'rgb(18, 14, 10)');
  assert.equal(await page.locator('input[name=theme][value=dark]').isChecked(), true);
  await page.check('input[name=theme][value=system]');
  assert.equal(await bg(page), 'rgb(246, 241, 231)');
  await page.close();
  const dark = await app.browser.newPage({ colorScheme: 'dark' });
  await dark.goto(app.base + '#/meer/voorkeuren');
  await dark.waitForSelector('input[name=theme]');
  assert.equal(await bg(dark), 'rgb(18, 14, 10)', 'volg toestel bij een donker toestel');
  await dark.check('input[name=theme][value=light]');
  assert.equal(await bg(dark), 'rgb(246, 241, 231)', 'een bewuste keuze wint van het toestel');
  await dark.close();
});

test('lettertype: koppen met schreef (eigen bestand, offline), schreefloos als je dat kiest; cijfers blijven schreefloos', async () => {
  const page = await app.browser.newPage();
  const font = await page.request.get(app.base + 'fonts/fraunces-latin-wght-normal.woff2');
  assert.equal(font.status(), 200);
  assert.equal((await page.request.get(app.base + 'fonts/Fraunces-OFL.txt')).status(), 200, 'licentie ligt naast het lettertype');
  await page.goto(app.base + '#/meer/voorkeuren');
  await page.waitForSelector('h1');
  await page.evaluate(() => document.fonts.ready);
  assert.match(await page.evaluate(() => getComputedStyle(document.querySelector('h1')).fontFamily), /Fraunces/);
  assert.equal(await page.evaluate(() => document.fonts.check('600 24px Fraunces')), true, 'het lettertype is geladen');
  await page.check('input[name=type][value=sans]');
  assert.doesNotMatch(await page.evaluate(() => getComputedStyle(document.querySelector('h1')).fontFamily), /Fraunces/);
  await page.reload();
  await page.waitForSelector('h1');
  assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-type')), 'sans');
  await page.close();
});
