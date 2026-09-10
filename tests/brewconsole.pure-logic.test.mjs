// FIX (teamreview v2 — Kritiek bevinding, QA Engineer/Test Automation Engineer).
// Zie load-app.mjs voor uitleg over hoe/waarom dit tegen de ECHTE broncode uit
// brewconsole_v2.html draait. Drie testgroepen, precies de drie risico's die het
// teamreview-rapport benoemde:
//   1. ENGINE_PROFILE_MAP-duplicaten (schijnkeuze-bevinding #1) worden gedetecteerd
//      én blijven beperkt tot de bekende, bewust geaccepteerde groep.
//   2. computeMethodAdvice()/buildReasoningLines() blijven consistent — de merge uit
//      deze v2 kan per constructie niet meer uit elkaar lopen, maar deze tests
//      bewaken dat een toekomstige wijziging die aanname niet stilzwijgend doorbreekt.
//   3. De Levenshtein-fuzzy-matcher voor OCR-tikfouten gedraagt zich zoals de eigen
//      brontekst-comments beweren (drempels, geen fuzzy op meerdere-woorden-termen).
//
// Uitvoeren: node --test tests/*.test.mjs   (vanuit de map met brewconsole_v2_2.html)

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './load-app.mjs';

const { api, sandbox } = loadApp();

describe('ENGINE_PROFILE_MAP — schijnkeuze-detectie (Kritiek bevinding #1)', () => {
  // VERVANGEN (Reparatieplan v4.0, §8.2, na B-4 en C-1): findProfileTwins() vergelijkt
  // sinds B-4 het werkelijk gegenereerde recept i.p.v. het gemapte overlay-id, en C-1 geeft
  // 'zoet' een eigen, ander gietschema. De oude aanname — precies één tweelinggroep
  // ({klassiek, vol_rond, zoet}) — klopt daardoor niet meer. Dat is de winst van beide
  // taken, geen regressie: zie §8.2 van het reparatieplan.
  test('B-4/C-1: de tweelinggroepen op v60 zijn precies de gemeten drie', () => {
    const groepen = [
      ['klassiek','vol_rond'],                  // C-1: zoet is eruit, andere fase-1-verdeling
      ['fruitig_clean','bloemig_delicaat'],      // B-4: beide vallen terug op Core-only
      ['sirooprig_vol','evenwichtig_flex']       // B-4: Hedrick is nooit generatable
    ];
    for (const groep of groepen){
      for (const lid of groep){
        const anderen = groep.filter(x => x !== lid);
        assert.deepEqual(new Set(api.findProfileTwins(lid, 'v60')), new Set(anderen),
          `${lid} hoort exact ${anderen} als tweeling te hebben`);
      }
    }
    assert.equal(api.findProfileTwins('zoet','v60').length, 0,
      'zoet heeft sinds C-1 een eigen gietschema en dus geen tweeling meer');
  });

  test('B-4: op chemex vallen vijf profielen samen — Kasuya is daar niet toepasbaar', () => {
    const groep = new Set(['klassiek','vol_rond','zoet','robuust','evenwichtig_flex']);
    for (const lid of groep){
      const verwacht = new Set([...groep].filter(x => x !== lid));
      assert.deepEqual(new Set(api.findProfileTwins(lid, 'chemex')), verwacht);
    }
    assert.deepEqual(new Set(api.findProfileTwins('heel_fruitig','chemex')), new Set(['fruitig_clean']));
  });

  test('B-4: profielen met een eigen, GENERATABLE overlay hebben geen tweeling (negatieve controle)', () => {
    // fruitig_clean staat hier bewust NIET meer bij: Rao's pulseCount is RESEARCH_GAP, dus
    // dat profiel valt terug op het generieke schema en is numeriek gelijk aan
    // bloemig_delicaat. Dat is bevinding E-06, geen testfout.
    assert.equal(api.findProfileTwins('heel_fruitig','v60').length, 0);
    assert.equal(api.findProfileTwins('fresh_clean','v60').length, 0);
    assert.equal(api.findProfileTwins('snel_puur','v60').length, 0);
  });

  test('methodOnly-profiel (bloemig_delicaat) telt niet mee op chemex, waar het niet zichtbaar is', () => {
    assert.equal(api.findProfileTwins('bloemig_delicaat', 'chemex').length, 0);
  });

  test('B-4: elke tweelinggroep is bekend EN elke samengevoegde knop is aantoonbaar een echte tweeling', () => {
    const BEKENDE_GROEPEN = {
      v60:    [['klassiek','vol_rond'], ['fruitig_clean','bloemig_delicaat'], ['sirooprig_vol','evenwichtig_flex']],
      chemex: [['klassiek','vol_rond','zoet','robuust','evenwichtig_flex'], ['heel_fruitig','fruitig_clean']]
    };
    for (const methodKey of ['v60','chemex']){
      const bekend = BEKENDE_GROEPEN[methodKey].map(g => new Set(g));
      for (const profileKey of Object.keys(api.PROFILE_INFO)){
        const only = api.PROFILE_INFO[profileKey].methodOnly;
        if (only && only !== methodKey) continue;
        const twins = api.findProfileTwins(profileKey, methodKey);
        if (twins.length === 0) continue;
        const groep = new Set([profileKey, ...twins]);
        assert.ok(bekend.some(b => b.size === groep.size && [...groep].every(x => b.has(x))),
          `Onverwachte tweelinggroep op ${methodKey}: {${[...groep].join(', ')}}. ` +
          `Twee zichtbare profielen leveren hetzelfde recept zonder dat dat is vastgelegd.`);
      }
    }
    // BEWAKING DIE ER NOG NIET WAS: een samengevoegde knop mag alleen leden bevatten die
    // daadwerkelijk hetzelfde recept opleveren. Zonder deze assertie kan C-1-achtig werk een
    // merge-groep stil laten verlopen — schijnkeuze in spiegelbeeld.
    for (const groep of api.PROFILE_MERGE_GROUPS || []){
      for (const lid of groep.members){
        if (lid === groep.canonical) continue;
        assert.ok(api.findProfileTwins(groep.canonical, 'v60').includes(lid),
          `PROFILE_MERGE_GROUPS voegt "${lid}" samen met "${groep.canonical}", maar ze leveren ` +
          `niet meer hetzelfde recept. De merge-groep is stale.`);
      }
    }
  });
});

describe('computeMethodAdvice() / buildReasoningLines() — consistentie (Hoog bevinding)', () => {
  const EXPECTED_BUCKET = {
    heel_fruitig: 'bright', fruitig_clean: 'bright', fresh_clean: 'bright',
    vol_rond: 'body', zoet: 'body',
    snel_puur: 'perger',
    bloemig_delicaat: 'methodOnly',
    klassiek: 'neutral', robuust: 'neutral', evenwichtig_flex: 'neutral',
    sirooprig_vol: 'methodOnly'
  };

  test('elk profiel valt in de verwachte bucket (score-classificatie ongewijzigd t.o.v. v1)', () => {
    for (const [profileKey, expectedBucket] of Object.entries(EXPECTED_BUCKET)){
      const result = api.computeMethodAdvice('medium', profileKey, 'single', null, false);
      assert.equal(result.profileBucket, expectedBucket, `profiel "${profileKey}" verwacht bucket "${expectedBucket}", kreeg "${result.profileBucket}"`);
    }
  });

  test('buildReasoningLines() gebruikt UITSLUITEND de bucket die computeMethodAdvice() al berekende — geen eigen classificatie meer', () => {
    const BUCKET_MARKER = {
      bright: 'maximale helderheid',
      body: 'body en een zachte afdronk',
      perger: 'is ontworpen voor de V60',
      neutral: 'bewust neutraal',
      methodOnly: 'werkt alléén op de'
    };
    for (const [profileKey, expectedBucket] of Object.entries(EXPECTED_BUCKET)){
      const lines = api.buildReasoningLines('medium', profileKey, 'single', null, false);
      assert.equal(lines.length >= 3, true, `buildReasoningLines("${profileKey}") gaf te weinig regels`);
      const profileLine = lines[1];
      assert.ok(
        profileLine.includes(BUCKET_MARKER[expectedBucket]),
        `profiel "${profileKey}" (bucket "${expectedBucket}"): verwachtte "${BUCKET_MARKER[expectedBucket]}" in "${profileLine}"`
      );
      for (const [bucket, marker] of Object.entries(BUCKET_MARKER)){
        if (bucket === expectedBucket) continue;
        assert.ok(!profileLine.includes(marker), `profiel "${profileKey}": onverwachte marker van bucket "${bucket}" in "${profileLine}"`);
      }
    }
  });

  test('methodOnly-profiel forceert altijd zijn eigen methode, ongeacht roast/batch/proces', () => {
    for (const roastKey of ['light','light_medium','medium','medium_dark','dark']){
      for (const batchKey of ['single','multi']){
        for (const profileKey of ['bloemig_delicaat', 'sirooprig_vol']){
          const result = api.computeMethodAdvice(roastKey, profileKey, batchKey, 'natural', true);
          assert.equal(result.method, 'v60');
          assert.equal(result.forced, true);
        }
      }
    }
  });

  test('natural/anaerobic proces telt mee als isFerment, en de bijbehorende regel verschijnt alleen dan', () => {
    const withFerment = api.buildReasoningLines('medium', 'klassiek', 'single', 'natural', false);
    const withoutFerment = api.buildReasoningLines('medium', 'klassiek', 'single', 'washed', false);
    assert.ok(withFerment.some(l => l.includes('Natural/anaerobic')));
    assert.ok(!withoutFerment.some(l => l.includes('Natural/anaerobic')));
  });

  test('experimentele fermentatie voegt zijn eigen regel toe, los van isFerment', () => {
    const lines = api.buildReasoningLines('medium', 'klassiek', 'single', 'natural', true);
    assert.ok(lines.some(l => l.includes('Experimenteel/dubbele fermentatie')));
  });

  test('geen enkele (roast × profiel × batch × proces × experimenteel)-combinatie laat buildReasoningLines() crashen', () => {
    const roasts = Object.keys(api.ROAST_INFO);
    const profiles = Object.keys(api.PROFILE_INFO);
    const batches = ['single', 'multi'];
    const processes = [null, 'washed', 'natural', 'honey', 'anaerobic'];
    for (const roastKey of roasts){
      for (const profileKey of profiles){
        for (const batchKey of batches){
          for (const processKey of processes){
            for (const experimentalFlag of [false, true]){
              assert.doesNotThrow(() => {
                const lines = api.buildReasoningLines(roastKey, profileKey, batchKey, processKey, experimentalFlag);
                assert.ok(Array.isArray(lines) && lines.length >= 3);
              }, `combinatie ${JSON.stringify({ roastKey, profileKey, batchKey, processKey, experimentalFlag })}`);
            }
          }
        }
      }
    }
  });
});

describe('Levenshtein / fuzzy OCR-matching (QA-aanbeveling, Test Automation Engineer)', () => {
  test('levenshtein() — bekende referentiewaarden', () => {
    assert.equal(api.levenshtein('kitten', 'sitting'), 3);
    assert.equal(api.levenshtein('a', 'a'), 0);
    assert.equal(api.levenshtein('', 'abc'), 3);
    assert.equal(api.levenshtein('abc', ''), 3);
  });

  test('maxFuzzyDistance() — drempels exact zoals de brontekst-comment beweert (≤3:0, 4-6:1, 7+:2)', () => {
    assert.equal(api.maxFuzzyDistance(1), 0);
    assert.equal(api.maxFuzzyDistance(3), 0);
    assert.equal(api.maxFuzzyDistance(4), 1);
    assert.equal(api.maxFuzzyDistance(6), 1);
    assert.equal(api.maxFuzzyDistance(7), 2);
    assert.equal(api.maxFuzzyDistance(20), 2);
  });

  test('fuzzyMatchesKeyword() — de eigen voorbeelden uit de brontekst-comment ("Karamei"/"carame1" i.p.v. "karamel"/"caramel")', () => {
    assert.equal(api.fuzzyMatchesKeyword(['carame1'], 'caramel'), true);
    assert.equal(api.fuzzyMatchesKeyword(['caramei'], 'caramel'), true);
    assert.equal(api.fuzzyMatchesKeyword(['chocolate'], 'chocolate'), true);
  });

  test('fuzzyMatchesKeyword() — te veel afwijking (buiten de drempel) matcht terecht niet', () => {
    assert.equal(api.fuzzyMatchesKeyword(['ch0c0latee'], 'chocolate'), false);
    assert.equal(api.fuzzyMatchesKeyword(['banaan'], 'caramel'), false);
  });

  test('fuzzyMatchesKeyword() — korte trefwoorden (≤3 letters) worden nooit fuzzy gematcht (te veel toevalstreffers)', () => {
    assert.equal(api.fuzzyMatchesKeyword(['tea'], 'tea'), false);
  });

  test('fuzzyMatchesKeyword() — meerdere-woorden-termen worden nooit fuzzy gematcht, ook niet met een prima kandidaat', () => {
    assert.equal(api.fuzzyMatchesKeyword(['dried', 'fruit'], 'dried fruit'), false);
  });

  test('textOrFuzzyIncludes() — exacte substring-match wint, fuzzy is puur een vangnet', () => {
    assert.equal(api.textOrFuzzyIncludes('proeft naar chocolate vandaag', ['chocolate'], 'chocolate'), true);
    assert.equal(api.textOrFuzzyIncludes('proeft naar carame1 vandaag', ['proeft','naar','carame1','vandaag'], 'caramel'), true);
    assert.equal(api.textOrFuzzyIncludes('proeft naar appel vandaag', ['proeft','naar','appel','vandaag'], 'caramel'), false);
  });
});

describe('grindConfidence-vertaling (Hoog bevinding, Content/Microcopy Specialist)', () => {
  test('elke bekende engine-waarde vertaalt naar Nederlands, geen kale enum meer op het scherm', () => {
    assert.equal(api.translateGrindConfidence('INSUFFICIENT'), 'onvoldoende');
    assert.equal(api.translateGrindConfidence('LOW'), 'laag');
    assert.equal(api.translateGrindConfidence('MEDIUM'), 'gemiddeld');
    assert.equal(api.translateGrindConfidence('HIGH'), 'hoog');
  });
  test('ontbrekende waarde valt terug op "onvoldoende", niet op een lege/undefined regel', () => {
    assert.equal(api.translateGrindConfidence(null), 'onvoldoende');
    assert.equal(api.translateGrindConfidence(undefined), 'onvoldoende');
  });
  test('een onbekende TOEKOMSTIGE engine-waarde lekt leesbaar door i.p.v. een lege regel te tonen', () => {
    assert.equal(api.translateGrindConfidence('CONTESTED'), 'CONTESTED');
  });
});

describe('Schijnkeuze-samenvoeging (v2.2 kernflow — Bouwbesluit "Knoppen samenvoegen")', () => {
  // BIJGEWERKT (Reparatieplan v4.0, C-1 / Bouwbesluit BB-2): 'zoet' is uit
  // PROFILE_MERGE_GROUPS gehaald omdat het sinds C-1 een aantoonbaar ander gietschema
  // oplevert (Kasuya's eigen smaakknop, fase 1 = 50+70 i.p.v. 60+60 bij 300 ml). Alleen
  // klassiek/vol_rond blijven samengevoegd — 'vol_rond' gaat over body, niet over de as
  // die C-1 verschuift, dus die twee blijven wél byte-identiek.
  test('canonicalProfileKey() wijst vol_rond naar klassiek; klassiek en zoet blijven zichzelf', () => {
    assert.equal(api.canonicalProfileKey('klassiek'), 'klassiek');
    assert.equal(api.canonicalProfileKey('vol_rond'), 'klassiek');
    assert.equal(api.canonicalProfileKey('zoet'), 'zoet');
  });

  test('canonicalProfileKey() laat niet-schijnkeuze profielen ongemoeid', () => {
    for (const key of Object.keys(api.PROFILE_INFO)){
      if (['klassiek', 'vol_rond'].includes(key)) continue;
      assert.equal(api.canonicalProfileKey(key), key);
    }
  });

  test('visibleProfileKeys() bevat klassiek en zoet maar niet vol_rond, en verliest geen enkel ander profiel', () => {
    const visible = api.visibleProfileKeys();
    assert.ok(visible.includes('klassiek'));
    assert.ok(!visible.includes('vol_rond'));
    assert.ok(visible.includes('zoet'), 'zoet heeft sinds C-1 een eigen gietschema en is dus geen samengevoegde tweeling meer');
    const allKeys = Object.keys(api.PROFILE_INFO);
    for (const key of allKeys){
      if (key === 'vol_rond') continue;
      assert.ok(visible.includes(key), `visibleProfileKeys() mist "${key}"`);
    }
    assert.equal(new Set(visible).size, visible.length);
  });

  test('PROFILE_INFO / ENGINE_PROFILE_MAP blijven volledig intact — de merge verwijdert geen data', () => {
    assert.ok('vol_rond' in api.PROFILE_INFO);
    assert.ok('zoet' in api.PROFILE_INFO);
    assert.ok('vol_rond' in api.ENGINE_PROFILE_MAP);
    assert.ok('zoet' in api.ENGINE_PROFILE_MAP);
  });

  test('displayScoreFor() telt de scores van samengevoegde tweelingen bij elkaar op (klassiek+vol_rond, niet meer zoet)', () => {
    const scores = { klassiek: 2, vol_rond: 5, zoet: 1, heel_fruitig: 3 };
    assert.equal(api.displayScoreFor(scores, 'klassiek'), 7);
    assert.equal(api.displayScoreFor(scores, 'zoet'), 1);
    assert.equal(api.displayScoreFor(scores, 'heel_fruitig'), 3);
  });

  test('displayScoreFor() geeft 0 terug voor een profiel zonder score, niet undefined/NaN', () => {
    assert.equal(api.displayScoreFor({}, 'klassiek'), 0);
  });
});

// NIEUW (Implementatieplan Zetadvies v3.0, §5 — Fase 1 testplan): D-1 (retentieterm
// ontbrak in de ratio) en D-2 (watervolume onder de referentie werd stil naar batchSize 1
// geklemd) tegen de ECHTE engine/app-code, niet tegen een herschreven kopie van de formule.
describe('computeRecipe() — retentieterm en volumeklem (Implementatieplan Zetadvies v3.0, Fase 1 / D-1 & D-2)', () => {
  const B = sandbox.BrewEngineBundle;

  test('LIQUID_RETAINED_RATIO is de gedocumenteerde 2,0 g/g-aanname en wordt daadwerkelijk toegepast in ratioFromWindow() (D-1)', () => {
    assert.equal(B.LIQUID_RETAINED_RATIO, 2.0);
    const targetWindow = { strengthTDS: [1.20, 1.20], extractionYieldEY: [20, 20] };
    const withRetention = B.ratioFromWindow(targetWindow);
    // Zonder de retentieterm zou dit exact 20/1.20 zijn — mét de term moet het daar
    // precies LIQUID_RETAINED_RATIO (2.0) boven liggen, aan beide kanten van de band.
    const withoutRetention = 20 / 1.20;
    assert.ok(Math.abs(withRetention.min - (withoutRetention + B.LIQUID_RETAINED_RATIO)) < 1e-9);
    assert.ok(Math.abs(withRetention.max - (withoutRetention + B.LIQUID_RETAINED_RATIO)) < 1e-9);
  });

  test('ratio per cluster bij 300 ml valt in de orde van grootte die het plan noemt (§3, Fase 1a: LOWER ~1:17,5-17,6, FULLER ~1:17,3-17,4)', () => {
    const lower = api.computeRecipe('v60', 'medium', 'heel_fruitig', 300, null, false, null, null, false, null, null, 0);
    const fuller = api.computeRecipe('v60', 'medium', 'klassiek', 300, null, false, null, null, false, null, null, 0);
    // BIJGEWERKT (Reparatieplan v4.0, A-6 / bevinding E-17): ratioText gebruikt sinds A-6
    // altijd een Nederlandse komma (nlRatio()) i.p.v. de punt die core.ratio.value gaf. De
    // regex hier bewaakte per ongeluk ook het scheidingsteken i.p.v. alleen de orde van
    // grootte — bijgewerkt naar komma, de numerieke intentie (17,4-17,7 / 17,2-17,5) blijft
    // ongewijzigd. Niet vermeld in §8.2 van het plan, maar een rechtstreeks gevolg van A-6.
    assert.ok(/^1:17,[4-7]$/.test(lower.ratioText), `LOWER-cluster ratio buiten verwacht bereik: ${lower.ratioText}`);
    assert.ok(/^1:17,[2-5]$/.test(fuller.ratioText), `FULLER-cluster ratio buiten verwacht bereik: ${fuller.ratioText}`);
    // De twee clusters blijven verschillend — Fase 1 lost het profielprobleem bewust niet op (§3, "Wat dit niet oplost").
    assert.notEqual(lower.ratioText, fuller.ratioText);
    assert.equal(lower.water, 300);
    assert.equal(fuller.water, 300);
  });

  test('grenswaarden rond het door D-1 verschoven geldige V60-volumebereik (260/265/300/385/390 ml, LOWER-cluster)', () => {
    const cases = [
      { ml: 260, expectValid: false },
      { ml: 265, expectValid: true },
      { ml: 300, expectValid: true },
      { ml: 385, expectValid: true },
      { ml: 390, expectValid: false }
    ];
    for (const { ml, expectValid } of cases){
      const rec = api.computeRecipe('v60', 'medium', 'heel_fruitig', ml, null, false, null, null, false, null, null, 0);
      if (expectValid){
        assert.ok(rec.dose > 0, `${ml} ml zou een geldig recept moeten geven, kreeg dose=0`);
        assert.equal(rec.water, ml, `${ml} ml: het recept moet exact het gevraagde volume tonen (geen stille substitutie naar een ander volume)`);
      } else {
        assert.equal(rec.dose, 0, `${ml} ml zou GEEN geldig recept moeten geven (buiten het dosisplafond), kreeg dose=${rec.dose}`);
        assert.equal(rec.technique, 'Geen geldig recept bij dit watervolume');
        assert.ok(rec.notes && rec.notes.length > 20, `${ml} ml: verwacht een leesbare, inhoudelijke uitleg in notes`);
      }
    }
  });

  test('250 ml geeft een leesbare melding en géén stille substitutie naar een ander volume (D-2, kernscenario uit het plan)', () => {
    const rec = api.computeRecipe('v60', 'medium', 'klassiek', 250, null, false, null, null, false, null, null, 0);
    assert.equal(rec.dose, 0, 'Bij 250 ml op v60/klassiek moet de dosisgrens dit eerlijk blokkeren, niet stil een ander volume verzinnen');
    assert.equal(rec.water, 250, 'Het waterveld moet het gevraagde volume (250) blijven tonen, niet stilzwijgend bv. 289 of 300');
    assert.ok(rec.notes.length > 20, 'Verwacht een leesbare, inhoudelijke uitleg, geen lege/korte placeholder');
    assert.match(rec.notes, /dosis|15|22/i, 'De uitleg moet iets zeggen over de dosisgrens die dit blokkeert');
  });

  test('een geldig, exact haalbaar volume geeft geen sizeConsistencyWarning (batchSize wordt teruggerekend uit het gevraagde volume)', () => {
    const rec = api.computeRecipe('v60', 'medium', 'klassiek', 300, null, false, null, null, false, null, null, 0);
    assert.equal(rec.sizeWarning, '', 'Bij een normaal, intern consistent gevraagd volume hoort geen size-consistentiewaarschuwing');
  });

  test('§5-testplaneis letterlijk: 250, 300 en 350 ml geven elk óf een recept met dat volume óf een leesbare uitleg, nooit iets anders', () => {
    const cases = [
      { ml: 250, expectValid: false }, // onder het dosisplafond (15g) voor v60/klassiek — leesbare uitleg
      { ml: 300, expectValid: true },
      { ml: 350, expectValid: true }
    ];
    for (const { ml, expectValid } of cases){
      const rec = api.computeRecipe('v60', 'medium', 'klassiek', ml, null, false, null, null, false, null, null, 0);
      if (expectValid){
        assert.equal(rec.water, ml, `${ml} ml moet een recept MET dat exacte volume geven`);
        assert.ok(rec.dose > 0, `${ml} ml moet een geldige, positieve dosis geven`);
        assert.notEqual(rec.technique, 'Geen geldig recept bij dit watervolume');
      } else {
        assert.equal(rec.dose, 0);
        assert.equal(rec.technique, 'Geen geldig recept bij dit watervolume');
        assert.ok(rec.notes && rec.notes.length > 20, `${ml} ml moet een leesbare uitleg geven, geen lege/stille fallback`);
      }
    }
  });

  test('engineValidVolumeRange() (schuifregelaar-klem) komt overeen met wat computeRecipe() daadwerkelijk accepteert, aan beide grenzen', () => {
    for (const profileKey of ['heel_fruitig', 'klassiek']){
      const range = api.engineValidVolumeRange('v60', profileKey);
      const atMin = api.computeRecipe('v60', 'medium', profileKey, range.min, null, false, null, null, false, null, null, 0);
      const atMax = api.computeRecipe('v60', 'medium', profileKey, range.max, null, false, null, null, false, null, null, 0);
      assert.ok(atMin.dose > 0, `engineValidVolumeRange().min (${range.min} ml) voor "${profileKey}" zou een geldig recept moeten geven`);
      assert.ok(atMax.dose > 0, `engineValidVolumeRange().max (${range.max} ml) voor "${profileKey}" zou een geldig recept moeten geven`);
    }
  });
});

// NIEUW (Implementatieplan Zetadvies v3.0, §5 — Fase 2 testplan): "vijf branddiepten
// geven vijf gedocumenteerde temperatuurbanden en de juiste maalpositie; het venster
// blijft altijd binnen de apparaat-envelop." Plus B-1's harde grens: ratio/dosis mogen
// NOOIT met branddiepte meebewegen, alleen temperatuur-ankerpunt en maalrichting.
describe('computeRecipe() — temperatuurankerpunt en maalrichting per branddiepte (Implementatieplan Zetadvies v3.0, Fase 2 / B-1)', () => {
  const EXPECTED_TEMP_BAND = {
    light:        { min: 94, max: 96, instruction: 'koken en direct gieten' },
    light_medium: { min: 94, max: 96, instruction: 'koken en direct gieten' },
    medium:       { min: 92, max: 95, instruction: 'koken, ongeveer 30 seconden wachten' },
    medium_dark:  { min: 88, max: 92, instruction: 'koken, ongeveer 1 minuut wachten' },
    dark:         { min: 88, max: 92, instruction: 'koken, ongeveer 1 minuut wachten' }
  };

  test('elke branddiepte geeft precies de in het plan gedocumenteerde temperatuurband + instructie (§3, Fase 2a)', () => {
    for (const [roastKey, expected] of Object.entries(EXPECTED_TEMP_BAND)){
      const rec = api.computeRecipe('v60', roastKey, 'klassiek', 300, null, false, null, null, false, null, null, 0);
      assert.equal(rec.tempBand.min, expected.min, `${roastKey}: tempBand.min`);
      assert.equal(rec.tempBand.max, expected.max, `${roastKey}: tempBand.max`);
      assert.equal(rec.tempInstruction, expected.instruction, `${roastKey}: tempInstruction`);
    }
  });

  test('de temperatuurband blijft voor elke branddiepte binnen de apparaat-envelop van het toestel', () => {
    for (const roastKey of Object.keys(EXPECTED_TEMP_BAND)){
      for (const methodKey of ['v60', 'chemex']){
        const rec = api.computeRecipe(methodKey, roastKey, 'klassiek', methodKey === 'v60' ? 300 : 450, null, false, null, null, false, null, null, 0);
        assert.ok(rec.tempBand.min >= rec.deviceTempBand.min, `${methodKey}/${roastKey}: tempBand.min (${rec.tempBand.min}) onder de apparaatband (${rec.deviceTempBand.min})`);
        assert.ok(rec.tempBand.max <= rec.deviceTempBand.max, `${methodKey}/${roastKey}: tempBand.max (${rec.tempBand.max}) boven de apparaatband (${rec.deviceTempBand.max})`);
      }
    }
  });

  test('maalrichting: lichter brandt naar de fijne kant (lager klikgetal), donkerder naar de grove kant (hoger klikgetal) — nooit buiten de gepubliceerde range', () => {
    const points = {};
    for (const roastKey of Object.keys(EXPECTED_TEMP_BAND)){
      const rec = api.computeRecipe('v60', roastKey, 'klassiek', 300, null, false, null, null, false, null, null, 0);
      assert.ok(rec.grindStartingPoint >= rec.grindStartingRange.clicksMin && rec.grindStartingPoint <= rec.grindStartingRange.clicksMax,
        `${roastKey}: grindStartingPoint (${rec.grindStartingPoint}) moet binnen de gepubliceerde range [${rec.grindStartingRange.clicksMin}, ${rec.grindStartingRange.clicksMax}] vallen`);
      points[roastKey] = rec.grindStartingPoint;
    }
    assert.ok(points.light <= points.light_medium, 'light zou niet grover mogen zijn dan light_medium');
    assert.ok(points.light_medium <= points.medium, 'light_medium zou niet grover mogen zijn dan medium');
    assert.ok(points.medium <= points.medium_dark, 'medium zou niet grover mogen zijn dan medium_dark');
    assert.ok(points.medium_dark <= points.dark, 'medium_dark zou niet grover mogen zijn dan dark');
    assert.ok(points.light < points.dark, 'light en dark moeten daadwerkelijk verschillen (anders is er geen maalrichting)');
    // De uiterste branddiepten moeten de uiterste klikken van de gepubliceerde range raken.
    const anyRec = api.computeRecipe('v60', 'light', 'klassiek', 300, null, false, null, null, false, null, null, 0);
    assert.equal(points.light, anyRec.grindStartingRange.clicksMin, 'light hoort op de fijne ondergrens van de gepubliceerde range te beginnen');
    assert.equal(points.dark, anyRec.grindStartingRange.clicksMax, 'dark hoort op de grove bovengrens van de gepubliceerde range te beginnen');
  });

  test('B-1: branddiepte verandert NOOIT de ratio/dosis, ook niet nu temperatuur en maalrichting wél meebewegen', () => {
    const results = Object.keys(EXPECTED_TEMP_BAND).map(roastKey =>
      api.computeRecipe('v60', roastKey, 'klassiek', 300, null, false, null, null, false, null, null, 0));
    const firstRatio = results[0].ratioText, firstDose = results[0].dose, firstWater = results[0].water;
    for (const rec of results){
      assert.equal(rec.ratioText, firstRatio, 'ratioText mag niet verschillen tussen branddiepten');
      assert.equal(rec.dose, firstDose, 'dose mag niet verschillen tussen branddiepten');
      assert.equal(rec.water, firstWater, 'water mag niet verschillen tussen branddiepten');
    }
  });

  test('grindStartingPoint is null wanneer de molen/methode geen gepubliceerde range heeft (bv. Chemex) — geen verzonnen positie', () => {
    const rec = api.computeRecipe('chemex', 'medium', 'klassiek', 450, null, false, null, null, false, null, null, 0);
    assert.equal(rec.grindStartingRange, null);
    assert.equal(rec.grindStartingPoint, null);
  });
});

// NIEUW (Implementatieplan Zetadvies v3.0, §5 — Fase 3 testplan): "aantal waterbeurten
// per overlay; som van alle stappen is exact het gevraagde watervolume; eerste fase is
// 40 procent bij Kasuya; timer telt tot de nieuwe totaaltijd." Plus de expliciet vereiste
// regressietest op de brouwtimer (non-negotiable "brew timer blijft betrouwbaar").
describe('buildPourSchedule() via computeRecipe() — gietschema-fixes (Implementatieplan Zetadvies v3.0, Fase 3 / D-3 & D-4)', () => {
  function pourSteps(rec){
    // Alle stappen behalve de afsluitende "Klaar"-stap (add:0) — de daadwerkelijke waterbeurten.
    return rec.steps.filter(s => s.add > 0);
  }

  test('Kasuya 4:6 (klassiek/heel_fruitig/vol_rond/zoet): precies 5 waterbeurten, niet 6 (D-3 — bloom telt niet dubbel)', () => {
    for (const profileKey of ['klassiek', 'heel_fruitig']){
      const rec = api.computeRecipe('v60', 'medium', profileKey, 300, null, false, null, null, false, null, null, 0);
      assert.equal(rec.technique, 'Kasuya 4:6', `${profileKey} zou de Kasuya-overlay moeten krijgen`);
      const steps = pourSteps(rec);
      assert.equal(steps.length, 5, `Kasuya (${profileKey}) hoort precies 5 waterbeurten te hebben (bloom is pour 1), kreeg ${steps.length}`);
      assert.equal(steps[0].label, 'Bloom', 'De eerste waterbeurt moet de bloom zijn, geen aparte extra stap ervoor');
    }
  });

  test('Kasuya 4:6: de eerste fase (bloom + pour 2) is exact 40% van het totale watervolume (§3b)', () => {
    const rec = api.computeRecipe('v60', 'medium', 'klassiek', 300, null, false, null, null, false, null, null, 0);
    const steps = pourSteps(rec);
    const phase1Water = steps[0].add + steps[1].add;
    assert.equal(phase1Water, Math.round(300 * 0.4), `Fase 1 (bloom+pour2) moet 40% van 300ml zijn, kreeg ${phase1Water}`);
    const phase2Water = steps[2].add + steps[3].add + steps[4].add;
    assert.equal(phase1Water + phase2Water, rec.water, 'Fase 1 + fase 2 samen moeten exact het totale watervolume zijn');
  });

  test('som van alle waterbeurten is exact het gevraagde/berekende watervolume, voor elk beschikbaar profiel/overlay', () => {
    const profiles = ['klassiek', 'heel_fruitig', 'fresh_clean', 'robuust', 'snel_puur', 'sirooprig_vol'];
    for (const profileKey of profiles){
      const rec = api.computeRecipe('v60', 'medium', profileKey, 300, null, false, null, null, false, null, null, 0);
      if (rec.dose === 0) continue; // geen geldig recept bij dit volume/profiel — niet van toepassing
      const steps = pourSteps(rec);
      const sum = steps.reduce((s, step) => s + step.add, 0);
      assert.equal(sum, rec.water, `${profileKey} (${rec.technique}): som van waterbeurten (${sum}) moet exact rec.water (${rec.water}) zijn`);
      // De laatste stap ("Klaar") moet ook exact op het totale volume uitkomen.
      assert.equal(rec.steps[rec.steps.length - 1].to, rec.water);
    }
  });

  test('April huismethode: geen aparte bloomstap (skipBloom), 6 gelijke waterbeurten', () => {
    const rec = api.computeRecipe('v60', 'medium', 'robuust', 300, null, false, null, null, false, null, null, 0);
    assert.equal(rec.technique, 'April huismethode');
    const steps = pourSteps(rec);
    assert.equal(steps.length, 6);
    assert.notEqual(steps[0].label, 'Bloom', 'April heeft bewust geen aparte bloomfase');
  });

  test('Hoffmann Ultimate: bloom blijft een aparte stap vóór de 2 hoofdpours (pulseCount telt de bloom NIET mee)', () => {
    const rec = api.computeRecipe('v60', 'medium', 'fresh_clean', 300, null, false, null, null, false, null, null, 0);
    assert.equal(rec.technique, 'Hoffmann Ultimate');
    const steps = pourSteps(rec);
    assert.equal(steps.length, 3, 'Hoffmann: bloom + 2 hoofdpours = 3 waterbeurten');
    assert.equal(steps[0].label, 'Bloom');
  });

  test('D-4: totalTime volgt uit de giet-structuur, niet meer uit het vaste contactTimeGuidance-middelpunt — varieert mee met het aantal waterbeurten', () => {
    const kasuya = api.computeRecipe('v60', 'medium', 'klassiek', 300, null, false, null, null, false, null, null, 0); // 5 beurten
    const hoffmann = api.computeRecipe('v60', 'medium', 'fresh_clean', 300, null, false, null, null, false, null, null, 0); // 3 beurten
    const april = api.computeRecipe('v60', 'medium', 'robuust', 300, null, false, null, null, false, null, null, 0); // 6 beurten
    assert.notEqual(kasuya.totalTime, hoffmann.totalTime, 'Een ander aantal waterbeurten moet een andere schemalengte geven — anders is dit nog steeds het oude vaste middelpunt');
    assert.ok(april.totalTime > hoffmann.totalTime, 'Meer waterbeurten (April, 6) moet een langer schema geven dan minder waterbeurten (Hoffmann, 3)');
    assert.ok(kasuya.totalTime > hoffmann.totalTime, 'Meer waterbeurten (Kasuya, 5) moet een langer schema geven dan minder waterbeurten (Hoffmann, 3)');
  });

  test('non-negotiable "brew timer blijft betrouwbaar" (regressietest, Fase 3-risico): totalTime is altijd een eindig, positief getal en de laatste stap valt op totalTime', () => {
    const profiles = ['klassiek', 'heel_fruitig', 'fresh_clean', 'robuust', 'snel_puur'];
    for (const profileKey of profiles){
      const rec = api.computeRecipe('v60', 'medium', profileKey, 300, null, false, null, null, false, null, null, 0);
      assert.ok(Number.isFinite(rec.totalTime) && rec.totalTime > 0, `${profileKey}: totalTime moet een eindig, positief getal zijn, kreeg ${rec.totalTime}`);
      const laatsteStap = rec.steps[rec.steps.length - 1];
      assert.equal(laatsteStap.label, 'Klaar — laten doorlopen');
      assert.equal(laatsteStap.t, rec.totalTime, 'De "Klaar"-stap moet op exact totalTime vallen — de timer telt hier naartoe');
      // Elke stap moet een niet-negatieve, oplopende tijd hebben (geen tijdreis in het schema).
      let prevT = -1;
      for (const s of rec.steps){
        assert.ok(s.t >= prevT, `${profileKey}: stap-tijden moeten niet-dalend zijn (${s.t} na ${prevT})`);
        prevT = s.t;
      }
    }
  });

  test('contactTimeDiagnosticBand is de ONVERANDERDE apparaatband en stuurt totalTime niet meer — puur een controle-achteraf-veld', () => {
    const rec = api.computeRecipe('v60', 'medium', 'klassiek', 300, null, false, null, null, false, null, null, 0);
    // (individuele properties i.p.v. deepEqual op het hele object: het object komt uit de
    // VM-sandbox en heeft dus een ander Object.prototype dan dit testbestand — deepEqual
    // zou daar terecht "niet reference-equal" op zeggen ondanks identieke inhoud.)
    assert.equal(rec.contactTimeDiagnosticBand.min, 120, 'De V60-diagnostische band zelf (registry) mag niet zijn aangepast');
    assert.equal(rec.contactTimeDiagnosticBand.max, 210, 'De V60-diagnostische band zelf (registry) mag niet zijn aangepast');
    assert.notEqual(rec.totalTime, Math.round((120 + 210) / 2), 'totalTime mag niet meer simpelweg het middelpunt van de diagnostische band zijn');
  });
});

// NIEUW (Implementatieplan Zetadvies v3.0, §5 — Fase 4 testplan): "oordeel per parameter
// klopt op de drie mengverhoudingen uit Fase 0; hardnessNudge() geeft aantoonbaar nog
// steeds temp: 0." Plus dekking voor de nieuwe alkaliniteit-omrekening en verdunningswiskunde.
describe('Waterprofiel — alkaliniteit, verdunning, per-parameter oordeel (Implementatieplan Zetadvies v3.0, Fase 4 / B-5, B-6)', () => {
  test('hardnessNudge() blijft een FORBIDDEN edge: altijd temp:0, ongewijzigd t.o.v. vóór Fase 4', () => {
    assert.equal(api.hardnessNudge(128).temp, 0);
    assert.equal(api.hardnessNudge(30).temp, 0);
    assert.equal(api.hardnessNudge(null).temp, 0);
    assert.match(api.hardnessNudge(128).note, /50–175 mg\/L/);
  });

  test('alkalinityNudge() is ook een FORBIDDEN edge: altijd temp:0, nooit een receptinvloed', () => {
    assert.equal(api.alkalinityNudge(50, 'CaCO3').temp, 0);
    assert.equal(api.alkalinityNudge(200, 'HCO3').temp, 0);
    assert.equal(api.alkalinityNudge(null, 'CaCO3').temp, 0);
  });

  test('HCO3→CaCO3-omrekening gebruikt exact de gedocumenteerde factor 0,82', () => {
    assert.equal(api.HCO3_TO_CACO3_FACTOR, 0.82);
    const result = api.alkalinityNudge(100, 'HCO3');
    assert.ok(Math.abs(result.mgLCaCO3 - 82) < 1e-9, `100 mg/L HCO3 moet 82 mg/L CaCO3-equivalent geven, kreeg ${result.mgLCaCO3}`);
  });

  test('waterSCAVerdict() geeft drie losse, correcte uitspraken (onder/binnen/boven), nooit een samengevoegd oordeel', () => {
    assert.match(api.waterSCAVerdict(30, 40, 70), /^onder/);
    assert.match(api.waterSCAVerdict(50, 40, 70), /^binnen/);
    assert.match(api.waterSCAVerdict(90, 40, 70), /^boven/);
    // Hardheid en alkaliniteit hebben BEWUST verschillende richtwaarden — nooit dezelfde band hergebruikt.
    // 45 mg/L: onder de hardheids-richtwaarde (50-175) maar wél binnen de alkaliniteits-richtwaarde (40-70).
    assert.match(api.waterSCAVerdict(45, 50, 175), /^onder/);
    assert.match(api.waterSCAVerdict(45, 40, 70), /^binnen/);
  });

  test('dilutedWaterValue(): de drie mengverhoudingen uit Fase 0 geven de in het plan getabelleerde effectieve waarden', () => {
    // Fase 0-tabel: 128 mg/L hardheid kraanwater, 1:0 → 128, 2:1 → 85, 1:1 → 64 (plan §3, Fase 0-tabel).
    assert.equal(Math.round(api.dilutedWaterValue(128, 1, 0)), 128);
    assert.equal(Math.round(api.dilutedWaterValue(128, 2, 1)), 85);
    assert.equal(Math.round(api.dilutedWaterValue(128, 1, 1)), 64);
    // Zelfde tabel voor alkaliniteit: 100 → 100, 2:1 → 67, 1:1 → 50.
    assert.equal(Math.round(api.dilutedWaterValue(100, 1, 0)), 100);
    assert.equal(Math.round(api.dilutedWaterValue(100, 2, 1)), 67);
    assert.equal(Math.round(api.dilutedWaterValue(100, 1, 1)), 50);
  });

  test('dilutedWaterValue() met een null/ontbrekende ruwe waarde blijft eerlijk null/undefined (geen verzonnen 0 of NaN)', () => {
    assert.equal(api.dilutedWaterValue(null, 1, 1), null);
    assert.equal(api.dilutedWaterValue(undefined, 1, 1), undefined);
  });
});

describe('RECORD_SCHEMA_VERSION — schema v2 t/m v4 (Implementatieplan Zetadvies v3.0 Fase 5/7, Reparatieplan v4.0 C-2)', () => {
  // BIJGEWERKT (Reparatieplan v4.0, C-2 / bevinding E-11): 4 (v4: beanSnapshot, additief).
  test('RECORD_SCHEMA_VERSION staat op 4 (v2: Fase 5-logboekvelden, v3: Fase 7 approved/grindStartingPoint, v4: C-2 beanSnapshot)', () => {
    // De daadwerkelijke opslag- en weergavelogica (saveBrewLogEntry(), de Historie-kaart,
    // en de migratie-/back-up-rondgangtests) draait via de echte DOM en staat daarom in
    // tests/kernflow.smoke.test.mjs — deze pure-logic-check bewaakt alleen het versiegetal
    // zelf, zodat een toekomstige per-ongeluk-terugdraai meteen opvalt.
    assert.equal(api.RECORD_SCHEMA_VERSION, 4);
  });
});

describe('cuppingSuggestionFor() — proef-naar-voorstel-mapping (Implementatieplan Zetadvies v3.0, Fase 6)', () => {
  const SCALE = { L: 1, MID: 2, H: 3 }; // laag / midden / hoog op de 0-4-schaal (drempel 1 punt)
  function scoresWith(overrides){
    const base = { aroma: SCALE.MID, zuur: SCALE.MID, zoet: SCALE.MID, body: SCALE.MID, bitter: SCALE.MID, aftersmaak: SCALE.MID, balans: SCALE.MID };
    return Object.assign(base, overrides);
  }

  test('cuppingAxisLevel(): drempel van 1 punt t.o.v. het midden (2) van de 0-4-schaal', () => {
    assert.equal(api.CUPPING_SCALE_CENTER, 2);
    assert.equal(api.CUPPING_NOISE_THRESHOLD, 1);
    assert.equal(api.cuppingAxisLevel({ zuur: 3 }, 'zuur'), 'hoog');
    assert.equal(api.cuppingAxisLevel({ zuur: 2 }, 'zuur'), 'midden');
    assert.equal(api.cuppingAxisLevel({ zuur: 1 }, 'zuur'), 'laag');
    assert.equal(api.cuppingAxisLevel({ zuur: 4 }, 'zuur'), 'hoog');
    assert.equal(api.cuppingAxisLevel({ zuur: 0 }, 'zuur'), 'laag');
    assert.equal(api.cuppingAxisLevel({}, 'zuur'), null, 'ontbrekende score blijft eerlijk null, geen verzonnen niveau');
  });

  test('Patroon 1 — zuur hoog + zoet laag + body laag → onderextractie, twee klikken fijner', () => {
    const s = api.cuppingSuggestionFor(scoresWith({ zuur: SCALE.H, zoet: SCALE.L, body: SCALE.L }));
    assert.ok(s, 'verwacht een match');
    assert.equal(s.pattern, 'onderextractie');
    assert.match(s.voorstel, /fijner/);
  });

  test('Patroon 2 — bitter hoog + aftersmaak hoog → overextractie, twee klikken grover', () => {
    const s = api.cuppingSuggestionFor(scoresWith({ bitter: SCALE.H, aftersmaak: SCALE.H }));
    assert.ok(s);
    assert.equal(s.pattern, 'overextractie');
    assert.match(s.voorstel, /grover/);
  });

  test('Patroon 3 — alle smaakassen laag + balans hoog → te zwak, meer dosis bij gelijk water', () => {
    const s = api.cuppingSuggestionFor(scoresWith({
      aroma: SCALE.L, zuur: SCALE.L, zoet: SCALE.L, body: SCALE.L, bitter: SCALE.L, aftersmaak: SCALE.L, balans: SCALE.H
    }));
    assert.ok(s);
    assert.equal(s.pattern, 'te_zwak');
    assert.match(s.voorstel, /dosis/);
    assert.doesNotMatch(s.voorstel, /water(hoeveelheid)? (aan|ver)passen|meer water|minder water/i, 'water moet nadrukkelijk gelijk blijven, dit is geen watervoorstel');
  });

  test('Patroon 4 — zuur laag + bitter laag + aftersmaak laag (en balans niet hoog) → vlak/waterbuffering, verwijst naar waterprofiel', () => {
    const s = api.cuppingSuggestionFor(scoresWith({ zuur: SCALE.L, bitter: SCALE.L, aftersmaak: SCALE.L, balans: SCALE.MID }));
    assert.ok(s);
    assert.equal(s.pattern, 'vlak_waterbuffering');
    assert.equal(s.wijstNaarWaterprofiel, true);
  });

  test('Eén voorstel per keer: als zowel "te zwak" als "vlak/waterbuffering" tegelijk zouden matchen, wint de tabelvolgorde (te zwak eerst)', () => {
    // Alle assen laag + balans hoog voldoet óók aan patroon 4 (zuur/bitter/aftersmaak laag)
    // — de plantabel geeft geen expliciete tie-break, dus deze functie kiest bewust de
    // volgorde uit de tabel zelf en geeft nooit twee voorstellen tegelijk.
    const s = api.cuppingSuggestionFor(scoresWith({
      aroma: SCALE.L, zuur: SCALE.L, zoet: SCALE.L, body: SCALE.L, bitter: SCALE.L, aftersmaak: SCALE.L, balans: SCALE.H
    }));
    assert.equal(s.pattern, 'te_zwak');
  });

  test('Geen enkel patroon matcht → null, geen verzonnen voorstel bij een neutrale of onduidelijke logging', () => {
    assert.equal(api.cuppingSuggestionFor(scoresWith({})), null, 'alles op het midden mag nooit een voorstel opleveren');
    assert.equal(api.cuppingSuggestionFor(scoresWith({ zuur: SCALE.H })), null, 'één enkele afwijkende as (geen volledig patroon) mag geen voorstel opleveren');
    assert.equal(api.cuppingSuggestionFor(null), null);
    assert.equal(api.cuppingSuggestionFor(undefined), null);
  });

  test('Nooit automatisch een receptveld raken: het voorstel is puur tekst/labels, geen recept- of statesleutels', () => {
    const s = api.cuppingSuggestionFor(scoresWith({ zuur: SCALE.H, zoet: SCALE.L, body: SCALE.L }));
    const keys = Object.keys(s).sort();
    assert.deepEqual(keys, ['diagnose', 'pattern', 'voorstel', 'wijstNaarWaterprofiel'].sort());
  });
});

describe('Boontype-model — buckets, terugvalladder, vervuilingsregels (Implementatieplan Zetadvies v3.0, Fase 7)', () => {
  // Eigen, geïsoleerde app-instantie: deze tests muteren brewLog/beanLibrary rechtstreeks
  // (live array-referenties uit __TEST_EXPORTS__) en mogen de eerdere describe-blokken
  // hierboven (die de gedeelde top-level `api` gebruiken) niet kunnen beïnvloeden.
  const { api: api2 } = loadApp();

  const WATER_A = { hardnessMgL: 128, alkalinity: { value: 50, unit: 'CaCO3' }, dilution: { tapParts: 1, demiParts: 0 } };
  const WATER_B = { hardnessMgL: 90, alkalinity: { value: 50, unit: 'CaCO3' }, dilution: { tapParts: 1, demiParts: 0 } };

  function resetStores(){
    api2.brewLog.length = 0;
    api2.beanLibrary.length = 0;
  }
  function addBean(overrides){
    const bean = Object.assign({ id: 'bean_' + Math.random().toString(36).slice(2), roastLevel: 'light', process: 'washed', intendedUse: null }, overrides);
    api2.beanLibrary.push(bean);
    return bean;
  }
  function addEntry(overrides){
    const entry = Object.assign({
      id: 'log_' + Math.random().toString(36).slice(2), method: 'v60', roast: 'light', approved: true,
      grindStand: null, grindStartingPoint: 20, actualGrindClicks: 20,
      waterProfileSnapshot: WATER_A
    }, overrides);
    api2.brewLog.push(entry);
    return entry;
  }

  test('roastBucketFor()/processBucketFor(): exact de indeling uit het plan, onbekend geeft eerlijk null', () => {
    assert.equal(api2.roastBucketFor('light'), 'light_lm');
    assert.equal(api2.roastBucketFor('light_medium'), 'light_lm');
    assert.equal(api2.roastBucketFor('medium'), 'medium');
    assert.equal(api2.roastBucketFor('medium_dark'), 'mediumdark_dark');
    assert.equal(api2.roastBucketFor('dark'), 'mediumdark_dark');
    assert.equal(api2.roastBucketFor('onbekend'), null);
    assert.equal(api2.processBucketFor('washed'), 'washed');
    assert.equal(api2.processBucketFor('natural'), 'natural_anaerobic');
    assert.equal(api2.processBucketFor('anaerobic'), 'natural_anaerobic');
    assert.equal(api2.processBucketFor('honey'), 'honey');
    assert.equal(api2.processBucketFor('overig'), null, '"Weet ik niet" geeft geen exact emmertje');
  });

  test('recipeGrindBaseline(): gebruikt grindStand als die er is, valt anders terug op grindStartingPoint ("het vertrekpunt")', () => {
    assert.equal(api2.recipeGrindBaseline({ grindStand: 15, grindStartingPoint: 20 }), 15);
    assert.equal(api2.recipeGrindBaseline({ grindStand: null, grindStartingPoint: 20 }), 20);
    assert.equal(api2.recipeGrindBaseline({ grindStand: null, grindStartingPoint: null }), null);
    assert.equal(api2.recipeGrindBaseline({}), null);
  });

  test('matchesWaterProfile(): alleen een exacte match op alle drie velden telt (B-7-basis)', () => {
    assert.equal(api2.matchesWaterProfile(WATER_A, WATER_A), true);
    assert.equal(api2.matchesWaterProfile({ hardnessMgL: 128, alkalinity: { value: 50, unit: 'CaCO3' }, dilution: { tapParts: 1, demiParts: 0 } }, WATER_A), true, 'gelijke waarden, andere objectinstantie, moet nog steeds matchen');
    assert.equal(api2.matchesWaterProfile(WATER_B, WATER_A), false, 'andere hardheid mag niet matchen');
    assert.equal(api2.matchesWaterProfile(null, WATER_A), false, 'ontbrekende snapshot (bijv. schemaVersion < 3) matcht nooit');
    assert.equal(api2.matchesWaterProfile(WATER_A, null), false);
  });

  test('Exact emmertje: bij n=3 in branddiepte+verwerking+methode krijg je level "exact" met het juiste gemiddelde', () => {
    resetStores();
    const bean = addBean({ roastLevel: 'light', process: 'washed' });
    addEntry({ beanId: bean.id, roast: 'light', grindStartingPoint: 20, actualGrindClicks: 18 }); // -2
    addEntry({ beanId: bean.id, roast: 'light', grindStartingPoint: 20, actualGrindClicks: 18 }); // -2
    addEntry({ beanId: bean.id, roast: 'light', grindStartingPoint: 20, actualGrindClicks: 20 }); // 0
    const result = api2.learningCorrectionFor(bean, 'v60', WATER_A);
    assert.ok(result);
    assert.equal(result.level, 'exact');
    assert.equal(result.n, 3);
    assert.ok(Math.abs(result.avgClicks - (-4/3)) < 1e-9, `verwacht gemiddelde -4/3, kreeg ${result.avgClicks}`);
    assert.match(api2.learningCorrectionText(result), /fijner/, 'negatief gemiddelde (lager klikgetal) is fijner');
  });

  test('Terugvalladder: te weinig in het exacte emmertje verbreedt eerst naar "verwerking laten vallen" (roast_only)', () => {
    resetStores();
    const beanWashed = addBean({ roastLevel: 'light', process: 'washed' });
    const beanNatural = addBean({ roastLevel: 'light_medium', process: 'natural' }); // zelfde branddiepte-bucket (light_lm), andere verwerking
    addEntry({ beanId: beanWashed.id, roast: 'light', actualGrindClicks: 22 }); // +2, enige washed-logging (< LEARNING_MIN_N)
    addEntry({ beanId: beanNatural.id, roast: 'light_medium', actualGrindClicks: 22 }); // +2
    addEntry({ beanId: beanNatural.id, roast: 'light_medium', actualGrindClicks: 22 }); // +2
    const result = api2.learningCorrectionFor(beanWashed, 'v60', WATER_A);
    assert.ok(result);
    assert.equal(result.level, 'roast_only', 'exact emmertje heeft maar n=1, moet verbreden naar branddiepte-bucket zonder verwerkingseis');
    assert.equal(result.n, 3);
    assert.equal(result.processBucket, null, 'op het roast_only-niveau is er geen enkel verwerkings-emmertje meer, dus geen enkele mag als "het" emmertje worden gepresenteerd');
    assert.match(api2.learningCorrectionText(result), /verwerking losgelaten/);
  });

  test('Terugvalladder: nog steeds te weinig na verwerking laten vallen verbreedt ook naar branddiepte (method_only)', () => {
    resetStores();
    const beanLight = addBean({ roastLevel: 'light', process: 'washed' });
    const beanDark = addBean({ roastLevel: 'dark', process: 'natural' }); // andere branddiepte-bucket
    addEntry({ beanId: beanLight.id, roast: 'light', actualGrindClicks: 22 });
    addEntry({ beanId: beanDark.id, roast: 'dark', actualGrindClicks: 24 });
    addEntry({ beanId: beanDark.id, roast: 'dark', actualGrindClicks: 24 });
    const result = api2.learningCorrectionFor(beanLight, 'v60', WATER_A);
    assert.ok(result);
    assert.equal(result.level, 'method_only');
    assert.equal(result.n, 3);
    assert.match(api2.learningCorrectionText(result), /breedst mogelijke niveau/);
  });

  test('Onder de drempel op elk niveau: eerlijk "onvoldoende" met het werkelijke n, nooit stilzwijgend niets', () => {
    resetStores();
    const bean = addBean({ roastLevel: 'light', process: 'washed' });
    addEntry({ beanId: bean.id, roast: 'light', actualGrindClicks: 22 });
    const result = api2.learningCorrectionFor(bean, 'v60', WATER_A);
    assert.ok(result);
    assert.equal(result.level, 'onvoldoende');
    assert.equal(result.n, 1);
    assert.equal(result.avgClicks, null, 'geen betrouwbaar gemiddelde tonen bij te weinig data');
    assert.match(api2.learningCorrectionText(result), /1 goedgekeurde/);
  });

  test('Echt niets beschikbaar (geen enkele match) geeft null, geen "onvoldoende" met n=0', () => {
    resetStores();
    const bean = addBean({ roastLevel: 'light', process: 'washed' });
    const result = api2.learningCorrectionFor(bean, 'v60', WATER_A);
    assert.equal(result, null);
  });

  test('Vervuilingsregel 1: niet-goedgekeurde brouwsels tellen nooit mee, ook niet als er genoeg van zijn', () => {
    resetStores();
    const bean = addBean({ roastLevel: 'light', process: 'washed' });
    addEntry({ beanId: bean.id, roast: 'light', approved: false, actualGrindClicks: 18 });
    addEntry({ beanId: bean.id, roast: 'light', approved: false, actualGrindClicks: 18 });
    addEntry({ beanId: bean.id, roast: 'light', approved: false, actualGrindClicks: 18 });
    const result = api2.learningCorrectionFor(bean, 'v60', WATER_A);
    assert.equal(result, null, 'drie NIET-goedgekeurde loggings mogen geen correctie opleveren');
  });

  test('Vervuilingsregel 2: espresso-bedoelde bonen zijn volledig uitgesloten, geen eigen emmertje', () => {
    resetStores();
    const bean = addBean({ roastLevel: 'medium', process: 'washed', intendedUse: 'espresso' });
    addEntry({ beanId: bean.id, roast: 'medium', actualGrindClicks: 18 });
    addEntry({ beanId: bean.id, roast: 'medium', actualGrindClicks: 18 });
    addEntry({ beanId: bean.id, roast: 'medium', actualGrindClicks: 18 });
    assert.equal(api2.learningCorrectionFor(bean, 'v60', WATER_A), null, 'espresso-bedoelde boon zelf mag geen correctie opleveren');

    // Ook als iemand ANDERS (een niet-espresso boon in hetzelfde emmertje) om een correctie
    // vraagt, mogen deze espresso-loggings niet stiekem meetellen in dat emmertje.
    const beanFilter = addBean({ roastLevel: 'medium', process: 'washed', intendedUse: null });
    const result = api2.learningCorrectionFor(beanFilter, 'v60', WATER_A);
    assert.equal(result, null, 'espresso-loggings mogen niet meetellen voor een ANDERE (filter-bedoelde) boon in hetzelfde emmertje');
  });

  test('B-7: een gewijzigd waterprofiel sluit het lopende segment af — oudere loggings tellen niet meer mee', () => {
    resetStores();
    const bean = addBean({ roastLevel: 'light', process: 'washed' });
    addEntry({ beanId: bean.id, roast: 'light', actualGrindClicks: 18, waterProfileSnapshot: WATER_A });
    addEntry({ beanId: bean.id, roast: 'light', actualGrindClicks: 18, waterProfileSnapshot: WATER_A });
    addEntry({ beanId: bean.id, roast: 'light', actualGrindClicks: 18, waterProfileSnapshot: WATER_A });
    // Onder WATER_A precies genoeg voor "exact".
    assert.equal(api2.learningCorrectionFor(bean, 'v60', WATER_A).level, 'exact');
    // Na een (gesimuleerde) waterprofielwijziging naar WATER_B tellen dezelfde drie loggings niet meer mee.
    assert.equal(api2.learningCorrectionFor(bean, 'v60', WATER_B), null, 'oude loggings onder een ander waterprofiel mogen het nieuwe segment niet vullen');
  });

  test('Ontbrekende klikgegevens (geen grindStartingPoint/grindStand of geen actualGrindClicks) tellen niet mee', () => {
    resetStores();
    const bean = addBean({ roastLevel: 'light', process: 'washed' });
    addEntry({ beanId: bean.id, roast: 'light', actualGrindClicks: null }); // niet ingevuld bij het loggen
    addEntry({ beanId: bean.id, roast: 'light', grindStartingPoint: null, grindStand: null, actualGrindClicks: 18 }); // geen vertrekpunt bekend
    addEntry({ beanId: bean.id, roast: 'light', actualGrindClicks: 18 }); // deze is wel compleet
    const result = api2.learningCorrectionFor(bean, 'v60', WATER_A);
    assert.equal(result.level, 'onvoldoende');
    assert.equal(result.n, 1, 'alleen de logging met zowel een vertrekpunt als een werkelijk klikgetal telt mee');
  });

  // NIEUW (Reparatieplan v4.0, C-3 / bevinding E-12): learningEligibleEntries() poolde tot
  // nu toe over elk watervolume heen — een correctie uit een 265 ml-kop en een uit een
  // 380 ml-kop werden ongewogen gemiddeld, terwijl de beddiepte daar ~40% verschilt.
  test('C-3: drie goedgekeurde loggings op hetzelfde volume geven een correctie; verplaats er één buiten de LEARNING_VOLUME_TOLERANCE en ze telt niet meer mee', () => {
    resetStores();
    const bean = addBean({ roastLevel: 'light', process: 'washed' });
    addEntry({ beanId: bean.id, roast: 'light', actualGrindClicks: 22, waterMl: 300 }); // +2
    addEntry({ beanId: bean.id, roast: 'light', actualGrindClicks: 22, waterMl: 300 }); // +2
    addEntry({ beanId: bean.id, roast: 'light', actualGrindClicks: 22, waterMl: 300 }); // +2
    const voor = api2.learningCorrectionFor(bean, 'v60', WATER_A, 300);
    assert.equal(voor.level, 'exact');
    assert.equal(voor.n, 3);
    assert.equal(voor.volMin, 300);
    assert.equal(voor.volMax, 300);

    // Verplaats de logging naar 600 ml (50% verschil met 300 ml, > de 40%-tolerantie) —
    // die telt nu niet meer mee voor een aanvraag op 300 ml, dus n zakt naar 2 en level
    // naar 'onvoldoende'.
    api2.brewLog[0].waterMl = 600;
    const na = api2.learningCorrectionFor(bean, 'v60', WATER_A, 300);
    assert.equal(na.level, 'onvoldoende');
    assert.equal(na.n, 2, 'de logging op 600 ml valt buiten de 40%-tolerantie t.o.v. de gevraagde 300 ml');
  });

  test('C-3: zonder currentVolumeMl (bv. bestaande aanroepen) blijft het gedrag ongewijzigd — geen volumefilter', () => {
    resetStores();
    const bean = addBean({ roastLevel: 'light', process: 'washed' });
    addEntry({ beanId: bean.id, roast: 'light', actualGrindClicks: 22, waterMl: 265 });
    addEntry({ beanId: bean.id, roast: 'light', actualGrindClicks: 22, waterMl: 380 });
    addEntry({ beanId: bean.id, roast: 'light', actualGrindClicks: 22, waterMl: 300 });
    const result = api2.learningCorrectionFor(bean, 'v60', WATER_A);
    assert.equal(result.level, 'exact', 'zonder currentVolumeMl mag geen enkele logging worden uitgesloten op volume');
    assert.equal(result.n, 3);
  });
});

describe('Reparatieplan v4.0 — Fase A (eerlijkheidsherstel)', () => {
  test('A-4: overlays zonder gecorroboreerd pulseCount melden dat het aantal beurten eigen invulling is', () => {
    for (const [profile, naam] of [['fruitig_clean','Rao'], ['snel_puur','Perger']]){
      const rec = api.computeRecipe('v60','medium',profile,300,null,false,null,null,false,null,null,0);
      assert.equal(rec.pulseCountSourced, false, `${naam} heeft geen gecorroboreerd pulseCount`);
      assert.match(rec.notes, /geen aantal giet-momenten|eigen invulling van deze app/,
        `${naam}: de notitie moet melden dat het aantal beurten niet uit de bron komt`);
    }
    const kasuya = api.computeRecipe('v60','medium','klassiek',300,null,false,null,null,false,null,null,0);
    assert.equal(kasuya.pulseCountSourced, true, 'Kasuya heeft pulseCount 5 als RESOLVED');
  });

  test('A-5: sizeWarning is altijd leeg — het veld bestaat nog voor compatibiliteit maar vuurt nooit', () => {
    for (let v = 265; v <= 380; v += 5){
      const rec = api.computeRecipe('v60','medium','klassiek',v,null,false,null,null,false,null,null,0);
      assert.equal(rec.sizeWarning, '', `sizeWarning moet leeg zijn bij ${v} ml`);
    }
  });

  test('A-6: ratioText gebruikt altijd een Nederlandse komma, met en zonder sterktehendel', () => {
    for (const st of [-1, 0, 1]){
      const rec = api.computeRecipe('v60','medium','klassiek',300,null,false,null,null,false,null,null,st);
      assert.ok(!rec.ratioText.includes('.'), `ratioText mag geen punt bevatten (kreeg ${rec.ratioText})`);
      assert.match(rec.ratioText, /^1:\d+,\d$/);
    }
  });
});

describe('B-1 — sterktehendel respecteert het harde dosisplafond (bevinding E-02)', () => {
  test('dosis blijft over het HELE geldige volumebereik en alle sterktestappen binnen 15–22 g (V60)', () => {
    for (let v = 265; v <= 380; v += 5){
      for (const st of [-1, 0, 1]){
        const rec = api.computeRecipe('v60','medium','klassiek',v,null,false,null,null,false,null,null,st);
        if (rec.dose === 0) continue;
        assert.ok(rec.dose >= 14.999 && rec.dose <= 22.001,
          `V60_DOSE_CEILING geschonden bij ${v} ml / sterkte ${st}: dosis ${rec.dose} g`);
      }
    }
  });
  test('geklemd betekent gemeld, nooit stil (de D-2-les)', () => {
    const rec = api.computeRecipe('v60','medium','klassiek',380,null,false,null,null,false,null,null,1);
    assert.equal(rec.dose, 22);
    assert.match(rec.strengthNote, /Begrensd/, 'een klem moet expliciet gemeld worden');
  });
  test('zonder klem blijft de melding ongewijzigd (negatieve controle)', () => {
    const rec = api.computeRecipe('v60','medium','klassiek',300,null,false,null,null,false,null,null,1);
    assert.equal(rec.dose, 18.7);
    assert.ok(!rec.strengthNote.includes('Begrensd'));
  });
});

describe('B-3 — giet-intervallen volgen POUR_CYCLE_SEC (bevinding E-04)', () => {
  test('elk interval tussen twee waterbeurten is exact POUR_CYCLE_SEC, voor elk profiel', () => {
    for (const p of ['klassiek','heel_fruitig','fresh_clean','robuust','snel_puur','sirooprig_vol']){
      const rec = api.computeRecipe('v60','medium',p,300,null,false,null,null,false,null,null,0);
      if (rec.dose === 0) continue;
      const ts = rec.steps.filter(s => s.add > 0).map(s => s.t);
      for (let i = 1; i < ts.length; i++){
        assert.equal(ts[i] - ts[i-1], 30,
          `${p}: interval ${i} is ${ts[i]-ts[i-1]}s, verwacht 30s (POUR_CYCLE_SEC)`);
      }
    }
  });
  test('de staart na de laatste pour is POUR_CYCLE_SEC + FINAL_DRAWDOWN_SEC = 70s', () => {
    for (const p of ['klassiek','fresh_clean','robuust','snel_puur']){
      const rec = api.computeRecipe('v60','medium',p,300,null,false,null,null,false,null,null,0);
      const ts = rec.steps.filter(s => s.add > 0).map(s => s.t);
      assert.equal(rec.totalTime - ts[ts.length-1], 70, `${p}: staart moet 70s zijn`);
    }
  });
  test('N-6: totalTime is ONVERANDERD t.o.v. vóór deze fix (brouwtimer-regressie)', () => {
    const verwacht = { klassiek:190, fresh_clean:130, robuust:220, snel_puur:100, sirooprig_vol:160 };
    for (const [p, t] of Object.entries(verwacht)){
      const rec = api.computeRecipe('v60','medium',p,300,null,false,null,null,false,null,null,0);
      assert.equal(rec.totalTime, t, `${p}: totalTime mag door B-3 niet veranderen`);
    }
  });
});

describe('B-2a — de app geeft de gebruiker niet de schuld van zijn eigen schema (bevinding E-03)', () => {
  // BIJGEWERKT (Reparatieplan v4.0, B-2b / Bouwbesluit BB-1): vóór B-2b viel ELK
  // Chemex-schema buiten de band, dus 'klassiek' (het 3-pulse Kernrecept) volstond als
  // voorbeeld. Na B-2b is precies dát 3-pulse-schema (waarop de nieuwe cyclusconstanten
  // zijn geijkt) weer BINNEN de band — de winst van B-2b. 'fresh_clean' (Hoffmann, 2
  // pulses) heeft een andere pulseCount en blijft daarom terecht buiten de band: D-4
  // (schemalengte volgt het aantal giet-momenten) is met B-2b niet losgelaten.
  test('op Chemex valt een schema met een afwijkend aantal giet-momenten nog steeds buiten de band, zonder de gebruiker de schuld te geven', () => {
    const rec = api.computeRecipe('chemex','medium','fresh_clean',600,null,false,null,null,false,null,null,0);
    const { min, max } = rec.contactTimeDiagnosticBand;
    assert.ok(rec.totalTime < min || rec.totalTime > max,
      'randvoorwaarde van deze test: dit Chemex-schema valt inderdaad buiten de band');
  });
});

describe('B-2b — brewer-specifieke cyclusconstanten (Bouwbesluit BB-1, akkoord gebruiker)', () => {
  test('het 3-pulse Kernrecept-schema (klassiek/heel_fruitig) valt nu binnen de Chemex-diagnostische band', () => {
    for (const p of ['klassiek','heel_fruitig']){
      const rec = api.computeRecipe('chemex','medium',p,600,null,false,null,null,false,null,null,0);
      const { min, max } = rec.contactTimeDiagnosticBand;
      assert.ok(rec.totalTime >= min && rec.totalTime <= max,
        `${p}: het 3-pulse Chemex-schema (${rec.totalTime}s) hoort na B-2b binnen ${min}-${max}s te vallen`);
    }
  });
  test('V60 s totalTime per profiel is volledig ongewijzigd door B-2b (V60 is de referentie, factor 1)', () => {
    const verwacht = { klassiek:190, fresh_clean:130, robuust:220, snel_puur:100, sirooprig_vol:160 };
    for (const [p, t] of Object.entries(verwacht)){
      const rec = api.computeRecipe('v60','medium',p,300,null,false,null,null,false,null,null,0);
      assert.equal(rec.totalTime, t, `${p}: V60-totalTime mag door B-2b niet veranderen`);
    }
  });
  test('een schema met een ander aantal giet-momenten blijft op Chemex evenredig langer/korter (D-4 blijft intact)', () => {
    const drie = api.computeRecipe('chemex','medium','klassiek',600,null,false,null,null,false,null,null,0);
    const twee = api.computeRecipe('chemex','medium','fresh_clean',600,null,false,null,null,false,null,null,0);
    const een = api.computeRecipe('chemex','medium','snel_puur',600,null,false,null,null,false,null,null,0);
    assert.ok(een.totalTime < twee.totalTime && twee.totalTime < drie.totalTime,
      'minder giet-momenten moet nog steeds een korter schema opleveren, ook na B-2b');
  });
});

describe('B-5 — brewer-ratio zichtbaar bij bypass (bevinding E-08)', () => {
  test('bij bypass wordt de werkelijke brewer-ratio genoemd, niet alleen de eindratio', () => {
    const rec = api.computeRecipe('v60','medium','klassiek',300,null,false,null,null,true,null,null,0);
    assert.ok(rec.pourWaterMl < rec.water, 'randvoorwaarde: bypass is actief');
    const brewerRatio = rec.pourWaterMl / rec.dose;
    assert.ok(brewerRatio < 13, `brewer-ratio hoort rond 1:12 te liggen, kreeg 1:${brewerRatio.toFixed(1)}`);
    assert.match(rec.bypassNote, /In de brewer zet je feitelijk op 1:/);
    assert.match(rec.bypassNote, /buiten dat venster/);
  });
});

describe('C-1 — Kasuya taste dial (bevinding E-05, Bouwbesluit BB-2)', () => {
  test('de drie standen leveren de bedoelde fase-1-verdeling bij 300 ml', () => {
    const verwacht = { heel_fruitig:[70,50], klassiek:[60,60], zoet:[50,70] };
    for (const [p, [a,b]] of Object.entries(verwacht)){
      const st = api.computeRecipe('v60','medium',p,300,null,false,null,null,false,null,null,0)
                    .steps.filter(s=>s.add>0);
      assert.equal(st[0].add, a, `${p}: eerste pour`);
      assert.equal(st[1].add, b, `${p}: tweede pour`);
    }
  });
  test('INVARIANT: fase 1 blijft exact 40% (afgerond op 5g, een pre-bestaande, door C-1 ongewijzigde conventie) en de som blijft exact het watervolume, voor elke stand', () => {
    for (const p of ['heel_fruitig','klassiek','vol_rond','zoet']){
      for (const vol of [270, 300, 340, 380]){
        const rec = api.computeRecipe('v60','medium',p,vol,null,false,null,null,false,null,null,0);
        if (rec.dose === 0) continue;
        const st = rec.steps.filter(s=>s.add>0);
        // BIJGEWERKT: phaseWater rondt al vóór C-1 af op het dichtstbijzijnde vijftal
        // (ongewijzigd door C-1, dat alleen de verdeling BINNEN fase 1 raakt) — bij 270ml
        // geeft dat 110g, niet het naïef afgeronde 108g. Zie ook §3b-testeis elders.
        assert.equal(st[0].add + st[1].add, Math.round((rec.water * 0.4) / 5) * 5,
          `${p} @ ${vol}ml: fase 1 moet ~40% blijven (afgerond op 5g)`);
        assert.equal(st.reduce((a,s)=>a+s.add,0), rec.water,
          `${p} @ ${vol}ml: som moet exact het watervolume zijn`);
      }
    }
  });
  test('een overlay zonder fase-mechanisme negeert de bias volledig (negatieve controle)', () => {
    const voor = api.computeRecipe('v60','medium','fresh_clean',300,null,false,null,null,false,null,null,0);
    assert.equal(voor.technique, 'Hoffmann Ultimate');
    const st = voor.steps.filter(s=>s.add>0);
    assert.equal(st[1].add, st[2].add + (st[1].add - st[2].add), 'Hoffmann-verdeling blijft de generieke');
  });
});

describe('C-2 — boon-snapshot op elke logging (bevinding E-11)', () => {
  test('een schemaVersion-4-logging gebruikt zijn eigen boon-snapshot, niet de live boon', () => {
    const bean = { id:'b1', name:'Test', roastLevel:'light', process:'washed', intendedUse:'filter' };
    api.beanLibrary.length = 0; api.beanLibrary.push(bean);
    const entry = { method:'v60', roast:'light', approved:true, grindStartingPoint:14,
      actualGrindClicks:12, beanId:'b1', schemaVersion:4,
      beanSnapshot:{ process:'natural', intendedUse:'filter', roastLevel:'light' },
      waterProfileSnapshot:{ hardnessMgL:null, alkalinity:{value:null,unit:'CaCO3'},
                             dilution:{tapParts:1,demiParts:0} } };
    assert.equal(api.processBucketFor(entry.beanSnapshot.process), 'natural_anaerobic');
    // wijzig de live boon; de snapshot moet winnen
    bean.process = 'honey';
    assert.equal(api.processBucketFor(entry.beanSnapshot.process), 'natural_anaerobic');
  });
});

describe('C-4 — onderextractie verbreed + conflictbewaking (bevinding E-13)', () => {
  test('zuur hoog + body laag + zoet MIDDEN telt nu als onderextractie', () => {
    const s = { aroma:2, zuur:4, zoet:2, body:0, bitter:1, aftersmaak:2, balans:2 };
    assert.equal(api.cuppingSuggestionFor(s).pattern, 'onderextractie');
  });
  test('tegenstrijdige signalen leveren geen maalverandering maar een herhaalverzoek', () => {
    const s = { aroma:2, zuur:4, zoet:2, body:0, bitter:4, aftersmaak:4, balans:2 };
    const sug = api.cuppingSuggestionFor(s);
    assert.equal(sug.pattern, 'gemengd_signaal');
    assert.ok(!/fijner|grover/.test(sug.voorstel), 'bij een conflict nooit een maalrichting adviseren');
  });
  test('zuiver overextractie blijft ongewijzigd (negatieve controle)', () => {
    const s = { aroma:2, zuur:1, zoet:2, body:3, bitter:4, aftersmaak:4, balans:2 };
    assert.equal(api.cuppingSuggestionFor(s).pattern, 'overextractie');
  });
});

describe('C-5 — retentiemeting (bevinding E-07b, Bouwbesluit BB-3, akkoord gebruiker: alleen weergave)', () => {
  function resetBrewLog(){ api.brewLog.length = 0; }
  function addEntry(overrides){
    api.brewLog.push(Object.assign({ method:'v60', bypass:false, doseG:17, waterMl:300, cupWeightG:266 }, overrides));
  }
  test('5 loggingen met bruikbaar kopgewicht geven een gemiddelde', () => {
    resetBrewLog();
    for (let i=0;i<5;i++) addEntry({ cupWeightG: 266 }); // (300-266)/17 = 2.0
    const res = api.measuredRetention('v60');
    assert.equal(res.n, 5);
    assert.equal(res.gemiddelde, 2.0);
  });
  test('4 loggingen geven gemiddelde:null met n:4 (onder RETENTION_MIN_N)', () => {
    resetBrewLog();
    for (let i=0;i<4;i++) addEntry({ cupWeightG: 266 });
    const res = api.measuredRetention('v60');
    assert.equal(res.n, 4);
    assert.equal(res.gemiddelde, null);
  });
  test('een bypass-logging telt niet mee', () => {
    resetBrewLog();
    for (let i=0;i<5;i++) addEntry({ cupWeightG: 266 });
    addEntry({ cupWeightG: 266, bypass: true });
    const res = api.measuredRetention('v60');
    assert.equal(res.n, 5, 'de bypass-logging mag het aantal bruikbare metingen niet ophogen');
  });
  test('een kopgewicht van 50 g bij 300 ml water (retentie 14,7 g/g) telt als uitgesloten, niet als geldig', () => {
    resetBrewLog();
    for (let i=0;i<5;i++) addEntry({ cupWeightG: 266 });
    addEntry({ cupWeightG: 50 });
    const res = api.measuredRetention('v60');
    assert.equal(res.n, 5, 'de onwaarschijnlijke meting mag het gemiddelde niet aantasten');
    assert.equal(res.uitgesloten, 1);
  });
});
