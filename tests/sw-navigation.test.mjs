// De service worker serveert de app-shell alleen voor de app zelf. Losse pagina's naast de app
// (toestelcheck.html, tokengenerator.html) moeten naar het netwerk, ook op een toestel waar de app
// al is geïnstalleerd; anders toont elke pagina op dit adres de app.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadSw(){
  const listeners = {};
  const self = {
    location: { origin: 'https://app.example' },
    addEventListener: (type, fn) => { listeners[type] = fn; },
    skipWaiting: () => {}, clients: { claim: () => {}, matchAll: async () => [] }
  };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'), { self, caches: { open: async () => ({ match: async () => ({ ok: true }), put: async () => {}, add: async () => {} }) }, fetch: async () => ({}), Request: class {}, URL, AbortController, setTimeout, clearTimeout, Promise, console });
  return listeners;
}
function navigate(url){
  const l = loadSw();
  let responded = false;
  l.fetch({ request: { method: 'GET', mode: 'navigate', url }, respondWith: (p) => { responded = true; Promise.resolve(p).catch(() => {}); }, waitUntil: (p) => { Promise.resolve(p).catch(() => {}); } });
  return responded;
}

test('de service worker pakt de app (hoofdmap en index.html) wel, losse pagina\'s niet', () => {
  assert.equal(navigate('https://app.example/'), true);
  assert.equal(navigate('https://app.example/index.html'), true);
  assert.equal(navigate('https://app.example/BrewConsole/'), true);
  assert.equal(navigate('https://app.example/tokengenerator.html'), false);
  assert.equal(navigate('https://app.example/toestelcheck.html'), false);
  assert.equal(navigate('https://app.example/ergens/pagina.html'), false);
});
test('een andere herkomst en niet-GET-verzoeken blijven buiten de worker', () => {
  assert.equal(navigate('https://elders.example/'), false);
  const l = loadSw();
  let responded = false;
  l.fetch({ request: { method: 'POST', mode: 'navigate', url: 'https://app.example/' }, respondWith: (p) => { responded = true; Promise.resolve(p).catch(() => {}); }, waitUntil: () => {} });
  assert.equal(responded, false);
});
