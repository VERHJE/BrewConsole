// Gedeeld door de schermtests: bouwt app3 naar een tijdelijke map, serveert hem en start Chromium.
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIXED = '/opt/pw-browsers/chromium';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };

export async function startApp() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'app3-'));
  execFileSync('node', [path.join(ROOT, 'scripts/build-app3.mjs'), out], { stdio: 'pipe' });
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x').pathname;
    const file = path.join(out, u.endsWith('/') ? u + 'index.html' : u);
    if (!file.startsWith(out) || !fs.existsSync(file)) { res.writeHead(404).end('niet gevonden'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' }).end(fs.readFileSync(file));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/app3/`;
  const browser = await chromium.launch({ executablePath: fs.existsSync(FIXED) ? FIXED : undefined, args: ['--no-sandbox'] });
  return { base, browser, async close() { await browser.close(); server.close(); fs.rmSync(out, { recursive: true, force: true }); } };
}

/** Maakt een zak, plant een zetsel en tikt het met een nagebootste klok helemaal af. Laat de pagina op 'Proeven' staan. */
export async function brewToEnd(page, base, beanName) {
  await page.goto(base + '#/zakken/nieuw');
  await page.fill('input[name=name]', beanName);
  await page.fill('textarea[name=paste]', 'Notes: jasmine, peach');
  await page.click('text=Herken velden');
  await page.fill('input[name=name]', beanName);
  await page.click('button:has-text("Opslaan")');
  await page.waitForSelector(`.item:has-text("${beanName}")`);
  await page.goto(base + '#/zetten');
  await page.selectOption('select[name=bean]', { label: beanName });
  await page.click('button:has-text("Start zetsel")');
  await page.waitForSelector('.timer .clock');
  await page.clock.install({ time: new Date('2026-11-05T12:00:00Z') });
  await page.click('button:has-text("Start")');
  for (let i = 0; i < 14; i++) {
    if (await page.locator('a:has-text("Proeven")').count()) break;
    await page.clock.fastForward(40_000);
    const finish = page.locator('button:has-text("Alles doorgelopen")');
    if (await finish.count()) { await finish.click(); break; }
    const erdoor = page.locator('button:text-is("Erdoor")');
    if (await erdoor.count()) await erdoor.click();
  }
  await page.click('a:has-text("Proeven")');
  await page.waitForSelector('.progress');
}

/** Zet een logboek met koppen in de app via Meer → Gegevens (zelfde route als een echte gebruiker). */
export async function importLog(page, base, json) {
  await page.goto(base + '#/meer/gegevens');
  await page.setInputFiles('input[type=file]', { name: 'seed.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  await page.click('button:has-text("toevoegen")');
  await page.waitForSelector('.banner:has-text("nieuwe gebeurtenissen toegevoegd")');
}
