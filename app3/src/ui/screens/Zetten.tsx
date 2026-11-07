import type { JSX } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Goal } from '../../../../engine3/src/index.ts';
import type { Route } from '../../core/router.ts';
import { href } from '../../core/router.ts';
import { beanRows } from '../../core/beans.ts';
import {
  CUP_MAX, CUP_MIN, DEFAULT_FORM, FEEDBACK_LABEL, GOAL_LABEL, METHOD_LABEL, TECHNIQUE_OPTIONS,
  bandText, brewPlanEvent, clock, nl1, planBrew, pourLines, techniqueName, type BrewForm
} from '../../core/brew.ts';
import { useApp, useSnapshot } from '../store-context.tsx';
import { Timer } from './Timer.tsx';
import { Proeven } from './Proeven.tsx';
import { Welkom } from '../Welkom.tsx';
import { markeerWelkomGezien, toonWelkom, welkomGezien } from '../../core/welkom.ts';
import { trialPlanEvent, type TrialArm } from '../../core/trials.ts';

const KEY = 'brewconsole.zetten';
function loadForm(): BrewForm {
  try { return { ...DEFAULT_FORM, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<BrewForm>), feedback: [] }; } catch { return DEFAULT_FORM; }
}
const hasSavedForm = (): boolean => { try { return localStorage.getItem(KEY) !== null; } catch { return false; } };
function saveForm(f: BrewForm): void {
  try { localStorage.setItem(KEY, JSON.stringify({ beanId: f.beanId, method: f.method, cupG: f.cupG, goal: f.goal, technique: f.technique })); } catch { /* geen opslag: prima */ }
}

function Plan(): JSX.Element {
  const { engine, store, env } = useApp();
  const { state, revision } = useSnapshot();
  const rows = beanRows(state);
  const [form, setForm] = useState<BrewForm>(loadForm);
  const [err, setErr] = useState('');
  // Op een telefoon start het formulier ingeklapt zodra je het eerder gebruikte; op een laptop staat het altijd open.
  const [open, setOpen] = useState(() => !hasSavedForm());
  // Een zak die niet meer bestaat (archief, andere toestel) valt terug op 'geen zak'.
  const beanId = form.beanId && rows.some(r => r.id === form.beanId) ? form.beanId : null;
  const eff = useMemo(() => ({ ...form, beanId }), [form, beanId]);
  useEffect(() => saveForm(eff), [eff]);
  const outcome = useMemo(() => planBrew(engine, state, env, eff), [engine, revision, eff]);
  const set = (p: Partial<BrewForm>): void => setForm({ ...eff, ...p });

  const start = async (): Promise<void> => {
    if (!outcome.ok) return;
    const ev = brewPlanEvent(env, outcome.advice, eff);
    try { await store.append([ev]); location.hash = href('timer', ev.data.brewId); }
    catch (e) { setErr(`Opslaan is mislukt: ${(e as Error).message}`); }
  };

  const startTrial = async (arm: TrialArm): Promise<void> => {
    if (!outcome.ok) return;
    try {
      const ev = trialPlanEvent(env, outcome.advice, eff, arm);
      await store.append([ev]); location.hash = href('timer', ev.data.brewId);
    } catch (e) { setErr(`Opslaan is mislukt: ${(e as Error).message}`); }
  };

  const beanName = beanId ? rows.find(r => r.id === beanId)?.name ?? 'Zak' : 'Geen zak';
  const summary = [beanName, `${eff.cupG} g`, eff.goal ? GOAL_LABEL[eff.goal] : 'geen voorkeur', eff.technique ? techniqueName(eff.technique) : null].filter(Boolean).join(' · ');

  return (
    <section class="zetten">
      <h1>Zetten</h1>
      <div class="zgrid">
      <div class="zform-col">
      <button type="button" class="zsummary" aria-expanded={open} aria-controls="zform" onClick={() => setOpen(!open)}>
        <span class="zsum-text">{summary}</span><span class="zedit">{open ? 'Klaar' : 'Wijzig'}</span>
      </button>
      <div class={open ? 'card zform' : 'card zform collapsed'} id="zform">
        <label class="field"><span>Zak</span>
          <select name="bean" value={beanId ?? ''} onChange={e => set({ beanId: (e.currentTarget as HTMLSelectElement).value || null })}>
            <option value="">Geen zak (algemeen)</option>
            {rows.map(r => <option key={r.id} value={r.id}>{r.name}{r.roaster ? ` · ${r.roaster}` : ''}</option>)}
          </select>
        </label>
        <div class="field"><span id="cup-l">Kop (gram, koffie die je drinkt)</span>
          <div class="stepper">
            <button class="btn" type="button" aria-label="Kleiner" onClick={() => set({ cupG: Math.max(CUP_MIN, eff.cupG - 10) })}>−</button>
            <input name="cup" inputMode="numeric" aria-labelledby="cup-l" value={String(eff.cupG)} onInput={e => set({ cupG: Number((e.currentTarget as HTMLInputElement).value) })} />
            <button class="btn" type="button" aria-label="Groter" onClick={() => set({ cupG: Math.min(CUP_MAX, eff.cupG + 10) })}>+</button>
          </div>
        </div>
        <div class="field"><span id="goal-l">Doel</span>
          <div class="chips" role="group" aria-labelledby="goal-l">
            <button type="button" class="chip" aria-pressed={eff.goal === null} onClick={() => set({ goal: null })}>Geen voorkeur</button>
            {(Object.keys(GOAL_LABEL) as Goal[]).map(k => <button key={k} type="button" class="chip" aria-pressed={eff.goal === k} onClick={() => set({ goal: k })}>{GOAL_LABEL[k]}</button>)}
          </div>
        </div>
        <details>
          <summary>Meer opties</summary>
          <label class="field"><span>Methode</span>
            <select name="method" value={eff.method} onChange={e => set({ method: (e.currentTarget as HTMLSelectElement).value as BrewForm['method'] })}>
              {(Object.keys(METHOD_LABEL) as Array<keyof typeof METHOD_LABEL>).map(m => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
            </select></label>
          <label class="field"><span>Techniek</span>
            <select name="technique" value={eff.technique ?? ''} onChange={e => set({ technique: ((e.currentTarget as HTMLSelectElement).value || null) as BrewForm['technique'] })}>
              <option value="">Laat Brew Console kiezen</option>
              {TECHNIQUE_OPTIONS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select></label>
          <fieldset class="field"><legend class="meta">Over de vorige kop</legend>
            {(Object.keys(FEEDBACK_LABEL) as Array<keyof typeof FEEDBACK_LABEL>).map(k => (
              <label key={k} class="row" style="min-height:var(--tap)"><input type="checkbox" checked={eff.feedback.includes(k)} onChange={e => set({ feedback: (e.currentTarget as HTMLInputElement).checked ? [...eff.feedback, k] : eff.feedback.filter(x => x !== k) })} /> {FEEDBACK_LABEL[k]}</label>
            ))}
          </fieldset>
        </details>
      </div>

      </div>
      <div class="zadvice-col">
      {!outcome.ok ? <p class="banner warn" role="alert">{outcome.message}</p> : <Advice outcome={outcome} onStart={start} onTrial={startTrial} />}
      {err && <p class="banner warn" role="alert">{err}</p>}
      </div>
      </div>
    </section>
  );
}

function Advice({ outcome, onStart, onTrial }: { outcome: Extract<ReturnType<typeof planBrew>, { ok: true }>; onStart: () => void; onTrial: (arm: TrialArm) => void }): JSX.Element {
  const { advice } = outcome;
  const r = advice.recipe;
  const end = bandText(advice.uncertainty.endSec, '', clock);
  const dose = bandText(advice.uncertainty.doseG, 'g');
  const tds = bandText(advice.uncertainty.targetTds, '% TDS', n => n.toFixed(2).replace('.', ','));
  const lines = pourLines(r);
  return (
    <div>
      <h2>{techniqueName(r.technique)}</h2>
      <div class="numbers">
        <div class="num"><b>{nl1(r.doseG)} g</b><small>koffie</small></div>
        <div class="num"><b>{Math.round(r.waterG)} g</b><small>water{r.bypassG > 0 ? ` (+${Math.round(r.bypassG)} g erbij)` : ''}</small></div>
        {r.tempC !== null && <div class="num"><b>{r.tempC} °C</b><small>temperatuur</small></div>}
        {r.grindClick !== null && <div class="num"><b>klik {r.grindClick}</b><small>Timemore C3S Pro</small></div>}
      </div>
      {(dose || tds) && <p class="meta">Onzekerheid: {[dose && `dosis ${dose}`, tds && `doel-TDS ${tds}`].filter(Boolean).join(' · ')}</p>}
      <div class="card">
        <table class="pours"><thead><tr><th>Tijd</th><th>Giet</th><th>Totaal</th><th>Hoe</th></tr></thead>
          <tbody>{lines.map(l => (
            <tr key={l.index}><td>{l.at}{l.wait ? '*' : ''}</td><td>{l.add}</td><td>{l.to}</td><td>{l.how}</td></tr>
          ))}</tbody></table>
        {lines.some(l => l.wait) && <p class="meta">* begin pas als het bed bijna droog is, ook als dat later is dan de tijd.</p>}
      </div>
      {advice.warnings.map(w => <p class="banner warn" key={w} role="status">{w}</p>)}
      {advice.reasons.length > 0 && (<div class="card"><strong>Waarom dit recept</strong><ul class="reasons">{advice.reasons.map(x => <li key={x.code + x.text}>{x.text}</li>)}</ul></div>)}
      {advice.trial && (
        <div class="card"><p><strong>Proef:</strong> {advice.trial.text}</p>
          <div class="actions">
            <button class="btn" type="button" onClick={() => onTrial('control')}>Zet kop 1: {techniqueName(advice.trial.control.technique)}</button>
            <button class="btn" type="button" onClick={() => onTrial('variant')}>Zet kop 2: {techniqueName(advice.trial.variant.technique)}</button>
          </div></div>)}
      <div class="startbar"><button class="btn primary" type="button" onClick={onStart}><span>{advice.trial ? 'Zet gewoon dit recept' : 'Start zetsel'}</span>{end && <small>klaar rond {end}</small>}</button></div>
    </div>
  );
}

export function Zetten({ route }: { route: Route }): JSX.Element {
  if (route.parts[0] === 'timer' && route.parts[1]) return <Timer brewId={route.parts[1]} />;
  if (route.parts[0] === 'proeven' && route.parts[1]) return <Proeven brewId={route.parts[1]} />;
  return <Start />;
}

/** Eerste keer: welkomstkaart; daarna (of na wegklikken) het gewone zetscherm. */
function Start(): JSX.Element {
  const { events } = useSnapshot();
  const [gezien, setGezien] = useState(() => welkomGezien(localStorage));
  if (toonWelkom(events.length, gezien)) return <Welkom onSkip={() => { markeerWelkomGezien(localStorage); setGezien(true); }} />;
  return <Plan />;
}
