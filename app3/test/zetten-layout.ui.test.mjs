import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { startApp, importLog } from './helpers.mjs';
import { seedLog, SEED_BEAN } from './seed.ts';

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(4)).json; });
after(async () => { await app.close(); });

const PHONE = { width: 390, height: 844 };

test('telefoon: eerste keer staat het formulier open; daarna ingeklapt met samenvatting, Wijzig klapt open', async () => {
  const page = await app.browser.newPage({ viewport: PHONE });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zetten');
  await page.waitForSelector('.numbers');
  assert.equal(await page.locator('#zform').isVisible(), true, 'nog nooit gebruikt: open');
  await page.selectOption('select[name=bean]', { label: SEED_BEAN });
  await page.waitForFunction(() => (localStorage.getItem('brewconsole.zetten') || '').includes('"beanId":"'));
  await page.reload();
  await page.waitForSelector('.numbers');
  assert.equal(await page.locator('#zform').isVisible(), false, 'eerder gebruikt: dicht');
  await page.waitForFunction(n => document.querySelector('.zsum-text').textContent.includes(n), SEED_BEAN);
  const sum = await page.locator('.zsum-text').innerText();
  assert.ok(sum.includes('250 g'), sum);
  assert.equal(await page.locator('.zsummary').getAttribute('aria-expanded'), 'false');
  await page.click('.zsummary');
  assert.equal(await page.locator('#zform').isVisible(), true);
  assert.equal(await page.locator('.zsummary').getAttribute('aria-expanded'), 'true');
  await page.fill('input[name=cup]', '300');
  await page.click('.zsummary');
  await page.waitForFunction(() => /300 g/.test(document.querySelector('.zsum-text').textContent));
  await page.close();
});

test('telefoon: de startknop staat zonder scrollen in beeld, boven de tabbalk', async () => {
  const page = await app.browser.newPage({ viewport: PHONE });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zetten');
  await page.selectOption('select[name=bean]', { label: SEED_BEAN });
  await page.waitForFunction(() => (localStorage.getItem('brewconsole.zetten') || '').includes('"beanId":"'));
  await page.reload();
  await page.waitForSelector('.startbar .btn');
  const btn = await page.locator('.startbar .btn').boundingBox();
  const tab = await page.locator('nav.tabbar').boundingBox();
  assert.ok(btn.y >= 0 && btn.y + btn.height <= PHONE.height, `knop in beeld: ${JSON.stringify(btn)}`);
  assert.ok(btn.y + btn.height <= tab.y + 1, 'niet onder de tabbalk');
  await page.close();
});

test('laptop: formulier en recept naast elkaar, geen samenvatting, startknop in beeld', async () => {
  const page = await app.browser.newPage({ viewport: { width: 1280, height: 800 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zetten');
  await page.waitForSelector('.numbers');
  assert.equal(await page.locator('.zsummary').isVisible(), false);
  const form = await page.locator('#zform').boundingBox();
  const nums = await page.locator('.numbers').boundingBox();
  assert.ok(nums.x > form.x + form.width, 'recept staat rechts van het formulier');
  const btn = await page.locator('.startbar .btn').boundingBox();
  assert.ok(btn.y + btn.height <= 800);
  await page.close();
});

test('timer: ring met aftelling, "Hierna", wachten op doorlopen; geen axe-overtredingen in licht en donker', async () => {
  for (const scheme of ['light', 'dark']) {
    const page = await app.browser.newPage({ viewport: PHONE, colorScheme: scheme });
    await importLog(page, app.base, json);
    await page.goto(app.base + '#/zetten');
    await page.selectOption('select[name=bean]', { label: SEED_BEAN });
    await page.selectOption('select[name=technique]', 'kasuya_46').catch(() => {});
    await page.click('button:has-text("Start zetsel")');
    await page.waitForSelector('.stepcard');
    assert.match(await page.locator('.stepname').innerText(), /Klaar om te starten/);
    await page.clock.install({ time: new Date('2026-11-06T09:00:00Z') });
    await page.click('button:has-text("Start")');
    await page.clock.fastForward(10_000);
    await page.waitForFunction(() => /Giet 1/.test(document.querySelector('.stepname').textContent));
    const ring = await page.locator('.ringtext').innerText();
    assert.match(ring, /^\d+:\d\d$/, `aftelling in de ring: ${ring}`);
    assert.match(await page.locator('.stepnext').innerText(), /Hierna giet 2/);
    assert.equal(await page.locator('.ring').getAttribute('aria-hidden'), 'true');
    await page.clock.fastForward(40_000);
    await page.waitForFunction(() => /Wacht op doorlopen/.test(document.querySelector('.stepname').textContent));
    assert.equal((await page.locator('.ringtext').innerText()).trim(), 'wacht');
    await page.evaluate(axeSource);
    const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
    assert.deepEqual(r.violations.map(v => `${scheme} ${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`), []);
    await page.close();
  }
});
