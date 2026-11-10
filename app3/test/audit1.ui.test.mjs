import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, importLog } from './helpers.mjs';
import { seedLog } from './seed.ts';

// Audit 10 nov 2026, ronde 1: P1-01 (kopgrenzen per brewer), P1-02 (een open zetsel terugvinden), P2-02 (kopveld zonder NaN).
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(4)).json; });
after(async () => { await app.close(); });

async function openForm(page) {
  await page.goto(app.base + '#/zetten');
  await page.waitForSelector('input[name=cup]', { state: 'attached' });
  const sum = page.locator('.zsummary');
  if (await sum.isVisible() && (await sum.getAttribute('aria-expanded')) === 'false') await sum.click();
}
const ratio = async page => { const [dose, water] = await page.locator('.numbers .num b').allInnerTexts(); return parseFloat(water) / parseFloat(dose.replace(',', '.')); };

test('P1-01: de V60 laat geen kop toe waarbij de verhouding onbruikbaar wordt; wisselen van brewer schuift de kop binnen het bereik', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await openForm(page);
  await page.fill('input[name=cup]', '600');
  assert.match(await page.locator('.zadvice-col [role=alert]').innerText(), /Hario V60 een kop tussen 200 en 280 gram/);
  assert.equal(await page.locator('.startbar').count(), 0, 'zonder geldig recept geen Start-knop');
  await page.fill('input[name=cup]', '280');
  const r = await ratio(page);
  assert.ok(r >= 13 && r <= 18, `V60 280 g: 1:${r.toFixed(1)}`);
  assert.equal(await page.locator('button[aria-label=Groter]').isDisabled(), true, 'plus staat uit op de bovengrens');
  // Chemex 2 koppen (680 g) → terug naar V60: de kop schuift naar 280 g
  await page.click('button.chip:has-text("Chemex")');
  await page.click('button.chip:has-text("2 koppen")');
  assert.equal(await page.inputValue('input[name=cup]'), '680');
  await page.click('button.chip:has-text("Hario V60")');
  assert.equal(await page.inputValue('input[name=cup]'), '280');
  assert.match(await page.locator('#cup-l').innerText(), /200–280 g/);
  await page.close();
});

test('P2-02: het kopveld toont nooit NaN; een komma mag; ongeldige tekst geeft een melding en laat het recept staan', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await openForm(page);
  await page.fill('input[name=cup]', 'abc');
  assert.equal(await page.inputValue('input[name=cup]'), 'abc');
  assert.match(await page.locator('#cup-err').innerText(), /Vul een getal in/);
  assert.equal(await page.locator('.advtitle h2').count(), 1, 'het vorige recept blijft staan');
  await page.fill('input[name=cup]', '240,4');
  assert.equal(await page.locator('#cup-err').count(), 0);
  await page.locator('input[name=cup]').blur();
  assert.equal(await page.inputValue('input[name=cup]'), '240');
  await page.fill('input[name=cup]', '');
  assert.notEqual(await page.inputValue('input[name=cup]'), '0');
  await page.close();
});

test('P1-02: een lopend zetsel is terug te vinden vanaf Zetten en vanuit het logboek', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zetten');
  await page.click('.startbar button');
  await page.waitForSelector('.timer.ready');
  await page.click('button:text-is("Start")');
  const timerUrl = page.url();
  await page.goto(app.base + '#/zetten');
  await page.waitForSelector('.banner.openbrew');
  assert.match(await page.locator('.banner.openbrew').innerText(), /Er loopt nog een zetsel/);
  await page.click('.banner.openbrew a:has-text("Naar de timer")');
  await page.waitForSelector('.timer');
  assert.equal(page.url(), timerUrl);
  await page.goto(app.base + '#/logboek');
  await page.click('.item >> nth=0');
  await page.click('a:has-text("Terug naar de timer")');
  await page.waitForSelector('.timer');
  // na afronden of afbreken verdwijnt de verwijzing
  await page.click('button:has-text("Stop")');
  await page.click('button:has-text("Echt stoppen")');
  await page.waitForSelector('.tctl a.btn:has-text("Terug")');
  await page.goto(app.base + '#/zetten');
  await page.waitForSelector('.zetten h1');
  assert.equal(await page.locator('.banner.openbrew').count(), 0);
  await page.close();
});
