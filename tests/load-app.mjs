// Zie het projectdocument load-app.mjs (ongewijzigd overgenomen, alleen APP_HTML_PATH
// wijst hier naar dit lokale bouwbestand). Automock-sandbox voor de PURE rekenlogica.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const APP_HTML_PATH = path.resolve(__dirname, '..', 'brewconsole_v2_2.html');

function autoMock(label){
  const store = Object.create(null);
  const fn = function(){ return autoMock(label + '()'); };
  const handler = {
    get(target, prop){
      if (prop === Symbol.toPrimitive) return (hint) => (hint === 'number' ? 0 : '');
      if (prop === Symbol.iterator) return function*(){};
      if (prop === 'then') return undefined;
      if (typeof prop === 'symbol') return undefined;
      if (prop in store) return store[prop];
      const child = autoMock(`${label}.${String(prop)}`);
      store[prop] = child;
      return child;
    },
    set(target, prop, value){ store[prop] = value; return true; },
    has(){ return false; },
    apply(){ return autoMock(label + '()'); }
  };
  return new Proxy(fn, handler);
}

function makeLocalStorage(){
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
    clear: () => data.clear(),
    _dump: () => Object.fromEntries(data)
  };
}

export function extractScripts(html){
  const scripts = [];
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))){
    scripts.push(m[1]);
  }
  if (scripts.length < 2){
    throw new Error(`Verwachtte minstens 2 <script>-blokken in ${APP_HTML_PATH}, vond ${scripts.length}. Is het bestand verplaatst/hernoemd?`);
  }
  return scripts;
}

export function loadApp(){
  const html = readFileSync(APP_HTML_PATH, 'utf8');
  const [engineScript, appScript] = extractScripts(html);

  const sandbox = {};
  const win = autoMock('window');
  const doc = autoMock('document');
  const nav = autoMock('navigator');
  sandbox.window = win;
  sandbox.self = win;
  sandbox.globalThis = sandbox;
  sandbox.document = doc;
  sandbox.navigator = nav;
  sandbox.localStorage = makeLocalStorage();
  sandbox.location = autoMock('location');
  sandbox.console = console;
  sandbox.URL = { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} };
  sandbox.Blob = function Blob(){};
  sandbox.fetch = () => Promise.reject(new Error('fetch niet beschikbaar in testsandbox'));
  sandbox.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  sandbox.cancelAnimationFrame = (id) => clearTimeout(id);
  sandbox.matchMedia = () => ({ matches: false, addEventListener(){}, addListener(){} });
  sandbox.setInterval = setInterval; sandbox.clearInterval = clearInterval;
  sandbox.setTimeout = setTimeout; sandbox.clearTimeout = clearTimeout;

  vm.createContext(sandbox);
  vm.runInContext(engineScript, sandbox, { filename: 'brew-engine-bundle.js' });
  // NIEUW (Implementatieplan Zetadvies v3.0, §5-testinfra): in een echte browser zijn
  // `window` en `globalThis` hetzelfde object, dus het app-script se `window.BrewEngineBundle`
  // vindt gewoon wat het engine-script via `globalThis.BrewEngineBundle = {...}` zette. In
  // deze VM-sandbox zijn het bewust TWEE verschillende objecten (`window` is een autoMock-
  // Proxy voor DOM-achtige dingen, `globalThis` is de echte sandbox) — zonder deze alias zou
  // elke `window.BrewEngineBundle`-aanroep in het app-script (bv. computeRecipe()) een lege
  // autoMock terugkrijgen in plaats van de echte engine, en dus stille onzin-uitkomsten geven
  // i.p.v. een duidelijke fout. Puur test-scaffolding; raakt geen app- of enginecode.
  win.BrewEngineBundle = sandbox.BrewEngineBundle;
  vm.runInContext(appScript, sandbox, { filename: 'brewconsole-app.js' });

  vm.runInContext(
    `globalThis.__TEST_EXPORTS__ = {
      ENGINE_PROFILE_MAP, PROFILE_INFO, METHOD_INFO, ROAST_INFO, OVERLAY_DISPLAY, PROCESS_INFO,
      computeMethodAdvice, buildReasoningLines, findProfileTwins, profileRecipeSignature,
      resolvedOverlayIdFor,
      levenshtein, maxFuzzyDistance, tokenizeForFuzzy, fuzzyMatchesKeyword, textOrFuzzyIncludes,
      RECORD_SCHEMA_VERSION, GRIND_CONFIDENCE_LABELS, translateGrindConfidence,
      canonicalProfileKey, visibleProfileKeys, displayScoreFor, PROFILE_MERGE_GROUPS,
      FRESHNESS_TIERS, freshnessTierForDays, coreOnlyReason,
      computeRecipe, engineValidVolumeRange, ENGINE_TARGET_WINDOWS, MODEL_POLICY,
      hardnessNudge, alkalinityNudge, dilutedWaterValue, waterSCAVerdict, HCO3_TO_CACO3_FACTOR,
      cuppingSuggestionFor, cuppingAxisLevel, CUPPING_NOISE_THRESHOLD, CUPPING_SCALE_CENTER,
      CUPPING_PRIMARY_AXES,
      roastBucketFor, processBucketFor, ROAST_BUCKET_LABELS, PROCESS_BUCKET_LABELS,
      recipeGrindBaseline, matchesWaterProfile, learningCorrectionFor, learningCorrectionText,
      learningEligibleEntries, bypassAdvice, BYPASS_PCT_OPTIONS,
      LEARNING_MIN_N, brewLog, beanLibrary,
      measuredRetention, measuredRetentionText, RETENTION_MIN_N, RETENTION_PLAUSIBLE,
      personalCalibrationFor, personalCalibrationText, PERSONAL_CALIBRATION_MIN_N,
      classifyProfile, profileMatchStars, PROFILE_STAR_SCALE, PROFILE_TECHNIQUE_ONLY_KEYS,
      FLAVOR_TAG_HINTS, FLAVOR_SCAN_SYNONYMS, SCA_FLAVOR_WHEEL, profileScorePercentages,
      profileNearTieCandidates, PROFILE_NEAR_TIE_MARGIN
    };`,
    sandbox,
    { filename: 'test-exports-shim.js' }
  );

  return { sandbox, api: sandbox.__TEST_EXPORTS__ };
}
