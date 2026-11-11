import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp } from './helpers.mjs';

let app;
before(async () => { app = await startApp(); });
after(async () => { await app.close(); });

const bg = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test('thema: één thema, groen-espresso met goud, ook als het toestel licht is; geen licht/donker-keuze meer', async () => {
  for (const scheme of ['light', 'dark']) {
    const page = await app.browser.newPage({ colorScheme: scheme });
    await page.goto(app.base + '#/meer/voorkeuren');
    await page.waitForSelector('input[name=type]');
    assert.equal(await page.locator('input[name=theme]').count(), 0, 'geen themakeuze');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()), '#13201a', `${scheme}: groene ondergrond`);
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).color), 'rgb(241, 232, 216)', `${scheme}: ivoren tekst`);
    assert.equal(await page.evaluate(() => document.querySelector('meta[name=theme-color]').getAttribute('content')), '#1e3128');
    await page.close();
  }
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
