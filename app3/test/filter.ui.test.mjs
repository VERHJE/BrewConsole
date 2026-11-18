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
  await page.selectOption('select[name=filter]', { label: 'Cafec TH-3' });
  assert.equal(await page.locator('.filternote').count(), 0, 'geen melding bij de eerste kop');
  await page.locator('.startbar button.primary').first().click();
  await page.waitForSelector('.timer .clock');

  await page.goto(app.base + '#/logboek'); await page.waitForSelector('.logrow');
  await page.click('.logrow >> nth=0');
  await page.waitForSelector('.logdetail .numbers');
  assert.match(await page.locator('.logdetail .numbers').innerText(), /Cafec TH-3[\s\S]*filter/i);

  await page.goto(app.base + '#/zetten');
  await page.waitForSelector('.recipe .numbers');
  await page.selectOption('select[name=filter]', { label: 'Hario V60-papier' });
  const note = page.locator('.filternote');
  await note.waitFor({ timeout: 3000 });
  const txt = await note.innerText();
  assert.match(txt, /Cafec TH-3/);
  assert.equal(/\d/.test(txt.replace('Cafec TH-3', '')), false, 'de melding bevat geen getal');
  await page.selectOption('select[name=filter]', { label: 'Niet bijhouden' });
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
  assert.equal(await page.locator('select[name=filter]').count(), 0);
  await page.close();
});

test('iPad liggend: de filterkeuze neemt één regel in (audit 15 nov, P3-04)', async () => {
  const page = await app.browser.newPage({ viewport: { width: 1180, height: 820 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zetten');
  await page.waitForSelector('.recipe .numbers');
  const sel = page.locator('select[name=filter]');
  const h = await sel.evaluate(e => e.getBoundingClientRect().height);
  const zak = await page.locator('select[name=bean]').evaluate(e => e.getBoundingClientRect().height);
  assert.equal(Math.round(h), Math.round(zak), 'even hoog als de keuzelijst voor de zak');
  await page.close();
});

// Review 17 nov 2026: W5 (het filter staat in de samenvatting van het zetformulier) en R2 (uitleg bij "Over de vorige kop").
test('telefoon: het gekozen filter staat in de samenvatting; "Over de vorige kop" legt uit wat de app zelf ziet', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zetten');
  await page.waitForSelector('input[name=cup]', { state: 'attached' });
  const sum = page.locator('.zsummary');
  if ((await sum.getAttribute('aria-expanded')) === 'false') await sum.click();
  await page.selectOption('select[name=filter]', 'cafec_th3');
  await page.waitForFunction(() => /Cafec TH-3/.test(document.querySelector('.zsum-text')?.textContent ?? ''));
  await page.selectOption('select[name=filter]', '');
  await page.waitForFunction(() => !/Cafec|Hario V60-papier/.test(document.querySelector('.zsum-text')?.textContent ?? ''));
  await page.click('summary:has-text("Meer opties")');
  assert.match(await page.locator('fieldset.field').innerText(), /haalt de app dat zelf uit je proefnotities/);
  await page.close();
});
