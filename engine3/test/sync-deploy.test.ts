import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import worker from '../sync/worker.ts';

const read = (f: string): string => readFileSync(new URL(`../sync/${f}`, import.meta.url), 'utf8');

test('wrangler.toml: bestaand ingangsbestand, KV-binding BLOCKS met een echt id, geen plaatshouder', () => {
  const toml = read('wrangler.toml');
  const main = /^main\s*=\s*"([^"]+)"/m.exec(toml)?.[1];
  assert.equal(main, 'worker.ts');
  assert.ok(existsSync(new URL(`../sync/${main}`, import.meta.url)));
  assert.match(toml, /\[\[kv_namespaces\]\]\s*\n(?:#[^\n]*\n)*binding = "BLOCKS"\s*\nid = "[0-9a-f]{32}"/);
  assert.ok(!/VERVANG/.test(toml), 'geen plaatshouder-id');
  assert.match(toml, /^ALLOW_ORIGIN\s*=\s*"https:\/\/[^"/]+"/m);
});
test('engine3/sync/package.json: alleen wrangler, exact vastgezet, voor Workers Builds met root directory engine3/sync', () => {
  const pkg = JSON.parse(read('package.json')) as { private: boolean; devDependencies: Record<string, string>; dependencies?: unknown };
  assert.equal(pkg.private, true);
  assert.deepEqual(Object.keys(pkg.devDependencies), ['wrangler']);
  assert.match(pkg.devDependencies['wrangler']!, /^\d+\.\d+\.\d+$/);
  assert.equal(pkg.dependencies, undefined);
  assert.ok(existsSync(new URL('../sync/package-lock.json', import.meta.url)));
});
test('de Worker-ingang heeft een fetch-handler en geeft 401 zonder token', async () => {
  assert.equal(typeof worker.fetch, 'function');
  const env = { BLOCKS: { get: async () => null, put: async () => {}, delete: async () => {}, list: async () => ({ keys: [], list_complete: true }) }, TOKEN_HASHES: 'a'.repeat(64), ALLOW_ORIGIN: 'https://app.example' };
  const res = await worker.fetch(new Request('https://x.example/meta'), env);
  assert.equal(res.status, 401);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://app.example');
});
