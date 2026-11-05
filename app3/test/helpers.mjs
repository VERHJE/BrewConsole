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
