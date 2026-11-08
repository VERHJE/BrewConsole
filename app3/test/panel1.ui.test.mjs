import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, importLog } from './helpers.mjs';
import { seedLog, SEED_BEAN } from './seed.ts';

let app, json;
before(async () => { app = await startApp(); json = (await seedLog(8)).json; });
after(async () => { await app.close(); });

test('zetten: de nieuwste zak staat vooraf gekozen; "geen zak" blijft een bewuste keuze', async () => {
  const page = await app.browser.newPage();
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zetten');
  await page.waitForSelector('select[name=bean]');
  assert.equal(await page.locator('select[name=bean] option:checked').innerText(), SEED_BEAN);
  await page.selectOption('select[name=bean]', '');
  // de keuze wordt na het schilderen opgeslagen: wacht daarop voordat we herladen
  await page.waitForFunction(() => (localStorage.getItem('brewconsole.zetten') ?? '').includes('"noBean":true'));
  await page.reload();
  await page.waitForSelector('select[name=bean]');
  assert.equal(await page.locator('select[name=bean]').inputValue(), '');
  await page.close();
});

test('timer voor de start: geen ring met "start", wel één startknop', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zetten');
  await page.click('button:has-text("Start zetsel")');
  await page.waitForSelector('.timer.ready');
  assert.equal(await page.locator('.ring').count(), 0);
  assert.equal(await page.locator('button:text-is("Start")').count(), 1);
  const box = await page.locator('button:text-is("Start")').boundingBox();
  assert.ok(box.y + box.height > 844 - 80, 'startknop zit onderaan');
  await page.close();
});

test('zakdetail: neutrale pasvorm krijgt geen grote kop en een ingeklapte tabel; Terug staat op de foto', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zakken');
  await page.click(`.item:has-text("${SEED_BEAN}")`);
  await page.waitForSelector('.fit');
  assert.equal(await page.locator('.fit .delta').count(), 0);
  assert.equal(await page.locator('.fit details').getAttribute('open'), null);
  assert.equal(await page.locator('.hero-photo a:has-text("Terug")').count(), 1);
  await page.close();
});

test('punt 4 en 5: logboek met één zak kopt op datum met pijltje; grote zakkaart pas vanaf drie zakken', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/logboek');
  await page.waitForSelector('.item.go');
  assert.doesNotMatch(await page.locator('.item.go').first().innerText(), new RegExp(SEED_BEAN));
  assert.equal(await page.locator('.item.go').count() > 0, true);
  await page.goto(app.base + '#/zakken');
  await page.waitForSelector('ul.thumbs .item');
  assert.equal(await page.locator('.hero').count(), 0, 'één zak: geen dubbele kaart');
  await page.close();
});

test('punt 6 en 7: Meer in drie groepen; hero-foto op laptop volgt de kleur van de zak', async () => {
  const page = await app.browser.newPage({ viewport: { width: 1280, height: 800 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/meer');
  await page.waitForSelector('.group-h');
  assert.deepEqual((await page.locator('.group-h').allTextContents()), ['Jouw koffie', 'Gedrag', 'Gegevens en app']);
  assert.equal(await page.locator('.list .item.go').count(), 7);
  await page.goto(app.base + '#/zakken');
  await page.click(`.item:has-text("${SEED_BEAN}")`);
  await page.waitForSelector('.hero-photo svg');
  const bg = await page.locator('.hero-photo svg').evaluate(el => getComputedStyle(el).backgroundColor);
  assert.notEqual(bg, 'rgba(0, 0, 0, 0)', 'de rand naast de tekening heeft dezelfde kleur als de achtergrond');
  await page.close();
});

test('zetten: de Kasuya-uitleg staat als rustige lijst, niet als waarschuwing', async () => {
  const page = await app.browser.newPage({ viewport: { width: 1280, height: 800 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zetten');
  await page.waitForSelector('ul.notes');
  assert.match(await page.locator('ul.notes').innerText(), /Kasuya: giet pas/);
  assert.equal(await page.locator('.banner.warn:has-text("Kasuya")').count(), 0);
  await page.close();
});
