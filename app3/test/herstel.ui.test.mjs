import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, importLog } from './helpers.mjs';
import { seedLog } from './seed.ts';

let app, json;
before(async () => { app = await startApp(); json = (await seedLog(8)).json; });
after(async () => { await app.close(); });

for (const scheme of ['light', 'dark']) {
  test(`voorkeuren (${scheme}): kleine keuzerondjes, woorden breken niet midden in het woord`, async () => {
    const page = await app.browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    await page.goto(app.base + '#/meer/voorkeuren');
    await page.waitForSelector('input[type=radio]');
    const m = await page.evaluate(() => [...document.querySelectorAll('.choice')].map(l => {
      const r = l.querySelector('input').getBoundingClientRect(), s = l.querySelector('span').getBoundingClientRect();
      const lh = parseFloat(getComputedStyle(l.querySelector('span')).lineHeight) || 24;
      return { w: r.width, text: l.innerText.trim(), lines: Math.round(s.height / lh) };
    }));
    for (const x of m) { assert.ok(x.w <= 30, `rondje ${x.w}px bij ${x.text}`); assert.ok(x.lines <= 2, `${x.text}: ${x.lines} regels`); }
    for (const word of ['Met schreef', 'Schreefloos']) assert.ok(m.some(x => x.text.startsWith(word) && x.lines === 1), `${word} op één regel`);
    await page.close();
  });
}

test('smaakprofiel als lijst zonder afgebroken woorden; kopdetail met het advies onderaan', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/meer/profiel');
  await page.waitForSelector('.sens, .sens-empty');
  assert.equal(await page.locator('table.plain >> text=Plantaardig').count(), 0);
  const long = await page.evaluate(() => [...document.querySelectorAll('.sens strong, .sens-empty')].every(e => e.scrollWidth <= e.clientWidth + 1));
  assert.equal(long, true);
  await page.goto(app.base + '#/logboek');
  await page.click('.item >> nth=0');
  await page.click('summary:has-text("Over dit advies")');
  await page.waitForSelector('.engine-note');
  assert.equal(await page.locator('dt:has-text("Advies van")').count(), 0);
  assert.match(await page.locator('.engine-note').innerText(), /Gemaakt door engine3/);
  await page.close();
});

test('de vaste knop onderaan heeft een effen achtergrond (geen wazige laag over tekst)', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zakken');
  await page.click('.item >> nth=0');
  await page.waitForSelector('.startbar');
  const st = await page.locator('.startbar').evaluate(e => { const c = getComputedStyle(e); return { filter: c.backdropFilter, bg: c.backgroundColor }; });
  assert.ok(st.filter === 'none' || st.filter === '', st.filter);
  assert.notEqual(st.bg, 'rgba(0, 0, 0, 0)');
  assert.ok(!/rgba\(.*,\s*0\.\d+\)/.test(st.bg), st.bg);
  await page.close();
});
