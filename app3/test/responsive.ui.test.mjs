// Responsive: dezelfde schermen op de toestellen die Jelle gebruikt (iPhone 11 Pro Max, iPad Pro 12,9 inch 2e generatie,
// MacBook Air M2) en een paar extra formaten. Chromium-emulatie van schermgrootte en aanraking, geen Safari/WebKit.
// Controleert: geen horizontaal scrollen of inhoud buiten beeld, alle tikdoelen minstens 44 × 44 punten, de timer staat in het midden.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, importLog } from './helpers.mjs';
import { seedLog } from './seed.ts';

const VIEWPORTS = [
  { id: 'iPhone 11 Pro Max', w: 414, h: 896, dpr: 3, mobile: true },
  { id: 'iPhone 11 Pro Max (Safari)', w: 414, h: 715, dpr: 3, mobile: true },
  { id: 'iPhone 11 Pro Max (liggend)', w: 896, h: 414, dpr: 3, mobile: true },
  { id: 'iPad Pro 12,9 (staand)', w: 1024, h: 1366, dpr: 2, mobile: false, touch: true },
  { id: 'iPad Pro 12,9 (liggend)', w: 1366, h: 1024, dpr: 2, mobile: false, touch: true },
  { id: 'iPad Pro 12,9 (split view)', w: 678, h: 1024, dpr: 2, mobile: false, touch: true },
  { id: 'MacBook Air M2', w: 1470, h: 956, dpr: 2, mobile: false },
  { id: 'MacBook smal venster', w: 900, h: 700, dpr: 2, mobile: false },
  { id: 'iPhone SE', w: 375, h: 667, dpr: 2, mobile: true },
  { id: 'klein 320', w: 320, h: 568, dpr: 2, mobile: true }
];

let app, json;
before(async () => { app = await startApp(); json = (await seedLog(2)).json; });
after(async () => { await app.close(); });

const MEASURE = () => {
  const vw = document.documentElement.clientWidth;
  const desc = el => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''} "${(el.textContent || '').trim().slice(0, 20)}"`;
  const hidden = el => { const d = el.closest('details:not([open])'); return !!d && !(el.tagName === 'SUMMARY' && el.parentElement === d) && !el.closest('summary'); };
  const clipped = el => { for (let p = el.parentElement; p; p = p.parentElement) if (getComputedStyle(p).overflowX !== 'visible') return true; return false; };
  const overflow = [], small = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('[hidden], .sr-only') || hidden(el)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if ((r.right > vw + 1 || r.left < -1) && !clipped(el)) overflow.push(desc(el));
    if (el.matches('a[href], button, select, summary, textarea, input:not([type=hidden]):not([type=checkbox]):not([type=radio])') && (r.height < 43.5 || r.width < 43.5)) small.push(`${desc(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  const t = document.querySelector('.timer');
  const tr = t ? t.getBoundingClientRect() : null;
  const now = document.querySelector('.tnow')?.getBoundingClientRect(), plan = document.querySelector('.tplan')?.getBoundingClientRect();
  const big = document.querySelector('.tctl .big')?.getBoundingClientRect();
  const tip = document.querySelector('.steptip');
  return {
    hscroll: document.documentElement.scrollWidth > vw + 1, overflow, small, timerOff: tr ? Math.abs(tr.left - (vw - tr.right)) : null,
    // Met display: contents heeft een blok geen eigen vlak: dan staan ze onder elkaar.
    sideBySide: now && plan ? now.width > 0 && plan.width > 0 && plan.left >= now.right - 1 : null,
    bigBottom: big ? big.bottom : null, vh: window.innerHeight,
    tipShown: tip ? getComputedStyle(tip).display !== 'none' && tip.getBoundingClientRect().height > 0 : null
  };
};

for (const v of VIEWPORTS) {
  test(`responsive: ${v.id} (${v.w} × ${v.h}): geen overloop, tikdoelen ≥ 44, timer gecentreerd`, async () => {
    const ctx = await app.browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dpr, isMobile: v.mobile, hasTouch: v.mobile || v.touch === true });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await importLog(page, app.base, json);
    const problems = [];
    const check = async name => {
      await page.waitForTimeout(150);
      const m = await page.evaluate(MEASURE);
      if (m.hscroll) problems.push(`${name}: horizontaal scrollen`);
      if (m.overflow.length) problems.push(`${name}: buiten beeld: ${m.overflow.slice(0, 3).join('; ')}`);
      if (m.small.length) problems.push(`${name}: tikdoel te klein: ${m.small.slice(0, 3).join('; ')}`);
      return m;
    };
    const go = async hash => { await page.goto(app.base + hash); await page.waitForSelector('.main'); };
    await go('#/zetten'); await check('zetten');
    const sum = page.locator('.zsummary');
    if (await sum.count() && await sum.isVisible() && (await sum.getAttribute('aria-expanded')) === 'false') await sum.click();
    await page.click('button.chip:has-text("Chemex")');
    await page.waitForSelector('h2:has-text("Chemex")');
    await check('zetten-chemex');
    await page.click('summary:has-text("Meer opties")'); await check('zetten-meer-opties');
    for (const h of ['#/zakken', '#/zakken/nieuw', '#/logboek', '#/meer', '#/meer/water', '#/meer/voorkeuren', '#/meer/gegevens']) { await go(h); await check(h); }
    await go('#/zakken'); await page.click('.item >> nth=0'); await check('zak-detail');
    await go('#/logboek'); await page.click('.item >> nth=0'); await check('logboek-detail');
    await go('#/zetten');
    if (await sum.count() && await sum.isVisible() && (await sum.getAttribute('aria-expanded')) === 'false') await sum.click();
    await page.click('button:has-text("Start zetsel")'); await page.waitForSelector('.timer.ready');
    const ready = await check('timer-klaar');
    await page.clock.install({ time: new Date('2026-11-09T12:00:00Z') });
    await page.click('button:has-text("Start")'); await page.waitForSelector('.pprog'); await page.clock.fastForward(50_000);
    const run = await check('timer-lopend');
    if (v.w >= 900) for (const [n, m] of [['klaar', ready], ['lopend', run]]) if (m.timerOff !== null && m.timerOff > 2) problems.push(`timer-${n}: niet gecentreerd (${Math.round(m.timerOff)} px verschil)`);
    // Twee kolommen op brede (≥ 900 × 600) en liggende telefoonschermen; staand en smal onder elkaar.
    const landscapePhone = v.h <= 560 && v.w > v.h, wide = v.w >= 900 && v.h >= 600;
    for (const [n, m] of [['klaar', ready], ['lopend', run]]) {
      if (m.sideBySide !== (landscapePhone || wide)) problems.push(`timer-${n}: kolommen ${m.sideBySide ? 'naast' : 'onder'} elkaar, verwacht ${landscapePhone || wide ? 'naast' : 'onder'}`);
      if ((landscapePhone || wide) && m.bigBottom !== null && m.bigBottom > m.vh + 1) problems.push(`timer-${n}: hoofdknop valt onder het scherm (${Math.round(m.bigBottom)} > ${m.vh})`);
    }
    if (run.tipShown === false) problems.push('timer-lopend: de tip bij de giet is verborgen');
    await ctx.close();
    assert.deepEqual(errors, []);
    assert.deepEqual(problems, []);
  });
}
