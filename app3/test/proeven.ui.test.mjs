import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, brewToEnd } from './helpers.mjs';

let app;
before(async () => { app = await startApp(); });
after(async () => { await app.close(); });

test('proeven: stappen in de juiste volgorde, blinde keuze vóór de zaknotities, opslaan verandert het volgende advies', async () => {
  const page = await app.browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await brewToEnd(page, app.base, 'Proefzak');
  const q = async () => (await page.locator('.q').first().innerText());
  assert.match(await q(), /Hoe sterk/);
  assert.equal(await page.locator('.choices.scale .radio, .choices.scale .box').count(), 0, 'de sterkteschaal heeft geen rondjes of vakjes');
  await page.click('button.choice:has-text("Iets slap")');
  await page.click('button:has-text("Volgende")');
  assert.match(await q(), /Zuurgraad/);
  await page.click('button.choice:has-text("Levendig")');
  await page.click('button.choice:has-text("Zoet en schoon")');
  // Review 17 nov (U2): één keuze heeft een rondje, meerdere keuzes een vierkant vakje; de sterkteschaal heeft geen teken
  const shape = sel => page.evaluate(s => [...document.querySelectorAll(s)].map(e => { const r = getComputedStyle(e).borderTopLeftRadius; return r.endsWith('%') ? parseFloat(r) / 100 : parseFloat(r) / e.getBoundingClientRect().width; }), sel);
  assert.equal(await page.locator('[aria-label="Zuurgraad"] .choice .radio').count(), 3, 'elke keuze bij Zuurgraad heeft een rondje');
  assert.deepEqual((await shape('[aria-label="Zuurgraad"] .radio')).map(r => r >= .5), [true, true, true], 'rond');
  assert.deepEqual((await shape('[aria-label="Afdronk"] .box')).map(r => r < .35), [true, true, true, true], 'vierkant (licht afgerond)');
  assert.equal(await page.locator('[aria-label="Afdronk"] [role=checkbox][aria-checked=true]').count(), 1);
  await page.click('button:has-text("Volgende")');
  assert.match(await q(), /Welke smaakgroepen/);
  assert.equal(await page.locator('.notehit').count(), 0, 'zaknotities zijn nog niet te zien');
  await page.click('button:has-text("Volgende")'); // niets aanvinken mag
  assert.match(await q(), /Dit staat op de zak/);
  await page.click('.notehit >> nth=0 >> button:text-is("Ja")');
  await page.click('button:has-text("Volgende")');
  assert.match(await q(), /lekker/);
  await page.click('button.star[aria-label="4 sterren"]');
  await page.click('button:has-text("Volgende")');
  assert.match(await q(), /echt gebruikt/);
  await page.fill('input[name=doseG]', '999');
  await page.waitForSelector('[role=alert]:has-text("Koffie")');
  assert.equal(await page.locator('button:has-text("Opslaan")').isDisabled(), true);
  await page.fill('input[name=doseG]', '');
  await page.click('button:has-text("Opslaan")');
  await page.waitForSelector('h1:has-text("Opgeslagen")');
  await page.click('a:has-text("Volgende kop")');
  await page.click('summary:has-text("Waarom dit recept")');
  await page.waitForSelector('.reasons');
  const reasons = await page.locator('.reasons').innerText();
  assert.match(reasons, /sterker/i, 'het oordeel "iets slap" werkt door in het advies');
  assert.deepEqual(errors, []);
  await page.close();
});
