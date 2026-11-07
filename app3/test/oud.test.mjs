import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('publicatie: /oud/ is een korte melding met een opruim-worker; de app zelf verwijst nergens meer naar de oude app', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'oud-'));
  execFileSync('node', [path.join(ROOT, 'scripts/build-app3.mjs'), out, '--root'], { stdio: 'pipe' });
  const page = fs.readFileSync(path.join(out, 'oud/index.html'), 'utf8');
  assert.match(page, /De oude versie is opgeruimd/);
  assert.match(page, /href="\.\.\/"/);
  // de oude app staat er niet meer
  assert.equal(fs.existsSync(path.join(out, 'oud/photos')), false);
  assert.equal(fs.existsSync(path.join(out, 'oud/toestelcheck.html')), false);
  // de nieuwe app staat op de wortel en kent /oud/ alleen als uitzondering in de worker
  const index = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  assert.ok(!index.includes('oud/'));
  const sw = fs.readFileSync(path.join(out, 'sw.js'), 'utf8');
  assert.ok(!/"oud\//.test(sw), 'oud/ staat niet in de voorgecachete lijst');
  // de opruim-worker wist caches en haalt zichzelf weg
  const log = [];
  const listeners = {};
  const ctx = {
    self: {
      addEventListener: (n, f) => { listeners[n] = f; }, skipWaiting: () => log.push('skip'),
      registration: { unregister: async () => { log.push('unregister'); } },
      clients: { matchAll: async () => [{ url: 'x', navigate: () => log.push('navigate') }] }
    },
    caches: { keys: async () => ['a', 'b'], delete: async k => { log.push('del:' + k); } }
  };
  vm.runInNewContext(fs.readFileSync(path.join(out, 'oud/sw.js'), 'utf8'), ctx);
  return (async () => {
    listeners.install();
    let done;
    listeners.activate({ waitUntil: p => { done = p; } });
    await done;
    assert.deepEqual(log, ['skip', 'del:a', 'del:b', 'unregister', 'navigate']);
    fs.rmSync(out, { recursive: true, force: true });
  })();
});
