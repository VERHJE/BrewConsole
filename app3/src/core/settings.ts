// Instellingen: water, molen en voorkeuren als `setting`-gebeurtenissen (de laatste wint).
//
// Water wordt genoteerd en tegen de SCA-richtwaarden gezet, maar stuurt geen receptgetal: voor hardheid of
// alkaliniteit is geen gevalideerde omrekening naar temperatuur of maling gevonden (zelfde besluit als in de
// oude app). Het staat wel in het logboek, zodat het meekomt met synchronisatie en later te gebruiken is.

import { factsOf, ms, type EngineEvent, type EngineState, type SettingEvent, type WaterSetting } from '../../../engine3/src/index.ts';
import { newId, type Env } from './ids.ts';

export const HCO3_TO_CACO3 = 0.82; // stoichiometrisch, SCA 310-2021
export const SCA_HARDNESS = { low: 50, high: 175 } as const;
export const SCA_ALKALINITY = { low: 40, high: 70 } as const;

export interface WaterPreset { readonly key: string; readonly label: string; readonly area: string | null; readonly value: WaterSetting; readonly source: string | null }

const TAP: WaterSetting['dilution'] = { tapParts: 1, demiParts: 0 };
/** Alleen bedrijven met één gepubliceerde, stabiele samenstelling (waarden en bronnen overgenomen uit de oude app, R-12). */
export const WATER_PRESETS: readonly WaterPreset[] = [
  { key: 'dunea', label: 'Dunea', area: 'Den Haag, Leiden e.o.', value: { hardnessMgL: 140, alkalinity: { value: 170, unit: 'HCO3' }, dilution: TAP }, source: 'Gemiddelde uit de kwaliteitsrapporten van Dunea 2021–2024: ±170 mg/L waterstofcarbonaat, ±1,4 mmol/L hardheid.' },
  { key: 'waternet', label: 'Waternet', area: 'Amsterdam e.o.', value: { hardnessMgL: 138, alkalinity: { value: 207, unit: 'HCO3' }, dilution: TAP }, source: 'Jaaroverzicht 2025 van Waternet (Weesperkarspel): 207 mg/L waterstofcarbonaat, 1,38 mmol/L hardheid.' },
  { key: 'pwn_andijk', label: 'PWN (Andijk)', area: 'oostelijk Noord-Holland', value: { hardnessMgL: 135, alkalinity: { value: 136, unit: 'HCO3' }, dilution: TAP }, source: 'PWN, productielocatie Andijk, 1e kwartaal 2023: 136 mg/L waterstofcarbonaat, 1,35 mmol/L hardheid.' },
  { key: 'sca', label: 'SCA-richtwaarde (68 / 40)', area: null, value: { hardnessMgL: 68, alkalinity: { value: 40, unit: 'CaCO3' }, dilution: TAP }, source: 'Richtwaarde voor wie water zelf mengt; binnen de SCA-banden.' }
];

export const DILUTIONS: ReadonlyArray<{ key: string; label: string; value: NonNullable<WaterSetting['dilution']> }> = [
  { key: '1:0', label: 'Geen verdunning (puur kraanwater)', value: { tapParts: 1, demiParts: 0 } },
  { key: '2:1', label: '2 delen kraan : 1 deel gedemineraliseerd', value: { tapParts: 2, demiParts: 1 } },
  { key: '1:1', label: '1 deel kraan : 1 deel gedemineraliseerd', value: { tapParts: 1, demiParts: 1 } }
];
export const dilutionKey = (d: WaterSetting['dilution']): string => (d ? `${d.tapParts}:${d.demiParts}` : '1:0');

export const EMPTY_WATER: WaterSetting = { hardnessMgL: null, alkalinity: null, dilution: TAP };

/** Wat na verdunning in de kop terechtkomt (demiwater draagt niets bij). */
export function effectiveWater(w: WaterSetting): { hardnessMgL: number | null; alkalinityCaCO3: number | null } {
  const total = w.dilution ? w.dilution.tapParts + w.dilution.demiParts : 1;
  const share = w.dilution && total > 0 ? w.dilution.tapParts / total : 1;
  const alk = w.alkalinity && w.alkalinity.value !== null ? (w.alkalinity.unit === 'HCO3' ? w.alkalinity.value * HCO3_TO_CACO3 : w.alkalinity.value) : null;
  return { hardnessMgL: w.hardnessMgL === null ? null : w.hardnessMgL * share, alkalinityCaCO3: alk === null ? null : alk * share };
}

export type Verdict = 'below' | 'within' | 'above';
export const verdictOf = (v: number | null, r: { low: number; high: number }): Verdict | null => (v === null ? null : v < r.low ? 'below' : v > r.high ? 'above' : 'within');

export interface WaterProblems { hardnessMgL?: string; alkalinity?: string }
export function validateWater(w: WaterSetting): WaterProblems {
  const p: WaterProblems = {};
  if (w.hardnessMgL !== null && !(Number.isFinite(w.hardnessMgL) && w.hardnessMgL >= 0 && w.hardnessMgL <= 600)) p.hardnessMgL = 'Geef een hardheid tussen 0 en 600 mg/L.';
  if (w.alkalinity && w.alkalinity.value !== null && !(Number.isFinite(w.alkalinity.value) && w.alkalinity.value >= 0 && w.alkalinity.value <= 600)) p.alkalinity = 'Geef een alkaliniteit tussen 0 en 600 mg/L.';
  return p;
}

// ───────────── lezen en schrijven ─────────────

export interface Settings {
  readonly water: WaterSetting;
  readonly zeroCheckedAt: number | null;
  /** Bij een A-tegen-B-proef ook vragen welke helderder was. */
  readonly brightLighter: boolean;
}

export function settingsOf(state: EngineState): Settings {
  const s = factsOf(state).settings;
  return { water: s.water ?? EMPTY_WATER, zeroCheckedAt: s.grinder?.zeroCheckedAt ?? null, brightLighter: s.brightLighter ?? false };
}

const env0 = (env: Env) => ({ id: newId(env, 'ev'), at: ms(env.now()), device: env.device, v: 1 as const, kind: 'setting' as const });

export const waterEvent = (env: Env, value: WaterSetting): SettingEvent => ({ ...env0(env), data: { key: 'water', value } });
export const grinderEvent = (env: Env, zeroCheckedAt: number | null): SettingEvent => ({ ...env0(env), data: { key: 'grinder', value: { model: 'TIMEMORE_C3S_PRO', zeroCheckedAt: zeroCheckedAt === null ? null : ms(zeroCheckedAt) } } });
export const brightLighterEvent = (env: Env, value: boolean): SettingEvent => ({ ...env0(env), data: { key: 'brightLighter', value } });

export type { EngineEvent };
