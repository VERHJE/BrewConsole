import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { startApp, importLog } from './helpers.mjs';
import { seedLog } from './seed.ts';

// Meer in de stijl van het zakdetail: etiket met drie getallen, gegroepeerde lijsten met iconen, tegels op de subschermen.
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(4)).json; });
after(async () => { await app.close(); });

for (const scheme of ['light', 'dark']) {
  test(`Meer-stijl (${scheme}): etiket, groepen met iconen, tegels; Nederlandse groepsnamen; axe schoon`, async () => {
    const page = await app.browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await importLog(page, app.base, json);
    const axe = async (where) => {
      await page.waitForTimeout(300);
      await page.evaluate(axeSource);
      const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
      assert.deepEqual(r.violations.map(v => `${where} ${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`), []);
    };
    await page.goto(app.base + '#/meer'); await page.waitForSelector('.meerhero');
    assert.equal(await page.locator('.meerhero .mh-nums > div').count(), 3);
    assert.match(await page.locator('.meerhero').innerText(), /4\s*koppen/i);
    assert.equal(await page.locator('.list.grouped .item.go .ic svg').count(), 7, 'zeven regels met een icoon');
    await axe('meer');
    await page.goto(app.base + '#/meer/profiel'); await page.waitForSelector('.main h1:text-is("Smaakprofiel")'); await page.waitForSelector('.meertiles');
    const text = await page.locator('.main').innerText();
    assert.doesNotMatch(text, /\b(natural|washed|light|medium)\b/, 'proces en branding in het Nederlands');
    assert.doesNotMatch(text, /\(algemeen\)/);
    await axe('profiel');
    await page.goto(app.base + '#/meer/molen'); await page.waitForSelector('.main h1:text-is("Molen")'); // na de schermovergang staat het nieuwe scherm er een frame later
    await page.waitForSelector('.meertiles');
    assert.match(await page.locator('.meertiles .num').first().innerText(), /%/);
    await axe('molen');
    assert.deepEqual(errors, []);
    await page.close();
  });
}
