// NIEUW (Phase 0 / BC-02 — audit: onware UI-teksten). Drie teksten beloofden effecten die
// de engine niet heeft: proces "verfijnt het advies (… iets lagere temperatuur)", hoogte is
// "voor grind-advies", en het profiel "bepaalt dosis, maling en schenkschema". Deze test
// houdt die beweringen uit de UI én toetst de vervangende teksten tegen de echte engine,
// zodat een tekst niet opnieuw stilletjes gaat liegen als de engine verandert.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadApp, APP_HTML_PATH } from './load-app.mjs';

const html = readFileSync(APP_HTML_PATH, 'utf8');
const { api } = loadApp();

describe('BC-02: UI-teksten beloven geen effecten die de engine niet heeft', () => {
  const FORBIDDEN_CLAIMS = [
    [/verfijnt het advies \(verstoppingsrisico/i, 'proces zou het advies/de temperatuur verfijnen'],
    [/iets lagere temperatuur/i, 'proces zou de temperatuur verlagen'],
    [/voor grind-advies/i, 'hoogte zou het maaladvies sturen'],
    [/Bepaalt dosis, maling en schenkschema/i, 'profiel zou dosis en maling bepalen']
  ];
  for (const [re, what] of FORBIDDEN_CLAIMS){
    test(`geen claim dat ${what}`, () => {
      assert.doesNotMatch(html, re);
    });
  }

  test('de vervangende teksten staan in de UI', () => {
    assert.match(html, /Natural\/anaerobic\? Dat weegt mee in de methodekeuze \(V60 of Chemex\) en het voorgestelde profiel; dosis, maling en temperatuur veranderen er niet door\./);
    assert.match(html, /m\.a\.s\.l\. — ter info, verandert het recept niet/);
    assert.match(html, /Bepaalt vooral het schenkschema\. Dosis verschuift hooguit een paar tiende gram; temperatuur en maling volgen uit de branding\./);
  });

  test('profieltekst klopt met de engine: temperatuur en maling gelijk over profielen, dosis binnen 0,5 g', () => {
    for (const m of ['v60', 'chemex']){
      for (const roast of ['light', 'medium', 'dark']){
        const recs = Object.keys(api.ENGINE_PROFILE_MAP)
          .filter(p => !api.PROFILE_INFO[p].methodOnly || api.PROFILE_INFO[p].methodOnly === m)
          .map(p => api.computeRecipe(m, roast, p, m === 'v60' ? 300 : 600, 'washed', false, 10, null, false, false, null, 0));
        assert.equal(new Set(recs.map(r => r.temp)).size, 1, `${m}/${roast}: temperatuur verschilt per profiel`);
        assert.equal(new Set(recs.map(r => r.grindStartingPoint)).size, 1, `${m}/${roast}: maling verschilt per profiel`);
        const doses = recs.map(r => r.dose);
        const spread = Math.max(...doses) - Math.min(...doses);
        assert.ok(spread <= 0.5 + 1e-9, `${m}/${roast}: dosisverschil ${spread.toFixed(2)} g is meer dan "een paar tiende gram"`);
      }
    }
  });

  test('procestekst klopt met de engine: proces duwt de methodekeuze (natural/anaerobic → V60)', () => {
    const nat = api.computeMethodAdvice('medium', 'klassiek', 'single', 'natural', false);
    const wa = api.computeMethodAdvice('medium', 'klassiek', 'single', 'washed', false);
    assert.equal(nat.v60Score, wa.v60Score + 1);
    // Dat dosis/maling/temperatuur niet veranderen, bewaakt tests/forbidden-edges.test.mjs.
  });
});
