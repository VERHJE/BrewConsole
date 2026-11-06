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

for (const scheme of ['light', 'dark']) {
  test(`logboek (${scheme}): maandkoppen, zoeken, vergelijken; axe schoon`, async () => {
    const page = await app.browser.newPage({ colorScheme: scheme });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await importLog(page, app.base, json);
    await page.goto(app.base + '#/logboek');
    await page.waitForSelector('.month-h');
    const total = await page.locator('.month .item').count();
    assert.ok(total >= 8, `koppen: ${total}`);
    await page.fill('input[name=zoek]', 'zzzonbekend');
    await page.waitForSelector('text=Geen koppen gevonden');
    await page.fill('input[name=zoek]', SEED_BEAN.toLowerCase());
    await page.waitForFunction(n => document.querySelectorAll('.month .item').length === n, total);
    await page.click('.month .item >> nth=0');
    await page.waitForSelector('select[name=compare]');
    const opts = await page.locator('select[name=compare] option').count();
    assert.ok(opts >= 2);
    await page.selectOption('select[name=compare]', { index: 1 });
    await page.waitForSelector('table.compare');
    assert.ok(await page.locator('table.compare tbody tr').count() >= 6);
    await page.evaluate(axeSource);
    const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
    assert.deepEqual(r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`), []);
    assert.deepEqual(errors, []);
    await page.close();
  });
}

test('favoriet: aan in het detail, ster en kop in de lijst, blijft na herladen; Meer toont sync-status', async () => {
  const page = await app.browser.newPage();
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zakken');
  await page.click(`.item:has-text("${SEED_BEAN}")`);
  await page.click('button:has-text("Favoriet")');
  assert.equal(await page.locator('button:has-text("Favoriet")').getAttribute('aria-pressed'), 'true');
  await page.goto(app.base + '#/zakken');
  await page.waitForSelector('.hero .eyebrow:has-text("Favoriet")');
  await page.waitForSelector('.item strong:has-text("★")');
  await page.goto(app.base + '#/meer');
  await page.waitForSelector('text=Twee toestellen gelijk houden');
  await page.close();
});
