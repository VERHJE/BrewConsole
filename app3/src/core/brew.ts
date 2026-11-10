// Zetten: een vraag aan de engine stellen en het antwoord leesbaar maken. De engine rekent; hier wordt niets bijgerekend.

import {
  TECHNIQUE_BY_ID, TECHNIQUES, RecipeError, fitsMethod, ms, g, CUP_LIMITS, factsOf,
  type Advice, type Band, type Engine, type EngineState, type FeedbackSignal, type Goal, type Method,
  type PlanRequest, type Pour, type Recipe, type TechniqueId, type TechniqueRef, type BrewPlanEvent
} from '../../../engine3/src/index.ts';
import { newId, type Env } from './ids.ts';
import { AGITATION_SHORT, pourGuide } from './gieten.ts';

export interface BrewForm {
  readonly beanId: string | null;
  readonly method: Method;
  readonly cupG: number;
  readonly goal: Goal | null;
  readonly technique: TechniqueId | null;
  readonly feedback: readonly FeedbackSignal[];
  /** Bewust 'geen zak' gekozen: dan niet vooraf de nieuwste zak nemen. */
  readonly noBean?: boolean;
}

export const DEFAULT_FORM: BrewForm = { beanId: null, method: 'v60', cupG: 250, goal: null, technique: null, feedback: [] };

export const GOAL_LABEL: Readonly<Record<Goal, string>> = { bright: 'Helder en fris', balanced: 'Gebalanceerd', rich: 'Rond en vol' };
export const METHOD_LABEL: Readonly<Record<Method, string>> = { v60: 'Hario V60', chemex: 'Chemex (6 kops)' };

/** Porties voor de Chemex: een kop is hier 340 g (12 oz), de maat van George Howells 6-kops-recept voor één kop. */
export const CHEMEX_PORTIONS: ReadonlyArray<{ id: 'one' | 'two'; label: string; cupG: number }> = [
  { id: 'one', label: '1 kop', cupG: 340 },
  { id: 'two', label: '2 koppen', cupG: 680 }
];
export const portionOf = (cupG: number): (typeof CHEMEX_PORTIONS)[number]['id'] | null => CHEMEX_PORTIONS.find(p => p.cupG === cupG)?.id ?? null;
export const FEEDBACK_LABEL: Readonly<Record<FeedbackSignal, string>> = {
  sour_or_hollow: 'De vorige kop was zuur of hol',
  drying: 'De vorige kop was droog in de mond',
  uneven_drain: 'Het water liep ongelijk door'
};
export const TECHNIQUE_OPTIONS: ReadonlyArray<{ id: TechniqueId; name: string }> = TECHNIQUES.map(t => ({ id: t.id, name: t.name }));

/** Technieken voor een brewer: de eigen recepten, en bij de Chemex daarnaast de V60-technieken (die loopt dan trager door). */
export function techniqueOptions(method: Method): { own: ReadonlyArray<{ id: TechniqueId; name: string }>; other: ReadonlyArray<{ id: TechniqueId; name: string }> } {
  const own = TECHNIQUES.filter(t => fitsMethod(t, method)).map(t => ({ id: t.id, name: t.name }));
  const other = method === 'chemex' ? TECHNIQUES.filter(t => !fitsMethod(t, method)).map(t => ({ id: t.id, name: t.name })) : [];
  return { own, other };
}

/** Is deze techniek voor deze brewer te kiezen? (Bij een wissel van brewer valt een niet-passende keuze terug op "Laat Brew Console kiezen".) */
export function techniqueFits(method: Method, id: TechniqueId | null): boolean {
  if (id === null) return true;
  const o = techniqueOptions(method);
  return o.own.some(t => t.id === id) || o.other.some(t => t.id === id);
}

/** Kopgrenzen per brewer (uit de engine): daarbinnen blijft de verhouding kloppen (audit 10 nov, P1-01). */
export const cupRange = (method: Method): { min: number; max: number } => CUP_LIMITS[method];
/** Een kop die buiten het bereik van de (nieuwe) brewer valt, wordt de dichtstbijzijnde grens. */
export const clampCup = (method: Method, cupG: number): number => {
  const { min, max } = cupRange(method);
  return Number.isFinite(cupG) ? Math.min(max, Math.max(min, Math.round(cupG))) : DEFAULT_FORM.cupG;
};
const METHOD_SHORT: Readonly<Record<Method, string>> = { v60: 'de Hario V60', chemex: 'de Chemex' };
/** Kopinvoer: accepteert een komma; geeft null als het geen getal is. */
export function parseCup(raw: string): number | null {
  const t = raw.replace(',', '.').trim();
  if (t === '' || !/^\d+(\.\d+)?$/.test(t)) return null;
  return Math.round(Number(t));
}

export type PlanOutcome =
  | { readonly ok: true; readonly advice: Advice; readonly request: PlanRequest }
  | { readonly ok: false; readonly message: string };

export function planBrew(engine: Engine, state: EngineState, env: Env, form: BrewForm): PlanOutcome {
  const { min, max } = cupRange(form.method);
  if (!Number.isFinite(form.cupG) || form.cupG < min || form.cupG > max) {
    return { ok: false, message: `Kies voor ${METHOD_SHORT[form.method]} een kop tussen ${min} en ${max} gram. Daarbuiten past de koffie niet in de brewer en klopt de verhouding niet meer.` };
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


export interface PourLine { readonly index: number; readonly at: string; readonly add: string; readonly to: string; readonly how: string; readonly wait: boolean }

export function pourLines(recipe: Recipe): PourLine[] {
  return recipe.pours.map((p: Pour, i) => ({
    index: i, at: clock(p.atSec), add: `+${Math.round(p.addG)} g`, to: `${Math.round(p.toG)} g`,
    how: [pourGuide(recipe, i).style, p.agitationAfter !== 'none' ? AGITATION_SHORT[p.agitationAfter] : ''].filter(Boolean).join(', '),
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

/**
 * Waarschuwingen uit het advies, rustiger gemaakt voor weergave: een dosis die minder dan 1 g buiten het bereik van de brewer ligt
 * (bijv. 22,3 g bij een maximum van 22 g) maakt niets uit en wordt niet getoond. Overige waarschuwingen blijven staan.
 */
export function visibleWarnings(warnings: readonly string[]): string[] {
  return warnings.filter(w => {
    const m = /\(([\d,.]+) g\) ligt buiten het bereik van de brewer .*het recept gebruikt ([\d,.]+) g/.exec(w);
    if (!m) return true;
    const num = (t: string): number => Number(t.replace(',', '.'));
    return Math.abs(num(m[1]!) - num(m[2]!)) >= 1;
  });
}

/** Meldingen die uitleg zijn en geen probleem: ze horen bij het recept, niet in een waarschuwingsbalk. */
const INFO_WARNING = [
  /^Kasuya: giet pas als het water bijna helemaal door het filter is/,
  /nog niet uit eigen zetsels geleerd/,
  /Nog geen doorlooptijden gelogd/,
  /Voor deze techniek zijn nog geen doorlooptijden gelogd/,
  /is een V60-techniek; op de Chemex/,
  /geen schaalregel; hoeveelheden zijn op verhouding geschaald/,
  /geen duidelijk betere klik/,
  /^Plaatshouder:/,
  /^Chemex: (dunne|diepe) laag/
];

/** Splitst de zichtbare meldingen in uitleg (rustig tonen) en echte aandachtspunten (waarschuwing). */
export function splitWarnings(warnings: readonly string[]): { notes: string[]; cautions: string[] } {
  const notes: string[] = [], cautions: string[] = [];
  for (const w of visibleWarnings(warnings)) (INFO_WARNING.some(r => r.test(w)) ? notes : cautions).push(w);
  return { notes, cautions };
}

/** Hoe lang een gepland of lopend zetsel als "open" geldt; daarna is het oud en wijst Zetten er niet meer naar. */
export const OPEN_BREW_HOURS = 12;
/**
 * Het meest recente zetsel dat gepland of bezig is (audit 10 nov, P1-02): daar moet je naar terug kunnen.
 * Afgeronde en afgebroken zetsels tellen niet; heel oude open zetsels ook niet.
 */
export function openBrew(state: EngineState, nowMs: number): { readonly id: string; readonly status: 'planned' | 'brewing'; readonly technique: TechniqueRef; readonly at: number } | null {
  let best: { id: string; status: 'planned' | 'brewing'; technique: TechniqueRef; at: number } | null = null;
  for (const [id, c] of factsOf(state).cups) {
    if (c.status !== 'planned' && c.status !== 'brewing') continue;
    if (nowMs - c.at > OPEN_BREW_HOURS * 3_600_000) continue;
    if (!best || c.at > best.at) best = { id, status: c.status, technique: c.technique, at: c.at };
  }
  return best;
}
