import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { factsOf } from '../../../../engine3/src/index.ts';
import { href } from '../../core/router.ts';
import { clock, pourLines, techniqueName } from '../../core/brew.ts';
import {
  abandonTimer, drainedTap, drainedUndo, finishTimer, pauseTimer, resumeTimer, startTimer, stepGuide, timerEventsFor, timerView, type StepKind
} from '../../core/timer.ts';
import { cueFor, readCuePrefs, type CueState } from '../../core/cues.ts';
import { playCue, unlockAudio } from '../cues.ts';
import { useApp, useSnapshot } from '../store-context.tsx';

/** Ring rond de tijd van de huidige stap. De getallen erin zijn voor het oog; de uitleg staat in de tekst ernaast. */
function Ring({ fraction, kind, label }: { fraction: number | null; kind: StepKind; label: string }): JSX.Element {
  const R = 52, C = 2 * Math.PI * R;
  const f = kind === 'done' ? 1 : kind === 'hold' ? 1 : fraction ?? 0;
  return (
    <div class="ring" aria-hidden="true">
      <svg viewBox="0 0 120 120">
        <circle class="track" cx="60" cy="60" r={R} />
        <circle class={`bar ${kind}`} cx="60" cy="60" r={R} stroke-dasharray={kind === 'hold' ? '5 7' : C.toFixed(1)} stroke-dashoffset={kind === 'hold' ? 0 : (C * (1 - f)).toFixed(1)} transform="rotate(-90 60 60)" />
      </svg>
      <span class="ringtext">{label}</span>
    </div>
  );
}

function useTicker(active: boolean): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick(t => t + 1), 200);
    return () => clearInterval(id);
  }, [active]);
}

/** Houdt het scherm aan zolang het zetsel loopt (waar de browser dat toestaat). */
function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    let lock: { release(): Promise<void> } | null = null;
    let gone = false;
    const take = async (): Promise<void> => {
      try { lock = (await (navigator as unknown as { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock?.request('screen')) ?? null; } catch { lock = null; }
      if (gone) void lock?.release();
    };
    void take();
    const onVis = (): void => { if (document.visibilityState === 'visible') void take(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { gone = true; document.removeEventListener('visibilitychange', onVis); void lock?.release(); };
  }, [active]);
}

export function Timer({ brewId }: { brewId: string }): JSX.Element {
  const { store, env } = useApp();
  const { state, events } = useSnapshot();
  const cup = factsOf(state).cups.get(brewId);
  const timerEvents = timerEventsFor(events, brewId);
  const recipe = cup?.planned;
  const view = recipe ? timerView(recipe, timerEvents, env.now()) : null;
  const running = view?.status === 'running';
  useTicker(running);
  useWakeLock(running || view?.status === 'paused');
  const [confirmStop, setConfirmStop] = useState(false);

  // Signalen (geluid en trillen) bij een giet, een wacht-op-doorlopen, de laatste drie seconden voor een giet en het einde.
  const prevCue = useRef<CueState | null>(null);
  const cueGuide = recipe && view ? stepGuide(recipe, view, recipe.expectedEndSec?.mid ?? null) : null;
  const cueNow: CueState | null = view && cueGuide ? { status: view.status, phaseKey: view.phases.join(','), kind: cueGuide.kind, remainingSec: cueGuide.remainingSec } : null;
  useEffect(() => {
    if (!cueNow) return;
    const cue = cueFor(prevCue.current, cueNow);
    prevCue.current = cueNow;
    if (cue) playCue(cue, readCuePrefs(localStorage));
  });
  // Een AudioContext start pas na een tik; na herladen midden in een zetsel is de eerste tik op het scherm genoeg.
  useEffect(() => {
    const once = (): void => unlockAudio();
    document.addEventListener('pointerdown', once, { once: true });
    return () => document.removeEventListener('pointerdown', once);
  }, []);

  if (!cup || !recipe || !view) return <section><h1>Zetsel niet gevonden</h1><a class="btn" href={href('zetten')}>Terug</a></section>;
  const lines = pourLines(recipe);
  const send = (evs: ReturnType<typeof startTimer>): void => { void store.append(evs); };
  const t = view.elapsedSec;
  const lastIdx = recipe.pours.length - 1;

  const guide = stepGuide(recipe, view, recipe.expectedEndSec?.mid ?? null);
  const center = guide.kind === 'ready' ? 'start' : guide.kind === 'done' ? 'klaar' : guide.kind === 'hold' ? 'wacht' : guide.remainingSec !== null ? clock(guide.remainingSec) : 'droog?';

  return (
    <section class={view.status === 'ready' ? 'timer ready' : 'timer'} aria-label="Timer">
      <div class="clock" aria-label={`Totale tijd ${clock(Math.floor(t))}`}>{clock(Math.floor(t))}<small>totaal</small></div>
      <div class={`stepcard ${guide.kind}`}>
        {guide.kind !== 'ready' && <Ring fraction={guide.fraction} kind={guide.kind} label={center} />}
        <div class="stepcopy" role="status">
          <h2 class="stepname">{guide.title}</h2>
          <p class="stepaction">{guide.action}</p>
        </div>
      </div>
      {guide.next && <p class="stepnext">{guide.next}</p>}
      <ol class="steps" aria-label="Gietschema">
        {lines.map((l, i) => {
          const ph = view.phases[i]!;
          const cls = ph === 'hold' ? 'hold' : ph === 'go' && i === view.current ? 'go' : view.drained.has(i) ? 'past' : '';
          return <li key={i} class={cls}><span>{l.at}</span><span>{l.add}</span><span>→ {l.to}</span></li>;
        })}
      </ol>

      {view.status === 'ready' && <button class="btn primary big" type="button" onClick={() => { unlockAudio(); send(startTimer(env, brewId)); }}>Start</button>}
      {(view.status === 'running' || view.status === 'paused') && (
        <div>
          {view.status === 'running' && (view.current === lastIdx && view.phases[lastIdx] === 'go' && !view.allPoured
            ? <button class="btn primary big" type="button" onClick={() => send(finishTimer(env, brewId, t, lastIdx))}>Alles doorgelopen — klaar</button>
            : view.current >= 0 && !view.drained.has(view.current)
              ? <button class="btn primary big" type="button" onClick={() => send(drainedTap(env, brewId, t, view.current))}>Erdoor</button>
              : view.current >= 0 && view.drained.has(view.current) && view.current !== lastIdx
                ? <button class="btn big" type="button" onClick={() => send(drainedUndo(env, brewId, t, view.current))}>Erdoor ongedaan maken</button>
                : null)}
          <div class="pair">
            {view.status === 'running'
              ? <button class="btn" type="button" onClick={() => send(pauseTimer(env, brewId, t))}>Pauze</button>
              : <button class="btn primary" type="button" onClick={() => { unlockAudio(); send(resumeTimer(env, brewId, t)); }}>Verder</button>}
            {confirmStop
              ? <button class="btn" type="button" onClick={() => send(abandonTimer(env, brewId, t))}>Echt stoppen</button>
              : <button class="btn" type="button" onClick={() => setConfirmStop(true)}>Stop</button>}
          </div>
        </div>
      )}
      {view.status === 'complete' && <a class="btn primary big" href={href('proeven', brewId)}>Proeven</a>}
      {view.status === 'abandoned' && <a class="btn big" href={href('zetten')}>Terug</a>}
    </section>
  );
}
