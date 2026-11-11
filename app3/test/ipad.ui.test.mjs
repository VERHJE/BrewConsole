import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, importLog } from './helpers.mjs';
import { seedLog } from './seed.ts';

// iPad liggend (1180×820): logboek met overzicht, Meer in twee kolommen, Zetten met tweekoloms recept.
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(3)).json; });
after(async () => { await app.close(); });

test('logboek op breed scherm: lijst links, verloop rechts zonder gekozen kop', async () => {
  const page = await app.browser.newPage({ viewport: { width: 1180, height: 820 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/logboek'); await page.waitForSelector('.logrow');
  assert.equal(await page.locator('.logoverview').isVisible(), true);
  const [l, o] = await Promise.all([page.locator('.split-list').boundingBox(), page.locator('.logoverview').boundingBox()]);
  assert.ok(o.x > l.x + l.width - 1, 'overzicht rechts van de lijst');
  await page.close();
});

test('logboek op smal scherm: geen overzichtspaneel', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/logboek'); await page.waitForSelector('.logrow');
  assert.equal(await page.locator('.logoverview').count(), 0);
  await page.close();
});

test('Meer op breed scherm: groepen naast elkaar, kop in groen-teal', async () => {
  const page = await app.browser.newPage({ viewport: { width: 1180, height: 820 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/meer'); await page.waitForSelector('.meergroups .mcol');
  const cols = await page.locator('.mcol').evaluateAll(es => es.map(e => e.getBoundingClientRect().x));
  assert.ok(cols[1] > cols[0] + 100, 'twee kolommen');
  const bg = await page.locator('.meerhero').evaluate(e => getComputedStyle(e).getPropertyValue('--l1').trim());
  assert.equal(bg, '#24403d');
  await page.close();
});

test('isStale: open zetsels ouder dan 12 uur gelden als niet afgerond', async () => {
  const { isStale } = await import('../src/core/brew.ts');
  const now = Date.UTC(2026, 0, 2, 12);
  assert.equal(isStale(now - 11 * 3_600_000, now), false);
  assert.equal(isStale(now - 13 * 3_600_000, now), true);
});
