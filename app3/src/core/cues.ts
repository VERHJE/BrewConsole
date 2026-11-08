// Signalen tijdens het zetsel: een tikje in de laatste drie seconden voor een giet, een dubbele piep als een giet begint,
// een aandachtssignaal als je "Erdoor" moet tikken, en een stijgende drieklank als het klaar is. Zuiver: de toestand van
// de timer erin, een signaal (of niets) eruit. Geluid en trillen zelf zitten in de schermlaag.

import type { StepKind } from './timer.ts';
import type { TimerStatus } from './timer.ts';

export type Cue = 'tick' | 'pour' | 'hold' | 'done';

export interface CueState {
  readonly status: TimerStatus;
  /** Fasen van alle gietingen als één tekst, bv. 'go,upcoming': verandert zodra er een giet begint of wacht. */
  readonly phaseKey: string;
  readonly kind: StepKind;
  readonly remainingSec: number | null;
}

const secsLeft = (r: number | null): number | null => (r === null ? null : Math.ceil(r - 1e-9));

/** Welk signaal hoort bij de overgang van `prev` naar `now`? `prev` null = eerste keer kijken: geen signaal. */
export function cueFor(prev: CueState | null, now: CueState): Cue | null {
  if (!prev) return null;
  if (now.status === 'complete' && prev.status !== 'complete') return 'done';
  if (now.status !== 'running' || prev.status !== 'running') return null; // start en hervatten zijn zelf een tik van jou
  if (now.phaseKey !== prev.phaseKey) return now.kind === 'hold' ? 'hold' : 'pour';
  if ((now.kind === 'pour' || now.kind === 'wait') && now.kind === prev.kind) {
    const a = secsLeft(now.remainingSec);
    if (a !== null && a >= 1 && a <= 3 && a !== secsLeft(prev.remainingSec)) return 'tick';
  }
  return null;
}

// ───────────── voorkeuren (per toestel) ─────────────

export interface CuePrefs { readonly sound: boolean; readonly vibrate: boolean }
export const CUE_SOUND_KEY = 'brewconsole.cueSound';
export const CUE_VIBRATE_KEY = 'brewconsole.cueVibrate';

export function readCuePrefs(s: { getItem(k: string): string | null } | null): CuePrefs {
  const on = (k: string): boolean => { try { return s?.getItem(k) !== '0'; } catch { return true; } };
  return { sound: on(CUE_SOUND_KEY), vibrate: on(CUE_VIBRATE_KEY) };
}
export function saveCuePref(s: { setItem(k: string, v: string): void } | null, key: typeof CUE_SOUND_KEY | typeof CUE_VIBRATE_KEY, on: boolean): void {
  try { s?.setItem(key, on ? '1' : '0'); } catch { /* geen opslag: de keuze geldt tot herladen */ }
}

/** Wat een signaal doet: toonreeks (Hz, seconden) en trilpatroon (ms). Tikken trillen niet. */
export const CUE_SOUND: Readonly<Record<Cue, ReadonlyArray<readonly [number, number]>>> = {
  tick: [[880, 0.05]],
  pour: [[1175, 0.12], [1175, 0.12]],
  hold: [[988, 0.1], [988, 0.1], [988, 0.1]],
  done: [[660, 0.18], [880, 0.18], [1175, 0.3]]
};
export const CUE_VIBRATION: Readonly<Record<Cue, readonly number[]>> = { tick: [], pour: [200], hold: [120, 80, 120], done: [300, 100, 300] };
