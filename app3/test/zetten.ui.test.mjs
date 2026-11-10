import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp } from './helpers.mjs';

let app;
before(async () => { app = await startApp(); });
after(async () => { await app.close(); });

test('zetten: advies verschijnt en volgt de kopgrootte', async () => {
  const page = await app.browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(app.base + '#/zetten');
  await page.click('button:has-text("Zonder zak beginnen")'); // eerste start: welkomstkaart
  await page.waitForSelector('.numbers');
  const dose250 = await page.locator('.num b').first().innerText();
  await page.fill('input[name=cup]', '280');
  await page.waitForFunction(old => document.querySelector('.num b')?.textContent !== old, dose250);
  assert.ok((await page.locator('table.pours tbody tr').count()) >= 3);
  assert.ok((await page.locator('.reasons li').count()) >= 1);
  await page.fill('input[name=cup]', '20');
  await page.waitForSelector('[role=alert]:has-text("tussen")');
  assert.deepEqual(errors, []);
  await page.close();
});

test('hele stroom: zak → advies → timer → klaar; herladen midden in het zetsel houdt de klok', async () => {
  const page = await app.browser.newPage();
  await page.goto(app.base + '#/zakken/nieuw');
  await page.fill('input[name=name]', 'Teststroom');
  await page.click('button:has-text("Opslaan")');
  await page.waitForSelector('.item:has-text("Teststroom")');
  await page.goto(app.base + '#/zetten');
  await page.selectOption('select[name=bean]', { label: 'Teststroom' });
  await page.click('button:has-text("Start zetsel")');
  await page.waitForSelector('.timer .clock');
  assert.match(await page.locator('.clock').innerText(), /^0:00/);
  assert.equal(await page.locator('nav.tabbar').count(), 0, 'tabbalk is weg tijdens het zetsel');
  await page.clock.install({ time: new Date('2026-11-05T12:00:00Z') });
  await page.click('button:has-text("Start")');
  await page.clock.fastForward(12_000);
  await page.waitForFunction(() => /^0:1[1-3]/.test(document.querySelector('.clock').textContent));
  await page.reload();
  await page.waitForSelector('.timer .clock');
  await page.clock.install({ time: new Date('2026-11-05T12:00:13Z') });
  await page.waitForFunction(() => { const [m, s] = document.querySelector('.clock').textContent.match(/^(\d+):(\d+)/).slice(1).map(Number); return m * 60 + s >= 12; });
  // Doorlopen: tik tot het einde. Elke ronde: vooruit in de tijd, dan de grote knop.
  for (let i = 0; i < 12; i++) {
    if (await page.locator('a:has-text("Proeven")').count()) break;
    await page.clock.fastForward(40_000);
    const finish = page.locator('button:has-text("Alles doorgelopen")');
    if (await finish.count()) { await finish.click(); break; }
    const erdoor = page.locator('button:text-is("Doorgelopen")');
    if (await erdoor.count()) await erdoor.click();
  }
  await page.waitForSelector('a:has-text("Proeven")');
  assert.match(await page.locator('.stepcard.done .stepname').innerText(), /Klaar/);
  assert.match(await page.locator('.stepcard.done .stepaction').innerText(), /Proef de koffie/);
  await page.close();
});
