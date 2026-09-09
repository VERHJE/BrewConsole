// NIEUW (vervolgplan v2.3 — bijlage A.6, bevinding F): bewaakt dat de service worker
// daadwerkelijk registreert. Moet over http draaien (localhost) — een service worker
// bestaat niet op file://, dus dit bestand start zijn eigen lichte webserver in plaats
// van de app zoals de andere smoketests vanaf schijf te laden.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const FIXED_CHROMIUM_PATH = '/opt/pw-browsers/chromium';
const executablePath = fs.existsSync(FIXED_CHROMIUM_PATH) ? FIXED_CHROMIUM_PATH : undefined;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

function startServer(){
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const reqPath = req.url === '/' ? '/brewconsole_v2_2.html' : req.url;
      const filePath = path.join(ROOT, reqPath);
      fs.readFile(filePath, (err, data) => {
        if (err){ res.writeHead(404); res.end('not found'); return; }
        const ext = path.extname(filePath);
        // Netlify default: public, max-age=0, must-revalidate (bijlage A.4) — nagebootst
        // zodat deze test ook de headeraanname dekt, niet alleen de registratie zelf.
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=0, must-revalidate' });
        res.end(data);
      });
    });
    server.listen(0, 'localhost', () => resolve(server));
  });
}

describe('Service worker registratie (bijlage A — bevinding F, opgelost)', () => {
  let server, browser, base;

  before(async () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'sw.js')), 'sw.js moet naast brewconsole_v2_2.html staan');
    server = await startServer();
    base = `http://localhost:${server.address().port}/`;
    browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  });

  after(async () => {
    if (browser) await browser.close();
    if (server) server.close();
  });

  test('registreert zonder fout, en de pagina wordt na herladen gecontroleerd', async () => {
    const page = await browser.newPage();
    const warnings = [];
    page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') warnings.push(m.text()); });
    page.on('pageerror', e => warnings.push('PAGEERROR: ' + e.message));

    await page.goto(base, { waitUntil: 'load' });
    await page.evaluate(() => navigator.serviceWorker.ready);
    const regs = await page.evaluate(async () =>
      (await navigator.serviceWorker.getRegistrations()).map(r => r.active && r.active.scriptURL));
    assert.equal(regs.length, 1, `verwacht precies 1 registratie, kreeg ${JSON.stringify(regs)}`);
    assert.ok(regs[0].endsWith('/sw.js'), `registratie moet naar sw.js wijzen, kreeg ${regs[0]}`);

    await page.reload({ waitUntil: 'load' });
    const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
    assert.ok(controlled, 'pagina moet na herladen door de service worker gecontroleerd worden');

    const cacheHasShell = await page.evaluate(async () => {
      const names = await caches.keys();
      for (const name of names){
        const cache = await caches.open(name);
        const match = await cache.match('/');
        if (match) return true;
      }
      return false;
    });
    assert.ok(cacheHasShell, 'de cache moet de app-shell (navigatie-sleutel "/") bevatten');

    assert.deepEqual(warnings, [], 'geen console-warnings/errors of pagefouten tijdens registratie');
    await page.close();
  });

  test('koude start met het netwerk volledig uit rendert de app vanaf de cache', async () => {
    // Aparte context: eerst online opwarmen (install/activate), dan offline een nieuwe
    // pagina laden — precies het scenario uit bijlage A.7, alleen hier geautomatiseerd
    // i.p.v. met de hand op een fysiek toestel.
    const ctx = await browser.newContext();
    const warm = await ctx.newPage();
    await warm.goto(base, { waitUntil: 'load' });
    await warm.evaluate(() => navigator.serviceWorker.ready);
    await warm.close();

    await ctx.setOffline(true);
    const cold = await ctx.newPage();
    const errors = [];
    cold.on('pageerror', e => errors.push(e.message));
    const response = await cold.goto(base, { waitUntil: 'load' });
    assert.equal(response.status(), 200, 'offline koude start moet status 200 geven (uit de cache)');
    const methodButtons = await cold.locator('#method-grid [data-method]').count();
    assert.ok(methodButtons > 0, 'de app moet offline renderen met de methodeknoppen zichtbaar');
    assert.deepEqual(errors, [], 'geen onafgevangen fouten tijdens de offline koude start');
    await cold.close();
    await ctx.close();
  });

  test('na een nieuwe "deploy" (gewijzigde HTML) krijgt een online start meteen de nieuwe versie (netwerk-eerst)', async () => {
    // Zet een tweede server op die een licht gewijzigde kopie serveert, om de
    // netwerk-eerst-strategie te bewijzen zonder de echte app te hoeven aanpassen.
    const html = fs.readFileSync(path.join(ROOT, 'brewconsole_v2_2.html'), 'utf8');
    const marker = '<!--DEPLOY-MARKER-->';
    const patched = html.replace('<body>', '<body>' + marker);
    const tmpDir = fs.mkdtempSync('/tmp/sw-deploy-');
    fs.writeFileSync(path.join(tmpDir, 'index.html'), patched);
    fs.copyFileSync(path.join(ROOT, 'sw.js'), path.join(tmpDir, 'sw.js'));

    const server2 = http.createServer((req, res) => {
      const reqPath = req.url === '/' ? '/index.html' : req.url;
      const filePath = path.join(tmpDir, reqPath);
      fs.readFile(filePath, (err, data) => {
        if (err){ res.writeHead(404); res.end('not found'); return; }
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=0, must-revalidate' });
        res.end(data);
      });
    });
    await new Promise(r => server2.listen(0, 'localhost', r));
    const base2 = `http://localhost:${server2.address().port}/`;

    const ctx = await browser.newContext();
    const first = await ctx.newPage();
    await first.goto(base2, { waitUntil: 'load' });
    await first.evaluate(() => navigator.serviceWorker.ready);
    await first.close();

    // "Nieuwe deploy": wijzig het bestand op schijf, dan gewoon opnieuw online openen.
    fs.writeFileSync(path.join(tmpDir, 'index.html'), patched.replace(marker, marker + '<!--v2-->'));
    const second = await ctx.newPage();
    await second.goto(base2, { waitUntil: 'load' });
    const html2 = await second.content();
    assert.ok(html2.includes(marker + '<!--v2-->'), 'online start moet meteen de nieuwste versie tonen (netwerk-eerst), niet de gecachete');
    await second.close();
    await ctx.close();
    server2.close();
  });
});
