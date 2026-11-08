import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { startApp, importLog } from './helpers.mjs';
import { seedLog, SEED_BEAN } from './seed.ts';

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(8)).json; });
after(async () => { await app.close(); });

test('zakdetail: pasvorm, vier grafieken met tooltip en tabel, kopgeschiedenis', async () => {
  const page = await app.browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zakken');
  await page.click(`.item:has-text("${SEED_BEAN}")`);
  await page.waitForSelector('.charts');
  assert.equal(await page.locator('.chart svg').count(), 4);
  assert.deepEqual(await page.locator('.chart h3').allInnerTexts(), ['Koffie per kop', 'Klaar na', 'Sterkte-oordeel', 'Waardering']);
  assert.match(await page.locator('.fit').innerText(), /Verwachte waardering/);
  // één zin in gewone taal onder elke grafiek
  const notes = await page.locator('.chart .chart-note').allInnerTexts();
  assert.equal(notes.length, 4);
  assert.match(notes[0], /^(Van \d+(,\d)? g naar|Steeds ongeveer)/);
  assert.match(notes[1], /^Laatste kop klaar na \d+:\d\d, gemiddeld/);
  assert.match(notes[2], /^Je vond de laatste 3 koppen/);
  assert.match(notes[3], /^Gemiddeld \d(,\d+)? van 5 over 8 koppen/);
  // 8 koppen: 8 markeringen, een lijn, en een tooltip met kopnummer bij hover
  assert.equal(await page.locator('.chart >> nth=3 >> circle.dot').count(), 8);
  assert.equal(await page.locator('.chart >> nth=3 >> path.line').count(), 1);
  await page.hover('.chart >> nth=3 >> circle.hit >> nth=2');
  await page.waitForSelector('.chart .tip');
  assert.match(await page.locator('.chart .tip').innerText(), /Kop 3/);
  // toetsenbord: dezelfde uitleg bij focus
  await page.locator('.chart >> nth=1 >> circle.hit >> nth=0').focus();
  assert.match(await page.locator('.chart >> nth=1 >> .tip').innerText(), /Kop 1/);
  // tabel
  await page.click('.chart >> nth=3 >> summary');
  assert.equal(await page.locator('.chart >> nth=3 >> tbody tr').count(), 8);
  assert.equal((await page.locator('.list .item').count()) >= 8, true);
  assert.deepEqual(errors, []);
  await page.close();
});

test('geen grafieklijn bij één kop; logboek toont het verloop van alle koppen', async () => {
  const one = (await seedLog(1)).json;
  const page = await app.browser.newPage();
  await importLog(page, app.base, one);
  await page.goto(app.base + '#/zakken');
  await page.click(`.item:has-text("${SEED_BEAN}")`);
  await page.waitForSelector('.charts');
  assert.equal(await page.locator('path.line').count(), 0);
  assert.equal(await page.locator('.chart-note').count(), 0, 'met één kop valt er niets te vergelijken');
  await page.waitForSelector('text=Na twee koppen verschijnt hier een lijn');
  await page.close();

  const page2 = await app.browser.newPage();
  await importLog(page2, app.base, json);
  await page2.goto(app.base + '#/logboek');
  await page2.click('summary:has-text("Verloop van alle koppen")');
  await page2.waitForSelector('.charts');
  assert.equal(await page2.locator('.chart svg').count(), 4);
  await page2.close();
});

for (const scheme of ['light', 'dark']) {
  test(`toegankelijkheid (${scheme}): zakdetail met grafieken en logboek met verloop`, async () => {
    const page = await app.browser.newPage({ colorScheme: scheme });
    await importLog(page, app.base, json);
    const check = async (name) => {
      await page.evaluate(axeSource);
      const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
      assert.deepEqual(r.violations.map(v => `${name} ${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`), []);
    };
    await page.goto(app.base + '#/zakken');
    await page.click(`.item:has-text("${SEED_BEAN}")`);
    await page.waitForSelector('.charts');
    await check('zakdetail');
    await page.goto(app.base + '#/logboek');
    await page.click('summary:has-text("Verloop van alle koppen")');
    await page.waitForSelector('.charts');
    await check('logboek');
    await page.close();
  });
}
