// Engine 3 · stap 5 · techniekkeuze.
//
// De regeltabel (data/selection-rules.ts) is een startvoorstel; eigen uitkomsten gaan erboven.
// Afspraken (verslag, 05):
//   - Een afwijking van Kasuya is altijd een PROEF: Kasuya blijft de controle, de variant komt ernaast.
//     Alleen een besluit van Jelle (bijv. Chemex → Hoffmann) wordt direct gezet.
//   - Een gewonnen proef wint, voor die zak en voor vergelijkbare koffies.
//   - Een techniek die al geprobeerd is op deze zak wordt niet nog eens voorgesteld.
//   - Een techniek zonder gietschema in de bron (Osmotic Flow) wordt niet als proef voorgesteld.
//   - Een proef pas als de controle een beetje bekend is (2 geproefde Kasuya-koppen van deze zak),
//     nooit twee tegelijk en niet direct na een vorige.
// Zuiver: feiten en vraag in, keuze uit.

import { SELECTION_RULES, type SelectionRule } from './data/selection-rules.ts';
import { TAG_CATEGORY } from './data/flavor-wheel.ts';
import { TECHNIQUE_BY_ID, fitsMethod } from './data/techniques.ts';
import { buildRecipe } from './recipe.ts';
import type { CupFacts, FactState, TrialFacts } from './state.ts';
import type { FeedbackSignal, Method, Reason, Recipe, RoastLevel, TechniqueId, TechniqueRef, TrialProposal, WheelCategory } from './types.ts';

export const TECHNIQUE_MODEL_VERSION = 'e3-technique-0.1';

const KASUYA: TechniqueId = 'kasuya_46';
/** Minimaal aantal geproefde controle-koppen (Kasuya) van deze zak vóór een proef. */
export const MIN_CONTROL_CUPS = 2;
/** Netto gewonnen proeven bij vergelijkbare zakken vóór het de standaard wordt. */
export const SIMILAR_NET_WINS_DEFAULT = 2;
/** Een klacht telt als terugkerend bij minstens dit aantal van de laatste vier koppen van de zak. */
export const RECURRING_MIN = 2;

export type Feedback = FeedbackSignal;

export interface TechniqueRequest {
  readonly beanId: string | null;
  readonly method: Method;
  /** Gewenste kopgrootte in g, of null. */
  readonly cupG: number | null;
  /** Zelf gekozen techniek: die wint altijd. */
  readonly technique: TechniqueId | null;
  /** Wat de engine zelf niet kan zien, bijvoorbeeld ongelijk doorlopen (nu alleen 'uneven_drain'). */
  readonly feedback?: readonly Feedback[];
}

export type TechniqueSource = 'user' | 'won_trial' | 'similar_wins' | 'rule_direct' | 'rule' | 'fallback';

export interface TechniqueTrialPlan {
  readonly id: string;
  readonly control: TechniqueId;
  readonly variant: TechniqueId;
  readonly basis: 'rule' | 'similar';
  readonly ruleId: string | null;
}

export interface TechniqueChoice {
  readonly version: string;
  /** Wat er nu gezet wordt. */
  readonly technique: TechniqueId;
  /** Alleen bij Kasuya: aandeel van de eerste giet in de eerste 40 %. */
  readonly kasuyaFirstPourShare: number | null;
  readonly source: TechniqueSource;
  readonly ruleId: string | null;
  readonly matchedRules: readonly string[];
  readonly reasons: readonly Reason[];
  /** Hooguit één voorstel voor een paar-proef; null als er geen is of er al een loopt. */
  readonly trial: TechniqueTrialPlan | null;
  /** Een eerder voorgestelde proef zonder uitslag. */
  readonly pendingTrialId: string | null;
}

// ───────────────────────────── kenmerken van de zak ─────────────────────────────

export function categoriesOf(tags: readonly string[]): WheelCategory[] {
  const out = new Set<WheelCategory>();
  for (const t of tags) { const c = TAG_CATEGORY.get(t); if (c) out.add(c); }
  return [...out];
}

type RoastClass = 'light' | 'medium' | 'dark';
export function roastClassOf(r: RoastLevel | null | undefined): RoastClass | null {
  if (!r) return null;
  return r === 'light' || r === 'light_medium' ? 'light' : r === 'medium' ? 'medium' : 'dark';
}

interface BeanProfile { readonly process: string | null; readonly roast: RoastLevel | null; readonly roastClass: RoastClass | null; readonly categories: readonly WheelCategory[] }

function profileOf(facts: FactState, beanId: string | null): BeanProfile {
  const b = beanId ? facts.beans.get(beanId) : undefined;
  const base = b?.fields.process?.base;
  const roast = b?.fields.roastLevel ?? null;
  return { process: base && base !== 'unknown' ? base : null, roast, roastClass: roastClassOf(roast), categories: categoriesOf(b?.fields.notes?.tags ?? []) };
}

/** Vergelijkbaar: zelfde proces en brandingklasse, en minstens één gedeelde smaakcategorie. */
export function similarBeans(a: BeanProfile, b: BeanProfile): boolean {
  if (!a.process || a.process !== b.process || !a.roastClass || a.roastClass !== b.roastClass) return false;
  return a.categories.some(c => b.categories.includes(c));
}

/** Terugkerende klachten uit de laatste vier geproefde koppen van de zak. */
export function recurringFeedback(facts: FactState, beanId: string | null): Set<Feedback> {
  const cups = facts.cupOrder.map(id => facts.cups.get(id)!).filter(c => c.beanId === beanId && c.tasting !== null).slice(-4);
  const count: Record<'sour_or_hollow' | 'drying', number> = { sour_or_hollow: 0, drying: 0 };
  for (const c of cups) {
    const t = c.tasting!;
    if (t.acidity === 'sharp' || t.finish.includes('hollow')) count.sour_or_hollow++;
    if (t.finish.includes('drying')) count.drying++;
  }
  const out = new Set<Feedback>();
  if (count.sour_or_hollow >= RECURRING_MIN) out.add('sour_or_hollow');
  if (count.drying >= RECURRING_MIN) out.add('drying');
  return out;
}

function ruleMatches(r: SelectionRule, req: TechniqueRequest, p: BeanProfile, fb: ReadonlySet<Feedback>): boolean {
  const w = r.when;
  if (w.method !== undefined && w.method !== req.method) return false;
  if (w.processBase !== undefined && !(p.process !== null && (w.processBase as readonly string[]).includes(p.process))) return false;
  if (w.roast !== undefined && !(p.roast !== null && w.roast.includes(p.roast))) return false;
  if (w.noteCategoryAny !== undefined && !w.noteCategoryAny.some(c => p.categories.includes(c))) return false;
  if (w.feedbackAny !== undefined && !w.feedbackAny.some(f => fb.has(f))) return false;
  if (w.maxCupG !== undefined && !(req.cupG !== null && req.cupG <= w.maxCupG)) return false;
  if (w.minCupG !== undefined && !(req.cupG !== null && req.cupG >= w.minCupG)) return false;
  return true;
}

// ───────────────────────────── eigen proefuitkomsten ─────────────────────────────

interface Outcome { readonly at: number; readonly control: TechniqueRef | null; readonly variant: TechniqueRef | null; readonly winner: TechniqueRef | null; readonly loser: TechniqueRef | null; readonly decisive: boolean }

function outcomesOf(trials: Iterable<TrialFacts>, beanFilter: (beanId: string | null) => boolean): Outcome[] {
  const out: Outcome[] = [];
  for (const tr of trials) {
    const d = tr.data;
    if (d.kind !== 'technique' || !beanFilter(d.beanId)) continue;
    const c = d.control.technique, v = d.variant.technique;
    const decisive = (d.preferred === 'control' || d.preferred === 'variant') && c !== null && v !== null && c !== v;
    out.push({ at: tr.at, control: c, variant: v, decisive,
      winner: !decisive ? null : d.preferred === 'control' ? c : v,
      loser: !decisive ? null : d.preferred === 'control' ? v : c });
  }
  return out.sort((x, y) => x.at - y.at);
}

const schedulable = (t: TechniqueId): boolean => TECHNIQUE_BY_ID.get(t)?.reference.pours != null;
/** Een techniek met gietschema die bij deze brewer hoort (Chemex-recepten niet op de V60 en omgekeerd). */
const usable = (t: TechniqueId, method: Method): boolean => { const d = TECHNIQUE_BY_ID.get(t); return d !== undefined && d.reference.pours !== null && fitsMethod(d, method); };

/** Welke regels gelden voor deze zak en deze vraag, op volgorde van prioriteit (voor uitleg en tests). */
export function matchedRulesFor(facts: FactState, req: TechniqueRequest): SelectionRule[] {
  const profile = profileOf(facts, req.beanId);
  const fb = recurringFeedback(facts, req.beanId);
  for (const f of req.feedback ?? []) fb.add(f);
  return SELECTION_RULES.filter(r => ruleMatches(r, req, profile, fb)).sort((x, y) => y.priority - x.priority);
}

/** De eerste techniek ≠ Kasuya met een gietschema uit de gevonden regels, of null. */
export function ruleCandidateFor(facts: FactState, req: TechniqueRequest): TechniqueId | null {
  for (const r of matchedRulesFor(facts, req)) for (const t of r.suggest) if (t !== KASUYA && usable(t, req.method)) return t;
  return null;
}

// ───────────────────────────── de keuze ─────────────────────────────

const reason = (code: string, text: string): Reason => ({ module: 'technique', code, text });
const nameOf = (t: TechniqueId): string => TECHNIQUE_BY_ID.get(t)?.name ?? t;

export function chooseTechnique(facts: FactState, req: TechniqueRequest): TechniqueChoice {
  const profile = profileOf(facts, req.beanId);
  const fb = recurringFeedback(facts, req.beanId);
  for (const f of req.feedback ?? []) fb.add(f);
  const matched = SELECTION_RULES.filter(r => ruleMatches(r, req, profile, fb)).sort((a, b) => b.priority - a.priority);
  const matchedIds = matched.map(r => r.id);
  // Het aandeel van de eerste giet komt van de belangrijkste regel die er een heeft.
  const share = matched.find(r => r.kasuyaFirstPourShare !== null)?.kasuyaFirstPourShare ?? null;
  const reasons: Reason[] = [];
  const finish = (technique: TechniqueId, source: TechniqueSource, ruleId: string | null, trial: TechniqueTrialPlan | null, pending: string | null): TechniqueChoice => ({
    version: TECHNIQUE_MODEL_VERSION, technique, kasuyaFirstPourShare: technique === KASUYA ? share : null, source, ruleId,
    matchedRules: matchedIds, reasons, trial, pendingTrialId: pending
  });

  // 1. Zelf gekozen.
  if (req.technique) {
    reasons.push(reason('technique.user_choice', `Je koos zelf ${nameOf(req.technique)}.`));
    return finish(req.technique, 'user', null, null, null);
  }

  // 2. Eigen uitkomsten voor deze zak.
  const own = outcomesOf(facts.trials.values(), b => b === req.beanId);
  const decisiveOwn = own.filter(o => o.decisive);
  const latestWin = decisiveOwn[decisiveOwn.length - 1];
  if (latestWin && latestWin.winner && !String(latestWin.winner).startsWith('legacy:') && usable(latestWin.winner as TechniqueId, req.method)) {
    const t = latestWin.winner as TechniqueId;
    reasons.push(reason('technique.won_trial', `${nameOf(t)} won jouw proef met deze zak.`));
    return finish(t, 'won_trial', null, null, null);
  }

  // 3. Vergelijkbare zakken.
  const tried = new Set<TechniqueRef | null>(own.map(o => o.variant));
  const similarIds = new Set<string>();
  for (const [id, b] of facts.beans) if (id !== req.beanId && similarBeans(profile, profileOf(facts, id))) similarIds.add(b.beanId);
  const sim = outcomesOf(facts.trials.values(), b => b !== null && similarIds.has(b)).filter(o => o.decisive);
  const net = new Map<string, number>();
  for (const o of sim) {
    if (o.winner) net.set(String(o.winner), (net.get(String(o.winner)) ?? 0) + 1);
    if (o.loser) net.set(String(o.loser), (net.get(String(o.loser)) ?? 0) - 1);
  }
  let similarBest: { t: TechniqueId; n: number } | null = null;
  for (const [t, n] of net) if (!t.startsWith('legacy:') && n > 0 && usable(t as TechniqueId, req.method) && (!similarBest || n > similarBest.n)) similarBest = { t: t as TechniqueId, n };
  if (similarBest && similarBest.n >= SIMILAR_NET_WINS_DEFAULT && !tried.has(similarBest.t) && similarBest.t !== KASUYA) {
    reasons.push(reason('technique.similar_wins', `${nameOf(similarBest.t)} won ${similarBest.n}× vaker dan het verloor bij vergelijkbare zakken (zelfde proces en branding, gedeelde smaak).`));
    return finish(similarBest.t, 'similar_wins', null, null, null);
  }

  // 4. De regeltabel: eerst een direct besluit, anders Kasuya als controle met een proefkandidaat.
  const top = matched[0]!;
  if (top.evidence === 'decision_jelle' && top.suggest[0] !== KASUYA) {
    reasons.push(reason('technique.rule_direct', top.why));
    return finish(top.suggest[0]!, 'rule_direct', top.id, null, null);
  }
  const first = matched.find(r => r.when && Object.keys(r.when).length > 0) ?? null;
  reasons.push(reason(first ? 'technique.rule' : 'technique.fallback', first ? first.why : top.why));
  const source: TechniqueSource = first ? 'rule' : 'fallback';

  // 5. Proef: alleen met een bekende controle, zonder lopende of net afgeronde proef.
  const cups = facts.cupOrder.map(id => facts.cups.get(id)!).filter(c => c.beanId === req.beanId);
  const pendingIds = new Set<string>();
  for (const c of cups) if (c.trialId && c.trialId.startsWith('tech:') && !facts.trials.has(c.trialId)) pendingIds.add(c.trialId);
  const pending = [...pendingIds][0] ?? null;
  const controlCups = cups.filter((c: CupFacts) => c.technique === KASUYA && c.tasting !== null && c.trialId === null).length;
  const recentTrialCup = cups.slice(-2).some(c => c.trialId !== null);
  let trial: TechniqueTrialPlan | null = null;
  if (pending) {
    reasons.push(reason('technique.trial_pending', 'Er loopt al een proef met deze zak; rond die eerst af.'));
  } else if (controlCups < MIN_CONTROL_CUPS) {
    if (matched.some(r => r.suggest.some(t => t !== KASUYA)) || similarBest) reasons.push(reason('technique.trial_later', `Eerst ${MIN_CONTROL_CUPS} geproefde Kasuya-koppen van deze zak (nu ${controlCups}); daarna volgt een proef.`));
  } else if (recentTrialCup) {
    reasons.push(reason('technique.trial_cooldown', 'Je hebt net een proef gezet; de volgende kop is gewoon Kasuya.'));
  } else {
    let cand: { t: TechniqueId; basis: 'rule' | 'similar'; ruleId: string | null } | null = null;
    if (similarBest && similarBest.t !== KASUYA && !tried.has(similarBest.t)) cand = { t: similarBest.t, basis: 'similar', ruleId: null };
    for (const r of matched) {
      if (cand) break;
      for (const t of r.suggest) {
        if (t === KASUYA || tried.has(t) || !usable(t, req.method)) continue;
        cand = { t, basis: 'rule', ruleId: r.id };
        break;
      }
    }
    if (cand) {
      const n = own.filter(o => o.variant === cand!.t).length + 1;
      trial = { id: `tech:${req.beanId ?? 'onbekend'}:${cand.t}:${n}`, control: KASUYA, variant: cand.t, basis: cand.basis, ruleId: cand.ruleId };
      reasons.push(reason('technique.trial', `Proef: ${nameOf(cand.t)} tegen ${nameOf(KASUYA)} met deze zak, blind en met gelijke dosis, water en maling.`));
    }
  }
  return finish(KASUYA, source, first ? first.id : top.id, trial, pending);
}

// ───────────────────────────── de proef als twee recepten ─────────────────────────────

export interface TrialRecipeInput {
  readonly doseG: number;
  readonly waterG: number;
  readonly bypassG?: number;
  readonly method: Method;
  readonly roast?: RoastLevel | null;
  readonly grindClick?: number | null;
}

/** Controle (Kasuya, met het aandeel van de regel) en variant met gelijke dosis, water en maling. */
export function trialProposalFor(choice: TechniqueChoice, input: TrialRecipeInput): TrialProposal | null {
  const t = choice.trial;
  if (!t) return null;
  const common = { method: input.method, doseG: input.doseG, waterG: input.waterG, ...(input.bypassG === undefined ? {} : { bypassG: input.bypassG }), ...(input.roast === undefined ? {} : { roast: input.roast }), ...(input.grindClick === undefined || input.grindClick === null ? {} : { grindClick: input.grindClick as never }) };
  const control: Recipe = buildRecipe({ ...common, technique: t.control, ...(choice.kasuyaFirstPourShare === null ? {} : { kasuyaFirstPourShare: choice.kasuyaFirstPourShare }) }).recipe;
  const variant: Recipe = buildRecipe({ ...common, technique: t.variant }).recipe;
  return {
    id: t.id, kind: 'technique',
    text: `Proef: ${nameOf(t.variant)} tegen ${nameOf(t.control)}, zelfde dosis, water en maling. Zet ze vlak na elkaar en kies blind welke je liever drinkt.`,
    control, variant
  };
}
