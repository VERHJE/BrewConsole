import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, importLog } from './helpers.mjs';
import { seedLog } from './seed.ts';

// iPhone met notch: met viewport-fit=cover loopt de pagina onder de statusbalk. Bovenaan moet de veilige zone vrij blijven.
// Chromium kent geen echte notch; we bootsen env(safe-area-inset-top) na door de waarde in de CSS te vervangen.
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(2)).json; });
after(async () => { await app.close(); });

test('veilige zone bovenin: titels en "Annuleren" staan onder de statusbalk (47 px), op gewone schermen en in de timer', async () => {
  const page = await app.browser.newPage({ viewport: { width: 414, height: 896 } });
  await importLog(page, app.base, json);
  const notch = async () => page.addStyleTag({ content: '.main { padding-top: calc(var(--gutter) + 47px) !important; }' });
  const cssUsesInset = await page.evaluate(() => [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => r.cssText.includes('.main') && r.cssText.includes('safe-area-inset-top')); } catch { return false; } }));
  assert.equal(cssUsesInset, true, 'de .main-regel gebruikt env(safe-area-inset-top)');
  for (const [h, title] of [['#/zetten', 'Zetten'], ['#/zakken', 'Zakken'], ['#/logboek', 'Logboek'], ['#/meer', 'Meer']]) {
    await page.goto(app.base + h); await page.waitForSelector(`.main h1:text-is("${title}")`); await page.waitForTimeout(300); await notch();
    const top = await page.locator(`.main h1:text-is("${title}")`).evaluate(e => e.getBoundingClientRect().top);
    assert.ok(top >= 47, `${h}: titel begint op ${Math.round(top)} px, onder de statusbalk`);
  }
  await page.goto(app.base + '#/zetten');
  await page.click('.startbar button'); await page.waitForSelector('.timer.ready'); await page.waitForTimeout(300); await notch();
  const leave = await page.locator('.leave-top').evaluate(e => e.getBoundingClientRect().top);
  assert.ok(leave >= 47, `Annuleren begint op ${Math.round(leave)} px`);
  await page.close();
});
