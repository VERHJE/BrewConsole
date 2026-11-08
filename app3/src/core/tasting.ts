// Proeven: de vragenlijst na een zetsel en de omzetting naar gebeurtenissen.
//
// Volgorde met reden: eerst wat je zonder voorkennis merkt (sterkte, zuur, afdronk), dan de blinde
// keuze van smaakgroepen, pas daarna de notities van de zak (anders zou je ze aanvinken omdat ze op de
// zak staan), dan waardering en oordeel over het doel.

import {
  FLAVOR_WHEEL, effectiveEvents, factsOf, ms, g, clicks, tdsPct,
  type Acidity, type BrewActualsEvent, type CupFacts, type EngineEvent, type EngineState, type Finish, type GoalHit,
  type Liking, type Missed, type NoteHit, type StrengthOrd, type TastingEvent, type VsLast, type WheelCategory
} from '../../../engine3/src/index.ts';
import { newId, type Env } from './ids.ts';

export const STRENGTH_LABEL: Readonly<Record<StrengthOrd, string>> = { '-2': 'Veel te slap', '-1': 'Iets slap', '0': 'Precies goed', '1': 'Iets sterk', '2': 'Veel te sterk' };
export const ACIDITY_LABEL: Readonly<Record<Acidity, string>> = { flat: 'Vlak', lively: 'Levendig', sharp: 'Scherp' };
export const FINISH_LABEL: Readonly<Record<Finish, string>> = { sweet_clean: 'Zoet en schoon', bitter: 'Bitter', drying: 'Droog in de mond', hollow: 'Hol' };
export const GOALHIT_LABEL: Readonly<Record<GoalHit, string>> = { yes: 'Ja', almost: 'Bijna', no: 'Nee' };
export const VSLAST_LABEL: Readonly<Record<VsLast, string>> = { better: 'Beter', same: 'Gelijk', worse: 'Slechter' };
export const MISSED_LABEL: Readonly<Record<Missed, string>> = { fruit: 'Meer fruit', sweet: 'Meer zoetheid', body: 'Meer body', less_bitter: 'Minder bitter', unsure: 'Weet ik niet' };
export const NOTEHIT_LABEL: Readonly<Record<NoteHit, string>> = { yes: 'Ja', bit: 'Een beetje', no: 'Nee' };
export const CATEGORIES: ReadonlyArray<{ key: WheelCategory; name: string }> = FLAVOR_WHEEL.map(c => ({ key: c.key, name: c.name }));

export interface TastingDraft {
  strength: StrengthOrd | null;
  acidity: Acidity | null;
  finish: Finish[];
  cata: WheelCategory[];
  noteHits: Record<string, NoteHit>;
  liking: Liking | null;
  goalHit: GoalHit | null;
  vsLast: VsLast | null;
  missed: Missed | null;
  note: string;
  /** Alleen gevuld als de gebruiker een werkelijke waarde heeft opgegeven. */
  actuals: { doseG?: number; waterG?: number; grindClick?: number; bypassG?: number; cupG?: number; tdsPct?: number };
}

export const emptyDraft = (): TastingDraft => ({
  strength: null, acidity: null, finish: [], cata: [], noteHits: {}, liking: null, goalHit: null, vsLast: null, missed: null, note: '', actuals: {}
});

export type StepId = 'strength' | 'taste' | 'blind' | 'notes' | 'liking' | 'goal' | 'actuals';

export interface TastingContext {
  readonly cup: CupFacts;
  /** De notities van de zak om te herkennen (tags en notities zonder tag), leeg als er geen zak is. */
  readonly bagNotes: readonly string[];
  /** De vorige geproefde kop van dezelfde zak, of null. */
  readonly previous: CupFacts | null;
  readonly completedAt: number | null;
}

export function contextFor(state: EngineState, events: readonly EngineEvent[], brewId: string): TastingContext | null {
  const facts = factsOf(state);
  const cup = facts.cups.get(brewId);
  if (!cup) return null;
  const bean = cup.beanId ? facts.beans.get(cup.beanId) : undefined;
  const notes = bean?.fields.notes;
  const bagNotes = notes ? [...new Set([...notes.tags, ...notes.unmapped])] : [];
  const idx = facts.cupOrder.indexOf(brewId);
  let previous: CupFacts | null = null;
  for (let i = idx - 1; i >= 0 && cup.beanId; i--) {
    const c = facts.cups.get(facts.cupOrder[i]!)!;
    if (c.beanId === cup.beanId && c.tasting) { previous = c; break; }
  }
  let completedAt: number | null = null;
  for (const e of effectiveEvents(events)) if (e.kind === 'brew.timer' && e.data.brewId === brewId && e.data.type === 'complete') completedAt = e.at;
  return { cup, bagNotes, previous, completedAt };
}

export function stepsFor(ctx: TastingContext): StepId[] {
  const steps: StepId[] = ['strength', 'taste', 'blind'];
  if (ctx.bagNotes.length > 0) steps.push('notes');
  steps.push('liking');
  if (ctx.cup.goal !== null || ctx.previous !== null) steps.push('goal');
  steps.push('actuals');
  return steps;
}

/** Wat er al is ingevuld voor een eerder opgeslagen proeverij (bewerken). */
export function draftFromCup(cup: CupFacts): TastingDraft {
  const t = cup.tasting;
  if (!t) return emptyDraft();
  const noteHits: Record<string, NoteHit> = {};
  for (const h of t.noteHits) noteHits[h.note] = h.hit;
  return {
    strength: t.strength, acidity: t.acidity, finish: [...t.finish], cata: [...t.cata], noteHits, liking: t.liking,
    goalHit: t.goalHit, vsLast: t.vsLast, missed: t.missed, note: t.note, actuals: {}
  };
}

export interface TastingOutput { readonly events: EngineEvent[] }

export function tastingEvents(env: Env, ctx: TastingContext, d: TastingDraft): TastingOutput {
  const minutesAfter = ctx.completedAt === null ? null : Math.max(0, Math.round((env.now() - ctx.completedAt) / 60_000));
  const showNotes = ctx.bagNotes.length > 0;
  const tasting: TastingEvent = {
    id: newId(env, 'ev'), at: ms(env.now()), device: env.device, v: 1, kind: 'tasting',
    data: {
      brewId: ctx.cup.brewId, minutesAfter, late: minutesAfter !== null && minutesAfter >= 120,
      strength: d.strength, acidity: d.acidity, finish: d.finish, liking: d.liking,
      goalHit: ctx.cup.goal !== null ? d.goalHit : null,
      vsLast: ctx.previous !== null ? d.vsLast : null,
      missed: d.goalHit && d.goalHit !== 'yes' ? d.missed : null,
      cata: d.cata, cataAsked: true,
      noteHits: showNotes ? ctx.bagNotes.filter(n => d.noteHits[n]).map(n => ({ note: n, hit: d.noteHits[n]! })) : [],
      legacyScores: null, note: d.note.trim().slice(0, 500)
    }
  };
  const events: EngineEvent[] = [tasting];
  const a = d.actuals;
  if (Object.values(a).some(v => v !== undefined)) {
    const c = ctx.cup;
    const actuals: BrewActualsEvent = {
      id: newId(env, 'ev'), at: ms(env.now() + 1), device: env.device, v: 1, kind: 'brew.actuals',
      data: {
        brewId: c.brewId, doseG: g(a.doseG ?? c.doseG), waterG: g(a.waterG ?? c.waterG),
        grindClick: a.grindClick !== undefined ? clicks(a.grindClick) : c.grindClick, bypassG: g(a.bypassG ?? c.bypassG),
        cupG: a.cupG !== undefined ? g(a.cupG) : c.cupG, tdsPct: a.tdsPct !== undefined ? tdsPct(a.tdsPct) : c.tdsPct, technique: c.technique
      }
    };
    events.push(actuals);
  }
  return { events };
}

/** Waar de gebruiker in de laatste stap iets onmogelijks invult. */
export function actualsProblems(a: TastingDraft['actuals']): string[] {
  const out: string[] = [];
  const range = (v: number | undefined, lo: number, hi: number, label: string): void => {
    if (v !== undefined && !(Number.isFinite(v) && v >= lo && v <= hi)) out.push(`${label}: tussen ${lo} en ${hi}.`);
  };
  range(a.doseG, 5, 60, 'Koffie (g)'); range(a.waterG, 50, 1200, 'Water (g)'); range(a.grindClick, 0, 60, 'Klik');
  range(a.bypassG, 0, 400, 'Bypass (g)'); range(a.cupG, 50, 1000, 'Kop (g)'); range(a.tdsPct, 0.3, 3, 'TDS (%)');
  return out;
}

/** '3,75' (Nederlandse komma, geen overbodige nullen). */
export function formatLiking(v: number): string {
  return String(Math.round(v * 100) / 100).replace('.', ',');
}
