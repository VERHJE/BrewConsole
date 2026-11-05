import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp } from './helpers.mjs';

let app;
before(async () => { app = await startApp(); });
after(async () => { await app.close(); });

test('start: tabbalk met vier tabs, navigeren werkt, geen fouten in de console', async () => {
  const page = await app.browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(app.base);
  await page.waitForSelector('nav.tabbar');
  assert.deepEqual(await page.locator('nav.tabbar a').allInnerTexts(), ['Zetten', 'Zakken', 'Logboek', 'Meer']);
  await page.click('nav.tabbar a:has-text("Zakken")');
  await page.waitForSelector('nav.tabbar a[aria-current="page"]:has-text("Zakken")');
  assert.equal(await page.locator('h1').innerText(), 'Zakken');
  assert.deepEqual(errors, []);
  await page.close();
});

test('opslag: een gebeurtenis in IndexedDB overleeft herladen', async () => {
  const page = await app.browser.newPage();
  await page.goto(app.base);
  await page.waitForSelector('nav.tabbar');
  const n = await page.evaluate(async () => {
    const open = indexedDB.open('brewconsole-app3', 1);
    const db = await new Promise(r => { open.onsuccess = () => r(open.result); });
    const tx = db.transaction('events', 'readwrite');
    tx.objectStore('events').put({ id: 'e:test', at: 1, device: 't', v: 1, kind: 'bean.upsert', data: { beanId: 'b', fields: { name: 'Testzak' }, sources: { name: 'user' }, legacy: null } });
    await new Promise(r => { tx.oncomplete = r; });
    return 1;
  });
  assert.equal(n, 1);
  await page.reload();
  await page.waitForSelector('nav.tabbar');
  const count = await page.evaluate(async () => {
    const open = indexedDB.open('brewconsole-app3', 1);
    const db = await new Promise(r => { open.onsuccess = () => r(open.result); });
    const req = db.transaction('events').objectStore('events').count();
    return await new Promise(r => { req.onsuccess = () => r(req.result); });
  });
  assert.equal(count, 1);
  await page.close();
});

test('smal scherm: geen horizontale scroll', async () => {
  const page = await app.browser.newPage({ viewport: { width: 320, height: 640 } });
  await page.goto(app.base);
  await page.waitForSelector('nav.tabbar');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.close();
});
