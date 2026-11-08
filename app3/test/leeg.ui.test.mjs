import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { startApp, importLog } from './helpers.mjs';
import { seedLog } from './seed.ts';

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(3)).json; });
after(async () => { await app.close(); });
const axe = async page => { await page.evaluate(axeSource); const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })); return r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`); };

for (const scheme of ['light', 'dark']) {
  test(`lege toestanden (${scheme}): profiel, notities, waarderingen, zak zonder koppen; axe schoon`, async () => {
    const page = await app.browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    // geen enkele kop: één volledige lege toestand met een actie
    await page.goto(app.base + '#/meer/profiel');
    await page.waitForSelector('.empty .empty-icon');
    assert.equal(await page.locator('.empty-title').innerText(), 'Nog geen smaakprofiel');
    assert.equal(await page.locator('.empty a.btn').getAttribute('href'), '#/zetten');
    assert.deepEqual(await axe(page), []);
    // met koppen maar zonder herkende notities: compacte toestand op de plek zelf
    await importLog(page, app.base, json);
    await page.goto(app.base + '#/meer/profiel');
    await page.waitForSelector('.empty.compact');
    assert.equal(await page.locator('.empty-icon').count(), 0);
    assert.ok((await page.locator('.empty.compact .empty-title').allInnerTexts()).includes('Nog geen herkende notities'));
    assert.deepEqual(await axe(page), []);
    await page.close();
    // een zak zonder koppen
    const p2 = await app.browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    await p2.goto(app.base + '#/zakken/nieuw');
    await p2.fill('input[name=name]', 'Leegzak');
    await p2.click('button:has-text("Opslaan")');
    await p2.click('.item:has-text("Leegzak")');
    await p2.waitForSelector('.detail');
    const titles = await p2.locator('.detail .empty.compact .empty-title').allInnerTexts();
    assert.ok(titles.includes('Nog geen afgeronde koppen') && titles.includes('Nog geen koppen met deze zak'), titles.join(' | '));
    assert.deepEqual(await axe(p2), []);
    assert.deepEqual(errors, []);
    await p2.close();
  });
}
