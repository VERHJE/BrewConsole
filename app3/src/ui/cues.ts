// Geluid (Web Audio) en trillen voor de signalen uit core/cues.ts. Een AudioContext mag pas starten na een tik van de
// gebruiker; `unlockAudio()` wordt bij Start, Verder en de eerste tik op het timerscherm aangeroepen.

import { CUE_SOUND, CUE_VIBRATION, type Cue, type CuePrefs } from '../core/cues.ts';

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  try {
    const Ctor = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    return ctx;
  } catch { return null; }
}

export function unlockAudio(): void {
  const c = context();
  if (c && c.state === 'suspended') void c.resume().catch(() => { /* geen geluid: prima */ });
}

function beeps(seq: ReadonlyArray<readonly [number, number]>, volume: number): void {
  const c = context();
  if (!c) return;
  let t = c.currentTime + 0.02;
  for (const [hz, dur] of seq) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = hz;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain); gain.connect(c.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
    t += dur + 0.08;
  }
}

/** Speelt het signaal volgens de voorkeuren. In schermtests kan `window.__cueLog` (een lijst) de signalen opvangen. */
export function playCue(cue: Cue, prefs: CuePrefs): void {
  (globalThis as { __cueLog?: string[] }).__cueLog?.push(cue);
  if (prefs.sound) beeps(CUE_SOUND[cue], cue === 'tick' ? 0.12 : 0.22);
  if (prefs.vibrate && CUE_VIBRATION[cue].length) { try { navigator.vibrate?.([...CUE_VIBRATION[cue]]); } catch { /* geen trilling */ } }
}
