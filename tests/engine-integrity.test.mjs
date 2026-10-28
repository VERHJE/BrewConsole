// V7 (audit, okt 2026): de rekenkern is een gebouwde bundel zonder TypeScript-bron in deze repo
// (docs/rekenkern.md). Deze test bewaakt dat niemand hem per ongeluk wijzigt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { APP_HTML_PATH } from './load-app.mjs';

const ENGINE_SHA256 = '1b13e449b38e07ee6247dac4472cce36971f01585178c4572b9fbb66355d9430';

test('de rekenkern (eerste script na <body>) is byte voor byte de vastgelegde versie', () => {
  const html = readFileSync(APP_HTML_PATH, 'utf8');
  const body = html.indexOf('<body');
  const start = html.indexOf('<script', body);
  const end = html.indexOf('</script>', start) + '</script>'.length;
  const hash = createHash('sha256').update(html.slice(start, end), 'utf8').digest('hex');
  assert.equal(hash, ENGINE_SHA256, 'De rekenkern is gewijzigd. Zie docs/rekenkern.md voor de werkwijze.');
});

test('docs/rekenkern.md noemt dezelfde hash als deze test', () => {
  const doc = readFileSync(new URL('../docs/rekenkern.md', import.meta.url), 'utf8');
  assert.ok(doc.includes(ENGINE_SHA256));
});
