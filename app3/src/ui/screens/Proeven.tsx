import type { JSX } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type {
  Acidity, Finish, GoalHit, Liking, Missed, NoteHit, StrengthOrd, VsLast, WheelCategory
} from '../../../../engine3/src/index.ts';
import { LIKING_MAX, LIKING_MIN, nudgeLiking } from '../../../../engine3/src/index.ts';
import { Stars } from '../Stars.tsx';
import { href } from '../../core/router.ts';
import { clock, techniqueName } from '../../core/brew.ts';
import {
  ACIDITY_LABEL, CATEGORIES, FINISH_LABEL, GOALHIT_LABEL, MISSED_LABEL, NOTEHIT_LABEL, STRENGTH_LABEL, VSLAST_LABEL,
  actualsProblems, contextFor, formatLiking, draftFromCup, stepsFor, tastingEvents, type StepId, type TastingContext, type TastingDraft
} from '../../core/tasting.ts';
import { pairTrialEvent, pendingTrialFor } from '../../core/trials.ts';
import { settingsOf } from '../../core/settings.ts';
import type { PairArm } from '../../../../engine3/src/index.ts';
import { useApp, useSnapshot } from '../store-context.tsx';

function Single<T extends string | number>({ value, options, onPick, label }: { value: T | null; options: ReadonlyArray<readonly [T, string]>; onPick: (v: T | null) => void; label: string }): JSX.Element {
  return (
    <div class="choices" role="group" aria-label={label}>
      {options.map(([v, text]) => <button key={String(v)} type="button" class="choice" aria-pressed={value === v} onClick={() => onPick(value === v ? null : v)}>{text}</button>)}
    </div>
  );
}

function Multi<T extends string>({ values, options, onToggle, label }: { values: readonly T[]; options: ReadonlyArray<readonly [T, string]>; onToggle: (v: T) => void; label: string }): JSX.Element {
  return (
    <div class="choices" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" role="checkbox" class="choice" aria-checked={values.includes(v)} onClick={() => onToggle(v)}><span class="box" aria-hidden="true" />{text}</button>
      ))}
    </div>
  );
}

const toggle = <T,>(list: readonly T[], v: T): T[] => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);
const entries = <K extends string>(o: Readonly<Record<K, string>>): Array<readonly [K, string]> => (Object.keys(o) as K[]).map(k => [k, o[k]] as const);

function Step({ id, ctx, d, set }: { id: StepId; ctx: TastingContext; d: TastingDraft; set: (p: Partial<TastingDraft>) => void }): JSX.Element {
  switch (id) {
    case 'strength':
      return (<div><p class="q">Hoe sterk was de koffie?</p>
        <Single<StrengthOrd> label="Sterkte" value={d.strength} onPick={v => set({ strength: v })} options={([-2, -1, 0, 1, 2] as StrengthOrd[]).map(v => [v, STRENGTH_LABEL[v]] as const)} /></div>);
    case 'taste':
      return (<div><p class="q">Zuurgraad</p>
        <Single<Acidity> label="Zuurgraad" value={d.acidity} onPick={v => set({ acidity: v })} options={entries(ACIDITY_LABEL)} />
        <p class="q">Afdronk <span class="hint">(meerdere mogelijk)</span></p>
        <Multi<Finish> label="Afdronk" values={d.finish} onToggle={v => set({ finish: toggle(d.finish, v) })} options={entries(FINISH_LABEL)} /></div>);
    case 'blind':
      return (<div><p class="q">Welke smaakgroepen proef je?</p>
        <p class="hint">Vink aan wat je proeft, zonder naar de zak te kijken. Niets aanvinken mag ook.</p>
        <Multi<WheelCategory> label="Smaakgroepen" values={d.cata} onToggle={v => set({ cata: toggle(d.cata, v) })} options={CATEGORIES.map(c => [c.key, c.name] as const)} /></div>);
    case 'notes':
      return (<div><p class="q">Dit staat op de zak. Herken je het?</p>
        {ctx.bagNotes.map(n => (
          <div class="notehit" key={n}><strong>{n}</strong>
            <div class="chips" role="group" aria-label={`Herken je ${n}?`}>
              {(Object.keys(NOTEHIT_LABEL) as NoteHit[]).map(h => <button key={h} type="button" class="chip" aria-pressed={d.noteHits[n] === h} onClick={() => { const next = { ...d.noteHits }; if (next[n] === h) delete next[n]; else next[n] = h; set({ noteHits: next }); }}>{NOTEHIT_LABEL[h]}</button>)}
            </div></div>
        ))}</div>);
    case 'liking':
      return (<div><p class="q">Hoe lekker vond je hem?</p>
        <Single<Liking> label="Waardering" value={d.liking} onPick={v => set({ liking: v })} options={([1, 2, 3, 4, 5] as Liking[]).map(v => [v, `${v} ${'★'.repeat(v)}`] as const)} />
        {d.liking !== null && (
          <div class="liking-fine">
            <button class="btn" type="button" aria-label="Een kwart ster lager" disabled={d.liking <= LIKING_MIN} onClick={() => set({ liking: nudgeLiking(d.liking!, -1) })}>−¼</button>
            <span class="liking-val" role="status"><Stars value={d.liking} /> {formatLiking(d.liking)} van 5</span>
            <button class="btn" type="button" aria-label="Een kwart ster hoger" disabled={d.liking >= LIKING_MAX} onClick={() => set({ liking: nudgeLiking(d.liking!, 1) })}>+¼</button>
          </div>)}
        <label class="field"><span>Notitie (optioneel)</span><textarea name="note" value={d.note} maxLength={500} onInput={e => set({ note: (e.currentTarget as HTMLTextAreaElement).value })} /></label></div>);
    case 'goal':
      return (<div>
        {ctx.cup.goal && (<><p class="q">Haalde je je doel?</p>
          <Single<GoalHit> label="Doel gehaald" value={d.goalHit} onPick={v => set({ goalHit: v })} options={entries(GOALHIT_LABEL)} /></>)}
        {d.goalHit && d.goalHit !== 'yes' && (<><p class="q">Wat miste je?</p>
          <Single<Missed> label="Gemist" value={d.missed} onPick={v => set({ missed: v })} options={entries(MISSED_LABEL)} /></>)}
        {ctx.previous && (<><p class="q">Vergeleken met de vorige kop van deze zak?</p>
          <Single<VsLast> label="Ten opzichte van de vorige" value={d.vsLast} onPick={v => set({ vsLast: v })} options={entries(VSLAST_LABEL)} /></>)}</div>);
    case 'actuals': {
      const c = ctx.cup;
      const num = (k: keyof TastingDraft['actuals'], label: string, ph: string): JSX.Element => (
        <label class="field"><span>{label}</span>
          <input name={k} inputMode="decimal" placeholder={ph} value={d.actuals[k] === undefined ? '' : String(d.actuals[k])}
            onInput={e => { const raw = (e.currentTarget as HTMLInputElement).value.replace(',', '.').trim(); const a = { ...d.actuals }; if (raw === '') delete a[k]; else a[k] = Number(raw); set({ actuals: a }); }} /></label>
      );
      return (<div><p class="q">Wat heb je echt gebruikt?</p>
        <p class="hint">Alleen invullen als het afweek van het recept. De engine leert van wat je echt deed.</p>
        {num('doseG', 'Koffie (g)', String(c.doseG))}{num('waterG', 'Water (g)', String(Math.round(c.waterG)))}
        {num('grindClick', 'Klik', c.grindClick === null ? '' : String(c.grindClick))}{num('bypassG', 'Bypass (g)', String(c.bypassG))}
        {num('cupG', 'Koffie in de kop (g)', '')}{num('tdsPct', 'TDS (%) als je gemeten hebt', '')}</div>);
    }
  }
}

export function Proeven({ brewId }: { brewId: string }): JSX.Element {
  const { store, env } = useApp();
  const { state, events } = useSnapshot();
  const ctx = useMemo(() => contextFor(state, events, brewId), [state, events, brewId]);
  const [draft, setDraft] = useState<TastingDraft | null>(null);
  const [i, setI] = useState(0);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  const [pref, setPref] = useState<PairArm | 'none' | null>(null);
  if (!ctx) return <section><h1>Zetsel niet gevonden</h1><a class="btn" href={href('zetten')}>Terug</a></section>;
  const d = draft ?? draftFromCup(ctx.cup);
  const set = (p: Partial<TastingDraft>): void => setDraft({ ...d, ...p });
  const steps = stepsFor(ctx);
  const step = steps[Math.min(i, steps.length - 1)]!;
  const last = i >= steps.length - 1;
  const problems = step === 'actuals' ? actualsProblems(d.actuals) : [];

  const save = async (): Promise<void> => {
    if (problems.length) return;
    try { await store.append(tastingEvents(env, ctx, d).events); setSaved(true); }
    catch (e) { setErr(`Opslaan is mislukt: ${(e as Error).message}`); }
  };

  const pending = saved ? pendingTrialFor(state, brewId) : null;
  const lighter = settingsOf(state).brightLighter;
  const choose = async (preferred: PairArm | 'none', brighter: PairArm | 'none' | null): Promise<void> => {
    if (!pending) return;
    try { await store.append([pairTrialEvent(env, pending, preferred, brighter)]); } catch (e) { setErr(`Opslaan is mislukt: ${(e as Error).message}`); }
  };
  if (saved && pending && pref !== null) {
    return (<section><h1>Welke was helderder?</h1>
      <p class="muted">Helderder is frisser en levendiger, niet per se lekkerder.</p>
      <div class="choices">
        <button class="choice" type="button" onClick={() => choose(pref, 'control')}>Kop 1 · {techniqueName(pending.control.technique)}</button>
        <button class="choice" type="button" onClick={() => choose(pref, 'variant')}>Kop 2 · {techniqueName(pending.variant.technique)}</button>
        <button class="choice" type="button" onClick={() => choose(pref, 'none')}>Geen verschil</button>
      </div>
      {err && <p class="banner warn" role="alert">{err}</p>}</section>);
  }
  if (saved && pending) {
    const pick = (v: PairArm | 'none'): void => { if (lighter) setPref(v); else void choose(v, null); };
    return (<section><h1>Welke was beter?</h1>
      <p class="muted">Je hebt beide koppen van de proef geproefd. Welke vond je lekkerder?</p>
      <div class="choices">
        <button class="choice" type="button" onClick={() => pick('control')}>Kop 1 · {techniqueName(pending.control.technique)}</button>
        <button class="choice" type="button" onClick={() => pick('variant')}>Kop 2 · {techniqueName(pending.variant.technique)}</button>
        <button class="choice" type="button" onClick={() => pick('none')}>Geen verschil</button>
      </div>
      {err && <p class="banner warn" role="alert">{err}</p>}</section>);
  }
  if (saved) {
    return (<section><h1>Opgeslagen</h1><p class="muted">Dit telt mee voor je volgende advies.</p>
      <div class="actions"><a class="btn primary" href={href('zetten')}>Volgende kop</a><a class="btn" href={href('logboek')}>Logboek</a></div></section>);
  }
  return (
    <section>
      <div class="head"><h1>Proeven</h1></div>
      <p class="meta">{techniqueName(ctx.cup.technique)} · {Math.round(ctx.cup.doseG)} g · klik {ctx.cup.grindClick ?? '?'}{ctx.cup.endSec !== null ? ` · klaar in ${clock(ctx.cup.endSec)}` : ''}</p>
      <div class="progress" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={i + 1} aria-label="Voortgang"><i style={`width:${((i + 1) / steps.length) * 100}%`} /></div>
      <Step id={step} ctx={ctx} d={d} set={set} />
      {problems.map(p => <p class="banner warn" key={p} role="alert">{p}</p>)}
      {err && <p class="banner warn" role="alert">{err}</p>}
      <div class="actions">
        {i > 0 && <button class="btn" type="button" onClick={() => setI(i - 1)}>Terug</button>}
        <span class="spacer" />
        {last ? <button class="btn primary" type="button" onClick={save} disabled={problems.length > 0}>Opslaan</button>
          : <button class="btn primary" type="button" onClick={() => setI(i + 1)}>Volgende</button>}
      </div>
    </section>
  );
}
