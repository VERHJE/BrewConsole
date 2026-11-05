// Engine 3 · het logboek: controleren, samenvoegen en ordenen. Puur, zonder opslag.
//
// Regels (docs/engine3/03-datamodel.md):
//   - Een gebeurtenis is onveranderlijk. Hetzelfde id = dezelfde gebeurtenis (dubbel → één keer).
//   - Volgorde: op `at`, bij gelijke tijd op `id` (deterministisch op elk toestel).
//   - 'retract' trekt een eerdere gebeurtenis in; 'brew.delete' verwijdert een heel zetsel.
//   - Voor 'tasting' en 'brew.actuals' geldt per zetsel: de laatste wint.

import type { EngineEvent, EventKind } from './types.ts';
import { EVENT_SCHEMA_VERSION } from './types.ts';
import { isIsoDate } from './units.ts';

const KINDS: ReadonlySet<EventKind> = new Set<EventKind>([
  'bean.upsert', 'bean.archive', 'brew.plan', 'brew.timer', 'brew.actuals', 'brew.delete',
  'tasting', 'pair.trial', 'setting', 'retract'
]);

export interface ValidationIssue {
  readonly id: string | null;
  readonly path: string;
  readonly problem: string;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const nullOr = (v: unknown, pred: (x: unknown) => boolean): boolean => v === null || pred(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

/** Controleert de vorm van één gebeurtenis. Lege lijst = in orde. */
export function validateEvent(e: unknown): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  if (!isObj(e)) return [{ id: null, path: '', problem: 'geen object' }];
  const id = isStr(e['id']) ? e['id'] : null;
  const bad = (path: string, problem: string): void => { out.push({ id, path, problem }); };
  if (!id) bad('id', 'ontbreekt');
  if (!isNum(e['at']) || (e['at'] as number) < 0) bad('at', 'geen tijdstip (epoch-ms)');
  if (!isStr(e['device']) || !(e['device'] as string)) bad('device', 'ontbreekt');
  if (e['v'] !== EVENT_SCHEMA_VERSION) bad('v', `schemaversie moet ${EVENT_SCHEMA_VERSION} zijn`);
  const kind = e['kind'];
  if (!isStr(kind) || !KINDS.has(kind as EventKind)) { bad('kind', `onbekend: ${String(kind)}`); return out; }
  const d = e['data'];
  if (!isObj(d)) { bad('data', 'geen object'); return out; }
  switch (kind as EventKind) {
    case 'bean.upsert': {
      if (!isStr(d['beanId'])) bad('data.beanId', 'ontbreekt');
      if (!isObj(d['fields'])) bad('data.fields', 'geen object');
      if (!isObj(d['sources'])) bad('data.sources', 'geen object');
      const f = isObj(d['fields']) ? d['fields'] : {};
      for (const k of ['roastDate', 'openedDate'] as const) {
        if (k in f && f[k] !== null && !isIsoDate(f[k])) bad(`data.fields.${k}`, 'geen YYYY-MM-DD');
      }
      break;
    }
    case 'bean.archive':
      if (!isStr(d['beanId'])) bad('data.beanId', 'ontbreekt');
      break;
    case 'brew.plan': {
      if (!isStr(d['brewId'])) bad('data.brewId', 'ontbreekt');
      const r = d['recipe'];
      if (!isObj(r)) { bad('data.recipe', 'geen object'); break; }
      if (!isNum(r['doseG']) || (r['doseG'] as number) <= 0) bad('data.recipe.doseG', 'moet > 0 g zijn');
      if (!isNum(r['waterG']) || (r['waterG'] as number) <= 0) bad('data.recipe.waterG', 'moet > 0 g zijn');
      if (!Array.isArray(r['pours'])) bad('data.recipe.pours', 'geen lijst');
      else {
        let prevTo = 0, prevAt = -1;
        (r['pours'] as unknown[]).forEach((p, i) => {
          if (!isObj(p)) { bad(`data.recipe.pours[${i}]`, 'geen object'); return; }
          if (!isNum(p['atSec']) || (p['atSec'] as number) < prevAt) bad(`data.recipe.pours[${i}].atSec`, 'moet oplopen');
          if (!isNum(p['toG']) || (p['toG'] as number) < prevTo) bad(`data.recipe.pours[${i}].toG`, 'moet oplopen');
          if (isNum(p['toG']) && isNum(p['addG']) && Math.abs((p['toG'] as number) - prevTo - (p['addG'] as number)) > 0.5) bad(`data.recipe.pours[${i}].addG`, 'past niet bij toG');
          prevAt = isNum(p['atSec']) ? (p['atSec'] as number) : prevAt;
          prevTo = isNum(p['toG']) ? (p['toG'] as number) : prevTo;
        });
      }
      break;
    }
    case 'brew.timer':
      if (!isStr(d['brewId'])) bad('data.brewId', 'ontbreekt');
      if (!isNum(d['tSec']) || (d['tSec'] as number) < 0) bad('data.tSec', 'moet ≥ 0 s zijn');
      if (!nullOr(d['pourIndex'], isNum)) bad('data.pourIndex', 'geen getal');
      break;
    case 'brew.actuals':
    case 'brew.delete':
      if (!isStr(d['brewId'])) bad('data.brewId', 'ontbreekt');
      break;
    case 'tasting': {
      if (!isStr(d['brewId'])) bad('data.brewId', 'ontbreekt');
      const st = d['strength'];
      if (!(st === null || st === -2 || st === -1 || st === 0 || st === 1 || st === 2)) bad('data.strength', 'moet −2…+2 of null zijn');
      if (!Array.isArray(d['finish'])) bad('data.finish', 'geen lijst');
      if (!Array.isArray(d['cata'])) bad('data.cata', 'geen lijst');
      if (d['cataAsked'] !== undefined && typeof d['cataAsked'] !== 'boolean') bad('data.cataAsked', 'moet waar of onwaar zijn');
      break;
    }
    case 'pair.trial':
      if (!isStr(d['trialId'])) bad('data.trialId', 'ontbreekt');
      if (!['control', 'variant', 'none'].includes(String(d['preferred']))) bad('data.preferred', 'onbekend');
      break;
    case 'setting':
      if (!['water', 'grinder', 'brightLighter'].includes(String(d['key']))) bad('data.key', 'onbekend');
      break;
    case 'retract':
      if (!isStr(d['targetId'])) bad('data.targetId', 'ontbreekt');
      break;
  }
  return out;
}

/** Volgorde op elk toestel gelijk: tijd, dan id. */
export function compareEvents(a: EngineEvent, b: EngineEvent): number {
  return a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/**
 * Voegt logboeken samen (bv. twee toestellen): dubbele id's één keer, gesorteerd.
 * Bij twee verschillende gebeurtenissen met hetzelfde id wint de eerste (en dat wordt gemeld).
 */
export function mergeLogs(...logs: ReadonlyArray<readonly EngineEvent[]>): { events: EngineEvent[]; conflicts: string[] } {
  const byId = new Map<string, EngineEvent>();
  const conflicts: string[] = [];
  for (const log of logs) {
    for (const ev of log) {
      const have = byId.get(ev.id);
      if (!have) byId.set(ev.id, ev);
      else if (JSON.stringify(have) !== JSON.stringify(ev)) conflicts.push(ev.id);
    }
  }
  return { events: [...byId.values()].sort(compareEvents), conflicts };
}

/** Het logboek zoals de engine het leest: ingetrokken en verwijderde dingen eruit. */
export function effectiveEvents(events: readonly EngineEvent[]): EngineEvent[] {
  const sorted = [...events].sort(compareEvents);
  const retracted = new Set<string>();
  const deletedBrews = new Set<string>();
  for (const ev of sorted) {
    if (ev.kind === 'retract') retracted.add(ev.data.targetId);
    if (ev.kind === 'brew.delete') deletedBrews.add(ev.data.brewId);
  }
  return sorted.filter(ev => {
    if (ev.kind === 'retract' || ev.kind === 'brew.delete') return false;
    if (retracted.has(ev.id)) return false;
    const brewId = 'brewId' in ev.data ? (ev.data as { brewId: string }).brewId : null;
    return !(brewId && deletedBrews.has(brewId));
  });
}
