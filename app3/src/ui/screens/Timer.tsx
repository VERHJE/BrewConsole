import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { factsOf } from '../../../../engine3/src/index.ts';
import { href } from '../../core/router.ts';
import { clock, pourLines, techniqueName } from '../../core/brew.ts';
import {
  abandonTimer, drainedTap, drainedUndo, finishTimer, pauseTimer, resumeTimer, startTimer, timerEventsFor, timerView
} from '../../core/timer.ts';
import { useApp, useSnapshot } from '../store-context.tsx';

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

  // Een korte trilling bij elke nieuwe giet-fase (waar de browser dat toestaat).
  const phaseKey = view ? view.phases.join(',') : '';
  useEffect(() => { if (running) { try { navigator.vibrate?.(200); } catch { /* geen trilling */ } } }, [phaseKey]);

  if (!cup || !recipe || !view) return <section><h1>Zetsel niet gevonden</h1><a class="btn" href={href('zetten')}>Terug</a></section>;
  const lines = pourLines(recipe);
  const send = (evs: ReturnType<typeof startTimer>): void => { void store.append(evs); };
  const t = view.elapsedSec;
  const lastIdx = recipe.pours.length - 1;
  const cur = view.current >= 0 ? lines[view.current]! : null;
  const holdIdx = view.phases.findIndex(p => p === 'hold');

  let now: JSX.Element;
  if (view.status === 'complete') {
    now = <div class="now done"><b>Klaar in {clock(cup.endSec ?? t)}</b><small>Proef de koffie en leg vast hoe hij was.</small></div>;
  } else if (view.status === 'abandoned') {
    now = <div class="now"><b>Afgebroken</b><small>Dit zetsel telt niet mee voor het advies.</small></div>;
  } else if (view.status === 'ready') {
    now = <div class="now"><b>{techniqueName(recipe.technique)}</b><small>{recipe.doseG} g koffie · {Math.round(recipe.waterG)} g water{recipe.grindClick !== null ? ` · klik ${recipe.grindClick}` : ''}{recipe.tempC !== null ? ` · ${recipe.tempC} °C` : ''}</small></div>;
  } else if (holdIdx >= 0) {
    const l = lines[holdIdx]!;
    now = <div class="now hold" role="status"><b>Wacht op doorlopen</b><small>Tik “Erdoor” zodra het bed bijna droog is. Dan: {l.add} tot {l.to}.</small></div>;
  } else if (cur && !view.allPoured) {
    now = <div class="now" role="status"><b>Giet {view.current + 1}: {cur.add} tot {cur.to}</b><small>{cur.how || 'rustig gieten'}{view.next ? ` · volgende giet over ${clock(view.next.inSec)}` : ' · laatste giet'}</small></div>;
  } else {
    now = <div class="now" role="status"><b>{view.next ? `Giet ${view.next.index + 1} over ${clock(view.next.inSec)}` : 'Laat doorlopen'}</b><small>{view.next ? `${lines[view.next.index]!.add} tot ${lines[view.next.index]!.to}` : 'Tik “Erdoor” als alles doorgelopen is.'}</small></div>;
  }

  return (
    <section class="timer" aria-label="Timer">
      <div class="clock" aria-live="off">{clock(Math.floor(t))}</div>
      {now}
      <ol class="steps" aria-label="Gietschema">
        {lines.map((l, i) => {
          const ph = view.phases[i]!;
          const cls = ph === 'hold' ? 'hold' : ph === 'go' && i === view.current ? 'go' : view.drained.has(i) ? 'past' : '';
          return <li key={i} class={cls}><span>{l.at}</span><span>{l.add}</span><span>→ {l.to}</span></li>;
        })}
      </ol>

      {view.status === 'ready' && <button class="btn primary big" type="button" onClick={() => send(startTimer(env, brewId))}>Start</button>}
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
              : <button class="btn primary" type="button" onClick={() => send(resumeTimer(env, brewId, t))}>Verder</button>}
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
