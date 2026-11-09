import type { JSX } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Goal } from '../../../../engine3/src/index.ts';
import type { Route } from '../../core/router.ts';
import { href } from '../../core/router.ts';
import { beanRows } from '../../core/beans.ts';
import {
  CHEMEX_PORTIONS, CUP_MAX, CUP_MIN, DEFAULT_FORM, FEEDBACK_LABEL, GOAL_LABEL, METHOD_LABEL,
  bandText, portionOf, techniqueFits, techniqueOptions, brewPlanEvent, clock, nl1, planBrew, pourLines, splitWarnings, techniqueName, type BrewForm
} from '../../core/brew.ts';
import { BagArt, useApp, useSnapshot } from '../store-context.tsx';
import { finishLines, pourNotes, prepLines } from '../../core/gieten.ts';
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
  try { localStorage.setItem(KEY, JSON.stringify({ beanId: f.beanId, method: f.method, cupG: f.cupG, goal: f.goal, technique: f.technique, noBean: f.noBean === true })); } catch { /* geen opslag: prima */ }
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
  // Zonder eigen keuze (nog niets bewust op 'geen zak' gezet) staat de nieuwste zak vooraf geselecteerd.
  const beanId = form.beanId && rows.some(r => r.id === form.beanId) ? form.beanId : form.noBean || rows.length === 0 ? null : rows[0]!.id;
  const eff = useMemo(() => ({ ...form, beanId }), [form, beanId]);
  useEffect(() => saveForm(eff), [eff]);
  const outcome = useMemo(() => planBrew(engine, state, env, eff), [engine, revision, eff]);
  const set = (p: Partial<BrewForm>): void => {
    let next = { ...eff, ...p, ...('beanId' in p ? { noBean: p.beanId === null } : {}) };
    // Wissel naar de Chemex: begin bij één kop (340 g, de maat van het recept), anders geeft 250 g een te dunne laag.
    if (next.method === 'chemex' && eff.method !== 'chemex' && portionOf(next.cupG) === null && !('cupG' in p)) next = { ...next, cupG: CHEMEX_PORTIONS[0]!.cupG };
    // Een techniek die niet bij de gekozen brewer past, valt terug op "Laat Brew Console kiezen".
    setForm(techniqueFits(next.method, next.technique) ? next : { ...next, technique: null });
  };
  const options = techniqueOptions(eff.method);
  const portion = eff.method === 'chemex' ? portionOf(eff.cupG) : null;

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
  const summary = [beanName, eff.method === 'chemex' ? 'Chemex' : null, `${eff.cupG} g`, eff.goal ? GOAL_LABEL[eff.goal] : 'geen voorkeur', eff.technique ? techniqueName(eff.technique) : null].filter(Boolean).join(' · ');

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
        <div class="field"><span id="method-l">Brewer</span>
          <div class="chips" role="group" aria-labelledby="method-l">
            {(Object.keys(METHOD_LABEL) as Array<keyof typeof METHOD_LABEL>).map(m => <button key={m} type="button" class="chip" aria-pressed={eff.method === m} onClick={() => set({ method: m })}>{METHOD_LABEL[m]}</button>)}
          </div>
        </div>
        {eff.method === 'chemex' && (
          <div class="field"><span id="portion-l">Portie (een kop is 340 g)</span>
            <div class="chips" role="group" aria-labelledby="portion-l">
              {CHEMEX_PORTIONS.map(p => <button key={p.id} type="button" class="chip" aria-pressed={portion === p.id} onClick={() => set({ cupG: p.cupG })}>{p.label}</button>)}
            </div>
          </div>)}
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
          <label class="field"><span>Techniek</span>
            <select name="technique" value={eff.technique ?? ''} onChange={e => set({ technique: ((e.currentTarget as HTMLSelectElement).value || null) as BrewForm['technique'] })}>
              <option value="">Laat Brew Console kiezen</option>
              {options.own.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              {options.other.length > 0 && <optgroup label="V60-technieken (lopen op de Chemex trager door)">{options.other.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>}
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
      {!outcome.ok ? <p class="banner warn" role="alert">{outcome.message}</p> : <Advice outcome={outcome} beanId={beanId} beanName={beanId ? beanName : null} onStart={start} onTrial={startTrial} />}
      {err && <p class="banner warn" role="alert">{err}</p>}
      </div>
      </div>
    </section>
  );
}

function Advice({ outcome, beanId, beanName, onStart, onTrial }: { outcome: Extract<ReturnType<typeof planBrew>, { ok: true }>; beanId: string | null; beanName: string | null; onStart: () => void; onTrial: (arm: TrialArm) => void }): JSX.Element {
  const { advice } = outcome;
  const r = advice.recipe;
  const { notes, cautions } = splitWarnings(advice.warnings);
  const end = bandText(advice.uncertainty.endSec, '', clock);
  const endB = advice.uncertainty.endSec;
  const doseB = advice.uncertainty.doseG;
  const tdsB = advice.uncertainty.targetTds;
  const tdsN = (n: number): string => n.toFixed(2).replace('.', ',');
  const lines = pourLines(r);
  const prep = prepLines(r), finish = finishLines(r), notesPerPour = pourNotes(r);
  return (
    <div>
      <div class="card recipe">
      <div class="advhead">
        {beanId && beanName && <span class="advthumb"><BagArt beanId={beanId} name={beanName} /></span>}
        <div class="advtitle">
          {beanName && <small class="eyebrow">{beanName}</small>}
          <h2>{techniqueName(r.technique)}</h2>
        </div>
      </div>
      <div class="numbers">
        <div class="num"><b>{nl1(r.doseG)} g</b><small>koffie</small></div>
        <div class="num"><b>{Math.round(r.waterG)} g</b><small>water{r.bypassG > 0 ? ` (+${Math.round(r.bypassG)} g erbij)` : ''}</small></div>
        {r.tempC !== null && <div class="num"><b>{r.tempC} °C</b><small>temperatuur</small></div>}
        {r.grindClick !== null && <div class="num"><b>klik {r.grindClick}</b><small>Timemore C3S Pro</small></div>}
      </div>
      {endB && <p class="meta">Verwacht klaar tussen {clock(endB.lo)} en {clock(endB.hi)}.</p>}
      <div class="recipe-body">
        <table class="pours"><thead><tr><th>Tijd</th><th>Giet</th><th>Totaal</th><th>Hoe</th></tr></thead>
          <tbody>{lines.map(l => (
            <tr key={l.index}><td>{l.at}{l.wait ? '*' : ''}</td><td>{l.add}</td><td>{l.to}</td><td>{l.how}</td></tr>
          ))}</tbody></table>
        {lines.some(l => l.wait) && <p class="meta">* begin pas als het bed bijna droog is, ook als dat later is dan de tijd.</p>}
        {prep.length > 0 && <div class="aprep"><strong>Voor je begint</strong><ul class="alist">{prep.map(t => <li key={t}>{t}</li>)}</ul></div>}
        {finish.length > 0 && <div class="aprep"><strong>Na de laatste giet</strong><ul class="alist">{finish.map(t => <li key={t}>{t}</li>)}</ul></div>}
      </div>
      <div class="startbar"><button class="btn primary" type="button" onClick={onStart}><span>{advice.trial ? 'Zet gewoon dit recept' : 'Start zetsel'}</span>{end && <small>klaar rond {end}</small>}</button></div>
      </div>
      {notesPerPour.length > 0 && (
        <details class="card fold"><summary>Aanwijzingen per giet</summary>
          <ol class="pournotes">{notesPerPour.map(n => (
            <li key={n.index}><b>Giet {n.index + 1} ({lines[n.index]!.at})</b>{n.tip && <span>{n.tip}</span>}{n.after && <span>Daarna: {n.after}</span>}</li>
          ))}</ol>
        </details>)}
      {cautions.map(w => <p class="banner warn" key={w} role="status">{w}</p>)}
      {notes.length > 0 && <ul class="notes" aria-label="Goed om te weten">{notes.map(w => <li key={w}>{w}</li>)}</ul>}
      {advice.reasons.length > 0 && (<details class="card fold"><summary>Waarom dit recept?</summary><ul class="reasons">{advice.reasons.map(x => <li key={x.code + x.text}>{x.text}</li>)}</ul></details>)}
      {(doseB || tdsB) && (
        <details class="card fold"><summary>Hoe zeker is dit recept?</summary>
          <p class="meta">Het advies is een schatting met een marge, geen exacte waarde.</p>
          <ul class="sure">
            {doseB && <li>De dosis ligt tussen {nl1(doseB.lo)} en {nl1(doseB.hi)} g.</li>}
            {tdsB && <li>De sterkte van de kop (doel-TDS) komt tussen {tdsN(tdsB.lo)} en {tdsN(tdsB.hi)} %.</li>}
          </ul>
        </details>)}
      {advice.trial && (
        <div class="card"><p><strong>Proef:</strong> {advice.trial.text}</p>
          <div class="actions">
            <button class="btn" type="button" onClick={() => onTrial('control')}>Zet kop 1: {techniqueName(advice.trial.control.technique)}</button>
            <button class="btn" type="button" onClick={() => onTrial('variant')}>Zet kop 2: {techniqueName(advice.trial.variant.technique)}</button>
          </div></div>)}
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
