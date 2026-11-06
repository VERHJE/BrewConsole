import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import QRCode from 'qrcode';
import { startApp } from './helpers.mjs';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

let app;
before(async () => { app = await startApp(); });
after(async () => { await app.close(); });

for (const scheme of ['light', 'dark']) {
  test(`foto per zak (${scheme}): kiezen, lijst, detail, Zet deze zak, verwijderen; axe schoon`, async () => {
    const png = await QRCode.toBuffer('foto', { margin: 4, scale: 12 });
    const page = await app.browser.newPage({ colorScheme: scheme });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(app.base + '#/zakken/nieuw');
    await page.fill('input[name=name]', 'Fotozak');
    await page.fill('input[name=country]', 'Kenia');
    await page.setInputFiles('input[name=photo]', { name: 'zak.png', mimeType: 'image/png', buffer: png });
    await page.waitForSelector('text=Foto klaar');
    await page.click('button:has-text("Opslaan")');
    await page.waitForSelector('ul.list .item strong:has-text("Fotozak")');
    await page.waitForSelector('.hero img.photo');
    await page.waitForSelector('.thumb img.photo');
    await page.reload();
    await page.waitForSelector('.thumb img.photo');
    await page.click('.item:has-text("Fotozak")');
    await page.waitForSelector('.hero-photo img.photo');
    assert.equal(await page.locator('h1').innerText(), 'Fotozak');
    await page.evaluate(axeSource);
    const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
    assert.deepEqual(r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`), []);
    await page.click('button:has-text("Zet deze zak")');
    await page.waitForSelector('select[name=bean]');
    await page.waitForFunction(() => document.querySelector('select[name=bean]').selectedOptions[0]?.textContent.includes('Fotozak'));
    await page.goto(app.base + '#/zakken');
    await page.click('.item:has-text("Fotozak")');
    await page.click('a:has-text("Bewerken")');
    await page.click('button:has-text("Foto verwijderen")');
    await page.click('button:has-text("Opslaan")');
    await page.waitForSelector('.thumb svg.bagart');
    assert.equal(await page.locator('img.photo').count(), 0);
    assert.deepEqual(errors, []);
    await page.close();
  });
}
