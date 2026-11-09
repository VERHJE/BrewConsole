import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { webcrypto } from 'node:crypto';
import QRCode from 'qrcode';
import { startApp } from './helpers.mjs';
import { handleRequest, MemoryStore, sha256Hex } from '../../engine3/sync/server.ts';

const TOKEN = 'token-voor-de-test-0123456789';
let app, server, url;

before(async () => {
  app = await startApp();
  const env = { store: new MemoryStore(), photos: new MemoryStore(), tokenHashes: [await sha256Hex(webcrypto.subtle, TOKEN)], subtle: webcrypto.subtle, allowOrigin: '*' };
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

async function connectDevice(page) {
  await page.goto(app.base + '#/meer/sync');
  await page.fill('input[name=url]', url);
  await page.fill('input[name=token]', TOKEN);
  await page.fill('input[name=phrase]', 'correct paard batterij');
  await page.click('button:has-text("Verbinden")');
}

test('foto-synchronisatie tussen twee toestellen in de echte app: maken, ophalen, verwijderen', async () => {
  const png = await QRCode.toBuffer('sync', { margin: 4, scale: 12 });
  const ctxA = await app.browser.newContext(); const ctxB = await app.browser.newContext();
  const a = await ctxA.newPage(); const b = await ctxB.newPage();
  const errors = [];
  for (const p of [a, b]) p.on('pageerror', e => errors.push(e.message));

  // toestel A: een zak met foto, dan verbinden
  await a.goto(app.base + '#/zakken/nieuw');
  await a.fill('input[name=name]', 'Syncfotozak');
  await a.setInputFiles('input[name=photo]', { name: 'zak.png', mimeType: 'image/png', buffer: png });
  await a.waitForSelector('text=Foto klaar');
  await a.click('button:has-text("Opslaan")');
  await a.waitForSelector('.thumb img.photo');
  await connectDevice(a);
  await a.waitForSelector('.banner:has-text("Foto’s: 1 verstuurd")', { timeout: 60_000 });

  // toestel B: verbinden haalt de zak én de foto op
  await connectDevice(b);
  await b.waitForSelector('.banner:has-text("Foto’s: 1 opgehaald")', { timeout: 60_000 });
  await b.goto(app.base + '#/zakken');
  await b.waitForSelector('.item:has-text("Syncfotozak") .thumb img.photo');

  // A verwijdert de foto en synchroniseert; B volgt
  await a.goto(app.base + '#/zakken');
  await a.click('.item:has-text("Syncfotozak")');
  await a.click('a:has-text("Bewerken")');
  await a.click('button:has-text("Foto verwijderen")');
  await a.click('button:has-text("Opslaan")');
  await a.waitForSelector('.thumb .bagart.label');
  await a.goto(app.base + '#/meer/sync');
  await a.click('button:has-text("Nu synchroniseren")');
  await a.waitForSelector('.banner:has-text("Foto’s: 1 verstuurd")', { timeout: 60_000 });
  await b.goto(app.base + '#/meer/sync');
  await b.click('button:has-text("Nu synchroniseren")');
  await b.waitForSelector('.banner:has-text("Foto’s: 1 verwijderd")', { timeout: 60_000 });
  await b.goto(app.base + '#/zakken');
  await b.waitForSelector('.item:has-text("Syncfotozak") .thumb .bagart.label');
  assert.equal(await b.locator('img.photo').count(), 0);
  assert.deepEqual(errors, []);
  await ctxA.close(); await ctxB.close();
});
