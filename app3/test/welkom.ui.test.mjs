import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { startApp, importLog } from './helpers.mjs';
import { seedLog } from './seed.ts';

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(2)).json; });
after(async () => { await app.close(); });

for (const scheme of ['light', 'dark']) {
  test(`eerste start (${scheme}): welkomstkaart, doorgaan zonder zak blijft onthouden; axe schoon`, async () => {
    const page = await app.browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(app.base + '#/zetten');
    await page.waitForSelector('.welkom');
    assert.equal(await page.locator('h1').innerText(), 'Welkom bij Brew Console');
    assert.equal(await page.locator('.welkom-steps li').count(), 3);
    assert.equal(await page.locator('select[name=bean]').count(), 0, 'nog geen formulier');
    assert.equal(await page.locator('a:has-text("Back-up inlezen")').getAttribute('href'), '#/meer/gegevens');
    assert.equal(await page.locator('a[href="oud/"]').count(), 0, 'de oude app bestaat niet meer');
    await page.evaluate(axeSource);
    const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
    assert.deepEqual(r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`), []);
    await page.click('button:has-text("Zonder zak beginnen")');
    await page.waitForSelector('select[name=bean]');
    await page.reload();
    await page.waitForSelector('.zsummary, select[name=bean]');
    assert.equal(await page.locator('.welkom').count(), 0, 'komt niet terug');
    assert.deepEqual(errors, []);
    await page.close();
  });
}

test('eerste start: de grote knop leidt naar een nieuwe zak; met gegevens verschijnt de kaart niet', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(app.base + '#/zetten');
  await page.waitForSelector('.welkom');
  await page.click('a:has-text("Voeg je eerste zak toe")');
  await page.waitForSelector('textarea[name=paste]');
  assert.match(page.url(), /#\/zakken\/nieuw$/);
  await page.close();
  const p2 = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(p2, app.base, json);
  await p2.goto(app.base + '#/zetten');
  await p2.waitForSelector('.numbers, select[name=bean], .zsummary');
  assert.equal(await p2.locator('.welkom').count(), 0);
  await p2.close();
});
