// Zetten: een vraag aan de engine stellen en het antwoord leesbaar maken. De engine rekent; hier wordt niets bijgerekend.

import {
  TECHNIQUE_BY_ID, TECHNIQUES, RecipeError, ms, g,
  type Advice, type Agitation, type Band, type Engine, type EngineState, type FeedbackSignal, type Goal, type Method,
  type PlanRequest, type Pour, type PourStyle, type Recipe, type TechniqueId, type BrewPlanEvent
} from '../../../engine3/src/index.ts';
import { newId, type Env } from './ids.ts';

export interface BrewForm {
  readonly beanId: string | null;
  readonly method: Method;
  readonly cupG: number;
  readonly goal: Goal | null;
  readonly technique: TechniqueId | null;
  readonly feedback: readonly FeedbackSignal[];
}

export const DEFAULT_FORM: BrewForm = { beanId: null, method: 'v60', cupG: 250, goal: null, technique: null, feedback: [] };

export const GOAL_LABEL: Readonly<Record<Goal, string>> = { bright: 'Helder en fris', balanced: 'Gebalanceerd', rich: 'Rond en vol' };
export const METHOD_LABEL: Readonly<Record<Method, string>> = { v60: 'Hario V60', chemex: 'Chemex' };
export const FEEDBACK_LABEL: Readonly<Record<FeedbackSignal, string>> = {
  sour_or_hollow: 'De vorige kop was zuur of hol',
  drying: 'De vorige kop was droog in de mond',
  uneven_drain: 'Het water liep ongelijk door'
};
export const TECHNIQUE_OPTIONS: ReadonlyArray<{ id: TechniqueId; name: string }> = TECHNIQUES.map(t => ({ id: t.id, name: t.name }));

export const CUP_MIN = 100, CUP_MAX = 700;

export type PlanOutcome =
  | { readonly ok: true; readonly advice: Advice; readonly request: PlanRequest }
  | { readonly ok: false; readonly message: string };

export function planBrew(engine: Engine, state: EngineState, env: Env, form: BrewForm): PlanOutcome {
  if (!Number.isFinite(form.cupG) || form.cupG < CUP_MIN || form.cupG > CUP_MAX) {
    return { ok: false, message: `Kies een kopgrootte tussen ${CUP_MIN} en ${CUP_MAX} gram.` };
  }
  const request: PlanRequest = {
    at: ms(env.now()), beanId: form.beanId, method: form.method, cupG: g(form.cupG), goal: form.goal, technique: form.technique,
    ...(form.feedback.length ? { feedback: form.feedback } : {})
  };
  try {
    return { ok: true, advice: engine.plan(state, request), request };
  } catch (e) {
    if (e instanceof RecipeError) return { ok: false, message: e.message };
    return { ok: false, message: `Er kon geen recept gemaakt worden: ${(e as Error).message}` };
  }
}

export const clock = (sec: number): string => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
export const nl1 = (n: number): string => (Math.round(n * 10) / 10).toString().replace('.', ',');

export const bandText = (b: Band | null, unit: string, fmt: (n: number) => string = nl1): string | null =>
  b ? `${fmt(b.lo)}–${fmt(b.hi)} ${unit}`.trim() : null;

const STYLE: Readonly<Record<PourStyle, string>> = { spiral: 'in spiraal', center: 'in het midden', circles: 'in rondjes' };
const AGITATION: Readonly<Record<Agitation, string>> = { none: '', swirl: 'swirl', gentle_swirl: 'zacht swirlen', stir: 'roeren', rao_spin: 'Rao-spin' };

export interface PourLine { readonly index: number; readonly at: string; readonly add: string; readonly to: string; readonly how: string; readonly wait: boolean }

export function pourLines(recipe: Recipe): PourLine[] {
  return recipe.pours.map((p: Pour, i) => ({
    index: i, at: clock(p.atSec), add: `+${Math.round(p.addG)} g`, to: `${Math.round(p.toG)} g`,
    how: [STYLE[p.style], p.agitationAfter !== 'none' ? AGITATION[p.agitationAfter] : ''].filter(Boolean).join(', '),
    wait: p.waitForDrain
  }));
}

export function techniqueName(ref: string): string {
  return TECHNIQUE_BY_ID.get(ref as TechniqueId)?.name ?? ref.replace(/^legacy:/, '');
}

export function brewPlanEvent(env: Env, advice: Advice, form: BrewForm, brewId?: string): BrewPlanEvent {
  return {
    id: newId(env, 'ev'), at: ms(env.now()), device: env.device, v: 1, kind: 'brew.plan',
    data: { brewId: brewId ?? newId(env, 'brew'), beanId: form.beanId, goal: form.goal, engine: advice.engine, recipe: advice.recipe, trialId: advice.trial?.id ?? null, legacy: null }
  };
}
