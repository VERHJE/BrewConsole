import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { startApp, importLog } from './helpers.mjs';
import { seedLog } from './seed.ts';

const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(4)).json; });
after(async () => { await app.close(); });

for (const scheme of ['light', 'dark']) {
  test(`keuzehulp Chemex (${scheme}): knop alleen bij de Chemex, venster met smaak per recept, met één tik kiezen; axe schoon`, async () => {
    const page = await app.browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    await importLog(page, app.base, json);
    await page.goto(app.base + '#/zetten');
    const sum = page.locator('.zsummary');
    if ((await sum.getAttribute('aria-expanded')) === 'false') await sum.click();
    assert.equal(await page.locator('button:has-text("Welk recept past?")').count(), 0, 'niet bij de V60');
    await page.click('button.chip:has-text("Chemex")');
    await page.click('button:has-text("Welk recept past?")');
    await page.waitForSelector('dialog.guide[open]');
    assert.equal(await page.locator('.guide-list li').count(), 9);
    assert.match(await page.locator('.guide-list li:has-text("Barefoot")').innerText(), /10\/10/);
    assert.match(await page.locator('.guide-list li:has-text("Ox Coffee")').innerText(), /Geen bron zegt iets over de smaak/);
    await page.evaluate(axeSource);
    const v = await page.evaluate(async () => (await axe.run(document.querySelector('dialog.guide'), { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] })).violations.map(x => x.id));
    assert.deepEqual(v, []);
    await page.click('.guide-list li:has-text("Barefoot") button');
    assert.equal(await page.locator('dialog.guide[open]').count(), 0);
    await page.waitForSelector('.advtitle h2:has-text("Barefoot")');
    assert.equal(await page.inputValue('select[name=technique]').catch(async () => { await page.click('summary:has-text("Meer opties")'); return page.inputValue('select[name=technique]'); }), 'chemex_barefoot');
    await page.close();
  });
}
