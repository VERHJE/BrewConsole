import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { startApp, importLog } from './helpers.mjs';
import { seedLog, SEED_BEAN } from './seed.ts';

/** Sorteren en filteren staan achter de knop Filter. */
const openFilter = async page => { await page.waitForSelector('button.filterbtn'); if (!(await page.locator('select[name=sorteer]').count())) await page.click('button.filterbtn'); };

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(8, { bagSizeG: '100' })).json; });
after(async () => { await app.close(); });

const names = page => page.locator('.list.thumbs .item strong').allInnerTexts().then(a => a.map(t => t.replace(/^★\s*/, '').trim()));
const iso = daysAgo => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);

async function addBean(page, name, roastDate) {
  await page.goto(app.base + '#/zakken/nieuw');
  await page.fill('input[name=name]', name);
  if (roastDate) await page.fill('input[name=roastDate]', roastDate);
  await page.click('button:has-text("Opslaan")');
  await page.waitForSelector(`.item:has-text("${name}")`);
}

for (const scheme of ['light', 'dark']) {
  test(`zakkenlijst (${scheme}): sorteren, filteren, onthouden en wissen; axe schoon`, async () => {
    const page = await app.browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await importLog(page, app.base, json);
    await addBean(page, 'Alfa', iso(3));
    await addBean(page, 'Charlie', iso(60));
    await addBean(page, 'Bravo', null);
    await openFilter(page);
    await page.waitForSelector('select[name=sorteer]');
    assert.equal(await page.locator('.hero').count(), 0, 'geen grote kaart meer: de lijst is compact');

    await page.selectOption('select[name=sorteer]', 'naam');
    assert.deepEqual(await names(page), ['Alfa', 'Bravo', 'Charlie', SEED_BEAN]);
    await page.selectOption('select[name=sorteer]', 'vers');
    assert.deepEqual((await names(page)).slice(0, 2), ['Alfa', 'Charlie'], 'vers eerst, zonder datum achteraan');
    await page.selectOption('select[name=sorteer]', 'gezet');
    assert.equal((await names(page))[0], SEED_BEAN, 'meest gezet eerst');

    await page.click('button.chip:has-text("Bijna op")');
    await page.waitForFunction(() => document.querySelectorAll('.list.thumbs .item').length === 1);
    assert.deepEqual(await names(page), [SEED_BEAN]);
    assert.match(await page.locator('p.meta[role=status]').innerText(), /1 van 4 zakken/);
    await page.click('button.chip:has-text("Vers")');
    await page.waitForSelector('text=Geen zakken met deze filters');
    await page.reload();
    await openFilter(page);
    await page.waitForSelector('select[name=sorteer]');
    assert.equal(await page.locator('button.chip[aria-pressed=true]').count(), 2, 'filters blijven na herladen');
    assert.equal(await page.inputValue('select[name=sorteer]'), 'gezet');
    await page.evaluate(axeSource);
    const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
    assert.deepEqual(r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`), []);
    await page.click('button:has-text("Wis sorteren en filters") >> nth=0');
    await page.waitForFunction(() => document.querySelectorAll('.list.thumbs .item').length === 4);
    assert.equal(await page.inputValue('select[name=sorteer]'), 'standaard');
    assert.deepEqual(errors, []);
    await page.close();
  });
}

test('zakkenlijst: favorieten staan eerst en het filter Vers vindt de zak van drie dagen oud', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await addBean(page, 'Alfa', iso(3));
  await addBean(page, 'Charlie', iso(60));
  await addBean(page, 'Bravo', null);
  await page.click('.item:has-text("Charlie")');
  await page.click('.detail button:has-text("Favoriet")');
  await page.goto(app.base + '#/zakken');
  await openFilter(page);
  await page.waitForSelector('select[name=sorteer]');
  assert.equal((await names(page))[0], 'Charlie');
  await page.click('button.chip:has-text("Favorieten")');
  await page.waitForFunction(() => document.querySelectorAll('.list.thumbs .item').length === 1);
  await page.click('button.chip:has-text("Favorieten")');
  await page.click('button.chip:has-text("Vers")');
  await page.waitForFunction(() => document.querySelectorAll('.list.thumbs .item').length === 1);
  assert.deepEqual(await names(page), ['Alfa']);
  await page.close();
});
