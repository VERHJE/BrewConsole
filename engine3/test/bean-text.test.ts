import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COUNTRY_SCAN_SYNONYMS, EXPERIMENTAL_SCAN_KEYWORDS, FLAVOR_SCAN_SYNONYMS, INTENDED_USE_SCAN_KEYWORDS,
  PROCESS_SCAN_KEYWORDS, REGION_SCAN_SYNONYMS, ROAST_SCAN_KEYWORDS, VARIETY_SCAN_SYNONYMS
} from '../src/data/bean-scan-data.ts';
import { expandSharedHeadNouns, extractAltitudeFromText, extractAltitudeRangeFromText, extractFarmFromText, parseBeanText, scanFlavorTagsInText } from '../src/bean/text.ts';

// De zakherkenning komt uit de oude app (brewconsole_v2_2.html). Die app is op 17 nov 2026 uit de repo gehaald; zijn uitkomsten
// staan vast in test/oude-app/*.json (zie het veld `bron`). Engine 3 moet daar exact op uitkomen. Faalt dit, dan is de
// herkenning veranderd: is dat bewust, leg het dan vast in de bouwbesluiten en maak de testgegevens opnieuw.
const lees = (f: string): any => JSON.parse(readFileSync(new URL(`./oude-app/${f}`, import.meta.url), 'utf8'));
const lijsten = lees('woordenlijsten.json');
const herkenning = lees('zakherkenning.json') as { nowMs: number; cases: Array<{ text: string; out: string }> };
const losse = lees('losse-functies.json');

test('de woordenlijsten zijn gelijk aan die van de oude app', () => {
  const same = (a: unknown, b: unknown, name: string): void => assert.equal(JSON.stringify(a), JSON.stringify(b), name);
  same(ROAST_SCAN_KEYWORDS, lijsten.roast, 'roast');
  same(INTENDED_USE_SCAN_KEYWORDS, lijsten.gebruik, 'gebruik');
  same(PROCESS_SCAN_KEYWORDS, lijsten.proces, 'proces');
  same(EXPERIMENTAL_SCAN_KEYWORDS, lijsten.experimenteel, 'experimenteel');
  same(COUNTRY_SCAN_SYNONYMS, lijsten.land, 'land');
  same(REGION_SCAN_SYNONYMS, lijsten.regio, 'regio');
  same(VARIETY_SCAN_SYNONYMS, lijsten.varieteit, 'variëteit');
  same(FLAVOR_SCAN_SYNONYMS, lijsten.smaak, 'smaak');
});

test('zakherkenning: 797 etiketten geven dezelfde uitkomst als de oude app (voorbeeldzakken, plak- en OCR-teksten, rare invoer, 600 willekeurige etiketten)', () => {
  assert.ok(herkenning.cases.length >= 790, `maar ${herkenning.cases.length} gevallen`);
  assert.ok(herkenning.cases.some(c => c.text === '') && herkenning.cases.some(c => c.text.length === 5000), 'lege en zeer lange invoer zitten erin');
  for (const c of herkenning.cases) {
    assert.equal(JSON.stringify(parseBeanText(c.text, herkenning.nowMs)), c.out, `verschil voor:\n${c.text.slice(0, 300)}`);
  }
});

test('losse functies: hoogte, boerderij, gedeelde hoofdwoorden en smaaktags', () => {
  for (const [t, v] of losse.hoogte) assert.deepEqual(extractAltitudeFromText(t), v, t);
  for (const [t, v] of losse.boerderij) assert.deepEqual(extractFarmFromText(t), v, t);
  for (const [t, v] of losse.hoofdwoorden) assert.equal(expandSharedHeadNouns(t), v);
  for (const [t, fuzzy, plain] of losse.smaaktags) {
    assert.deepEqual([...scanFlavorTagsInText(t, { fuzzy: true })], fuzzy, t);
    assert.deepEqual([...scanFlavorTagsInText(t)], plain, t);
  }
});

test('hoogte als bereik: een bereik blijft een bereik, een los getal wordt min = max', () => {
  assert.deepEqual(extractAltitudeRangeFromText('ELEVATION 1580 - 1680'), { minM: 1580, maxM: 1680 });
  assert.deepEqual(extractAltitudeRangeFromText('1900-2200 masl'), { minM: 1900, maxM: 2200 });
  assert.deepEqual(extractAltitudeRangeFromText('grown at 1850 meters'), { minM: 1850, maxM: 1850 });
  assert.equal(extractAltitudeRangeFromText('niets'), null);
});
