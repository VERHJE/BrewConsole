import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, importLog } from './helpers.mjs';
import { seedLog } from './seed.ts';

// B7–B9 (11 nov 2026): één tijdlijn voor het gietschema, de timer op een iPad, drie vaste regels in de zakkenlijst.
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(3)).json; });
after(async () => { await app.close(); });

test('gietschema: dezelfde tijdlijn op Zetten en in de timer; de huidige giet is gemarkeerd, een doorgelopen giet afgevinkt', async () => {
  const page = await app.browser.newPage({ viewport: { width: 1180, height: 820 }, reducedMotion: 'reduce' });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zetten'); await page.waitForSelector('.recipe .numbers');
  const n = await page.locator('.recipe ol.pourline li').count();
  assert.ok(n >= 3, 'tijdlijn op Zetten');
  await page.click('.startbar button'); await page.waitForSelector('.timer.ready');
  assert.equal(await page.locator('.timer ol.pourline li').count(), n, 'dezelfde gietbeurten in de timer');
  await page.clock.install({ time: new Date('2026-11-05T12:00:00Z') });
  await page.click('button:has-text("Start")');
  await page.waitForSelector('.timer ol.pourline li.now');
  assert.equal(await page.locator('.timer ol.pourline li.now').count(), 1, 'één huidige giet');
  assert.match(await page.locator('.timer ol.pourline li.now').innerText(), /Nu:/, 'de staat staat ook in tekst');
  await page.click('button:text-is("Doorgelopen")');
  await page.clock.fastForward(50_000); // de volgende giet begint: de eerste is nu echt voorbij
  await page.waitForSelector('.timer ol.pourline li.past');
  assert.ok(await page.locator('.timer ol.pourline li.past').count() >= 1, 'doorgelopen giet afgevinkt');
  // iPad liggend: de overbodige regel "Daarna giet 2…" is weg, het schema staat bovenaan de rechterkolom
  assert.equal(await page.locator('.timer .stepnext').isVisible(), false);
  const schemaTop = await page.locator('.timer details.schema').evaluate(e => e.getBoundingClientRect().top);
  const prep = page.locator('.timer .stepprep').first();
  if (await prep.count()) assert.ok(schemaTop <= await prep.evaluate(e => e.getBoundingClientRect().top), 'schema vóór de voorbereiding');
  await page.close();
});

test('zakkenlijst: drie vaste regels (herkomst, branding, voorraad en koppen)', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zakken'); await page.waitForSelector('ul.thumbs .item');
  const rows = await page.locator('ul.thumbs .item .itext').evaluateAll(els => els.map(e => [...e.querySelectorAll('small')].length));
  assert.ok(rows.length > 0 && rows.every(k => k === 3), `elke rij heeft drie regels: ${rows.join(',')}`);
  await page.close();
});
