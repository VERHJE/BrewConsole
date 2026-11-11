import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { startApp, importLog } from './helpers.mjs';
import { seedLog } from './seed.ts';

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(2)).json; });
after(async () => { await app.close(); });

const axe = async page => {
  await page.evaluate(axeSource);
  const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
  return r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
};
const text = (page, sel) => page.locator(sel).innerText();

for (const scheme of ['light', 'dark']) {
  test(`Hoffmann (${scheme}): recept met voorbereiding en aanwijzing per giet; timer toont swirl, roeren en tempo op het juiste moment; axe schoon`, async () => {
    const ctx = await app.browser.newContext({ colorScheme: scheme, viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await importLog(page, app.base, json);

    // recept: techniek kiezen, voorbereiding en afronding, aanwijzing per giet; geen "in spiraal" waar de bron geen patroon noemt
    await page.goto(app.base + '#/zetten');
    await page.waitForSelector('.recipe .numbers');
    await page.click('summary:has-text("Meer opties")');
    await page.selectOption('select[name=technique]', 'hoffmann_ultimate');
    await page.waitForSelector('h2:has-text("Hoffmann")');
    assert.match(await text(page, '.aprep >> nth=0'), /Voor je begint[\s\S]*Spoel het filter[\s\S]*kuiltje/);
    assert.match(await text(page, '.aprep >> nth=1'), /Na de laatste giet[\s\S]*3:30/);
    const hoe = await page.locator('ol.pourline li').evaluateAll(els => els.map(e => e.querySelector('.how')?.textContent ?? ''));
    assert.deepEqual(hoe, ['swirl', '', 'roeren']);
    await page.click('summary:has-text("Aanwijzingen per giet")');
    const notes = await page.locator('ol.pournotes li').allInnerTexts();
    assert.equal(notes.length, 3);
    assert.match(notes[0], /Giet 1 \(0:00\)[\s\S]*twee keer de dosis[\s\S]*Daarna: Swirl de V60\./);
    assert.match(notes[2], /Giet 3 \(1:15\)[\s\S]*langzamer[\s\S]*met de klok mee/);
    assert.deepEqual(await axe(page), []);

    // timer: eerst de voorbereiding en het schema met aanwijzing, dan per giet wat er nu en daarna moet
    await page.click('button:has-text("Start zetsel")');
    await page.waitForSelector('.timer.ready');
    assert.match(await text(page, '.stepprep'), /Voor je begint[\s\S]*Spoel het filter/);
    assert.deepEqual(await page.locator('.timer ol.steps li small').allInnerTexts(), ['swirl', 'roeren']);
    assert.deepEqual(await axe(page), []);
    await page.clock.install({ time: new Date('2026-11-05T12:00:00Z') });
    await page.click('button:has-text("Start")');
    await page.waitForSelector('.pprog');
    assert.match(await text(page, '.pprog'), /Giet 1 van 3/i); // de kop staat in kapitalen (CSS)
    assert.match(await text(page, '.steptip'), /twee keer de dosis/);
    assert.equal((await text(page, '.steptarget span')).trim().startsWith('+'), true);
    assert.doesNotMatch(await text(page, '.steptarget span'), /spiraal/);
    assert.match(await text(page, '.stepafter'), /^Daarna: swirl de V60\nSwirl de V60 tot alles gelijkmatig nat is[\s\S]*bloemen tot 0:45/);
    assert.deepEqual(await axe(page), []);

    await page.clock.fastForward(50_000);
    await page.waitForFunction(() => /Giet 2 van 3/.test(document.querySelector('.pprog')?.getAttribute('aria-label') ?? ''));
    assert.match(await text(page, '.steptip'), /ongeveer 30 seconden tot 300 g/i);
    assert.equal(await page.locator('.stepafter').count(), 0, 'na giet 2 niets te doen');

    await page.clock.fastForward(30_000);
    await page.waitForFunction(() => /Giet 3 van 3/.test(document.querySelector('.pprog')?.getAttribute('aria-label') ?? ''));
    assert.match(await text(page, '.steptip'), /Iets langzamer/);
    assert.match(await text(page, '.stepafter'), /^Daarna: roer\nRoer één keer met de klok mee[\s\S]*zachte swirl/);
    assert.match(await text(page, '.stepprep'), /Na de laatste giet[\s\S]*3:30/);
    assert.match(await text(page, '.stepnext'), /Alles doorgelopen/);
    assert.deepEqual(await axe(page), []);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}
