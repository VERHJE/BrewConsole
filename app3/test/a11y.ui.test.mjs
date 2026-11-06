import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { startApp, brewToEnd } from './helpers.mjs';

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let app;
before(async () => { app = await startApp(); });
after(async () => { await app.close(); });

async function violations(page) {
  await page.evaluate(axeSource);
  const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
  assert.ok(r.passes.length > 10, 'axe moet echt regels hebben uitgevoerd');
  return r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
}

for (const scheme of ['light', 'dark']) {
  test(`toegankelijkheid (${scheme}): geen axe-overtredingen op de hoofdschermen`, async () => {
    const page = await app.browser.newPage({ colorScheme: scheme });
    await brewToEnd(page, app.base, 'Axezak'); // laat de pagina op 'Proeven' staan
    const seen = [];
    seen.push(['proeven stap 1', await violations(page)]);
    for (const [name, hash] of [['zetten', '#/zetten'], ['zakken', '#/zakken'], ['zak toevoegen', '#/zakken/nieuw'], ['logboek', '#/logboek'], ['meer', '#/meer'], ['profiel', '#/meer/profiel'], ['molen', '#/meer/molen'], ['gegevens', '#/meer/gegevens'], ['sync', '#/meer/sync'], ['water', '#/meer/water'], ['voorkeuren', '#/meer/voorkeuren']]) {
      await page.goto(app.base + hash);
      await page.waitForSelector('h1');
      seen.push([name, await violations(page)]);
    }
    const bad = seen.filter(([, v]) => v.length);
    assert.deepEqual(bad, []);
    await page.close();
  });
}
