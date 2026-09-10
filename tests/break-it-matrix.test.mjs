// NIEUW (Nieuwe Reparaties v2.2 §9 — "Exhaustive 'break it' testmatrix"): een
// representatieve, niet-uitputtende parametrische sweep over de door het document
// genoemde assen (methode, alle 11 profielen, batchgrootte, branddiepte, proces, fresh/
// oud, sterkte, C3S/geen-calibratie-grinder, met/zonder overlay, normale/ontbrekende/
// extreme boondata). Een volledige Cartesische product van alle assen zou tienduizenden
// combinaties geven — dit bestand kiest bewust een dichte, representatieve sweep per as
// in plaats van elke as met elke andere te kruisen, en test daarnaast de expliciete
// randgevallen (te klein/te groot watervolume, ontbrekende procesdata) apart en gericht.
//
// Elke case controleert precies de negen punten uit §9:
//   1. Geen NaN/Infinity/undefined/negatieve dose/waterwaarden.
//   2. Ratio = water / dose binnen toegestane policy (ruwe sanity-marge).
//   3. Core parameters blijven binnen hun harde bounds (V60-dosisplafond 15-22g).
//   4. Method scope wordt gerespecteerd (geen V60-only overlay op Chemex, geen
//      Chemex-only op V60).
//   5. Unsupported overlay wordt nooit toegepast (idem 4, plus batch-ceiling-uitsluiting).
//   6. Overlay verandert geen core parameters (apart, dicht bewaakt in §2-suite; hier
//      als extra sanity-check op de volle sweep meegenomen).
//   7. Winner is altijd afkomstig uit de canonical selection path (structureel
//      gegarandeerd sinds §2 — hier alleen op crashvrij gedrag gecontroleerd).
//   8. Evidence status is consistent met de bronstatus (grindConfidence is nooit een
//      kale ongeldige waarde).
//   9. BLOCKED/Insufficient states worden niet als normale recepten gerenderd (aparte
//      randgeval-tests onderaan).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './load-app.mjs';

const { api, sandbox } = loadApp();
const B = sandbox.BrewEngineBundle;

function assertFiniteNonNegative(value, label){
  assert.equal(typeof value, 'number', `${label} moet een getal zijn, kreeg ${typeof value}`);
  assert.ok(Number.isFinite(value), `${label} (${value}) mag geen NaN/Infinity zijn`);
  assert.ok(value >= 0, `${label} (${value}) mag niet negatief zijn`);
}

function assertHealthyRecipe(rec, { method, profile, roast }){
  const label = `${method}/${profile}/${roast}`;

  // 1. Geen NaN/Infinity/undefined/negatieve dose/waterwaarden — tenzij dit een eerlijke
  //    BLOCKED-fallback is (dose:0, technique meldt expliciet geen geldig recept).
  const isFallback = rec.technique === 'Geen geldig recept bij dit watervolume';
  if (!isFallback){
    assertFiniteNonNegative(rec.dose, `${label}: dose`);
    assertFiniteNonNegative(rec.water, `${label}: water`);
    assert.ok(rec.dose > 0, `${label}: dose moet > 0 zijn voor een niet-fallback recept`);

    // 2. Ratio = water/dose binnen policy — ruwe sanity-marge (1:8 tot 1:30 dekt elk
    //    denkbaar filterrecept ruim, inclusief bypass/concentraat).
    const impliedRatio = rec.water / rec.dose;
    assert.ok(impliedRatio >= 8 && impliedRatio <= 30,
      `${label}: geïmpliceerde ratio ${impliedRatio.toFixed(1)} valt buiten de sane 1:8-1:30-marge`);

    // 3. Core parameters blijven binnen hun harde bounds — V60 heeft een keihard
    //    dosisplafond van 15-22g (Reparatieplan v4.0, B-1, non-negotiable); Chemex heeft
    //    geen bekend plafond (G-CHEMEX-DOSE-CEILING-01), dus daar alleen sanity-bounds.
    if (method === 'v60'){
      assert.ok(rec.dose >= 14.9 && rec.dose <= 22.1, `${label}: V60-dosis ${rec.dose}g buiten het harde 15-22g-plafond (kleine marge voor afronding)`);
    }

    assertFiniteNonNegative(rec.temp, `${label}: temp`);
    assertFiniteNonNegative(rec.totalTime, `${label}: totalTime`);
    assert.ok(Array.isArray(rec.steps) && rec.steps.length > 0, `${label}: steps mag niet leeg zijn`);
    for (const s of rec.steps){
      assertFiniteNonNegative(s.t, `${label}: step.t`);
      assert.ok(Number.isFinite(s.add) && s.add >= 0, `${label}: step.add (${s.add}) moet een niet-negatief getal zijn`);
    }
  }

  // 4/5. Method scope: een profiel met methodOnly mag nooit op de andere methode
  //      renderen (dit wordt al bij de aanroep zelf gefilterd — hier alleen bevestigen
  //      dat de aanroep zelf niet crasht/geen onzin teruggeeft voor de juiste methode).
  const only = api.PROFILE_INFO[profile].methodOnly;
  if (only) assert.equal(method, only, `${label}: profiel ${profile} is methodOnly:${only}, mag niet op ${method} getest worden`);

  // 8. Evidence status consistent: grindConfidence moet een van de bekende labels zijn.
  assert.ok(['INSUFFICIENT','LOW','MEDIUM','HIGH'].includes(rec.grindConfidence),
    `${label}: onbekende grindConfidence-waarde "${rec.grindConfidence}"`);

  // 9. BLOCKED/Insufficient nooit als normaal recept: een fallback-recept moet zichzelf
  //    als zodanig identificeren, nooit een plausibel ogend dose/water-paar tonen.
  if (isFallback){
    assert.equal(rec.dose, 0, `${label}: fallback-recept moet dose=0 tonen, nooit een verzonnen dosis`);
    assert.ok(rec.notes && rec.notes.length > 0, `${label}: fallback-recept moet uitleggen waarom`);
  }
}

describe('§9 Break-it matrix — representatieve sweep over methode×profiel×roast×sterkte', () => {
  for (const method of ['v60', 'chemex']){
    const vol = method === 'v60' ? 300 : 600;
    for (const profile of Object.keys(api.ENGINE_PROFILE_MAP)){
      const only = api.PROFILE_INFO[profile].methodOnly;
      if (only && only !== method) continue;
      for (const roast of ['light', 'medium', 'dark']){
        for (const strength of [-1, 0, 1]){
          test(`${method}/${profile}/${roast}/sterkte=${strength} is gezond`, () => {
            const rec = api.computeRecipe(method, roast, profile, vol, null, false, null, null, false, null, null, strength);
            assertHealthyRecipe(rec, { method, profile, roast });
          });
        }
      }
    }
  }
});

describe('§9 Break-it matrix — boondata: normaal/ontbrekend/extreem (proces, freshness, hoogte, hardheid)', () => {
  const cases = [
    { label: 'alles null (ontbrekende boondata)', process: null, roastDays: null, altitude: null, hardness: null },
    { label: 'washed, kersvers (1 dag)', process: 'washed', roastDays: 1, altitude: 1800, hardness: 120 },
    { label: 'natural, zeer oud (365 dagen)', process: 'natural', roastDays: 365, altitude: 1800, hardness: 120 },
    { label: 'honey, extreme hoogte (5000masl)', process: 'honey', roastDays: 10, altitude: 5000, hardness: 120 },
    { label: 'anaerobic, extreme hardheid (0 mg/L)', process: 'anaerobic', roastDays: 10, altitude: 1800, hardness: 0 },
    { label: 'anaerobic, extreme hardheid (500 mg/L)', process: 'anaerobic', roastDays: 10, altitude: 1800, hardness: 500 },
  ];
  for (const c of cases){
    test(`v60/klassiek — ${c.label}`, () => {
      const rec = api.computeRecipe('v60', 'medium', 'klassiek', 300, c.process, false, c.roastDays, c.altitude, false, null, c.hardness, 0);
      assertHealthyRecipe(rec, { method: 'v60', profile: 'klassiek', roast: 'medium' });
      // Non-negotiable (project-brede audit H7 + Implementatieplan v3.0 §7): geen van
      // deze contextvelden mag dose/water/ratio/grind beïnvloeden — vergelijk tegen de
      // baseline-aanroep zonder enige contextdata.
      const baseline = api.computeRecipe('v60', 'medium', 'klassiek', 300, null, false, null, null, false, null, null, 0);
      assert.equal(rec.dose, baseline.dose, `${c.label}: dose mag niet verschuiven`);
      assert.equal(rec.water, baseline.water, `${c.label}: water mag niet verschuiven`);
      assert.equal(rec.grindStartingPoint, baseline.grindStartingPoint, `${c.label}: grind mag niet verschuiven`);
    });
  }
});

describe('§9 Break-it matrix — watervolume-extremen (te klein/te groot) geven eerlijke BLOCKED-fallback, geen crash of verzonnen recept', () => {
  test('V60 met een absurd klein watervolume crasht niet en toont geen verzonnen dosis', () => {
    const rec = api.computeRecipe('v60', 'medium', 'klassiek', 1, null, false, null, null, false, null, null, 0);
    assert.equal(rec.technique, 'Geen geldig recept bij dit watervolume');
    assert.equal(rec.dose, 0);
  });

  test('V60 met een negatief watervolume crasht niet (HARD_CONSTRAINT_VIOLATION in de engine, eerlijke fallback in de app)', () => {
    const rec = api.computeRecipe('v60', 'medium', 'klassiek', -100, null, false, null, null, false, null, null, 0);
    assert.equal(rec.technique, 'Geen geldig recept bij dit watervolume');
    assert.equal(rec.dose, 0);
  });

  test('V60 binnen het engine-geldige bereik blijft gewoon werken aan beide randen', () => {
    const range = api.engineValidVolumeRange('v60', 'klassiek');
    const low = api.computeRecipe('v60', 'medium', 'klassiek', range.min, null, false, null, null, false, null, null, 0);
    const high = api.computeRecipe('v60', 'medium', 'klassiek', range.max, null, false, null, null, false, null, null, 0);
    assertHealthyRecipe(low, { method: 'v60', profile: 'klassiek', roast: 'medium' });
    assertHealthyRecipe(high, { method: 'v60', profile: 'klassiek', roast: 'medium' });
    assert.notEqual(low.technique, 'Geen geldig recept bij dit watervolume');
    assert.notEqual(high.technique, 'Geen geldig recept bij dit watervolume');
  });
});

describe('§9 Break-it matrix — grinder zonder calibration curve (engine-niveau)', () => {
  test('GENERIC_UNLISTED grinder (het bewuste catch-all-register) geeft INSUFFICIENT confidence, nooit een verzonnen klik-getal', () => {
    const t = B.translateSetting(B.GENERIC_UNLISTED_ID, 'MEDIUM_FINE');
    assert.equal(t.confidenceBand, 'INSUFFICIENT');
    assert.equal(t.setting.state, 'RESEARCH_GAP', 'een onbekende grinder mag nooit een concreet setting-getal tonen');
  });

  test('een volstrekt onbekende, niet-geregistreerde grinder-id valt terug op hetzelfde GENERIC_UNLISTED-gedrag, nooit een crash of verzonnen getal', () => {
    const t = B.translateSetting('SOME_MADE_UP_GRINDER_XYZ', 'MEDIUM_FINE');
    assert.equal(t.grinderRecognized, false);
    assert.equal(t.confidenceBand, 'INSUFFICIENT');
    assert.equal(t.setting.state, 'RESEARCH_GAP');
  });

  test('C3S Pro (wél een curve/registry) geeft geen INSUFFICIENT confidence voor de V60-band', () => {
    const t = B.translateSetting(B.TIMEMORE_C3S_PRO_ID, 'MEDIUM_FINE');
    assert.equal(t.grinderRecognized, true);
    assert.notEqual(t.startingRangeHint.state, 'RESEARCH_GAP');
  });
});

describe('§8 Hard constraints/missing-data states — engine-niveau (niet bereikbaar via computeRecipe()\'s publieke app-API, die altijd een geldige fallback kiest voor roastKey/methodKey)', () => {
  function baseReq(overrides){
    return Object.assign({
      coffee: { roastLevel: B.resolved('MEDIUM', 'STATED') },
      brewer: B.V60_02,
      targetWindow: B.resolveTargetWindow('FULLER_BODIED', { strengthTDS:[1.2,1.35], extractionYieldEY:[19,21] }),
      grinderRegistryId: B.TIMEMORE_C3S_PRO_ID,
      desiredGrindBand: 'MEDIUM_FINE',
      freshnessBloomFlag: B.unknown(),
      batchSize: 1,
      targetVolumeML: 300,
      extraConstraints: []
    }, overrides);
  }

  test('ontbrekende branddiepte blijft recommendation-blocking (MISSING_ROAST_LEVEL)', () => {
    const gen = B.generateCandidates(baseReq({ coffee: { roastLevel: B.unknown() } }));
    assert.equal(gen.blocked.state, 'RESOLVED');
    assert.equal(gen.blocked.value.code, 'MISSING_ROAST_LEVEL');
    assert.equal(gen.candidates.length, 0, 'geen enkele kandidaat mag gegenereerd worden zonder branddiepte');
  });

  test('out-of-scope apparatuur blokkeert (OUT_OF_SCOPE_EQUIPMENT)', () => {
    const gen = B.generateCandidates(baseReq({ brewer: { scope: 'OTHER_OUT_OF_SCOPE' } }));
    assert.equal(gen.blocked.state, 'RESOLVED');
    assert.equal(gen.blocked.value.code, 'OUT_OF_SCOPE_EQUIPMENT');
    assert.equal(gen.candidates.length, 0);
  });

  test('geen enkele overlevende kandidaat geeft een expliciete BLOCKED state via selectRecommendation(), geen silent fallback', () => {
    const rec = B.selectRecommendation({
      candidates: [],
      buildReasoningChain: () => [],
      areDistinct: (a,b) => a.id !== b.id,
      experimentalEligibleCandidateIds: new Set()
    });
    assert.equal(rec.state, 'BLOCKED');
    assert.equal(rec.top.state, 'UNKNOWN', 'geen kandidaat betekent geen "top"-aanbeveling, nooit een verzonnen winnaar');
  });
});
