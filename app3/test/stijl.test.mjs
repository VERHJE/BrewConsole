import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Review 17 nov 2026, C4: de stijl staat in meerdere bestanden die de build in vaste volgorde aan elkaar plakt. Een bestand dat
// niet in de lijst staat, zou stilletjes ontbreken; een naam in de lijst zonder bestand breekt de build.
test('elk stijlbestand staat in STYLE_FILES van de build, en andersom', () => {
  const build = fs.readFileSync(new URL('../../scripts/build-app3.mjs', import.meta.url), 'utf8');
  const list = /STYLE_FILES = \[([^\]]+)\]/.exec(build)?.[1];
  assert.ok(list, 'STYLE_FILES gevonden');
  const named = [...list.matchAll(/'([^']+\.css)'/g)].map(m => m[1]);
  const onDisk = fs.readdirSync(new URL('../styles/', import.meta.url)).filter(f => f.endsWith('.css'));
  assert.deepEqual([...named].sort(), [...onDisk].sort());
  assert.equal(new Set(named).size, named.length, 'geen dubbele namen');
  assert.deepEqual(named.slice(0, 3), ['fonts.css', 'tokens.css', 'basis.css'], 'lettertypen en tokens eerst, dan de basis');
});
