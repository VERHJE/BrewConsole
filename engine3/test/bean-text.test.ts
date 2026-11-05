import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import fc from 'fast-check';
import { loadApp } from '../../tests/load-app.mjs';
import {
  COUNTRY_SCAN_SYNONYMS, EXPERIMENTAL_SCAN_KEYWORDS, FLAVOR_SCAN_SYNONYMS, INTENDED_USE_SCAN_KEYWORDS,
  PROCESS_SCAN_KEYWORDS, REGION_SCAN_SYNONYMS, ROAST_SCAN_KEYWORDS, VARIETY_SCAN_SYNONYMS
} from '../src/data/bean-scan-data.ts';
import { expandSharedHeadNouns, extractAltitudeFromText, extractAltitudeRangeFromText, extractFarmFromText, parseBeanText, scanFlavorTagsInText } from '../src/bean/text.ts';

type App = {
  parseBeanText: (t: string) => unknown;
  extractFarmFromText: (t: string) => unknown;
  extractAltitudeFromText: (t: string) => unknown;
  expandSharedHeadNouns: (t: string) => string;
  scanFlavorTagsInText: (t: string, o?: { fuzzy: boolean }) => Set<string>;
  [k: string]: unknown;
};
const app = loadApp().api as unknown as App;
const NOW = Date.now();

test('de woordenlijsten zijn gelijk aan die van de app (opnieuw genereren als dit faalt)', () => {
  const same = (a: unknown, b: unknown, name: string): void => assert.equal(JSON.stringify(a), JSON.stringify(b), name);
  same(ROAST_SCAN_KEYWORDS, app['ROAST_SCAN_KEYWORDS'], 'roast');
  same(INTENDED_USE_SCAN_KEYWORDS, app['INTENDED_USE_SCAN_KEYWORDS'], 'gebruik');
  same(PROCESS_SCAN_KEYWORDS, app['PROCESS_SCAN_KEYWORDS'], 'proces');
  same(EXPERIMENTAL_SCAN_KEYWORDS, app['EXPERIMENTAL_SCAN_KEYWORDS'], 'experimenteel');
  same(COUNTRY_SCAN_SYNONYMS, app['COUNTRY_SCAN_SYNONYMS'], 'land');
  same(REGION_SCAN_SYNONYMS, app['REGION_SCAN_SYNONYMS'], 'regio');
  same(VARIETY_SCAN_SYNONYMS, app['VARIETY_SCAN_SYNONYMS'], 'variëteit');
  same(FLAVOR_SCAN_SYNONYMS, app['FLAVOR_SCAN_SYNONYMS'], 'smaak');
});

/** Zelfde tekst, zelfde uitkomst als de app (zonder de branddatum-klok, die we gelijk zetten). */
function parity(text: string): void {
  const a = app.parseBeanText(text) as Record<string, unknown>;
  const b = parseBeanText(text, NOW) as unknown as Record<string, unknown>;
  assert.equal(JSON.stringify(b), JSON.stringify(a), `verschil voor:\n${text}`);
}

// Teksten uit de bestaande app-tests: de 8 voorbeeldzakken en alle plak-/OCR-teksten.
function corpusFromAppTests(): string[] {
  const out = new Set<string>();
  for (const f of ['bean-scan.test.mjs', 'bean-scan-zakken.test.mjs']) {
    const src = readFileSync(new URL(`../../tests/${f}`, import.meta.url), 'utf8');
    for (const m of src.matchAll(/`((?:[^`\\]|\\.)*)`|'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g)) {
      const s = (m[1] ?? m[2] ?? m[3] ?? '').replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"');
      if (s.length >= 12 && /[a-z]{3}/i.test(s) && !/^(?:\.\.|\/|http|node:)/.test(s)) out.add(s);
    }
  }
  return [...out];
}
test('de teksten uit de app-tests (inclusief de 8 voorbeeldzakken) geven dezelfde uitkomst', () => {
  const corpus = corpusFromAppTests();
  assert.ok(corpus.length >= 40, `maar ${corpus.length} teksten gevonden`);
  for (const t of corpus) parity(t);
});

test('lege en rare invoer geeft dezelfde uitkomst', () => {
  for (const t of ['', '   ', '\n\n', '###', '12345', 'a', 'Colombia', 'ééé', 'x'.repeat(5000)]) parity(t);
});

const LINES = [
  'Colombia', 'COLOMBIA EL DIVISO', 'Ethiopia Guji', 'Kenya', 'Brasil Cerrado', 'Origin: Peru', 'Process: Washed', 'PROCESS LACTIC FERMENTED HONEY', 'Process Natural', 'anaerobic natural',
  'Variety: Caturra, Castillo', 'Gesha', 'SL28 SL34', 'Notes: Apple | Tangerine |\nGreen Tea', 'Tasting notes: black cherry, raisin', 'Taste: dark chocolate & hazelnut', 'Gedroogd & tropisch fruit',
  'ELEVATION 1580 - 1680', '1900-2200 masl', 'grown at 1850 meters', 'Roasted on 12 oct 2026', 'Roast date 2026-10-20', 'Gebrand op 3-11-2026', '250g', 'Quantity 250g, 1KG', '1 kg', 'Add to cart',
  'Kawa Coffee Roasters', 'www.blommers.coffee', 'FINCA LAS BRISAS', 'Farm: Primrose-Gutity', 'REGION ACEVEDO -FINCA LAS BRISAS', 'Region Huila', 'Light roast', 'Ilght Roast', 'Filter roast', 'Espresso', 'Preparation espresso, filter',
  'espresso prep', 'Decaf', 'Sugarcane Decaf', 'semi-washed', 'Colobmia', 'ZWARTE ROES', 'SPECIALTY COFFEE', 'WONDER BEANS', 'GREED FREE® COFFEE', 'Perfect brew', 'Best before 2027', 'ons, (a) Colombia', 'L & Be 5', 'honey process',
  'light roasted', 'roasted red apple', 'Single Origin', '100% Arabica', 'Name Lord Voldemor'
];
const BITS = [
  ...Object.keys(COUNTRY_SCAN_SYNONYMS), ...Object.keys(REGION_SCAN_SYNONYMS), ...Object.keys(VARIETY_SCAN_SYNONYMS), ...Object.keys(FLAVOR_SCAN_SYNONYMS),
  ...Object.values(PROCESS_SCAN_KEYWORDS).flat(), ...Object.values(ROAST_SCAN_KEYWORDS).flat(), ...Object.values(INTENDED_USE_SCAN_KEYWORDS).flat(), ...EXPERIMENTAL_SCAN_KEYWORDS
];
const noisy = (s: string): fc.Arbitrary<string> => fc.constantFrom(s, s.toUpperCase(), s.toLowerCase(), s.replace(/[aeiou]/, '').trim() || s, s + ' ®', ' ' + s);
const lineArb = fc.oneof(fc.constantFrom(...LINES).chain(noisy), fc.constantFrom(...BITS).chain(noisy), fc.stringMatching(/^[A-Za-z0-9 ,.:;|&\-+/]{0,30}$/));
test('willekeurige etiketten (regels uit echte zakken, woordenlijsten en ruis): altijd dezelfde uitkomst als de app', () => {
  fc.assert(fc.property(fc.array(lineArb, { minLength: 1, maxLength: 12 }), lines => { parity(lines.join('\n')); }), { numRuns: 600 });
});

test('losse functies: hoogte, boerderij, gedeelde hoofdwoorden en smaaktags', () => {
  for (const t of ['elevation 1580 - 1680', '1900-2200 masl', 'grown at 1850 meters', 'hoogte 1200', '1750 m.a.s.l.', 'niets', 'altitude: 1900 - 2100 m']) {
    assert.equal(extractAltitudeFromText(t), app.extractAltitudeFromText(t), t);
  }
  for (const t of ['Farm: Primrose-Gutity', 'REGION ACEVEDO -FINCA LAS BRISAS', 'Sitio Beija Flor #2', 'niets', 'FINCA LAS BRISAS Em ’']) {
    assert.equal(extractFarmFromText(t), app.extractFarmFromText(t), t);
  }
  assert.equal(expandSharedHeadNouns('gedroogd & tropisch fruit'), app.expandSharedHeadNouns('gedroogd & tropisch fruit'));
  for (const t of ['apple, caramel', 'milk and dark chocolate', 'grapefruit', 'light roast', 'plums and cherries', 'roasted red apple']) {
    assert.deepEqual([...scanFlavorTagsInText(t, { fuzzy: true })], [...app.scanFlavorTagsInText(t, { fuzzy: true })], t);
    assert.deepEqual([...scanFlavorTagsInText(t)], [...app.scanFlavorTagsInText(t)], t);
  }
});
test('hoogte als bereik: een bereik blijft een bereik, een los getal wordt min = max', () => {
  assert.deepEqual(extractAltitudeRangeFromText('ELEVATION 1580 - 1680'), { minM: 1580, maxM: 1680 });
  assert.deepEqual(extractAltitudeRangeFromText('1900-2200 masl'), { minM: 1900, maxM: 2200 });
  assert.deepEqual(extractAltitudeRangeFromText('grown at 1850 meters'), { minM: 1850, maxM: 1850 });
  assert.equal(extractAltitudeRangeFromText('niets'), null);
});
