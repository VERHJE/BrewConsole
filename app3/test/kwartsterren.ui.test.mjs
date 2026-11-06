import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { startApp, brewToEnd } from './helpers.mjs';

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let app;
before(async () => { app = await startApp(); });
after(async () => { await app.close(); });

for (const scheme of ['light', 'dark']) {
  test(`kwartsterren (${scheme}): hele ster kiezen, kwart bijstellen, zichtbaar in het logboek; axe schoon`, async () => {
    const page = await app.browser.newPage({ colorScheme: scheme });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await brewToEnd(page, app.base, 'Sterzak');
    await page.click('button.choice:has-text("Iets slap")');
    await page.click('button:has-text("Volgende")');
    await page.click('button.choice:has-text("Levendig")');
    await page.click('button:has-text("Volgende")');
    await page.click('button:has-text("Volgende")');
    await page.click('button:has-text("Volgende")');
    await page.waitForSelector('.q:has-text("lekker")');
    assert.equal(await page.locator('.liking-fine').count(), 0, 'eerst een hele ster kiezen');
    await page.click('button.choice:has-text("4")');
    await page.waitForSelector('.liking-fine');
    await page.click('button[aria-label="Een kwart ster hoger"]');
    await page.click('button[aria-label="Een kwart ster hoger"]');
    await page.click('button[aria-label="Een kwart ster lager"]');
    await page.waitForSelector('.liking-val:has-text("4,25 van 5")');
    await page.evaluate(axeSource);
    const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
    assert.deepEqual(r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`), []);
    await page.click('button:has-text("Volgende")');
    await page.click('button:has-text("Opslaan")');
    await page.waitForSelector('h1:has-text("Opgeslagen")');
    await page.goto(app.base + '#/logboek');
    await page.waitForSelector('.item [role=img][aria-label="4,25 van 5"]');
    await page.click('.item >> nth=0');
    await page.waitForSelector('dd:has-text("4,25 van 5")');
    assert.deepEqual(errors, []);
    await page.close();
  });
}
