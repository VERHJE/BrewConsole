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
const axe = async (page) => { await page.evaluate(axeSource); const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })); return r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`); };

for (const scheme of ['light', 'dark']) {
  test(`laptop (${scheme}): lijst en detail naast elkaar bij zakken en logboek; telefoon één per keer; axe schoon`, async () => {
    const wide = await app.browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: scheme });
    await importLog(wide, app.base, json);
    await wide.goto(app.base + '#/zakken');
    await wide.click(`.item:has-text("${SEED_BEAN}")`);
    await wide.waitForSelector('.detail');
    assert.equal(await wide.locator('.split-list').isVisible(), true, 'lijst blijft zichtbaar');
    assert.equal(await wide.locator('.split-list .item[aria-current=true]').count(), 1, 'gekozen zak is gemarkeerd');
    assert.equal(await wide.locator('.back-narrow').first().isVisible(), false, 'geen Terug nodig');
    const b = await wide.evaluate(() => [document.querySelector('.split-list').getBoundingClientRect(), document.querySelector('.detail').getBoundingClientRect()].map(r => [r.left, r.right]));
    assert.ok(b[0][1] <= b[1][0] + 1, 'naast elkaar, niet eroverheen');
    assert.deepEqual(await axe(wide), []);
    await wide.goto(app.base + '#/logboek');
    await wide.click('.item >> nth=0');
    await wide.waitForSelector('select[name=compare]');
    assert.equal(await wide.locator('.split-list').isVisible(), true);
    assert.equal(await wide.locator('.split-list .item[aria-current=true]').count(), 1);
    await wide.close();
    const narrow = await app.browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    await importLog(narrow, app.base, json);
    await narrow.goto(app.base + '#/zakken');
    await narrow.click(`.item:has-text("${SEED_BEAN}")`);
    await narrow.waitForSelector('.detail');
    assert.equal(await narrow.locator('.split-list').isVisible(), false, 'telefoon: alleen het detail');
    assert.equal(await narrow.locator('.back-narrow').first().isVisible(), true);
    await narrow.close();
  });

  test(`lege schermen (${scheme}) en gegevens in gewone taal; axe schoon`, async () => {
    const page = await app.browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    await page.goto(app.base + '#/zakken');
    await page.waitForSelector('.empty .empty-icon');
    assert.equal(await page.locator('.empty .empty-title').innerText(), 'Nog geen zakken');
    assert.deepEqual(await axe(page), []);
    await page.goto(app.base + '#/logboek');
    await page.waitForSelector('h1:has-text("Logboek")'); // na de schermovergang (View Transitions) staat het nieuwe scherm er een frame later
    await page.waitForSelector('.empty .empty-icon');
    assert.equal(await page.locator('.empty a.btn').count(), 1);
    assert.deepEqual(await axe(page), []);
    await importLog(page, app.base, json);
    await page.goto(app.base + '#/meer/gegevens');
    await page.waitForSelector('text=Op dit toestel: 1 zak en 8 koppen');
    assert.equal(await page.locator('text=gebeurtenissen op dit toestel').count(), 0);
    await page.close();
  });
}

test('waardering: één rij met vijf sterren, elk minstens 48 px hoog, in een rij', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  const { brewToEnd } = await import('./helpers.mjs');
  await brewToEnd(page, app.base, 'Sterrenzak');
  await page.click('button.choice:has-text("Iets slap")'); await page.click('button:has-text("Volgende")');
  await page.click('button.choice:has-text("Levendig")'); await page.click('button:has-text("Volgende")');
  await page.click('button:has-text("Volgende")'); await page.click('button:has-text("Volgende")');
  await page.waitForSelector('.starpick');
  const m = await page.evaluate(() => [...document.querySelectorAll('.starpick .star')].map(b => { const r = b.getBoundingClientRect(); return { top: Math.round(r.top), h: r.height, w: r.width }; }));
  assert.equal(m.length, 5);
  assert.ok(m.every(x => x.h >= 48 && x.w >= 48), JSON.stringify(m));
  assert.equal(new Set(m.map(x => x.top)).size, 1, 'alle vijf op één regel');
  await page.click('.star[aria-label="3 sterren"]');
  assert.equal(await page.locator('.star.on').count(), 3);
  assert.equal(await page.locator('.star[aria-pressed=true]').count(), 1);
  await page.click('.star[aria-label="3 sterren"]');
  assert.equal(await page.locator('.star.on').count(), 0, 'nogmaals tikken wist de keuze');
  await page.close();
});
