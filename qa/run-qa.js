// QA-verzamelscript: draait de volledige testsuite (pure-logic + Playwright-smoke +
// service-worker-registratie) als één commando, met één duidelijke exitcode voor CI.
//
// Chromium: dit script zet ZELF geen executablePath of PLAYWRIGHT_BROWSERS_PATH — dat is
// bewust. tests/kernflow.smoke.test.mjs en tests/sw-registration.test.mjs vallen al terug
// op Playwright's eigen, door "npx playwright install chromium" beheerde browser zodra hun
// vaste sandbox-pad (/opt/pw-browsers/chromium) niet bestaat. Op een normale CI-runner
// bestaat dat pad niet, dus wordt automatisch de door Playwright gedownloade Chromium
// gebruikt — geen aparte CI-tak in de testcode nodig.
//
// Gebruik: node qa/run-qa.js   (vanuit de repo-root, na `npm ci` + `npx playwright install
// chromium`). Ook aan te roepen als `npm run qa`.

import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const testsDir = path.join(repoRoot, 'tests');

const testFiles = readdirSync(testsDir)
  .filter((f) => f.endsWith('.test.mjs'))
  .sort()
  .map((f) => path.join('tests', f));

if (testFiles.length === 0) {
  console.error(`Geen *.test.mjs-bestanden gevonden in ${testsDir} — niets om te draaien.`);
  process.exit(1);
}

console.log('QA-suite — Brew Console');
console.log('Testbestanden:');
for (const f of testFiles) console.log(`  - ${f}`);
console.log('');

const result = spawnSync(process.execPath, ['--test', ...testFiles], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: process.env
});

if (result.error) {
  console.error('Kon de testsuite niet starten:', result.error.message);
  process.exit(1);
}

// signal !== null betekent dat het proces is gekilld (bv. timeout/OOM in CI) — dat telt
// ook als falen, ook als het geen numerieke exitcode heeft.
if (result.signal){
  console.error(`Testsuite afgebroken door signaal ${result.signal}.`);
  process.exit(1);
}

process.exit(result.status ?? 1);
