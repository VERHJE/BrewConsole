import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, importLog } from './helpers.mjs';
import { seedLog, SEED_BEAN } from './seed.ts';

// Kleine correcties uit de nalooprondes van 11 nov 2026.
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(8)).json; });
after(async () => { await app.close(); });

test('Zetten: de tabel heeft geen lege "Hoe"-kolom; de proef heeft maar één "Proef:" ervoor', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zetten'); await page.waitForSelector('.recipe .numbers');
  const heads = await page.locator('table.pours thead th').allInnerTexts();
  const cells = await page.locator('table.pours tbody tr').first().locator('td').count();
  assert.equal(heads.length, cells, 'evenveel koppen als cellen');
  if (!heads.includes('Hoe')) assert.equal(await page.locator('table.pours tbody tr td:last-child').filter({ hasText: /^$/ }).count(), 0, 'geen lege laatste kolom');
  const trial = page.locator('.card:has(> p > strong:text-is("Proef:"))');
  if (await trial.count()) assert.doesNotMatch(await trial.first().innerText(), /Proef:\s*Proef:/);
  await page.close();
});

test('zakdetail: de vier tegels staan op dezelfde hoogte; uitgeschakelde knoppen zijn duidelijk uitgeschakeld', async () => {
  const page = await app.browser.newPage({ viewport: { width: 1180, height: 820 }, reducedMotion: 'reduce' });
  await importLog(page, app.base, json);
  // een zak mét zakgrootte: dan heeft de derde tegel de voorraad (.num.stock), waar de oude marge-regel op sloeg
  await page.goto(app.base + '#/zakken/nieuw'); await page.waitForSelector('input[name=name]');
  await page.fill('input[name=name]', 'Voorraadzak'); await page.fill('input[name=bagSizeG]', '250');
  await page.click('button:has-text("Opslaan")');
  await page.waitForSelector('ul.thumbs .item:has-text("Voorraadzak")');
  await page.click('ul.thumbs .item:has-text("Voorraadzak")');
  await page.waitForSelector('.beantiles .num.stock'); await page.waitForTimeout(500);
  const tops = await page.locator('.beantiles .num').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().top)));
  assert.equal(new Set(tops).size, 1, `tegels beginnen op verschillende hoogtes: ${tops.join(', ')}`);
  await page.goto(app.base + '#/zakken/nieuw'); await page.waitForSelector('button:has-text("Herken velden")');
  const style = await page.locator('button:has-text("Herken velden")').evaluate(e => ({ off: e.disabled, op: getComputedStyle(e).opacity, bg: getComputedStyle(e).backgroundColor }));
  assert.equal(style.off, true);
  assert.equal(style.op, '1', 'geen half-doorzichtig goud');
  assert.notEqual(style.bg, 'rgb(226, 189, 132)', 'niet meer de gouden hoofdkleur');
  await page.close();
});
