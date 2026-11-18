import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { webcrypto } from 'node:crypto';
import { startApp } from './helpers.mjs';
import { handleRequest, MemoryStore, sha256Hex } from '../../engine3/sync/server.ts';

// Review 17 nov 2026, W1: synchroniseren gebeurt vanzelf, zonder de knop. Twee toestellen en een echte (lokale) sync-server.
const TOKEN = 'token-voor-de-test-0123456789';
let app, server, url, env;

before(async () => {
  app = await startApp();
  env = { store: new MemoryStore(), photos: new MemoryStore(), tokenHashes: [await sha256Hex(webcrypto.subtle, TOKEN)], subtle: webcrypto.subtle, allowOrigin: '*' };
  server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length && req.method !== 'GET' && req.method !== 'DELETE' ? Buffer.concat(chunks) : undefined;
    const r = await handleRequest(new Request(`http://127.0.0.1${req.url}`, { method: req.method, headers: req.headers, body }), env);
    res.writeHead(r.status, Object.fromEntries(r.headers)).end(Buffer.from(await r.arrayBuffer()));
  });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  url = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server.close(); await app.close(); });

const blockCount = async () => (await env.store.list(null, 500)).ids.length;
const until = async (f, what) => { for (let i = 0; i < 300; i++) { if (await f()) return; await new Promise(r => setTimeout(r, 100)); } throw new Error(`te lang gewacht op: ${what}`); };

async function connectDevice(page) {
  await page.goto(app.base + '#/meer/sync');
  await page.fill('input[name=url]', url);
  await page.fill('input[name=token]', TOKEN);
  await page.fill('input[name=phrase]', 'correct paard batterij');
  await page.click('button:has-text("Verbinden")');
  await page.waitForSelector('.banner:has-text("Gelukt")', { timeout: 60_000 });
}

async function addBean(page, name) {
  await page.goto(app.base + '#/zakken/nieuw');
  await page.fill('input[name=name]', name);
  await page.click('button:has-text("Opslaan")');
  await page.waitForSelector(`.item:has-text("${name}")`);
}

test('automatisch: een nieuwe zak gaat vanzelf naar de server, en een ander toestel haalt hem op bij openen', async () => {
  const ctxA = await app.browser.newContext(); const ctxB = await app.browser.newContext();
  const a = await ctxA.newPage(); const b = await ctxB.newPage();
  const errors = [];
  for (const p of [a, b]) p.on('pageerror', e => errors.push(e.message));
  await a.clock.install(); // de rustpauze van 15 s wordt hieronder vooruitgespoeld

  // A verbindt eerst, en voegt pas daarna een zak toe: die kan alleen automatisch op de server komen
  await connectDevice(a);
  assert.match(await a.locator('.panel').first().innerText(), /Synchroniseert vanzelf/);
  const n0 = await blockCount();
  await addBean(a, 'Autozak');
  await a.clock.fastForward(14_000);
  await new Promise(r => setTimeout(r, 500));
  assert.equal(await blockCount(), n0, 'binnen de rustpauze nog niets verstuurd');
  await a.clock.fastForward(2_000);
  await until(async () => (await blockCount()) > n0, 'het blok van A');

  // B verbindt en heeft de zak van A, zonder dat A op de knop drukte
  await connectDevice(b);
  await b.goto(app.base + '#/zakken');
  await b.waitForSelector('.item:has-text("Autozak")');

  // A voegt nog een zak toe; B haalt hem op door de app opnieuw te openen
  const n1 = await blockCount();
  await addBean(a, 'Tweede autozak');
  await a.clock.fastForward(16_000);
  await until(async () => (await blockCount()) > n1, 'het tweede blok van A');
  await b.reload();
  await b.waitForSelector('.item:has-text("Tweede autozak")', { timeout: 30_000 });

  // Meer toont de stand
  await b.goto(app.base + '#/meer');
  await b.waitForFunction(() => /Verbonden · laatst/.test(document.querySelector('a[href="#/meer/sync"]')?.textContent ?? ''));
  assert.deepEqual(errors, []);
  await ctxA.close(); await ctxB.close();
});
