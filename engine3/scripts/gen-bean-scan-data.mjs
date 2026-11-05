// Genereert engine3/src/data/bean-scan-data.ts uit de woordenlijsten van de zakherkenning in de huidige app.
// Draai opnieuw na een wijziging in die lijsten:  node engine3/scripts/gen-bean-scan-data.mjs
// De test in engine3/test/bean-text.test.ts faalt als het bestand niet meer overeenkomt.
import { writeFileSync } from 'node:fs';
import { loadApp } from '../../tests/load-app.mjs';

const { api } = loadApp();
const keep = (o) => JSON.parse(JSON.stringify(o)); // volgorde van de sleutels blijft behouden (de eerste treffer wint)
const data = {
  ROAST_SCAN_KEYWORDS: keep(api.ROAST_SCAN_KEYWORDS),
  INTENDED_USE_SCAN_KEYWORDS: keep(api.INTENDED_USE_SCAN_KEYWORDS),
  PROCESS_SCAN_KEYWORDS: keep(api.PROCESS_SCAN_KEYWORDS),
  EXPERIMENTAL_SCAN_KEYWORDS: keep(api.EXPERIMENTAL_SCAN_KEYWORDS),
  COUNTRY_SCAN_SYNONYMS: keep(api.COUNTRY_SCAN_SYNONYMS),
  REGION_SCAN_SYNONYMS: keep(api.REGION_SCAN_SYNONYMS),
  VARIETY_SCAN_SYNONYMS: keep(api.VARIETY_SCAN_SYNONYMS),
  FLAVOR_SCAN_SYNONYMS: keep(api.FLAVOR_SCAN_SYNONYMS)
};
const body = `// GEGENEREERD door engine3/scripts/gen-bean-scan-data.mjs uit de zakherkenning in brewconsole_v2_2.html.
// Niet met de hand wijzigen. De volgorde van de sleutels is betekenisvol: de eerste treffer wint.

export const ROAST_SCAN_KEYWORDS: Readonly<Record<string, readonly string[]>> = ${JSON.stringify(data.ROAST_SCAN_KEYWORDS, null, 2)};

export const INTENDED_USE_SCAN_KEYWORDS: Readonly<Record<string, readonly string[]>> = ${JSON.stringify(data.INTENDED_USE_SCAN_KEYWORDS, null, 2)};

export const PROCESS_SCAN_KEYWORDS: Readonly<Record<string, readonly string[]>> = ${JSON.stringify(data.PROCESS_SCAN_KEYWORDS, null, 2)};

export const EXPERIMENTAL_SCAN_KEYWORDS: readonly string[] = ${JSON.stringify(data.EXPERIMENTAL_SCAN_KEYWORDS, null, 2)};

export const COUNTRY_SCAN_SYNONYMS: Readonly<Record<string, string>> = ${JSON.stringify(data.COUNTRY_SCAN_SYNONYMS, null, 2)};

export const REGION_SCAN_SYNONYMS: Readonly<Record<string, string>> = ${JSON.stringify(data.REGION_SCAN_SYNONYMS, null, 2)};

export const VARIETY_SCAN_SYNONYMS: Readonly<Record<string, string>> = ${JSON.stringify(data.VARIETY_SCAN_SYNONYMS, null, 2)};

export const FLAVOR_SCAN_SYNONYMS: Readonly<Record<string, string>> = ${JSON.stringify(data.FLAVOR_SCAN_SYNONYMS, null, 2)};
`;
writeFileSync(new URL('../src/data/bean-scan-data.ts', import.meta.url), body);
console.log('bean-scan-data.ts:', Object.entries(data).map(([k, v]) => `${k} ${Array.isArray(v) ? v.length : Object.keys(v).length}`).join(', '));
