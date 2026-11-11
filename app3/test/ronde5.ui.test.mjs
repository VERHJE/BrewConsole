import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { startApp, importLog } from './helpers.mjs';
import { seedLog, SEED_BEAN } from './seed.ts';

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(8)).json; });
after(async () => { await app.close(); });

const axe = async page => {
  await page.evaluate(axeSource);
  const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
  return r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
};

for (const scheme of ['light', 'dark']) {
  test(`schermen (${scheme}): recept met zakfoto en inklapbare uitleg, zakkenlijst, logboek met smaakregel, zakformulier; axe schoon`, async () => {
    const ctx = await app.browser.newContext({ colorScheme: scheme, viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await importLog(page, app.base, json);

    // 1 + 2: recept — uitleg dicht, onzekerheid in gewone taal, zak met plaatje erbij
    await page.goto(app.base + '#/zetten');
    await page.waitForSelector('.recipe .numbers');
    assert.equal(await page.locator('.advthumb').count(), 1);
    assert.match(await page.locator('.advtitle .eyebrow').innerText(), new RegExp(SEED_BEAN));
    assert.match(await page.locator('.advhead ~ p.meta').first().innerText(), /^Verwacht klaar tussen \d:\d\d en \d:\d\d\.$/);
    assert.equal(await page.locator('details.fold[open]').count(), 0, 'uitleg staat dicht');
    assert.deepEqual(await page.locator('details.fold > summary').allInnerTexts(), ['Waarom dit recept?', 'Hoe zeker is dit recept?']);
    await page.click('summary:has-text("Hoe zeker is dit recept?")');
    assert.match(await page.locator('ul.sure').innerText(), /De dosis ligt tussen [\d,]+ en [\d,]+ g\./);
    assert.match(await page.locator('ul.sure').innerText(), /doel-TDS\) komt tussen [\d,]+ en [\d,]+ %\./);
    assert.deepEqual(await axe(page), []);

    // 4: zakkenlijst — twee vaste regels
    await page.goto(app.base + '#/zakken');
    await page.waitForSelector('ul.thumbs .item');
    const smalls = await page.locator('ul.thumbs .item .itext small').allInnerTexts();
    assert.equal(smalls.length, 2);
    assert.equal(smalls[0], 'Herkomst onbekend');
    assert.match(smalls[1], /^Licht · .*8 koppen/);
    assert.deepEqual(await axe(page), []);

    // 6: logboek — korte smaakregel onder elke geproefde kop
    await page.goto(app.base + '#/logboek');
    await page.waitForSelector('.item.go');
    const tastes = await page.locator('.item small.taste').allInnerTexts();
    assert.ok(tastes.length >= 6, `smaakregels: ${tastes.length} van ${await page.locator(".item.go").count()} rijen`);
    assert.ok(tastes.every(t => /slap|sterk|precies goed/i.test(t)), tastes.join(' | '));
    assert.deepEqual(await axe(page), []);

    // 5: zakformulier — optionele velden dicht tot ze iets bevatten
    await page.goto(app.base + '#/zakken/nieuw');
    await page.waitForSelector('input[name=name]');
    assert.equal(await page.locator('details.fold[open]').count(), 0);
    assert.equal(await page.locator('input[name=region]').isVisible(), false);
    assert.equal(await page.locator('input[name=roastDate]').isVisible(), true);
    assert.equal(await page.locator('input[name=bagSizeG]').isVisible(), true);
    await page.fill('textarea[name=paste]', 'Notes: jasmine, peach\nProcess: Washed\nRoast: Light');
    await page.click('text=Herken velden');
    await page.waitForSelector('details.fold[open] select[name=process]');
    assert.equal(await page.locator('select[name=roastLevel]').isVisible(), true, 'herkende velden staan open');
    assert.equal(await page.locator('input[name=notes]').isVisible(), true);
    // een open groep blijft open, ook als je alles weer leegmaakt
    await page.selectOption('select[name=process]', '');
    await page.selectOption('select[name=roastLevel]', '');
    await page.fill('input[name=notes]', '');
    assert.equal(await page.locator('select[name=process]').isVisible(), true);
    assert.deepEqual(await axe(page), []);

    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('timer: welke giet het is en tot welk gewicht, in een grote regel', async () => {
  const ctx = await app.browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zetten');
  await page.click('button:has-text("Start zetsel")');
  await page.waitForSelector('.timer.ready');
  assert.equal(await page.locator('.pprog').count(), 0, 'voor de start nog geen voortgang');
  await page.clock.install({ time: new Date('2026-11-05T12:00:00Z') });
  await page.click('button:has-text("Start")');
  await page.waitForSelector('.pprog');
  const label = await page.locator('.pprog').getAttribute('aria-label');
  assert.match(label, /^Giet 1 van \d$/);
  const total = Number(label.split(' ').pop());
  assert.equal(await page.locator('.pdots .d').count(), total);
  assert.equal(await page.locator('.pdots .d.now').count(), 1);
  assert.match(await page.locator('.steptarget b').innerText(), /^tot \d+ g$/);
  // Kasuya: de bronnen noemen geen gietpatroon, dus alleen de hoeveelheid
  assert.match(await page.locator('.steptarget span').innerText(), /^\+\d+ g$/);
  await page.clock.fastForward(50_000);
  await page.waitForFunction(() => /Giet [2-9] van/.test(document.querySelector('.pprog')?.getAttribute('aria-label') ?? ''));
  assert.deepEqual(errors, []);
  await ctx.close();
});
