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

const axe = async page => {
  await page.evaluate(axeSource);
  const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
  return r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
};
const text = (page, sel) => page.locator(sel).innerText();

for (const scheme of ['light', 'dark']) {
  test(`Chemex (${scheme}): brewer en portie kiezen, eigen recept per portie, techniekkeuze volgt de brewer; axe schoon`, async () => {
    const ctx = await app.browser.newContext({ colorScheme: scheme, viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await importLog(page, app.base, json);
    await page.goto(app.base + '#/zetten');
    await page.waitForSelector('.numbers');

    // V60: geen portiekeuze
    assert.equal(await page.locator('button.chip:has-text("2 koppen")').count(), 0);
    await page.click('button.chip:has-text("Chemex")');
    await page.waitForSelector('button.chip:has-text("2 koppen")');

    const pick = async (portie, naam) => {
      await page.click(`button.chip:has-text("${portie}")`);
      await page.waitForSelector(`h2:has-text("${naam}")`);
    };
    await pick('1 kop', 'Chemex Howell');
    assert.match(await text(page, '.numbers'), /klik 17/);
    assert.equal(await page.locator('button.chip:has-text("1 kop")').getAttribute('aria-pressed'), 'true');
    // twee koppen (680 g): Barefoot is het voorstel
    await pick('2 koppen', 'Chemex Barefoot');
    assert.equal(await page.locator('button.chip:has-text("Hele kan")').count(), 0);
    // geen V60-melding bij een Chemex-recept
    assert.equal(await page.locator('.banner.warn:has-text("V60-techniek")').count(), 0);
    assert.equal(await page.locator('ul.notes li:has-text("V60-techniek")').count(), 0);
    assert.match(await text(page, '.aprep >> nth=0'), /Voor je begint[\s\S]*Spoel het filter/);
    assert.deepEqual(await axe(page), []);

    // techniekkeuze: eigen recepten eerst, V60-technieken in een eigen groep
    await page.click('summary:has-text("Meer opties")');
    const own = await page.locator('select[name=technique] > option').allInnerTexts();
    assert.ok(own.some(o => /Chemex Stumptown/.test(o)));
    assert.equal(await page.locator('select[name=technique] optgroup option:has-text("Hoffmann")').count(), 1);
    await page.selectOption('select[name=technique]', 'chemex_stumptown');
    await page.waitForSelector('h2:has-text("Chemex Stumptown")');
    const hoe = await page.locator('table.pours tbody tr td:last-child').allInnerTexts();
    assert.equal(hoe.length, 3);

    // terug naar de V60: de Chemex-keuze valt weg en de lijst bevat geen Chemex-recepten
    await page.click('button.chip:has-text("Hario V60")');
    await page.waitForSelector('h2:has-text("Kasuya")');
    assert.equal(await page.locator('select[name=technique] option:has-text("Chemex")').count(), 0);
    assert.equal(await page.locator('select[name=technique]').inputValue(), '');
    assert.deepEqual(await axe(page), []);

    // Chemex starten: timer met aanwijzing per giet
    await page.click('button.chip:has-text("Chemex")');
    await page.click('button.chip:has-text("1 kop")');
    await page.waitForSelector('h2:has-text("Chemex Howell")');
    await page.clock.install({ time: new Date('2026-11-09T12:00:00Z') });
    await page.click('button:has-text("Start zetsel")');
    await page.waitForSelector('.timer.ready');
    await page.click('button:has-text("Start")');
    await page.waitForSelector('.pprog');
    assert.match(await text(page, '.pprog'), /Giet 1 van 3/);
    assert.match(await text(page, '.steptip'), /20 seconden[\s\S]*concentrische cirkels/i);
    assert.deepEqual(await axe(page), []);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}
