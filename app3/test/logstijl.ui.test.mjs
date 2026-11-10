import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { startApp, importLog } from './helpers.mjs';
import { seedLog, SEED_BEAN } from './seed.ts';

// Logboek in de stijl van het zakdetail: datumblok als etiket, donkere kop, tijdlijn voor het gieten, proeftegels.
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(3)).json; });
after(async () => { await app.close(); });

for (const scheme of ['light', 'dark']) {
  test(`logboek-stijl (${scheme}): etiketdatum, kop met naam, tijdlijn en proeftegels; axe schoon`, async () => {
    const page = await app.browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await importLog(page, app.base, json);
    await page.goto(app.base + '#/logboek'); await page.waitForSelector('.logrow');
    assert.ok(await page.locator('.logrow .logdate.bagart.label .l-topo').count() > 0, 'datumblok als etiket');
    await page.click('.logrow >> nth=0');
    await page.waitForSelector(`.loghero h1:has-text("${SEED_BEAN}")`);
    assert.ok(await page.locator('ol.pourline li').count() >= 2, 'tijdlijn voor het gieten');
    assert.ok(await page.locator('.numbers .num').count() >= 2);
    await page.waitForTimeout(400);
    await page.evaluate(axeSource);
    const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
    assert.deepEqual(r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`), []);
    assert.deepEqual(errors, []);
    await page.close();
  });
}
