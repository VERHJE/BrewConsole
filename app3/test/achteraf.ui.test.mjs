import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, brewToEnd } from './helpers.mjs';

// Review 17 nov 2026, W2: achteraf aanpassen (filter, toch afronden) en gearchiveerde zakken terugzetten.
let app;
before(async () => { app = await startApp(); });
after(async () => { await app.close(); });

async function newBean(page, name) {
  await page.goto(app.base + '#/zakken/nieuw');
  await page.fill('input[name=name]', name);
  await page.click('button:has-text("Opslaan")');
  await page.waitForSelector(`.item:has-text("${name}")`);
}

test('archief: een gearchiveerde zak staat onder "Gearchiveerd" en is terug te zetten', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await newBean(page, 'Archiefzak');
  assert.equal(await page.locator('details.archived').count(), 0, 'zonder archief geen kopje');
  await page.click('.item:has-text("Archiefzak")');
  await page.click('a:has-text("Bewerken")');
  await page.click('button:has-text("Archiveren")');
  await page.waitForSelector('details.archived summary:has-text("Gearchiveerd (1)")');
  assert.equal(await page.locator('ul.list.thumbs .item:has-text("Archiefzak")').count(), 0, 'niet meer in de gewone lijst');
  await page.click('details.archived summary');
  await page.click('button[aria-label="Archiefzak terugzetten"]');
  await page.waitForSelector('ul.list.thumbs .item:has-text("Archiefzak")');
  assert.equal(await page.locator('details.archived').count(), 0);
  assert.deepEqual(errors, []);
  await page.close();
});

test('niet afgerond: toch afronden met een eigen tijd, dan proeven; "klaar na" toont die tijd', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.clock.install({ time: new Date('2026-11-17T08:00:00Z') });
  await newBean(page, 'Vergeten zak');
  await page.goto(app.base + '#/zetten');
  await page.selectOption('select[name=bean]', { label: 'Vergeten zak' });
  await page.click('button:has-text("Start zetsel")');
  await page.waitForSelector('.timer .clock');
  const id = decodeURIComponent(page.url().split('#/timer/')[1]);
  await page.clock.fastForward('13:00:00'); // langer dan 12 uur open
  await page.goto(app.base + '#/logboek/' + encodeURIComponent(id));
  await page.waitForSelector('form.latefinish');
  await page.fill('input[name=endclock]', 'ongeveer');
  await page.click('button:has-text("Toch afronden en proeven")');
  await page.waitForSelector('.latefinish .err[role=alert]');
  await page.fill('input[name=endclock]', '3:30');
  await page.click('button:has-text("Toch afronden en proeven")');
  await page.waitForSelector('.proeven .progress');
  assert.match(page.url(), /#\/proeven\//);
  await page.goto(app.base + '#/logboek/' + encodeURIComponent(id));
  await page.waitForSelector('.numbers');
  assert.equal(await page.locator('form.latefinish').count(), 0, 'afgerond: geen melding meer');
  assert.match(await page.locator('.numbers').innerText(), /3:30\s*klaar na/i);
  assert.ok(await page.locator(`a.btn[href="#/proeven/${encodeURIComponent(id)}"], a.btn[href="#/proeven/${id}"]`).count() >= 1, 'afgerond: de knop Proeven staat er');
  assert.deepEqual(errors, []);
  await page.close();
});

test('filter achteraf: in "Wat heb je echt gebruikt?" een ander filter kiezen; het logboek toont het', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await brewToEnd(page, app.base, 'Filterzak');
  // door naar de laatste stap ("Wat heb je echt gebruikt?"), die heeft Opslaan in plaats van Volgende
  for (let i = 0; i < 8 && !(await page.locator('.pactions button:has-text("Opslaan")').count()); i++) {
    await page.click('.pactions button:has-text("Volgende")');
    await page.waitForTimeout(100);
  }
  await page.waitForSelector('select[name=filter]');
  assert.equal(await page.inputValue('select[name=filter]'), '', 'niets gekozen bij het zetten');
  await page.selectOption('select[name=filter]', 'cafec_th3');
  await page.click('button:has-text("Opslaan")');
  await page.waitForSelector('h1:has-text("Opgeslagen")');
  await page.goto(app.base + '#/logboek');
  await page.click('.logrow >> nth=0');
  await page.waitForSelector('.numbers');
  assert.match(await page.locator('.numbers').innerText(), /Cafec TH-3\s*filter/i);
  assert.deepEqual(errors, []);
  await page.close();
});
