import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, importLog } from './helpers.mjs';
import { seedLog } from './seed.ts';

// Audit 15 nov, P3-05: een tegellabel ("TEMPERATUUR", "MOLEN · C3S PRO") mag niet midden in een woord afbreken.
// Gemeten zoals het scherm het tekent: zou een woord zonder `overflow-wrap: anywhere` buiten de tegel lopen, dan breekt het nu af.
let app, json, events;
before(async () => { app = await startApp(); ({ json, events } = await seedLog(3, { bagSizeG: '250' })); });
after(async () => { await app.close(); });

test('tegels: geen label breekt midden in een woord af, van 320 tot 430 px', async () => {
  const bean = events.find(e => e.kind === 'bean.upsert').data.beanId;
  const cup = events.find(e => e.kind === 'brew.plan').data.brewId;
  for (const width of [320, 360, 390, 430]) {
    const page = await app.browser.newPage({ viewport: { width, height: 844 } });
    await importLog(page, app.base, json);
    for (const route of ['zetten', `zakken/${bean}`, `logboek/${cup}`, 'meer', 'meer/profiel', 'meer/molen']) {
      await page.goto(app.base + '#/' + route);
      await page.waitForSelector('main h1, .main h1, section h1').catch(() => {});
      await page.waitForTimeout(400);
      const n = await page.locator('.num small').count();
      if (['zetten', `zakken/${bean}`, `logboek/${cup}`].includes(route)) assert.ok(n > 0, `${width} px, #/${route}: geen tegels gevonden (h1: ${await page.locator('h1').first().textContent().catch(() => '?')})`);
      const broken = await page.locator('.num small').evaluateAll(els => els.filter(e => e.getClientRects().length).flatMap(e => {
        const box = e.closest('.num'); const cs = getComputedStyle(box);
        const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const probe = document.createElement('span');
        probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap';
        e.appendChild(probe);
        const out = e.textContent.trim().split(/\s+/).filter(w => { probe.textContent = w; return probe.getBoundingClientRect().width > avail + 0.5; });
        probe.remove();
        return out;
      }));
      assert.deepEqual(broken, [], `${width} px, #/${route}: woorden die niet passen`);
    }
    await page.close();
  }
});
