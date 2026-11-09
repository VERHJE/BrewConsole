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

// ───────────── per stap: wat nu, hoe lang nog, wat daarna ─────────────

export type StepKind = 'ready' | 'pour' | 'hold' | 'wait' | 'drain' | 'done';

export interface StepGuide {
  readonly kind: StepKind;
  /** Korte kop, bijvoorbeeld 'Giet 2'. */
  readonly title: string;
  /** Seconden tot het einde van deze stap, of null als dat niet vaststaat (wachten op doorlopen). */
  readonly remainingSec: number | null;
  /** 0 … 1: hoe ver deze stap is, of null. */
  readonly fraction: number | null;
  /** Wat er nu moet gebeuren. */
  readonly action: string;
  /** Wat daarna komt, of null. */
  readonly next: string | null;
  /** Welke giet het is, bijvoorbeeld 2 van 5; null buiten een giet (voor de start, klaar, afgebroken). */
  readonly progress: { readonly index: number; readonly count: number } | null;
  /** Bij een lopende giet: wat erbij moet, tot welk gewicht, en hoe. Anders null. */
  readonly target: { readonly addG: number; readonly toG: number; readonly how: string } | null;
}

const g0 = (n: number): string => String(Math.round(n));
const mmss = (s: number): string => `${Math.floor(Math.max(0, Math.round(s)) / 60)}:${String(Math.max(0, Math.round(s)) % 60).padStart(2, '0')}`;

/**
 * Eén stap tegelijk. De stap loopt van het begin van een giet tot het begin van de volgende; bij de laatste giet loopt
 * hij naar het verwachte einde (als dat bekend is). `holdIdx` en `phases` komen uit timerView.
 */
export function stepGuide(recipe: Recipe, v: TimerView, expectedEndSec: number | null): StepGuide {
  const pours = recipe.pours;
  const last = pours.length - 1;
  const first = pours[0];
  if (v.status === 'complete') return { kind: 'done', title: 'Klaar', remainingSec: null, fraction: 1, action: 'Proef de koffie en leg vast hoe hij was.', next: null, progress: null, target: null };
  if (v.status === 'abandoned') return { kind: 'done', title: 'Afgebroken', remainingSec: null, fraction: null, action: 'Dit zetsel telt niet mee voor het advies.', next: null, progress: null, target: null };
  if (v.status === 'ready' || !first) {
    return { kind: 'ready', title: 'Klaar om te starten', remainingSec: null, fraction: 0,
      action: first ? `Eerste giet: ${g0(first.addG)} g.` : 'Start de timer bij het eerste water.', next: pours[1] ? `Daarna giet 2 om ${mmss(pours[1].atSec)}.` : null, progress: null, target: null };
  }
  const t = v.elapsedSec;
  const holdIdx = v.phases.findIndex(p => p === 'hold');
  const upcoming = v.next;
  const nextPourText = (i: number): string => `giet ${i + 1}: ${g0(pours[i]!.addG)} g tot ${g0(pours[i]!.toG)} g om ${mmss(pours[i]!.atSec)}`;

  if (holdIdx >= 0) {
    const p = pours[holdIdx]!;
    return { kind: 'hold', title: 'Wacht op doorlopen', remainingSec: null, fraction: null,
      action: `Tik “Erdoor” zodra het bed bijna droog is. Dan giet ${holdIdx + 1}: ${g0(p.addG)} g tot ${g0(p.toG)} g.`,
      next: holdIdx < last ? `Daarna ${nextPourText(holdIdx + 1)}.` : 'Daarna: laat doorlopen.', progress: { index: holdIdx + 1, count: pours.length }, target: null };
  }
  if (v.current >= 0 && !v.allPoured) {
    const i = v.current;
    const p = pours[i]!;
    const start = p.atSec;
    const endAt = upcoming ? pours[upcoming.index]!.atSec : expectedEndSec;
    const remaining = endAt === null ? null : Math.max(0, endAt - t);
    const fraction = endAt === null || endAt <= start ? null : Math.min(1, Math.max(0, (t - start) / (endAt - start)));
    if (i === last) {
      return { kind: 'drain', title: `Giet ${i + 1}`, remainingSec: remaining, fraction,
        action: `${g0(p.addG)} g tot ${g0(p.toG)} g, daarna laten doorlopen.`, next: 'Tik “Alles doorgelopen” zodra het bed droog is.',
        progress: { index: i + 1, count: pours.length }, target: { addG: p.addG, toG: p.toG, how: 'daarna laten doorlopen' } };
    }
    const nx = upcoming ? pours[upcoming.index]! : null;
    return { kind: 'pour', title: `Giet ${i + 1}`, remainingSec: remaining, fraction,
      action: `${g0(p.addG)} g tot ${g0(p.toG)} g${p.style === 'spiral' ? ', in spiraal' : p.style === 'circles' ? ', in rondjes' : ', in het midden'}.`,
      next: nx && upcoming ? `Hierna ${nextPourText(upcoming.index)}.` : null,
      progress: { index: i + 1, count: pours.length }, target: { addG: p.addG, toG: p.toG, how: p.style === 'spiral' ? 'in spiraal' : p.style === 'circles' ? 'in rondjes' : 'in het midden' } };
  }
  if (upcoming) {
    const p = pours[upcoming.index]!;
    return { kind: 'wait', title: `Giet ${upcoming.index + 1} komt`, remainingSec: upcoming.inSec, fraction: null,
      action: `${g0(p.addG)} g tot ${g0(p.toG)} g.`, next: null, progress: { index: upcoming.index + 1, count: pours.length }, target: null };
  }
  return { kind: 'drain', title: 'Laat doorlopen', remainingSec: null, fraction: null, action: 'Tik “Alles doorgelopen” als alles doorgelopen is.', next: null, progress: { index: pours.length, count: pours.length }, target: null };
}
