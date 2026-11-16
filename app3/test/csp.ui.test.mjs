import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import { startApp, importLog } from './helpers.mjs';
import { seedLog } from './seed.ts';

// Audit 15 nov, P3-07: de app draait onder een Content-Security-Policy (meta-tag in index.html). Alle schermtests draaien
// daardoor al onder die CSP; deze test vangt daarnaast elke schending op, op de hoofdschermen en met een foto (blob:).
let app, json, events;
before(async () => { app = await startApp(); ({ json, events } = await seedLog(3)); });
after(async () => { await app.close(); });

test('CSP: geen schendingen op de hoofdschermen; het inline script mag (hash), een vreemd script niet', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  const console_ = [];
  page.on('console', m => { if (/Content Security Policy|Refused to/i.test(m.text())) console_.push(m.text()); });
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', e => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  await importLog(page, app.base, json);
  // het inline script in <head> draait (hash klopt): het zet het lettertype vóór het tekenen
  await page.evaluate(() => localStorage.setItem('brewconsole.type', 'sans'));
  await page.reload();
  await page.waitForSelector('h1');
  assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-type')), 'sans', 'inline script geblokkeerd?');
  // foto als blob:
  await page.goto(app.base + '#/zakken/nieuw');
  await page.fill('input[name=name]', 'Fotozak');
  await page.setInputFiles('input[name=photo]', { name: 'zak.png', mimeType: 'image/png', buffer: await QRCode.toBuffer('csp', { margin: 4, scale: 8 }) });
  await page.waitForSelector('text=Foto klaar');
  await page.click('button:has-text("Opslaan")');
  await page.waitForSelector('.thumb img.photo');
  assert.ok(await page.locator('.thumb img.photo').evaluate(i => i.complete && i.naturalWidth > 0), 'foto (blob:) getekend');
  const bean = events.find(e => e.kind === 'bean.upsert').data.beanId;
  const cup = events.find(e => e.kind === 'brew.plan').data.brewId;
  for (const r of ['zetten', `zakken/${bean}`, 'logboek', `logboek/${cup}`, 'meer', 'meer/profiel', 'meer/molen', 'meer/water', 'meer/voorkeuren', 'meer/gegevens', 'meer/sync', 'meer/over', `proeven/${cup}`]) {
    await page.goto(app.base + '#/' + r);
    await page.waitForSelector('h1');
    await page.waitForTimeout(250);
  }
  // timer
  await page.goto(app.base + '#/zetten'); await page.waitForSelector('.recipe .numbers');
  await page.locator('.startbar button.primary').first().click();
  await page.waitForSelector('.timer');
  assert.deepEqual(await page.evaluate(() => window.__csp), [], 'schendingen');
  assert.deepEqual(console_, [], 'CSP-meldingen in de console');
  // en de CSP doet echt iets: een ingevoegd inline script draait niet
  const ran = await page.evaluate(() => { const s = document.createElement('script'); s.textContent = 'window.__vreemd = 1'; document.head.appendChild(s); return window.__vreemd === 1; });
  assert.equal(ran, false, 'een vreemd inline script mag niet draaien');
  await page.close();
});
