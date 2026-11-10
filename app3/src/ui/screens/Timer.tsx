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

/**
 * De ring (richting "Ritueel"): loopt rond tot het einde van de stap. In het midden het gewicht waar je naartoe giet,
 * daaronder de aftelling. Alles is voor het oog; de uitleg staat in de tekst eronder (role=status).
 */
function Ring({ fraction, kind, label, big, unit, soon }: { fraction: number | null; kind: StepKind; label: string; big: string | null; unit: string | null; soon: boolean }): JSX.Element {
  const R = 54, C = 2 * Math.PI * R;
  const f = kind === 'done' ? 1 : kind === 'hold' ? 1 : fraction ?? 0;
  return (
    <div class={soon ? 'ring soon' : 'ring'} aria-hidden="true">
      <svg viewBox="0 0 120 120">
        <circle class="track" cx="60" cy="60" r={R} />
        <circle class={`bar ${kind}`} cx="60" cy="60" r={R} stroke-dasharray={kind === 'hold' ? '2 6' : C.toFixed(1)} stroke-dashoffset={kind === 'hold' ? 0 : (C * (1 - f)).toFixed(1)} transform="rotate(-90 60 60)" />
        {kind === 'done' && <path class="check" d="M44 61 l11 11 l22 -24" pathLength="1" />}
      </svg>
      {kind !== 'done' && big !== null && <span class="ringnum" key={big}>{big}{unit && <small>{unit}</small>}</span>}
      <span class="ringtext">{label}</span>
    </div>
  );
}

/** Voor de start: dezelfde vorm zonder voortgang, met het totale water erin. */
function ReadyDial({ waterG, endText }: { waterG: number; endText: string | null }): JSX.Element {
  return (
    <div class="readydial" aria-hidden="true">
      <svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="54" /></svg>
      <span class="ringnum">{Math.round(waterG)}<small>g</small></span>
      <span class="ringsub">{endText ? `water · klaar ${endText}` : 'water'}</span>
    </div>
  );
}

/** Breed of liggend: dan staan schema en uitleg naast de timer en is het schema altijd open. */
function useWide(): boolean {
  const q = '(min-width: 900px) and (min-height: 600px), (orientation: landscape) and (max-height: 560px)';
  const [wide, setWide] = useState(() => typeof matchMedia === 'function' && matchMedia(q).matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const m = matchMedia(q); const on = (): void => setWide(m.matches);
    m.addEventListener('change', on); return () => m.removeEventListener('change', on);
  }, []);
  return wide;
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
  const facts = factsOf(state);
  const cup = facts.cups.get(brewId) ?? facts.abandoned.get(brewId);
  const timerEvents = timerEventsFor(events, brewId);
  const recipe = cup?.planned;
  const view = recipe ? timerView(recipe, timerEvents, env.now()) : null;
  const running = view?.status === 'running';
  useTicker(running);
  useWakeLock(running || view?.status === 'paused');
  const [confirmStop, setConfirmStop] = useState(false);
  const wide = useWide();

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
  // Het grote getal in de ring: het gewicht waar je naartoe giet; bij wachten het volgende doel.
  const holdIdx = view.phases.indexOf('hold');
  const holdNext = guide.kind === 'hold' && holdIdx >= 0 ? recipe.pours[holdIdx]! : null;
  const big = guide.target ? String(Math.round(guide.target.toG)) : holdNext ? String(Math.round(holdNext.toG)) : guide.kind === 'drain' || guide.kind === 'wait' ? String(Math.round(recipe.pours[lastIdx]!.toG)) : null;
  const soon = guide.kind === 'pour' && guide.remainingSec !== null && guide.remainingSec <= 5 && view.current < lastIdx;
  const name = techniqueName(recipe.technique);
  const eyebrow = `${name} · ${String(Math.round(recipe.doseG * 10) / 10).replace('.', ',')} g`;
  const end = recipe.expectedEndSec ? clock(recipe.expectedEndSec.mid) : null;
  // Op de telefoon is het schema alleen voor de start open (dan staat Start vast onderin); daarna één stap tegelijk.
  const schemaOpen = wide || view.status === 'ready';

  return (
    <section class={`timer rit ${view.status === 'ready' ? 'ready' : ''} k-${guide.kind}`.trim()} aria-label="Timer">
      <div class="tnow">
      {view.status === 'ready' && <button class="btn leave-top" type="button" onClick={() => { send(abandonTimer(env, brewId, 0)); location.hash = href('zetten'); }}>← Annuleren, terug naar Zetten</button>}
      {guide.progress && (
        <div class="pprog" role="group" aria-label={`Giet ${guide.progress.index} van ${guide.progress.count}`}>
          <span class="ptext">Giet {guide.progress.index} van {guide.progress.count}</span>
          <span class="pdots" aria-hidden="true">{Array.from({ length: guide.progress.count }, (_, i) => <i key={i} class={i + 1 < guide.progress!.index ? 'd done' : i + 1 === guide.progress!.index ? 'd now' : 'd'} />)}</span>
        </div>)}
      <p class="teyebrow">{eyebrow}</p>
      <div class={`stepcard ${guide.kind}`}>
        {guide.kind === 'ready' ? <ReadyDial waterG={recipe.waterG} endText={end} /> : <Ring fraction={guide.fraction} kind={guide.kind} label={center} big={big} unit={big ? 'g' : null} soon={soon} />}
        <div class="stepcopy" role="status" key={`${guide.kind}-${guide.progress?.index ?? 0}`}>
          <h2 class="stepname">{guide.title}</h2>
          {guide.target
            ? <p class="steptarget"><b>tot {Math.round(guide.target.toG)} g</b><span>+{Math.round(guide.target.addG)} g{guide.target.how ? ` · ${guide.target.how}` : ''}</span></p>
            : <p class="stepaction">{guide.action}</p>}
          {guide.target?.tip && <p class="steptip">{guide.target.tip}</p>}
        </div>
      </div>
      {guide.after && (
        <div class="stepafter" role="note">
          <strong>Daarna{guide.after.todo ? `: ${guide.after.todo}` : ''}</strong>
          {guide.after.detail && <span>{guide.after.detail}</span>}
        </div>)}
      <div class="clock" aria-label={`Totale tijd ${clock(Math.floor(t))}`}>{clock(Math.floor(t))}<small>totaal{end && view.status !== 'complete' ? ` · ±${end}` : ''}</small></div>
      </div>
      <div class="tplan">
      {guide.prep.length > 0 && (
        <div class="stepprep"><strong>Voor je begint</strong><ol>{guide.prep.map(t => <li key={t}>{t}</li>)}</ol></div>)}
      {guide.finish.length > 0 && (
        <div class="stepprep"><strong>Na de laatste giet</strong><ol>{guide.finish.map(t => <li key={t}>{t}</li>)}</ol></div>)}
      {guide.next && <p class="stepnext">{guide.next}</p>}
      <details class="schema" open={schemaOpen} key={schemaOpen ? 'open' : 'dicht'}>
        <summary>Gietschema <span class="meta">· {lines.length} gieten</span></summary>
        <ol class="steps" aria-label="Gietschema">
          {lines.map((l, i) => {
            const ph = view.phases[i]!;
            const cls = view.status === 'complete' ? 'past' : ph === 'hold' ? 'hold' : ph === 'go' && i === view.current ? 'go' : view.drained.has(i) ? 'past' : '';
            return <li key={i} class={cls}><span>{l.at}</span><span>{l.add}</span><span>→ {l.to}</span>{l.how && <small>{l.how}</small>}</li>;
          })}
        </ol>
      </details>
      </div>

      <div class="tctl">
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
      {view.status === 'complete' && (
        <div>
          <a class="btn primary big" href={href('proeven', brewId)}>Proeven</a>
          <a class="btn big leave" href={href('zetten')}>Later proeven, naar Zetten</a>
        </div>)}
      {view.status === 'abandoned' && <a class="btn big" href={href('zetten')}>Terug</a>}
      </div>
    </section>
  );
}
