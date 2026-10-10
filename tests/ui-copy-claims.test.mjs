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
    assert.match(html, /Bepaalt het gietschema en wat de proefkaart straks vraagt\. Dosis verschuift hooguit een paar tiende gram; temperatuur en maling volgen uit de branding \(een heel kort schema start één klik fijner\)\./);
  });

  test('profieltekst klopt met de engine: temperatuur en maling gelijk over profielen, dosis binnen 0,5 g', () => {
    for (const m of ['v60', 'chemex']){
      for (const roast of ['light', 'medium', 'dark']){
        const recs = Object.keys(api.ENGINE_PROFILE_MAP)
          .filter(p => !api.PROFILE_INFO[p].methodOnly || api.PROFILE_INFO[p].methodOnly === m)
          .map(p => api.computeRecipe(m, roast, p, m === 'v60' ? 300 : 600, 'washed', false, 10, null, false, false, null, 0));
        assert.equal(new Set(recs.map(r => r.temp)).size, 1, `${m}/${roast}: temperatuur verschilt per profiel`);
        // BC-11: alleen een heel kort schema (≤ SHORT_CONTACT_MAX_SEC) start één klik fijner — precies wat de tekst zegt.
        const normal = recs.filter(r => r.totalTime > 120);
        assert.equal(new Set(normal.map(r => r.grindStartingPoint)).size, 1, `${m}/${roast}: maling verschilt per profiel`);
        for (const r of recs.filter(r => r.totalTime <= 120 && r.grindStartingPoint != null)){
          assert.equal(r.grindStartingPoint, normal[0].grindStartingPoint - 1, `${m}/${roast}: kort schema hoort precies één klik fijner te starten`);
        }
        const doses = recs.map(r => r.dose);
        const spread = Math.max(...doses) - Math.min(...doses);
        assert.ok(spread <= 0.5 + 1e-9, `${m}/${roast}: dosisverschil ${spread.toFixed(2)} g is meer dan "een paar tiende gram"`);
      }
    }
  });

  // Review R-05: twee teksten beloofden een "Hedrick-methode" terwijl de engine Hedrick nooit
  // maakt (die profielen krijgen het basisrecept). Een profielbeschrijving mag alleen een
  // bronnaam noemen als de engine voor dat profiel ook echt dat naam-gebonden schema maakt.
  test('profielbeschrijvingen noemen geen bron waarvan de engine het schema niet maakt', () => {
    assert.doesNotMatch(html, /Hedrick-methode|Naar Hedrick/);
    const NAMES = ['Hedrick', 'Kasuya', 'Hoffmann', 'Rao', 'Perger', 'April'];
    for (const [key, info] of Object.entries(api.PROFILE_INFO)){
      const named = NAMES.filter(n => info.desc.includes(n));
      if (!named.length) continue;
      const methods = info.methodOnly ? [info.methodOnly] : ['v60', 'chemex'];
      const ok = methods.some(m => {
        const r = api.computeRecipe(m, 'medium', key, m === 'v60' ? 300 : 600, 'washed', false, 10, null, false, false, null, 0);
        return r.hasNamedOverlay && named.every(n => (r.technique + ' ' + r.author).includes(n));
      });
      assert.ok(ok, `${key}: beschrijving noemt ${named.join(', ')}, maar de engine maakt dat schema niet`);
    }
  });

  test('procestekst klopt met de engine: proces duwt de methodekeuze (natural/anaerobic → V60)', () => {
    const nat = api.computeMethodAdvice('medium', 'klassiek', 'single', 'natural', false);
    const wa = api.computeMethodAdvice('medium', 'klassiek', 'single', 'washed', false);
    assert.equal(nat.v60Score, wa.v60Score + 1);
    // Dat dosis/maling/temperatuur niet veranderen, bewaakt tests/forbidden-edges.test.mjs.
  });
});
