import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { startApp, importLog } from './helpers.mjs';
import { seedLog } from './seed.ts';

// Water, Voorkeuren, Gegevens en Synchronisatie in dezelfde stijl: kaarten met icoon, schakelaars, tegels; axe schoon.
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(2)).json; });
after(async () => { await app.close(); });

test('instelschermen: kaarten met icoon, echte schakelaars, tegels bij Gegevens; axe schoon', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await importLog(page, app.base, json);
  const axe = async (where) => {
    await page.waitForTimeout(300);
    await page.evaluate(axeSource);
    const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
    assert.deepEqual(r.violations.map(v => `${where} ${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`), []);
  };
  for (const [hash, h1] of [['#/meer/water', 'Water'], ['#/meer/voorkeuren', 'Voorkeuren'], ['#/meer/gegevens', 'Gegevens'], ['#/meer/sync', 'Synchronisatie']]) {
    await page.goto(app.base + hash); await page.waitForSelector(`.main h1:text-is("${h1}")`);
    assert.ok(await page.locator('.panel .ic svg').count() >= 1, `${h1}: kaarten met icoon`);
    await axe(h1);
  }
  // Voorkeuren: schakelaars zijn echte checkboxen met role=switch en reageren op toets en klik
  await page.goto(app.base + '#/meer/voorkeuren'); await page.waitForSelector('input.switch');
  assert.equal(await page.locator('input.switch[role=switch]').count(), 3);
  const box = page.locator('input[name=cueSound]');
  const was = await box.isChecked();
  await box.click(); assert.equal(await box.isChecked(), !was);
  // Gegevens: drie tegels bovenaan
  await page.goto(app.base + '#/meer/gegevens'); await page.waitForSelector('.meertiles');
  assert.equal(await page.locator('.meertiles .num').count(), 3);
  assert.deepEqual(errors, []);
  await page.close();
});
