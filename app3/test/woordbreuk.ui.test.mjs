import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, importLog } from './helpers.mjs';
import { seedLog } from './seed.ts';

// Review 17 nov 2026, U1: woorden braken midden in af ("VOLGEND / E" in Proeven op 390 px), doordat het hele hoofdvlak
// `overflow-wrap: anywhere` had. Deze test meet op alle hoofdschermen, in Proeven en in de timer, op 320, 390 en 430 px:
//   1. geen woord staat over twee regels (afbreken bij een koppelteken of schuine streep mag);
//   2. niets loopt horizontaal over, ook niet met een zak met een extreem lange naam (een woord van 68 tekens, emoji).
const LANG = 'Finca 🌋 ' + 'Supercalifragilisticexpialidocious'.repeat(2) + ' El Paraíso Lychee Thermal Shock Double Anaerobic Natural ☕☕☕☕ ' + 'x'.repeat(60);
let app, json, events;
before(async () => { app = await startApp(); ({ json, events } = await seedLog(4, { bagSizeG: '250' })); });
after(async () => { await app.close(); });

/** Woorden (stukken zonder spatie, koppelteken of schuine streep) die over meer dan één regel lopen; de lange testnaam mag breken. */
const brokenWords = () => {
  const out = new Set();
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const el = n.parentElement;
    if (!el || el.closest('.sr-only, [hidden], svg')) continue;
    const re = /[^\s\-–‑/]{2,}/g;
    for (let m = re.exec(n.textContent); m; m = re.exec(n.textContent)) {
      if (/Supercalifragilistic|xxxxxxxx|☕/.test(m[0])) continue;
      const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
      const tops = new Set([...r.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top)));
      if (tops.size > 1) out.add(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${m[0]}"`);
    }
  }
  return [...out];
};

async function scan(width, bean, cup, other) {
  const problems = [];
  // zonder schermovergangen en animaties, zodat er altijd het nieuwe scherm gemeten wordt
  const page = await app.browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const check = async (label) => {
    await page.waitForTimeout(200);
    for (const b of await page.evaluate(brokenWords)) problems.push(`${width} px, ${label}: ${b}`);
    const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (o > 1) problems.push(`${width} px, ${label}: ${o} px horizontale overloop`);
  };
  const go = async (route) => { await page.goto(app.base + '#/' + route); await page.waitForSelector('.main h1, .main .welkom, .timer', { timeout: 15000 }); };
  await importLog(page, app.base, json);
  // een tweede zak met een extreem lange naam
  await go('zakken/nieuw');
  await page.fill('input[name=name]', LANG);
  await page.click('button:has-text("Opslaan")');
  await page.waitForFunction(() => !location.hash.endsWith('/nieuw'));
  await check('zakdetail lange naam');
  for (const r of ['zetten', 'zakken', `zakken/${bean}`, 'zakken/nieuw', `zakken/${bean}/bewerken`, 'logboek', `logboek/${cup}`, `logboek/vergelijk/${cup}/${other}`,
    'meer', 'meer/profiel', 'meer/molen', 'meer/water', 'meer/voorkeuren', 'meer/gegevens', 'meer/sync', 'meer/over']) { await go(r); await check(r); }
  // Zetten met de zak met de lange naam
  await go('zetten');
  await page.waitForSelector('input[name=cup]', { state: 'attached' });
  const sum = page.locator('.zsummary');
  if (await sum.isVisible() && (await sum.getAttribute('aria-expanded')) === 'false') await sum.click();
  const opt = await page.locator('select[name=bean] option').filter({ hasText: 'Finca' }).first().getAttribute('value');
  await page.selectOption('select[name=bean]', opt);
  await check('zetten lange naam');
  // Proeven: alle stappen
  await go('proeven/' + cup);
  for (let i = 1; i <= 8; i++) {
    await check(`proeven stap ${i}`);
    const next = page.locator('.pactions .btn.primary');
    if (!/Volgende/i.test(await next.innerText())) break;
    if (await page.locator('.proeven .choice').count()) await page.locator('.proeven .choice').first().click();
    await next.click();
  }
  // timer: klaar om te beginnen, en lopend
  await page.clock.install({ time: new Date('2026-11-17T12:00:00Z') });
  await go('zetten');
  await page.locator('.startbar button.primary').first().click();
  await page.waitForSelector('.timer');
  await check('timer klaar');
  await page.click('button:has-text("Start")');
  await page.clock.fastForward(50_000);
  await check('timer loopt');
  assert.deepEqual(errors, [], `${width} px: geen fouten`);
  await page.close();
  return problems;
}

test('geen woord breekt midden in af en niets loopt over, ook met een extreem lange zaknaam (320, 390 en 430 px)', async () => {
  const bean = events.find(e => e.kind === 'bean.upsert').data.beanId;
  const plans = events.filter(e => e.kind === 'brew.plan');
  const cup = plans.at(-1).data.brewId, other = plans[0].data.brewId;
  const problems = (await Promise.all([320, 390, 430].map(w => scan(w, bean, cup, other)))).flat();
  assert.deepEqual(problems, []);
});
