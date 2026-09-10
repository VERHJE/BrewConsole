// NIEUW (Implementatieplan v3.0, P2 §21/§24 — "Golden fixtures: stable numerical
// regression"): permanente, in git meegecommitte versie van de _baselines_v3/-sweep.
// Waar die map ad-hoc snapshot-bestanden waren die alleen handmatig, per taak, tegen
// elkaar gediffed werden, faalt DEZE test de CI-run zelf zodra een recept ongemerkt
// verandert — zonder dat iemand met een los script hoeft te vergelijken.
//
// tests/fixtures/golden-recipes.txt is het "gouden" bestand: elke regel is één
// methode/profiel/roast/sterkte-combinatie, in exact hetzelfde ; -gescheiden formaat als
// tests/_baseline.mjs. Een AANGEKONDIGDE, bedoelde receptwijziging (zoals de C3S Pro
// 13-16 -> 15-17-rangewijziging deze ronde) vereist dat iemand dit bestand bewust
// regenereert (zie de opdracht in het commentaar onderaan) — precies het punt van een
// golden-fixture-laag: stilzwijgende drift wordt een falende test, geen onopgemerkte diff.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadApp } from './load-app.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_PATH = path.resolve(__dirname, 'fixtures', 'golden-recipes.txt');
const COLUMNS = ['method','profile','roast','strength','dose','ratioText','temp','totalTime','technique','steps','grindStartingPoint','grindStartingRange'];

function generateCurrentSweep(api){
  const rows = [];
  for (const m of ['v60','chemex']){
    for (const p of Object.keys(api.ENGINE_PROFILE_MAP)){
      const only = api.PROFILE_INFO[p].methodOnly;
      if (only && only !== m) continue;
      for (const roast of ['light','medium','dark']){
        for (const st of [-1,0,1]){
          const vol = m === 'v60' ? 300 : 600;
          const r = api.computeRecipe(m, roast, p, vol, 'washed', false, 10, null, false, false, null, st);
          const gsr = r.grindStartingRange ? `${r.grindStartingRange.clicksMin}-${r.grindStartingRange.clicksMax}` : '';
          rows.push([m,p,roast,st,r.dose,r.ratioText,r.temp,r.totalTime,r.technique,
                     r.steps.map(s=>`${s.t}:${s.add}`).join('|'),
                     r.grindStartingPoint,gsr].join(';'));
        }
      }
    }
  }
  return rows;
}

describe('Golden fixtures — stable numerical regression (Implementatieplan v3.0, P2)', () => {
  const { api } = loadApp();
  const golden = readFileSync(GOLDEN_PATH, 'utf8').trim().split('\n');
  const current = generateCurrentSweep(api);

  test('het aantal gegenereerde recepten in de sweep is ongewijzigd (geen profiel stilzwijgend verschenen/verdwenen)', () => {
    assert.equal(current.length, golden.length,
      `Sweep-grootte veranderd (${current.length} vs. golden ${golden.length}) — een profiel/methode-combinatie is toegevoegd of verdwenen. ` +
      `Als dat bedoeld is: regenereer tests/fixtures/golden-recipes.txt met "node tests/_baseline.mjs > tests/fixtures/golden-recipes.txt".`);
  });

  test('elk recept in de sweep is byte-voor-byte identiek aan het gouden bestand', () => {
    const n = Math.min(current.length, golden.length);
    const mismatches = [];
    for (let i = 0; i < n; i++){
      if (current[i] !== golden[i]){
        const curFields = current[i].split(';');
        const goldFields = golden[i].split(';');
        const changedCols = COLUMNS.filter((_, idx) => curFields[idx] !== goldFields[idx]);
        mismatches.push(`  regel ${i+1} [${changedCols.join(', ')}]:\n    golden : ${golden[i]}\n    huidig : ${current[i]}`);
      }
    }
    assert.equal(mismatches.length, 0,
      `${mismatches.length} recept(en) wijken af van het gouden bestand — als dit een bedoelde wijziging is ` +
      `(met provenance gedocumenteerd, zoals het plan §25 eist), regenereer het gouden bestand met ` +
      `"node tests/_baseline.mjs > tests/fixtures/golden-recipes.txt" en commit die wijziging expliciet. ` +
      `Als dit NIET bedoeld is, is dit een regressie.\n${mismatches.join('\n')}`);
  });
});
