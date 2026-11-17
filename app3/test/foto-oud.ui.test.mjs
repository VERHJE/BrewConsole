import { test, before, after } from 'node:test';
import QRCode from 'qrcode';
import { startApp } from './helpers.mjs';

// Tot 17 nov 2026 stond een foto als Blob in IndexedDB; sindsdien als bytes met type (core/photos.ts). Een oud record moet nog
// getoond worden. Deze test staat apart van foto.ui.test.mjs omdat hij niet in WebKit kan draaien: WebKit kan in een
// Playwright-sessie (een privévenster) geen Blob in IndexedDB zetten, dus zo'n oud record bestaat daar niet.
let app;
before(async () => { app = await startApp(); });
after(async () => { await app.close(); });

test('een foto die nog als Blob in de database staat (van vóór 17 nov 2026) wordt nog getoond', async () => {
  const png = await QRCode.toBuffer('oud', { margin: 4, scale: 12 });
  const page = await app.browser.newPage();
  await page.goto(app.base + '#/zakken/nieuw');
  await page.fill('input[name=name]', 'Oudezak');
  await page.click('button:has-text("Opslaan")');
  await page.waitForSelector('ul.list .item strong:has-text("Oudezak")');
  const id = decodeURIComponent((await page.locator('.item:has-text("Oudezak")').getAttribute('href')).split('/').pop());
  // zoals de app het tot 17 nov opsloeg: de Blob zelf
  await page.evaluate(async ([id, bytes]) => {
    const db = await new Promise((ok, no) => { const r = indexedDB.open('brewconsole-app3-photos', 1); r.onupgradeneeded = () => r.result.createObjectStore('photos'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
    await new Promise((ok, no) => { const tx = db.transaction('photos', 'readwrite'); tx.objectStore('photos').put(new Blob([new Uint8Array(bytes)], { type: 'image/png' }), id); tx.oncomplete = ok; tx.onerror = () => no(tx.error); });
    db.close();
  }, [id, [...png]]);
  await page.reload();
  await page.waitForSelector('.item:has-text("Oudezak") .thumb img.photo');
  await page.close();
});
