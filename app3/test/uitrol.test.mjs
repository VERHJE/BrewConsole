import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Audit 15 nov 2026, P2-01: bij een zip-upload leest Netlify netlify.toml niet. Omleidingen en headers moeten daarom in
// de publicatiemap staan, en op /app3/ (het adres tot 6 nov) moet een opruim-worker staan voor oude installaties.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('publicatie: _redirects, _headers en een opruim-worker op /app3/, buiten de voorraad van de worker', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'uitrol-'));
  try {
    execFileSync('node', [path.join(ROOT, 'scripts/build-app3.mjs'), out, '--root'], { stdio: 'pipe' });
    const redirects = fs.readFileSync(path.join(out, '_redirects'), 'utf8');
    assert.match(redirects, /^\/app3\/\*\s+\/:splat\s+301$/m, '/app3/… gaat naar /…');
    assert.match(redirects, /^\/app3\s+\/\s+301$/m, '/app3 zonder schuine streep ook');
    assert.ok(!/\s!\s*$|301!/m.test(redirects), 'geen geforceerde omleiding: het bestand /app3/sw.js moet winnen');

    const headers = fs.readFileSync(path.join(out, '_headers'), 'utf8');
    for (const p of ['/', '/index.html', '/sw.js', '/oud/sw.js', '/app3/sw.js']) {
      assert.match(headers, new RegExp(`^${p.replace(/[/.]/g, '\\$&')}\\n  Cache-Control: no-cache$`, 'm'), `no-cache voor ${p}`);
    }

    // De opruim-worker op /app3/ is dezelfde als op /oud/ en doet zijn werk.
    const cleanup = fs.readFileSync(path.join(out, 'app3/sw.js'), 'utf8');
    assert.equal(cleanup, fs.readFileSync(path.join(out, 'oud/sw.js'), 'utf8'));
    const log = [];
    const listeners = {};
    vm.runInNewContext(cleanup, {
      self: {
        addEventListener: (n, f) => { listeners[n] = f; }, skipWaiting: () => log.push('skip'),
        registration: { unregister: async () => { log.push('unregister'); } },
        clients: { matchAll: async () => [{ url: 'x', navigate: () => log.push('navigate') }] }
      },
      caches: { keys: async () => ['oud-app3'], delete: async k => { log.push('del:' + k); } }
    });
    listeners.install();
    let done;
    listeners.activate({ waitUntil: p => { done = p; } });
    await done;
    assert.deepEqual(log, ['skip', 'del:oud-app3', 'unregister', 'navigate']);

    // Niets hiervan in de voorraad van de echte worker: Netlify serveert _redirects en _headers niet (404 zou de installatie breken).
    const sw = fs.readFileSync(path.join(out, 'sw.js'), 'utf8');
    for (const f of ['_redirects', '_headers', 'app3/sw.js']) assert.ok(!sw.includes(`"${f}"`), `${f} niet in de voorraad`);
    // De app zelf staat niet meer onder /app3/.
    assert.deepEqual(fs.readdirSync(path.join(out, 'app3')), ['sw.js']);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('netlify.toml herhaalt de omleidingen en headers niet (één bron: de build)', () => {
  const toml = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8').replace(/^#.*$/gm, '');
  assert.ok(!/\[\[redirects\]\]|\[\[headers\]\]/.test(toml));
  assert.match(toml, /publish = "dist"/);
});
