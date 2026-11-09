// Engine 3 · stap 1 · van logboek naar toestand.
//
// learn() leest het effectieve logboek en bouwt daar feiten van op: per zak, per zetsel ('kop'),
// per techniek en per hoeveelheid. Er zit nog geen model in; dit is wat de latere modules lezen.
// Regels:
//   - volgorde en dubbelingen maken niets uit (mergeLogs + effectiveEvents);
//   - bij 'tasting', 'brew.actuals' en 'setting' wint de laatste, bij 'bean.upsert' wint de laatste per veld;
//   - een gebeurtenis voor een zetsel zonder plan telt niet mee, maar wordt in `notes` gemeld;
//   - niets wordt geraden: ontbrekend blijft null.

import { effectiveEvents, mergeLogs } from './events.ts';
import type {
  BeanFields, BeanUpsertEvent, BrewActualsEvent, BrewPlanEvent, BrewTimerEvent, EngineEvent, EngineState,
  FieldSource, Goal, Method, PairTrialEvent, Recipe, SettingEvent, TastingEvent, TechniqueRef, TimerType
} from './types.ts';
import type { Clicks, EpochMs, Grams, Seconds, TdsPct } from './units.ts';

export interface BeanFacts {
  readonly beanId: string;
  readonly fields: Partial<BeanFields>;
  readonly sources: Partial<Record<keyof BeanFields, FieldSource>>;
  readonly legacy: Readonly<Record<string, unknown>>;
  readonly archived: boolean;
  readonly firstAt: EpochMs;
  /** Zetsels van deze zak, op tijd. */
  readonly brewIds: readonly string[];
}

/** Eén zetsel zoals het gebeurd is, samengevat. Alles wat niet bekend is, is null. */
export interface CupFacts {
  readonly brewId: string;
  readonly beanId: string | null;
  readonly at: EpochMs;
  readonly goal: Goal | null;
  readonly engine: BrewPlanEvent['data']['engine'];
  readonly trialId: string | null;
  readonly planned: Recipe;
  readonly technique: TechniqueRef;
  readonly method: Method;
  /** Wat er werkelijk gebruikt is (actuals), anders het plan. */
  readonly doseG: Grams;
  readonly waterG: Grams;
  readonly bypassG: Grams;
  readonly grindClick: Clicks | null;
  readonly cupG: Grams | null;
  readonly tdsPct: TdsPct | null;
  /** Water dat na het zetten is bijgevuld (uit de oude app: plan.inputs.e2.dilutionG), anders 0. */
  readonly dilutionG: number;
  readonly actualsGiven: boolean;
  /** Tijden binnen het zetsel. */
  readonly startedAtSec: Seconds | null;
  readonly endSec: Seconds | null;
  readonly bedDrySec: Seconds | null;
  /** Moment van 'erdoor' per giet (index in planned.pours); een ongedaan gemaakte tik is eruit. */
  readonly drainedAtSec: ReadonlyMap<number, Seconds>;
  /** Tijd van de laatste giet-start tot 'erdoor' na die giet. Alleen als beide bekend zijn. */
  readonly lastDrainSec: Seconds | null;
  readonly status: 'planned' | 'brewing' | 'complete' | 'abandoned';
  readonly tasting: TastingEvent['data'] | null;
  readonly tastedAt: EpochMs | null;
}

/** Een blinde proef met het moment waarop hij is vastgelegd. */
export interface TrialFacts {
  readonly at: EpochMs;
  readonly data: PairTrialEvent['data'];
}

export interface FactState extends EngineState {
  readonly beans: ReadonlyMap<string, BeanFacts>;
  /** Alleen zetsels die niet zijn afgebroken: een afgebroken zetsel telt nergens mee (besluit Jelle, 9 nov 2026). */
  readonly cups: ReadonlyMap<string, CupFacts>;
  /** De afgebroken zetsels, alleen voor het scherm van de timer zelf; ze doen niet mee aan advies, voorraad of logboek. */
  readonly abandoned: ReadonlyMap<string, CupFacts>;
  /** Zetsels op tijd (plan-moment), voor 'de laatste kop' en 'de vorige kop van deze zak'. */
  readonly cupOrder: readonly string[];
  readonly trials: ReadonlyMap<string, TrialFacts>;
  readonly settings: {
    readonly water: Extract<SettingEvent, { data: { key: 'water' } }>['data']['value'] | null;
    readonly grinder: Extract<SettingEvent, { data: { key: 'grinder' } }>['data']['value'] | null;
    readonly brightLighter: boolean | null;
  };
  /** Meldingen over het logboek zelf (verweesde gebeurtenissen, enz.). */
  readonly notes: readonly string[];
  readonly eventCount: number;
  readonly lastEventAt: EpochMs | null;
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

export function learnFacts(events: readonly EngineEvent[]): FactState {
  const eff = effectiveEvents(mergeLogs(events).events);
  const notes: string[] = [];

  const beans = new Map<string, Mutable<BeanFacts> & { brewIds: string[]; fields: Partial<BeanFields>; sources: Partial<Record<keyof BeanFields, FieldSource>>; legacy: Record<string, unknown> }>();
  const plans = new Map<string, BrewPlanEvent>();
  const timers = new Map<string, BrewTimerEvent[]>();
  const actuals = new Map<string, BrewActualsEvent>();
  const tastings = new Map<string, TastingEvent>();
  const trials = new Map<string, TrialFacts>();
  let water: FactState['settings']['water'] = null;
  let grinder: FactState['settings']['grinder'] = null;
  let brightLighter: boolean | null = null;

  for (const ev of eff) {
    switch (ev.kind) {
      case 'bean.upsert': {
        const d = (ev as BeanUpsertEvent).data;
        const b = beans.get(d.beanId) ?? { beanId: d.beanId, fields: {}, sources: {}, legacy: {}, archived: false, firstAt: ev.at, brewIds: [] };
        Object.assign(b.fields, d.fields);
        Object.assign(b.sources, d.sources);
        if (d.legacy) Object.assign(b.legacy, d.legacy);
        beans.set(d.beanId, b);
        break;
      }
      case 'bean.archive': {
        const b = beans.get(ev.data.beanId);
        if (b) b.archived = true; else notes.push(`bean.archive voor onbekende zak ${ev.data.beanId}`);
        break;
      }
      case 'brew.plan':
        plans.set(ev.data.brewId, ev); // een tweede plan voor hetzelfde zetsel vervangt het eerste
        break;
      case 'brew.timer': {
        const list = timers.get(ev.data.brewId) ?? [];
        list.push(ev);
        timers.set(ev.data.brewId, list);
        break;
      }
      case 'brew.actuals': actuals.set(ev.data.brewId, ev); break;
      case 'tasting': tastings.set(ev.data.brewId, ev); break;
      case 'pair.trial': trials.set(ev.data.trialId, { at: ev.at, data: ev.data }); break;
      case 'setting':
        if (ev.data.key === 'water') water = ev.data.value;
        else if (ev.data.key === 'grinder') grinder = ev.data.value;
        else brightLighter = ev.data.value;
        break;
      default: break; // retract en brew.delete zijn al verwerkt
    }
  }

  for (const brewId of [...timers.keys(), ...actuals.keys(), ...tastings.keys()]) {
    if (!plans.has(brewId)) notes.push(`gebeurtenissen voor zetsel ${brewId} zonder plan genegeerd`);
  }

  const cups = new Map<string, CupFacts>();
  const abandoned = new Map<string, CupFacts>();
  for (const [brewId, plan] of plans) {
    const p = plan.data;
    const a = actuals.get(brewId)?.data ?? null;
    const t = tastings.get(brewId) ?? null;
    const { drained, startedAtSec, endSec, bedDrySec, status } = foldTimer(timers.get(brewId) ?? []);
    const lastIndex = p.recipe.pours.length - 1;
    const lastPour = p.recipe.pours[lastIndex];
    const lastDrainAt = drained.get(lastIndex);
    const target = status === 'abandoned' ? abandoned : cups;
    target.set(brewId, {
      brewId,
      beanId: p.beanId,
      at: plan.at,
      goal: p.goal,
      engine: p.engine,
      trialId: p.trialId,
      planned: p.recipe,
      technique: a?.technique ?? p.recipe.technique,
      method: p.recipe.method,
      doseG: a?.doseG ?? p.recipe.doseG,
      waterG: a?.waterG ?? p.recipe.waterG,
      bypassG: a?.bypassG ?? p.recipe.bypassG,
      grindClick: a?.grindClick ?? p.recipe.grindClick,
      cupG: a?.cupG ?? null,
      tdsPct: a?.tdsPct ?? null,
      dilutionG: dilutionOf(p.legacy),
      actualsGiven: a !== null,
      startedAtSec,
      endSec,
      bedDrySec,
      drainedAtSec: drained,
      lastDrainSec: lastPour && lastDrainAt !== undefined && lastDrainAt >= lastPour.atSec ? ((lastDrainAt - lastPour.atSec) as Seconds) : null,
      status,
      tasting: t ? t.data : null,
      tastedAt: t ? t.at : null
    });
    if (p.beanId) {
      const b = beans.get(p.beanId);
      if (!b) notes.push(`zetsel ${brewId} verwijst naar onbekende zak ${p.beanId}`);
      else if (status !== 'abandoned') b.brewIds.push(brewId);
    }
  }

  const cupOrder = [...cups.values()].sort((x, y) => x.at - y.at || (x.brewId < y.brewId ? -1 : 1)).map(c => c.brewId);
  for (const b of beans.values()) b.brewIds.sort((x, y) => cupOrder.indexOf(x) - cupOrder.indexOf(y));

  return {
    __engineState: true,
    beans,
    cups,
    abandoned,
    cupOrder,
    trials,
    settings: { water, grinder, brightLighter },
    notes,
    eventCount: eff.length,
    lastEventAt: eff.length > 0 ? eff[eff.length - 1]!.at : null
  };
}

function dilutionOf(legacy: Readonly<Record<string, unknown>> | null): number {
  const inputs = legacy?.['inputs'] as { e2?: { dilutionG?: unknown } } | null | undefined;
  const d = inputs?.e2?.dilutionG;
  return typeof d === 'number' && d > 0 ? d : 0;
}

function foldTimer(list: readonly BrewTimerEvent[]): {
  drained: Map<number, Seconds>; startedAtSec: Seconds | null; endSec: Seconds | null; bedDrySec: Seconds | null; status: CupFacts['status'];
} {
  const drained = new Map<number, Seconds>();
  let startedAtSec: Seconds | null = null;
  let endSec: Seconds | null = null;
  let bedDrySec: Seconds | null = null;
  let status: CupFacts['status'] = 'planned';
  const ended = (type: TimerType): boolean => type === 'complete' || type === 'abandon';
  for (const ev of list) { // list staat al op tijd (effectiveEvents)
    const d = ev.data;
    if (d.type === 'start' && startedAtSec === null) { startedAtSec = d.tSec; status = 'brewing'; }
    else if (d.type === 'drained' && d.pourIndex !== null) drained.set(d.pourIndex, d.tSec);
    else if (d.type === 'drained_undo' && d.pourIndex !== null) drained.delete(d.pourIndex);
    else if (d.type === 'bed_dry') bedDrySec = d.tSec;
    else if (ended(d.type)) { endSec = d.tSec; status = d.type === 'complete' ? 'complete' : 'abandoned'; }
  }
  return { drained, startedAtSec, endSec, bedDrySec, status };
}

// ───────────────────────────── lezen ─────────────────────────────

/** Geeft de feiten terug, of gooit als de toestand niet van deze engine komt. */
export function factsOf(state: EngineState): FactState {
  const s = state as Partial<FactState>;
  if (!s || s.__engineState !== true || !(s.cups instanceof Map)) throw new Error('onbekende engine-toestand');
  return s as FactState;
}

export interface CupFilter {
  readonly beanId?: string | null;
  readonly technique?: TechniqueRef;
  readonly method?: Method;
  readonly waterG?: Grams;
  readonly status?: CupFacts['status'];
  readonly tasted?: boolean;
}

/** Zetsels op tijd, gefilterd. */
export function cupsOf(state: EngineState, f: CupFilter = {}): CupFacts[] {
  const s = factsOf(state);
  const out: CupFacts[] = [];
  for (const id of s.cupOrder) {
    const c = s.cups.get(id)!;
    if (f.beanId !== undefined && c.beanId !== f.beanId) continue;
    if (f.technique !== undefined && c.technique !== f.technique) continue;
    if (f.method !== undefined && c.method !== f.method) continue;
    if (f.waterG !== undefined && c.waterG !== f.waterG) continue;
    if (f.status !== undefined && c.status !== f.status) continue;
    if (f.tasted !== undefined && (c.tasting !== null) !== f.tasted) continue;
    out.push(c);
  }
  return out;
}

/** Tellingen per zak/techniek/hoeveelheid, voor de modules die 'genoeg data' moeten beoordelen. */
export function countsBy(state: EngineState, key: (c: CupFacts) => string, f: CupFilter = {}): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of cupsOf(state, f)) m.set(key(c), (m.get(key(c)) ?? 0) + 1);
  return m;
}
