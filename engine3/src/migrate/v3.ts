// Engine 3 · migratie van de huidige back-up (backupVersion 3: bonen, v6-zetsels, oude platte
// logregels, blinde paren, instellingen) naar het logboek van gebeurtenissen.
//
// Regels:
//   - Niets verzinnen: een ontbrekende waarde blijft null.
//   - Niets weggooien: wat geen plek heeft, staat in het rapport (warnings) of in legacyScores/note.
//   - Deterministisch: dezelfde back-up geeft byte-voor-byte hetzelfde logboek (id's zijn afgeleid
//     van de bron-id's), zodat twee keer importeren of twee toestellen samenvoegen geen dubbelen geeft.
//   - Thema en andere schermvoorkeuren gaan niet mee: die zijn van de frontend.

import type {
  Acidity, BeanFields, BeanProcess, BeanUpsertEvent, EngineEvent, EngineStamp, Fermentation, Finish, FieldSource,
  Goal, GoalHit, IntendedUse, Liking, Method, Missed, Pour, ProcessBase, Recipe, RoastLevel, StrengthOrd,
  TechniqueRef, TimerType, VsLast, WaterSetting
} from '../types.ts';
import { EVENT_SCHEMA_VERSION } from '../types.ts';
import { TAG_CATEGORY } from '../data/flavor-wheel.ts';
import { celsius, clicks, g, isIsoDate, metres, ms, s, tdsPct } from '../units.ts';
import type { EpochMs, IsoDate } from '../units.ts';

export const MIGRATION_DEVICE = 'migratie-v3';

export interface MigrationReport {
  readonly counts: Readonly<Record<string, number>>;
  readonly warnings: readonly string[];
}

type J = Record<string, unknown>;
const isObj = (v: unknown): v is J => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const pos = (v: unknown): number | null => { const n = num(v); return n !== null && n > 0 ? n : null; };
const date = (v: unknown): IsoDate | null => (isIsoDate(v) ? v : null);

const STRENGTH: Readonly<Record<string, StrengthOrd>> = { much_too_weak: -2, too_weak: -1, just_right: 0, too_strong: 1, much_too_strong: 2 };
const ROASTS: readonly RoastLevel[] = ['light', 'light_medium', 'medium', 'medium_dark', 'dark'];
const USES: readonly IntendedUse[] = ['filter', 'espresso', 'omni'];
const ACIDITY: readonly Acidity[] = ['flat', 'lively', 'sharp'];
const FINISH: readonly Finish[] = ['sweet_clean', 'bitter', 'drying', 'hollow'];
const GOALS: readonly Goal[] = ['bright', 'balanced', 'rich'];
const GOAL_HIT: readonly GoalHit[] = ['yes', 'almost', 'no'];
const VS_LAST: readonly VsLast[] = ['better', 'same', 'worse'];
const MISSED: readonly Missed[] = ['fruit', 'sweet', 'body', 'less_bitter', 'unsure'];
const TIMER: Readonly<Record<string, TimerType>> = {
  start: 'start', pause: 'pause', resume: 'resume', drained: 'drained', drained_undo: 'drained_undo',
  bed_dry: 'bed_dry', complete: 'complete', abandon: 'abandon'
};
const pick = <T extends string>(list: readonly T[], v: unknown): T | null => (typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : null);

export function methodOf(v: unknown): Method | null {
  if (v === 'v60' || v === 'chemex') return v;
  return null;
}

export function techniqueOf(v: unknown): TechniqueRef | null {
  const t = str(v);
  if (!t) return null;
  if (/^kasuya/i.test(t)) return 'kasuya_46';
  if (/hoffmann/i.test(t)) return 'hoffmann_ultimate';
  if (/^rao/i.test(t)) return 'rao';
  if (/^april/i.test(t)) return 'april';
  return `legacy:${t}`;
}

/** Oud proces-veld (één sleutel) naar de drie assen. */
export function processOf(bean: J): BeanProcess {
  const p = str(bean['process']);
  let base: ProcessBase = 'unknown';
  const fermentation: Fermentation[] = [];
  if (p === 'washed' || p === 'natural' || p === 'honey' || p === 'wet_hulled') base = p;
  else if (p === 'anaerobic') fermentation.push('anaerobic');
  return { base, fermentation, experimental: bean['experimental'] === true, decaf: bean['decaf'] === true ? 'other' : null, ambiguousTerm: null };
}

function beanFields(b: J): BeanFields {
  const notes = Array.isArray(b['flavorNotes']) ? (b['flavorNotes'] as unknown[]).filter((x): x is string => typeof x === 'string') : [];
  const alt = pos(b['altitude']);
  return {
    name: str(b['name']) ?? '(zonder naam)',
    roaster: str(b['roaster']),
    country: str(b['country']),
    region: str(b['region']),
    farm: str(b['farm']),
    producer: null,
    variety: str(b['variety']),
    process: processOf(b),
    roastLevel: pick(ROASTS, b['roastLevel']),
    intendedUse: pick(USES, b['intendedUse']),
    altitude: alt !== null ? { minM: metres(alt), maxM: metres(alt) } : null,
    notes: { raw: notes, tags: notes.filter(t => TAG_CATEGORY.has(t)), unmapped: notes.filter(t => !TAG_CATEGORY.has(t)) },
    roastDate: date(b['roastDate']),
    openedDate: date(b['openedDate']),
    bagSizeG: pos(b['bagSizeG']) !== null ? g(pos(b['bagSizeG']) as number) : null,
    cuppingScore: null,
    harvestYear: null,
    coordinates: null
  };
}

function poursFromSteps(steps: unknown, technique: TechniqueRef | null): Pour[] {
  if (!Array.isArray(steps)) return [];
  const out: Pour[] = [];
  let total = 0;
  for (const st of steps) {
    if (!isObj(st)) continue;
    const add = num(st['add']);
    const t = num(st['t']);
    if (add === null || add <= 0 || t === null) continue;
    total += add;
    out.push({ atSec: s(t), addG: g(add), toG: g(Math.round(total * 10) / 10), style: 'spiral', agitationAfter: 'none', waitForDrain: technique === 'kasuya_46' && out.length > 0 });
  }
  return out;
}

interface Ctx { events: EngineEvent[]; warnings: string[]; counts: Record<string, number> }
const bump = (c: Ctx, k: string): void => { c.counts[k] = (c.counts[k] ?? 0) + 1; };
const push = (c: Ctx, ev: EngineEvent): void => { c.events.push(ev); bump(c, ev.kind); };
const env = <K extends EngineEvent['kind']>(id: string, at: number, kind: K) => ({ id, at: ms(at) as EpochMs, device: MIGRATION_DEVICE, v: EVENT_SCHEMA_VERSION, kind });

function tastingData(brewId: string, t: J) {
  const scores = isObj(t['scores']) ? Object.fromEntries(Object.entries(t['scores']).filter(([, v]) => typeof v === 'number')) as Record<string, number> : null;
  const st = str(t['strength']);
  const liking = num(t['liking']);
  return {
    brewId,
    minutesAfter: num(t['minutesAfterBrew']),
    late: t['late'] === true,
    strength: st && st in STRENGTH ? (STRENGTH[st] as StrengthOrd) : null,
    acidity: pick(ACIDITY, t['acidity']),
    finish: Array.isArray(t['finish']) ? (t['finish'] as unknown[]).map(f => pick(FINISH, f)).filter((f): f is Finish => f !== null) : [],
    liking: liking !== null && liking >= 1 && liking <= 5 ? (Math.round(liking) as Liking) : null,
    goalHit: pick(GOAL_HIT, t['goalHit']),
    vsLast: pick(VS_LAST, t['vsLast']),
    missed: pick(MISSED, t['missed']),
    cata: [],
    noteHits: [],
    legacyScores: scores && Object.keys(scores).length ? scores : null,
    note: str(t['note']) ?? ''
  };
}

function migrateBrewV6(c: Ctx, r: J): void {
  const brewId = str(r['id']);
  if (!brewId) { c.warnings.push('zetsel zonder id overgeslagen'); return; }
  const plan = isObj(r['plan']) ? r['plan'] : {};
  const actual = isObj(r['actual']) ? r['actual'] : {};
  const createdAt = num(r['createdAt']) ?? 0;
  const method = methodOf(plan['methodId']);
  const waterG = pos(plan['waterMl']);
  const doseG = pos(plan['doseG']) ?? pos(actual['doseG']);
  const technique = techniqueOf(plan['technique']);
  if (!method || waterG === null || doseG === null) {
    c.warnings.push(`zetsel ${brewId}: geen methode, water of dosis — plan niet over te zetten (proef/feiten blijven wel bewaard als die er zijn)`);
  } else {
    const bypass = isObj(plan['bypass']) ? plan['bypass'] : null;
    const pourWater = bypass ? pos(bypass['pourWaterG']) : null;
    const end = pos(plan['expectedDrainEndSec']) ?? pos(plan['expectedTotalSec']);
    const grind = num(plan['grindTarget']) ?? num(plan['grindStartingPoint']);
    const recipe: Recipe = {
      technique: technique ?? 'legacy:onbekend',
      method,
      doseG: g(doseG),
      waterG: g(pourWater ?? waterG),
      bypassG: g(bypass ? (pos(bypass['plannedG']) ?? 0) : 0),
      tempC: num(plan['tempC']) !== null ? celsius(num(plan['tempC']) as number) : null,
      grindClick: grind !== null ? clicks(grind) : null,
      pours: poursFromSteps(plan['steps'], technique),
      expectedEndSec: end !== null ? { mid: s(end), lo: s(end), hi: s(end) } : null
    };
    const engine: EngineStamp = { name: 'brewconsole-v2', version: str(plan['modelPolicyVersion']) ?? 'onbekend' };
    const legacyKeys: Array<[string, unknown]> = [['diagnosis', r['diagnosis']], ['recommendation', r['recommendation']], ['appliedAdjust', plan['appliedAdjust']], ['derived', r['derived']], ['favorite', r['favorite']], ['profileId', plan['profileId']], ['roastId', plan['roastId']], ['inputs', plan['inputs']]];
    const legacy = Object.fromEntries(legacyKeys.filter(([, v]) => v !== undefined && v !== null));
    push(c, { ...env(`mig:brew:${brewId}:plan`, createdAt, 'brew.plan'), data: { brewId, beanId: str(r['beanId']), goal: pick(GOALS, r['goal']), engine, recipe, trialId: null, legacy: Object.keys(legacy).length ? legacy : null } });
  }
  const events = Array.isArray(actual['events']) ? actual['events'] : [];
  let hasBedDry = false;
  events.forEach((evRaw, i) => {
    if (!isObj(evRaw)) return;
    const type = TIMER[String(evRaw['type'])];
    if (!type) { bump(c, 'timer_skipped'); return; }
    if (type === 'bed_dry') hasBedDry = true;
    const at = num(evRaw['at']) ?? createdAt;
    const tSec = num(evRaw['tSec']) ?? 0;
    push(c, { ...env(`mig:brew:${brewId}:timer:${i}`, at, 'brew.timer'), data: { brewId, type, tSec: s(Math.max(0, tSec)), pourIndex: num(evRaw['stepIndex']) } });
  });
  const bedDry = pos(actual['bedDrySec']);
  if (bedDry !== null && !hasBedDry) {
    push(c, { ...env(`mig:brew:${brewId}:timer:bed_dry`, num(actual['completedAt']) ?? createdAt, 'brew.timer'), data: { brewId, type: 'bed_dry', tSec: s(bedDry), pourIndex: null } });
  }
  const aDose = pos(actual['doseG']), aClick = num(actual['grindClick']), cup = pos(actual['cupWeightG']), byp = pos(actual['bypassActualG']), tds = pos(actual['tdsPct']);
  if (aDose !== null || aClick !== null || cup !== null || byp !== null || tds !== null) {
    push(c, {
      ...env(`mig:brew:${brewId}:actuals`, num(actual['completedAt']) ?? num(r['updatedAt']) ?? createdAt, 'brew.actuals'),
      data: { brewId, doseG: aDose !== null ? g(aDose) : null, waterG: null, grindClick: aClick !== null ? clicks(aClick) : null, bypassG: byp !== null ? g(byp) : null, cupG: cup !== null ? g(cup) : null, tdsPct: tds !== null ? tdsPct(tds) : null, technique: null }
    });
  }
  if (isObj(r['tasting'])) {
    const t = r['tasting'];
    push(c, { ...env(`mig:brew:${brewId}:tasting`, num(t['at']) ?? num(r['updatedAt']) ?? createdAt, 'tasting'), data: tastingData(brewId, t) });
  }
  if (r['deletedAt'] != null) {
    push(c, { ...env(`mig:brew:${brewId}:delete`, num(r['deletedAt']) ?? createdAt, 'brew.delete'), data: { brewId } });
  }
  if (r['lifecycle'] === 'brewing') c.warnings.push(`zetsel ${brewId}: was nog bezig bij de back-up`);
}

/** Oude platte logregel (schema 1–5) die niet als v6-zetsel in de back-up staat. */
function migrateLegacyLog(c: Ctx, e: J): void {
  const brewId = str(e['id']);
  if (!brewId) return;
  const at = num(e['timestamp']) ?? 0;
  const method = methodOf(e['method']);
  const waterG = pos(e['waterMl']);
  const doseG = pos(e['doseG']);
  if (method && waterG !== null && doseG !== null) {
    const grind = num(e['grindStartingPoint']);
    push(c, {
      ...env(`mig:log:${brewId}:plan`, at, 'brew.plan'),
      data: {
        brewId, beanId: str(e['beanId']), goal: pick(GOALS, e['goal']), engine: { name: 'brewconsole-v2', version: str(e['modelPolicyVersion']) ?? 'onbekend' },
        recipe: { technique: 'legacy:onbekend', method, doseG: g(doseG), waterG: g(pos(e['pourWaterG']) ?? waterG), bypassG: g(pos(e['bypassPlannedG']) ?? 0), tempC: num(e['temp']) !== null ? celsius(num(e['temp']) as number) : null, grindClick: grind !== null ? clicks(grind) : null, pours: [], expectedEndSec: null },
        trialId: null,
        legacy: ((l) => (Object.keys(l).length ? l : null))(Object.fromEntries(Object.entries(e).filter(([k, v]) => v != null && ['profile', 'roast', 'grindMicron', 'grindStand', 'recommendation', 'approved', 'scheduledTimeSec'].includes(k))))
      }
    });
  } else c.warnings.push(`oude logregel ${brewId}: geen methode, water of dosis`);
  const aDose = pos(e['actualDoseG']), aClick = num(e['actualGrindClicks']), cup = pos(e['cupWeightG']);
  if (aDose !== null || aClick !== null || cup !== null) {
    push(c, { ...env(`mig:log:${brewId}:actuals`, at, 'brew.actuals'), data: { brewId, doseG: aDose !== null ? g(aDose) : null, waterG: null, grindClick: aClick !== null ? clicks(aClick) : null, bypassG: pos(e['bypassActualG']) !== null ? g(pos(e['bypassActualG']) as number) : null, cupG: cup !== null ? g(cup) : null, tdsPct: null, technique: null } });
  }
  const bedDry = pos(e['bedDrySec']);
  if (bedDry !== null) push(c, { ...env(`mig:log:${brewId}:timer:bed_dry`, at, 'brew.timer'), data: { brewId, type: 'bed_dry', tSec: s(bedDry), pourIndex: null } });
  const t: J = isObj(e['tasting']) ? e['tasting'] : isObj(e['scores']) ? { scores: e['scores'], note: e['note'] } : {};
  if (Object.keys(t).length) push(c, { ...env(`mig:log:${brewId}:tasting`, num(t['at']) ?? at, 'tasting'), data: tastingData(brewId, t) });
}

export function migrateBackupV3(backup: unknown): { events: EngineEvent[]; report: MigrationReport } {
  const c: Ctx = { events: [], warnings: [], counts: {} };
  if (!isObj(backup)) return { events: [], report: { counts: {}, warnings: ['geen back-upobject'] } };
  const version = num(backup['backupVersion']);
  if (version !== 3) c.warnings.push(`backupVersion ${String(version)} (verwacht 3) — toch geprobeerd`);

  const beans = Array.isArray(backup['beans']) ? backup['beans'] : [];
  for (const b of beans) {
    if (!isObj(b) || !str(b['id'])) { c.warnings.push('boon zonder id overgeslagen'); continue; }
    const id = str(b['id']) as string;
    const fields = beanFields(b);
    const sources = Object.fromEntries(Object.keys(fields).map(k => [k, 'migrated' as FieldSource]));
    const LEGACY_BEAN = ['profileKey', 'flavorScores', 'fermentEvidence', 'goal', 'favorite', 'stands', 'pendingAdjust', 'lastBrew', 'doseUsedG', 'schemaVersion'];
    const legacy = Object.fromEntries(LEGACY_BEAN.filter(k => b[k] !== undefined).map(k => [k, b[k]]));
    const ev: BeanUpsertEvent = { ...env(`mig:bean:${id}`, num(b['addedAt']) ?? 0, 'bean.upsert'), data: { beanId: id, fields, sources, legacy: Object.keys(legacy).length ? legacy : null } };
    push(c, ev);
  }

  const brews = Array.isArray(backup['brews']) ? backup['brews'] : [];
  const seen = new Set<string>();
  for (const r of brews) {
    if (!isObj(r)) continue;
    const id = str(r['id']);
    if (id) seen.add(id);
    migrateBrewV6(c, r);
  }
  const log = Array.isArray(backup['brewLog']) ? backup['brewLog'] : [];
  for (const e of log) {
    if (!isObj(e)) continue;
    const id = str(e['id']);
    if (id && seen.has(id)) { bump(c, 'legacy_duplicate'); continue; }
    migrateLegacyLog(c, e);
  }

  const trials = Array.isArray(backup['abTrials']) ? backup['abTrials'] : [];
  for (const t of trials) {
    if (!isObj(t) || !str(t['id'])) continue;
    const method = methodOf(t['method']);
    const water = pos(t['waterMl']);
    const cd = pos(t['controlDose']), vd = pos(t['variantDose']);
    if (!method || water === null || cd === null || vd === null) { c.warnings.push(`blind paar ${String(t['id'])}: onvolledig`); continue; }
    const pref = t['preferred'] === 'control' || t['preferred'] === 'variant' ? t['preferred'] : 'none';
    const bright = t['brighter'] === 'control' || t['brighter'] === 'variant' ? t['brighter'] : t['brighter'] == null ? null : 'none';
    push(c, {
      ...env(`mig:pair:${String(t['id'])}`, num(t['createdAt']) ?? 0, 'pair.trial'),
      data: {
        trialId: String(t['id']), beanId: str(t['beanId']), method, waterG: g(water), kind: 'strength',
        control: { doseG: g(cd), technique: null, grindClick: null }, variant: { doseG: g(vd), technique: null, grindClick: null },
        preferred: pref, brighter: bright
      }
    });
  }

  const exportedAt = typeof backup['exportedAt'] === 'string' ? Date.parse(backup['exportedAt']) : NaN;
  const setAt = Number.isFinite(exportedAt) ? exportedAt : 0;
  const hardness = num(backup['waterHardnessMgL']);
  const alk = isObj(backup['waterAlkalinity']) ? backup['waterAlkalinity'] : null;
  const dil = isObj(backup['waterDilution']) ? backup['waterDilution'] : null;
  if (hardness !== null || alk || dil) {
    const value: WaterSetting = {
      hardnessMgL: hardness,
      alkalinity: alk ? { value: num(alk['value']), unit: alk['unit'] === 'HCO3' ? 'HCO3' : 'CaCO3' } : null,
      dilution: dil && num(dil['tapParts']) !== null && num(dil['demiParts']) !== null ? { tapParts: num(dil['tapParts']) as number, demiParts: num(dil['demiParts']) as number } : null
    };
    push(c, { ...env('mig:setting:water', setAt, 'setting'), data: { key: 'water', value } });
  }
  if (typeof backup['brightLighter'] === 'boolean') {
    push(c, { ...env('mig:setting:brightLighter', setAt, 'setting'), data: { key: 'brightLighter', value: backup['brightLighter'] } });
  }

  c.events.sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { events: c.events, report: { counts: c.counts, warnings: c.warnings } };
}
