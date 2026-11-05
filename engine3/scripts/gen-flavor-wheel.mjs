// Genereert engine3/src/data/flavor-wheel.ts uit het smaakwiel van de huidige app, zodat beide
// precies dezelfde tags en categorieën kennen. Draai opnieuw na een wijziging in het wiel:
//   node engine3/scripts/gen-flavor-wheel.mjs
// tests (engine3/test/data.test.ts) falen als het bestand niet meer overeenkomt.
import { writeFileSync } from 'node:fs';
import { loadApp } from '../../tests/load-app.mjs';

const { api } = loadApp();
const wheel = api.SCA_FLAVOR_WHEEL.map(c => ({
  key: c.key, name: c.name,
  subgroups: c.subgroups.map(sg => ({ label: sg.label ?? null, tags: sg.tags.map(t => ({ tag: t.t, hint: t.h ?? null })) }))
}));
const body = `// GEGENEREERD door engine3/scripts/gen-flavor-wheel.mjs uit SCA_FLAVOR_WHEEL in brewconsole_v2_2.html.
// Niet met de hand wijzigen.
import type { WheelCategory } from '../types.ts';

export interface WheelTag { readonly tag: string; readonly hint: string | null }
export interface WheelSubgroup { readonly label: string | null; readonly tags: readonly WheelTag[] }
export interface WheelCategoryDef { readonly key: WheelCategory; readonly name: string; readonly subgroups: readonly WheelSubgroup[] }

export const FLAVOR_WHEEL: readonly WheelCategoryDef[] = ${JSON.stringify(wheel, null, 2)};

export const TAG_CATEGORY: ReadonlyMap<string, WheelCategory> = new Map(
  FLAVOR_WHEEL.flatMap(c => c.subgroups.flatMap(sg => sg.tags.map(t => [t.tag, c.key] as const)))
);
`;
writeFileSync(new URL('../src/data/flavor-wheel.ts', import.meta.url), body);
console.log('flavor-wheel.ts:', wheel.length, 'categorieën,', wheel.reduce((n, c) => n + c.subgroups.reduce((m, sg) => m + sg.tags.length, 0), 0), 'tags');
