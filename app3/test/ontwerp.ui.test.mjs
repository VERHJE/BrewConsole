// Ronde 6 (ontwerp, fase A): logboekrijen met brewer, afgebroken zetsels weg, etiket in plaats van een tekening,
// compacte zakkenlijst met raster op een breed scherm, ivoor en espresso met messing (licht) en goud (donker).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { startApp, importLog } from './helpers.mjs';
import { seedLog, SEED_BEAN } from './seed.ts';

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let app, json;
before(async () => {
  app = await startApp();
  // Het tweede zetsel wordt een Chemex-zetsel, zodat het brewerlabel te zien is.
  const log = JSON.parse((await seedLog(3)).json);
  const plans = log.events.filter(e => e.kind === 'brew.plan');
  plans[1].data.recipe.method = 'chemex';
  json = JSON.stringify(log);
});
after(async () => { await app.close(); });

const axe = async page => {
  await page.evaluate(axeSource);
  const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
  return r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
};

for (const scheme of ['light', 'dark']) {
  test(`ontwerp (${scheme}): logboekrij met datumblok en brewer; een afgebroken zetsel staat er niet in en telt niet mee; axe schoon`, async () => {
    const ctx = await app.browser.newContext({ colorScheme: scheme, viewport: { width: 414, height: 896 } });
    const page = await ctx.newPage();
    await importLog(page, app.base, json);
    await page.goto(app.base + '#/logboek');
    await page.waitForSelector('.logrow');
    assert.equal(await page.locator('.logrow').count(), 3);
    const first = await page.locator('.logrow').first();
    assert.match(await first.locator('.logdate').innerText(), /^\d{1,2}\s+\w+/);
    assert.deepEqual((await page.locator('.logrow .brewer').allInnerTexts()).sort(), ['CHEMEX', 'V60', 'V60']);
    assert.ok(await page.locator('.logrow .logmeta').count() === 3 && await page.locator('.logrow .lognums').count() === 3);
    assert.deepEqual(await axe(page), []);

    // Een zetsel starten en afbreken: het komt niet in het logboek en de zak telt het niet mee.
    await page.goto(app.base + '#/zetten');
    const sum = page.locator('.zsummary');
    if (await sum.count() && await sum.isVisible() && (await sum.getAttribute('aria-expanded')) === 'false') await sum.click();
    await page.click('button:has-text("Start zetsel")');
    await page.waitForSelector('.timer.ready');
    await page.clock.install({ time: new Date('2026-11-09T12:00:00Z') });
    await page.click('button:has-text("Start")');
    await page.waitForSelector('.pprog');
    await page.click('button:has-text("Stop")');
    await page.click('button:has-text("Echt stoppen")');
    await page.waitForSelector('text=Afgebroken');
    await page.goto(app.base + '#/logboek');
    await page.waitForSelector('.logrow');
    assert.equal(await page.locator('.logrow').count(), 3, 'het afgebroken zetsel staat niet in het logboek');
    await page.goto(app.base + '#/zakken');
    await page.click('ul.thumbs a.item >> nth=0');
    await page.waitForSelector('.detail');
    assert.match(await page.locator('.detail .muted').first().innerText(), /3 koppen/);
    await ctx.close();
  });

  test(`ontwerp (${scheme}): zakken zonder hero, met Filter-knop en een etiket met monogram; kleuren van het thema; axe schoon`, async () => {
    const ctx = await app.browser.newContext({ colorScheme: scheme, viewport: { width: 414, height: 896 } });
    const page = await ctx.newPage();
    await importLog(page, app.base, json);
    await page.goto(app.base + '#/zakken');
    await page.waitForSelector('ul.thumbs a.item');
    assert.equal(await page.locator('.hero').count(), 0);
    const mono = await page.locator('.thumb .bagart.label .mono').first().innerText();
    assert.equal(mono, SEED_BEAN[0]);
    // De hoofdknop: espresso in het lichte thema, goud in het donkere.
    const bg = await page.locator('a.btn.primary').first().evaluate(el => getComputedStyle(el).backgroundColor);
    assert.equal(bg, scheme === 'light' ? 'rgb(42, 31, 21)' : 'rgb(217, 166, 90)');
    // Het zakdetail toont het etiket met naam en brander in tekst.
    await page.click('ul.thumbs a.item >> nth=0');
    await page.waitForSelector('.hero-photo .bagart.label.large');
    assert.match(await page.locator('.hero-photo .l-name').innerText(), new RegExp(SEED_BEAN));
    assert.deepEqual(await axe(page), []);
    await ctx.close();
  });
}

test('ontwerp: op een breed scherm een raster van zakken en een gecentreerde kolom; compact rail met woordmerk', async () => {
  // Een log met meer zakken: kopieer de zak een paar keer onder andere namen.
  const log = JSON.parse(json);
  const upserts = log.events.filter(e => e.kind === 'bean.upsert');
  let n = 0;
  for (const name of ['Alfa', 'Bravo', 'Charlie', 'Delta']) {
    const e = JSON.parse(JSON.stringify(upserts[0]));
    e.id = `x${n++}`; e.data.beanId = `bean_${name}`; e.data.fields.name = name; e.at += 1000 + n;
    log.events.push(e);
  }
  const page = await app.browser.newPage({ viewport: { width: 1470, height: 956 } });
  await importLog(page, app.base, JSON.stringify(log));
  await page.goto(app.base + '#/zakken');
  await page.waitForSelector('ul.thumbs a.item');
  const xs = await page.locator('ul.thumbs a.item').evaluateAll(els => [...new Set(els.map(e => Math.round(e.getBoundingClientRect().left)))]);
  assert.ok(xs.length >= 2, `raster met meerdere kolommen (${xs.join(', ')})`);
  const box = await page.locator('.main > section').evaluate(el => { const r = el.getBoundingClientRect(); const m = document.querySelector('.main').getBoundingClientRect(); return { left: r.left - m.left, right: m.right - r.right }; });
  assert.ok(Math.abs(box.left - box.right) < 3, `inhoud gecentreerd (${Math.round(box.left)} / ${Math.round(box.right)})`);
  assert.match(await page.locator('.brandmark').innerText(), /Brew\s*Console/);
  const tabs = await page.locator('.tabbar a').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().top)));
  assert.ok(tabs[3] - tabs[0] < 320, `de vier onderdelen staan dicht bij elkaar (${tabs.join(', ')})`);
  await page.close();
});

test('ontwerp: een afgerond zetsel toont bij elke giet een vinkje', async () => {
  const page = await app.browser.newPage({ viewport: { width: 414, height: 896 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zetten');
  await page.waitForSelector('.numbers');
  const sum = page.locator('.zsummary');
  if (await sum.count() && await sum.isVisible() && (await sum.getAttribute('aria-expanded')) === 'false') await sum.click();
  await page.click('button:has-text("Start zetsel")');
  await page.waitForSelector('.timer.ready');
  await page.clock.install({ time: new Date('2026-11-09T12:00:00Z') });
  await page.click('button:has-text("Start")');
  await page.waitForSelector('.pprog');
  for (let i = 0; i < 14; i++) {
    if (await page.locator('a:has-text("Proeven")').count()) break;
    await page.clock.fastForward(40_000);
    const fin = page.locator('button:has-text("Alles doorgelopen")');
    if (await fin.count() && await fin.click({ timeout: 3000 }).then(() => true, () => false)) break;
    const er = page.locator('button:text-is("Doorgelopen")'); if (await er.count()) await er.click({ timeout: 3000 }).catch(() => {});
  }
  await page.waitForSelector('a:has-text("Proeven")');
  const n = await page.locator('.timer ol.steps li').count();
  assert.equal(await page.locator('.timer ol.steps li.past').count(), n, 'alle gietbeurten zijn afgevinkt');
  await page.close();
});

test('iPad-meldingen: vinkjes onder Meer opties zijn klein met tekst ernaast; timer heeft een uitgang; doel zonder effect wordt uitgelegd', async () => {
  const page = await app.browser.newPage({ viewport: { width: 1180, height: 820 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zetten');
  await page.click('summary:has-text("Meer opties")');
  const boxes = await page.locator('fieldset.field input[type=checkbox]').evaluateAll(els => els.map(e => e.getBoundingClientRect().width));
  assert.ok(boxes.length > 0 && boxes.every(w => w <= 30), `vinkjes ${boxes}`);
  const labelW = await page.locator('fieldset.field label.row').first().evaluate(e => e.getBoundingClientRect().width);
  assert.ok(labelW > 150, `tekst heeft ruimte (${labelW}px)`);
  await page.click('button.chip:has-text("Chemex")');
  await page.click('button.chip:has-text("Helder en fris")');
  assert.match(await page.locator('.goalnote').innerText(), /verandert het doel het recept niet/);
  await page.click('button:has-text("Start zetsel")');
  await page.waitForSelector('.timer.ready');
  await page.click('button:has-text("Annuleren, terug naar Zetten")');
  await page.waitForSelector('select[name=bean]');
  await page.close();
});
