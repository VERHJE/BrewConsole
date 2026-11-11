import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startApp, importLog } from './helpers.mjs';
import { seedLog } from './seed.ts';
import { opstartPlaatjes } from '../../scripts/opstartscherm-maten.mjs';

// Opstartscherm, statusbalk, compact logboek en opgeruimd smaakprofiel (11 nov 2026).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(6)).json; });
after(async () => { await app.close(); });

test('opstartschermen: elk plaatje bestaat in de juiste pixelmaat, blijft klein en heeft een link met de exacte schermmaat', () => {
  const html = fs.readFileSync(path.join(ROOT, 'app3/index.html'), 'utf8');
  const plaatjes = opstartPlaatjes();
  assert.ok(plaatjes.length >= 20);
  const media = new Set();
  for (const p of plaatjes) {
    const file = path.join(ROOT, 'icons', p.file);
    assert.ok(fs.existsSync(file), `${p.file} ontbreekt (node scripts/maak-opstartschermen.mjs)`);
    const b = fs.readFileSync(file);
    assert.equal(b.subarray(1, 4).toString(), 'PNG');
    assert.equal(b.readUInt32BE(16), p.w, `${p.file}: breedte`);
    assert.equal(b.readUInt32BE(20), p.h, `${p.file}: hoogte`);
    assert.ok(b.length < 250_000, `${p.file} is ${Math.round(b.length / 1024)} kB`);
    assert.ok(html.includes(`href="icons/${p.file}" media="${p.media}"`), `index.html mist de link voor ${p.file}`);
    assert.equal(media.has(p.media), false, `dubbele mediaquery ${p.media}`); media.add(p.media);
  }
  // de iPhone van Jelle (390 x 844 punten, drievoudig) staat erbij
  assert.ok(plaatjes.some(p => p.w === 1170 && p.h === 2532));
});

test('publicatie: opstartschermen worden meegeleverd maar zitten niet in de voorraad van de service worker; statusbalk-metatags staan erin', async () => {
  const page = await app.browser.newPage();
  const r = await page.request.get(app.base + 'icons/splash/splash-1170x2532.png');
  assert.equal(r.status(), 200);
  assert.equal((await r.body()).subarray(1, 4).toString(), 'PNG');
  const sw = await (await page.request.get(app.base + 'sw.js')).text();
  assert.equal(sw.includes('icons/splash'), false, 'niet in de precache');
  assert.equal(sw.includes('icons/icon-192.png'), true, 'gewone iconen wel');
  await page.goto(app.base);
  for (const [n, v] of [['apple-mobile-web-app-capable', 'yes'], ['apple-mobile-web-app-status-bar-style', 'black-translucent'], ['theme-color', '#1e3128']])
    assert.equal(await page.locator(`meta[name="${n}"]`).getAttribute('content'), v, n);
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor), 'rgb(30, 49, 40)', 'html heeft de kleur van de bovenkant van de pagina');
  await page.waitForSelector('.main h1');
  assert.equal(await page.locator('.boot').count(), 0, 'het opstartplaatje maakt plaats voor de app');
  await page.close();
});

test('logboek compact: lage rijen en een smaakregel van één regel; "Nog te proeven" als label rechts', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/logboek'); await page.waitForSelector('.logrow');
  const hs = await page.locator('.logrow').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
  assert.ok(hs.every(h => h <= 112), `rijen zijn te hoog: ${hs.join(', ')}`);
  const taste = page.locator('.logrow small.taste').first();
  if (await taste.count()) assert.equal(await taste.evaluate(e => getComputedStyle(e).whiteSpace), 'nowrap');
  assert.ok(await page.locator('.logrow .logdate i').first().innerText().then(t => /^\d\d:\d\d$/.test(t)), 'de tijd staat in het datumblok');
  await page.close();
});

test('smaakprofiel opgeruimd: groepen met oordeel als kaart met pil, groepen zonder oordeel ingeklapt', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/meer/profiel'); await page.waitForSelector('.meertiles');
  if (await page.locator('ul.sens').count()) {
    assert.ok(await page.locator('ul.sens .senshead .tag').count() >= 1);
    assert.doesNotMatch(await page.locator('ul.sens').innerText(), /0 van 0 aangevinkt/);
  }
  const d = page.locator('details.sens-empty');
  assert.equal(await d.count(), 1);
  assert.equal(await d.evaluate(e => e.open), false, 'ingeklapt');
  assert.match(await d.locator('summary').innerText(), /nog zonder oordeel/);
  await page.close();
});
