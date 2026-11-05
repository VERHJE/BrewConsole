// Timer: alles wordt uit de brew.timer-gebeurtenissen en de klok afgeleid, nooit uit een lopende teller.
// Dat is wat het vergrendelen van het scherm, herladen of een tweede toestel overleefbaar maakt.

import {
  effectiveEvents, ms, s,
  type BrewTimerEvent, type EngineEvent, type Recipe, type Seconds, type TimerType
} from '../../../engine3/src/index.ts';
import { newId, type Env } from './ids.ts';

export type TimerStatus = 'ready' | 'running' | 'paused' | 'complete' | 'abandoned';

export function timerEventsFor(log: readonly EngineEvent[], brewId: string): BrewTimerEvent[] {
  return effectiveEvents(log).filter((e): e is BrewTimerEvent => e.kind === 'brew.timer' && e.data.brewId === brewId);
}

export type PourPhase = 'upcoming' | 'hold' | 'go';

export interface TimerView {
  readonly status: TimerStatus;
  readonly elapsedSec: number;
  /** Fase per giet. 'hold': de tijd is er, maar het bed is nog niet doorgelopen (Kasuya). */
  readonly phases: readonly PourPhase[];
  /** Laatste giet die aan de beurt is geweest (−1 = nog geen). */
  readonly current: number;
  /** Eerstvolgende giet die nog niet begonnen is. */
  readonly next: { readonly index: number; readonly inSec: number } | null;
  readonly drained: ReadonlySet<number>;
  /** Is de laatste giet doorgelopen? */
  readonly allPoured: boolean;
}

export function timerView(recipe: Recipe, events: readonly BrewTimerEvent[], nowMs: number): TimerView {
  let status: TimerStatus = 'ready';
  let anchorSec = 0;
  let anchorAt = 0;
  const drained = new Set<number>();
  for (const e of events) {
    const d = e.data;
    if (d.type === 'start' && status === 'ready') { status = 'running'; anchorSec = d.tSec; anchorAt = e.at; }
    else if (d.type === 'pause' && status === 'running') { status = 'paused'; anchorSec = d.tSec; anchorAt = e.at; }
    else if (d.type === 'resume' && status === 'paused') { status = 'running'; anchorSec = d.tSec; anchorAt = e.at; }
    else if (d.type === 'drained' && d.pourIndex !== null) drained.add(d.pourIndex);
    else if (d.type === 'drained_undo' && d.pourIndex !== null) drained.delete(d.pourIndex);
    else if (d.type === 'complete') { status = 'complete'; anchorSec = d.tSec; }
    else if (d.type === 'abandon') { status = 'abandoned'; anchorSec = d.tSec; }
  }
  const elapsedSec = status === 'running' ? anchorSec + Math.max(0, (nowMs - anchorAt) / 1000) : status === 'ready' ? 0 : anchorSec;

  const pours = recipe.pours;
  const phases: PourPhase[] = pours.map((p, i) => {
    if (status === 'ready' || elapsedSec < p.atSec) return 'upcoming';
    if (p.waitForDrain && i > 0 && !drained.has(i - 1)) return 'hold';
    return 'go';
  });
  let current = -1;
  phases.forEach((ph, i) => { if (ph === 'go') current = i; });
  const nextIdx = phases.findIndex(ph => ph === 'upcoming');
  const next = nextIdx >= 0 ? { index: nextIdx, inSec: Math.max(0, pours[nextIdx]!.atSec - elapsedSec) } : null;
  return { status, elapsedSec, phases, current, next, drained, allPoured: pours.length > 0 && drained.has(pours.length - 1) };
}

// ───────────── gebeurtenissen maken ─────────────

function ev(env: Env, brewId: string, type: TimerType, tSec: number, pourIndex: number | null, bump = 0): BrewTimerEvent {
  return { id: newId(env, 'ev'), at: ms(env.now() + bump), device: env.device, v: 1, kind: 'brew.timer', data: { brewId, type, tSec: s(Math.round(tSec * 10) / 10) as Seconds, pourIndex } };
}

export const startTimer = (env: Env, brewId: string): BrewTimerEvent[] => [ev(env, brewId, 'start', 0, null)];
export const pauseTimer = (env: Env, brewId: string, tSec: number): BrewTimerEvent[] => [ev(env, brewId, 'pause', tSec, null)];
export const resumeTimer = (env: Env, brewId: string, tSec: number): BrewTimerEvent[] => [ev(env, brewId, 'resume', tSec, null)];
export const drainedTap = (env: Env, brewId: string, tSec: number, pourIndex: number): BrewTimerEvent[] => [ev(env, brewId, 'drained', tSec, pourIndex)];
export const drainedUndo = (env: Env, brewId: string, tSec: number, pourIndex: number): BrewTimerEvent[] => [ev(env, brewId, 'drained_undo', tSec, pourIndex)];
/** Laatste giet doorgelopen: erdoor, bed droog en klaar in één tik (elk 1 ms later, zodat de volgorde vastligt). */
export const finishTimer = (env: Env, brewId: string, tSec: number, lastIndex: number): BrewTimerEvent[] => [
  ev(env, brewId, 'drained', tSec, lastIndex), ev(env, brewId, 'bed_dry', tSec, null, 1), ev(env, brewId, 'complete', tSec, null, 2)
];
export const abandonTimer = (env: Env, brewId: string, tSec: number): BrewTimerEvent[] => [ev(env, brewId, 'abandon', tSec, null)];
