// Engine 3 · stap 3 · sterkte.
//
// Voorlopig gelijk aan Engine 2 (e2-2026.5): de nulmeting (06) laat zien dat sterkte bijna
// verzadigd is (46 van de 52 % die maximaal kan). Dit is dezelfde rekenkunde, maar op de feiten
// uit het logboek (state.ts) en zonder app, opslag of cache in de app. Verbeteren kan later,
// met de meetopstelling als scheidsrechter.
//
// Model in het kort: de ware voorkeur g (ln TDS) heeft een rooster-posterior. Elk sterkte-antwoord
// (−2…+2) is een geordende probit rond helling·(ln TDS − g) met ruis 0,70, gemiddeld over vijf
// hellingen. Blinde paren (Thurstone) tellen mee. Het doel verschuift alleen bij 70 % kans (0,85
// in rust) op minstens een halve stap van 4 %, hooguit twee stappen per kop, en nooit tegen het
// antwoord in dat je net gaf.

import type { CupFacts, FactState } from './state.ts';
import type { Method } from './types.ts';

export const STRENGTH_MODEL_VERSION = 'e3-strength-0.1 (= e2-2026.5, met bewaking tegen het laatste antwoord bij de afwijking per zak)';

const R_ABS = 2.1;
const EY_NOMINAL = 0.20;
const NOISE_SD = 0.70;
const SLOPES = [1.61, 3, 5, 8, 12] as const;
const PRIOR_SD = 0.25;
const HALF_STEP = Math.log(1.04);
const THRESHOLD_SEARCH = 0.70;
const THRESHOLD_REST = 0.85;
const REST_SD = 0.12;
const MAX_STEPS = 2;
const SOFT_WEIGHT = 0.5;
const FORGET = Math.pow(0.5, 1 / 30);
const PAIR_W = 0.17;
const PAIR_NONE = 0.3;
const COST_STRONG = 1.35;
const COST_WEAK = 0.75;
const CAL_SD = 0.10;
const CAL_WIDE_SD = 0.12;
const CAL_STEP_WIDE = Math.log(1.15);
const CAL_STEP_NARROW = Math.log(1.08);
const BEAN_PRIOR_SD = 0.05;
const BEAN_MIN_N = 3;
const BEAN_GRID = [-0.16, -0.12, -0.08, -0.04, 0, 0.04, 0.08, 0.12, 0.16] as const;
const TDS_RANGE = { min: 0.4, max: 2.5 } as const;
const EY_MIN_N = 3;
const EY_WINDOW = 20;
const RETENTION_MIN_N = 5;
const RETENTION_PLAUSIBLE = { min: 1.0, max: 3.5 } as const;

const GRID: number[] = (() => {
  const g: number[] = [];
  for (let x = Math.log(0.80); x <= Math.log(1.90) + 1e-9; x += 0.005) g.push(x);
  return g;
})();

type Ord = -2 | -1 | 0 | 1 | 2;
const CUTS: Record<Ord, readonly [number, number]> = {
  '-2': [-Infinity, -1.5], '-1': [-1.5, -0.5], '0': [-0.5, 0.5], '1': [0.5, 1.5], '2': [1.5, Infinity]
};

// ───────────────────────────── massabalans ─────────────────────────────

export function tdsOf(doseG: number, waterG: number, rAbs: number = R_ABS, ey: number = EY_NOMINAL): number | null {
  if (!(doseG > 0) || !(waterG > 0) || waterG / doseG <= rAbs) return null;
  const x = ey / (waterG / doseG - rAbs);
  return 100 * x / (1 + x);
}
export function ratioForTdsPct(tdsPct: number, rAbs: number = R_ABS, ey: number = EY_NOMINAL): number {
  const t = tdsPct / 100;
  return ey * (1 - t) / t + rAbs;
}

/** Normale verdelingsfunctie (Abramowitz & Stegun 7.1.26). */
export function phi(z: number): number {
  const s = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + s * y);
}
function answerProb(ord: Ord, lnT: number, g: number, slope: number): number {
  const mu = slope * (lnT - g);
  const cut = CUTS[ord];
  const hi = cut[1] === Infinity ? 1 : phi((cut[1] - mu) / NOISE_SD);
  const lo = cut[0] === -Infinity ? 0 : phi((cut[0] - mu) / NOISE_SD);
  return Math.max(1e-12, hi - lo);
}
function utility(s: number, g: number): number {
  const k = s > g ? COST_STRONG : COST_WEAK;
  return -k * Math.pow((s - g) / PAIR_W, 2);
}
function pairProb(outcome: 'A' | 'B' | 'none', lnA: number, lnB: number, g: number): number {
  const d = utility(lnA, g) - utility(lnB, g);
  if (outcome === 'A') return Math.max(1e-12, 1 - phi(PAIR_NONE - d));
  if (outcome === 'B') return Math.max(1e-12, phi(-PAIR_NONE - d));
  return Math.max(1e-12, phi(PAIR_NONE - d) - phi(-PAIR_NONE - d));
}

// ───────────────────────────── waarnemingen uit het logboek ─────────────────────────────

export interface JarObs {
  readonly type: 'jar'; readonly id: string; readonly at: number; readonly lnT: number; readonly tds: number; readonly ord: Ord;
  readonly weight: number; readonly measured: boolean; readonly method: Method; readonly beanId: string | null;
  readonly doseG: number; readonly waterG: number; readonly late: boolean; readonly bypass: boolean;
}
export interface PairObs {
  readonly type: 'pair'; readonly id: string; readonly at: number; readonly lnT: number; readonly lnA: number; readonly lnB: number;
  readonly outcome: 'A' | 'B' | 'none'; readonly weight: 1; readonly method: Method | null; readonly beanId: string | null;
}
export type Obs = JarObs | PairObs;

function measuredTdsOf(c: CupFacts): number | null {
  const t = c.tdsPct;
  return typeof t === 'number' && t >= TDS_RANGE.min && t <= TDS_RANGE.max ? t : null;
}

/** Vasthouden (g water per g koffie): gemeten vanaf 5 koppen met kopgewicht, anders 2,1. */
export function retentionFor(facts: FactState, method: Method): { value: number; n: number; measured: boolean } {
  const waarden: number[] = [];
  for (const id of facts.cupOrder) {
    const c = facts.cups.get(id)!;
    if (c.method !== method || c.planned.bypassG > 0 || c.cupG === null || !(c.doseG > 0)) continue;
    const r = (c.planned.waterG - c.cupG) / c.doseG;
    if (r >= RETENTION_PLAUSIBLE.min && r <= RETENTION_PLAUSIBLE.max) waarden.push(r);
  }
  if (waarden.length < RETENTION_MIN_N) return { value: R_ABS, n: waarden.length, measured: false };
  const gem = Math.round(waarden.reduce((a, b) => a + b, 0) / waarden.length * 100) / 100;
  return { value: Math.round((gem + EY_NOMINAL) * 100) / 100, n: waarden.length, measured: true };
}

/** Gemeten extractie (refractometer) per brewer: gemiddelde van de laatste 20 plausibele metingen. */
export function eyModelFor(facts: FactState, method: Method, rAbs: number): { n: number; eyMean: number | null } {
  const pts: number[] = [];
  for (const id of facts.cupOrder) {
    const c = facts.cups.get(id)!;
    const m = measuredTdsOf(c);
    if (c.method !== method || !c.actualsGiven || m === null) continue;
    const tds = m / 100;
    const dose = c.doseG;
    const water = c.planned.waterG + c.dilutionG;
    if (!(dose > 0) || !(water > 0)) continue;
    const ey = c.cupG !== null && c.cupG > 0 ? tds * c.cupG / dose : tds / (1 - tds) * (water / dose - (rAbs || R_ABS));
    if (!(ey > 0.10 && ey < 0.30)) continue;
    pts.push(ey);
  }
  const recent = pts.slice(-EY_WINDOW);
  if (!recent.length) return { n: 0, eyMean: null };
  return { n: recent.length, eyMean: recent.reduce((a, p) => a + p, 0) / recent.length };
}
function eyFor(facts: FactState, method: Method, rAbs: number): number {
  const m = eyModelFor(facts, method, rAbs);
  return m.n >= EY_MIN_N && m.eyMean !== null ? m.eyMean : EY_NOMINAL;
}

export function observationsOf(facts: FactState): Obs[] {
  const out: Obs[] = [];
  const rMemo = new Map<Method, number>();
  const eyMemo = new Map<Method, number>();
  const rOf = (m: Method): number => { let v = rMemo.get(m); if (v === undefined) { v = retentionFor(facts, m).value; rMemo.set(m, v); } return v; };
  const eyOf = (m: Method): number => { let v = eyMemo.get(m); if (v === undefined) { v = eyFor(facts, m, rOf(m)); eyMemo.set(m, v); } return v; };

  for (const id of facts.cupOrder) {
    const c = facts.cups.get(id)!;
    const t = c.tasting;
    if (!t || t.strength === null) continue;
    const dose = c.doseG;
    const water = c.planned.waterG;
    const rAbs = rOf(c.method);
    const ey = eyOf(c.method);
    const measured = measuredTdsOf(c);
    let tds = measured !== null ? measured : tdsOf(dose, water, rAbs, ey);
    if (tds === null) continue;
    // Na het zetten bijgevuld: de kop is lichter dan het bed. Een gemeten TDS is al de kop zelf.
    if (c.dilutionG > 0 && measured === null) {
      const mb = water - rAbs * dose + ey * dose;
      tds = tds * mb / (mb + c.dilutionG);
    }
    const bypass = c.planned.bypassG > 0;
    const soft = t.late || bypass;
    out.push({ type: 'jar', id: c.brewId, at: c.at, lnT: Math.log(tds), tds, ord: t.strength, weight: soft ? SOFT_WEIGHT : 1, measured: measured !== null,
      method: c.method, beanId: c.beanId, doseG: dose, waterG: water, late: t.late, bypass });
  }
  for (const [trialId, tr] of facts.trials) {
    const t = tr.data;
    if (t.kind !== 'strength') continue;
    if (!(t.control.doseG > 0) || !(t.variant.doseG > 0) || !(t.waterG > 0)) continue;
    if (Math.abs(t.control.doseG - t.variant.doseG) < 0.1) continue;
    const rAbs = rOf(t.method);
    const ey = eyOf(t.method);
    const a = tdsOf(t.control.doseG, t.waterG, rAbs, ey);
    const b = tdsOf(t.variant.doseG, t.waterG, rAbs, ey);
    if (a === null || b === null) continue;
    const outcome = t.preferred === 'control' ? 'A' : t.preferred === 'variant' ? 'B' : 'none';
    out.push({ type: 'pair', id: trialId, at: tr.at, lnT: Math.log(a), lnA: Math.log(a), lnB: Math.log(b), outcome, weight: 1, method: t.method, beanId: t.beanId });
  }
  return out.sort((x, y) => x.at - y.at);
}

// ───────────────────────────── posterior ─────────────────────────────

interface Post { readonly priorCenterLn: number; readonly logPrior: readonly number[]; ll: number[][]; n: number }

function newPosterior(priorCenterLn: number): Post {
  const logPrior = GRID.map(g => -0.5 * Math.pow((g - priorCenterLn) / PRIOR_SD, 2));
  return { priorCenterLn, logPrior, ll: SLOPES.map(() => GRID.map(() => 0)), n: 0 };
}
function addObservation(post: Post, o: Obs): void {
  if (o.type === 'pair') {
    const ll = GRID.map(g => o.weight * Math.log(pairProb(o.outcome, o.lnA, o.lnB, g)));
    post.ll = post.ll.map(row => row.map((v, gi) => v * FORGET + ll[gi]!));
    post.n += 1;
    return;
  }
  const G = GRID.length;
  post.ll = post.ll.map((row, bi) => {
    const next = new Array<number>(G);
    const slope = SLOPES[bi]!;
    for (let gi = 0; gi < G; gi++) next[gi] = row[gi]! * FORGET + o.weight * Math.log(answerProb(o.ord, o.lnT, GRID[gi]!, slope));
    return next;
  });
  post.n += 1;
}

export interface Summary {
  readonly p: readonly number[]; readonly medianLn: number; readonly q10Ln: number; readonly q90Ln: number; readonly meanLn: number;
  readonly sdLn: number; readonly slopeMean: number; readonly slopeShare: readonly number[]; readonly n: number;
}
function summary(post: Post): Summary {
  const rows = post.ll.map(row => row.map((v, gi) => v + post.logPrior[gi]!));
  let max = -Infinity;
  rows.forEach(row => row.forEach(v => { if (v > max) max = v; }));
  const w = GRID.map(() => 0);
  const slopeMass = rows.map(row => {
    let s = 0;
    row.forEach((v, gi) => { const e = Math.exp(v - max); w[gi] = w[gi]! + e; s += e; });
    return s;
  });
  const tot = w.reduce((a, b) => a + b, 0);
  const p = w.map(x => x / tot);
  const q = (frac: number): number => { let c = 0; for (let i = 0; i < p.length; i++) { c += p[i]!; if (c >= frac) return GRID[i]!; } return GRID[GRID.length - 1]!; };
  const mean = p.reduce((a, x, i) => a + x * GRID[i]!, 0);
  const sd = Math.sqrt(p.reduce((a, x, i) => a + x * Math.pow(GRID[i]! - mean, 2), 0));
  const sm = slopeMass.reduce((a, b) => a + b, 0);
  const slopeShare = slopeMass.map(x => x / sm);
  const slopeMean = slopeShare.reduce((a, x, i) => a + x * SLOPES[i]!, 0);
  return { p, medianLn: q(0.5), q10Ln: q(0.1), q90Ln: q(0.9), meanLn: mean, sdLn: sd, slopeMean, slopeShare, n: post.n };
}
function probBeyond(sum: Summary, refLn: number): { up: number; dn: number } {
  let up = 0, dn = 0;
  sum.p.forEach((x, i) => {
    if (GRID[i]! > refLn + HALF_STEP / 2) up += x;
    else if (GRID[i]! < refLn - HALF_STEP / 2) dn += x;
  });
  return { up, dn };
}
/** De richting die één waarneming vraagt: −1 lichter, +1 sterker, 0 geen. */
function answerDirection(o: Obs): number {
  if (o.type === 'pair') {
    if (o.outcome !== 'A' && o.outcome !== 'B') return 0;
    const win = o.outcome === 'A' ? o.lnA : o.lnB, lose = o.outcome === 'A' ? o.lnB : o.lnA;
    return Math.sign(win - lose);
  }
  return o.ord > 0 ? -1 : o.ord < 0 ? 1 : 0;
}

// ───────────────────────────── beslisregel ─────────────────────────────

export type StrengthMode = 'start' | 'zoeken' | 'rust';
export interface TrailStep {
  readonly id: string; readonly beforeLn: number; readonly afterLn: number; readonly steps: number; readonly up: number; readonly dn: number;
  readonly mode: StrengthMode; readonly threshold: number; readonly q10Ln: number; readonly q90Ln: number;
}
export interface Decision { readonly targetLn: number; readonly mode: StrengthMode; readonly n: number; readonly trail: readonly TrailStep[]; readonly summary: Summary | null }

interface Snap { readonly len: number; readonly target: number; readonly mode: StrengthMode; readonly trail: readonly TrailStep[]; readonly post: Post; readonly value: Decision }

// Het afspelen is deterministisch en hangt alleen af van de waarnemingen: de laatste uitkomsten
// worden onthouden zodat een nieuwe kop maar één stap kost. Zuiver geheugen, geen toestand.
const CACHE: Array<{ keys: string[]; end: Snap; prev: Snap | null }> = [];
const CACHE_N = 4;
const obsKey = (o: Obs): string => `${o.id},${o.type},${o.lnT},${o.weight},${o.type === 'pair' ? `${o.outcome},${o.lnA},${o.lnB}` : o.ord}`;

export function decide(obs: readonly Obs[], baselineLn: number): Decision {
  if (!obs.length) return { targetLn: baselineLn, mode: 'start', n: 0, trail: [], summary: null };
  const keys = obs.map(obsKey);
  let best: Snap | null = null;
  for (const c of CACHE) {
    for (const cp of [c.end, c.prev]) {
      if (!cp || cp.len > keys.length || (best && cp.len <= best.len)) continue;
      let same = true;
      for (let i = 0; i < cp.len; i++) if (c.keys[i] !== keys[i]) { same = false; break; }
      if (same) best = cp;
    }
  }
  if (best && best.len === keys.length) return best.value;
  const res = decideFrom(obs, best);
  CACHE.unshift({ keys, end: res.end, prev: res.prev });
  if (CACHE.length > CACHE_N) CACHE.pop();
  return res.end.value;
}

function decideFrom(obs: readonly Obs[], from: Snap | null): { end: Snap; prev: Snap | null } {
  let post: Post, target: number, mode: StrengthMode, startIdx: number;
  const trail: TrailStep[] = [];
  if (from) {
    post = { priorCenterLn: from.post.priorCenterLn, logPrior: from.post.logPrior, ll: from.post.ll, n: from.post.n };
    target = from.target; mode = from.mode; trail.push(...from.trail); startIdx = from.len;
  } else {
    post = newPosterior(obs[0]!.lnT); target = obs[0]!.lnT; mode = 'zoeken'; startIdx = 0;
  }
  let prev: Snap | null = null;
  const snap = (len: number, sum: Summary): Snap => ({
    len, target, mode, trail: trail.slice(),
    post: { priorCenterLn: post.priorCenterLn, logPrior: post.logPrior, ll: post.ll, n: post.n },
    value: { targetLn: target, mode, n: len, trail: trail.slice(), summary: sum }
  });
  for (let idx = startIdx; idx < obs.length; idx++) {
    if (idx === obs.length - 1 && idx > 0 && idx > startIdx) prev = snap(idx, summary(post));
    else if (idx === obs.length - 1 && from && from.len === idx) prev = from;
    const o = obs[idx]!;
    addObservation(post, o);
    const sum = summary(post);
    const before = target;
    const thr = mode === 'rust' ? THRESHOLD_REST : THRESHOLD_SEARCH;
    const pr = probBeyond(sum, target);
    let k = 0;
    if (pr.up > thr || pr.dn > thr) {
      k = Math.round((sum.medianLn - target) / HALF_STEP);
      const maxSteps = idx < 2 ? 1 : MAX_STEPS; // de eerste twee koppen: hooguit een halve stap
      k = Math.max(-maxSteps, Math.min(maxSteps, k));
      if (k === 0) k = pr.up > pr.dn ? 1 : -1;
      // Nooit tegen het antwoord in dat je net gaf.
      const dir = answerDirection(o);
      if ((dir < 0 && k > 0) || (dir > 0 && k < 0)) k = 0;
      target += k * HALF_STEP;
    }
    const recent = obs.slice(Math.max(0, idx - 2), idx + 1);
    const atTarget = recent.length === 3 && recent.every(r => r.type === 'pair'
      ? (r.outcome === 'A' && Math.abs(r.lnA - before) < HALF_STEP)
      : (r.ord === 0 && Math.abs(r.lnT - before) < HALF_STEP));
    const agrees = Math.abs(sum.medianLn - target) < HALF_STEP / 2;
    if (k !== 0) mode = 'zoeken';
    else if (sum.sdLn < REST_SD && atTarget && agrees) mode = 'rust';
    else if (mode === 'rust' && !agrees) mode = 'zoeken';
    trail.push({ id: o.id, beforeLn: before, afterLn: target, steps: k, up: pr.up, dn: pr.dn, mode, threshold: thr, q10Ln: sum.q10Ln, q90Ln: sum.q90Ln });
  }
  return { end: snap(obs.length, summary(post)), prev };
}

// ───────────────────────────── afwijking per zak, kalibratiepaar ─────────────────────────────

export interface BeanOffset { readonly n: number; readonly offsetLn: number; readonly applies: boolean; readonly meanLn?: number; readonly up?: number; readonly dn?: number }

export function beanOffset(obs: readonly Obs[], beanId: string, gLn: number, slope: number): BeanOffset {
  const mine = obs.filter((o): o is JarObs => o.type === 'jar' && o.beanId === beanId);
  if (mine.length < BEAN_MIN_N) return { n: mine.length, offsetLn: 0, applies: false };
  const B = slope > 0 ? slope : SLOPES[0];
  const logw = BEAN_GRID.map(d => -0.5 * Math.pow(d / BEAN_PRIOR_SD, 2)
    + mine.reduce((a, o) => a + o.weight * Math.log(answerProb(o.ord, o.lnT, gLn + d, B)), 0));
  const mx = Math.max(...logw);
  const w = logw.map(x => Math.exp(x - mx));
  const tot = w.reduce((a, b) => a + b, 0);
  const p = w.map(x => x / tot);
  const mean = p.reduce((a, x, i) => a + x * BEAN_GRID[i]!, 0);
  const up = p.reduce((a, x, i) => a + (BEAN_GRID[i]! >= HALF_STEP / 2 ? x : 0), 0);
  const dn = p.reduce((a, x, i) => a + (BEAN_GRID[i]! <= -HALF_STEP / 2 ? x : 0), 0);
  if (up < THRESHOLD_SEARCH && dn < THRESHOLD_SEARCH) return { n: mine.length, offsetLn: 0, applies: false, meanLn: mean, up, dn };
  let k = Math.round(mean / HALF_STEP);
  k = Math.max(-MAX_STEPS, Math.min(MAX_STEPS, k)) || (up > dn ? 1 : -1);
  return { n: mine.length, offsetLn: k * HALF_STEP, applies: true, meanLn: mean, up, dn };
}

export interface CalibrationPair { readonly dir: 1 | -1; readonly stepLn: number; readonly pct: number; readonly variantLn: number }

/** Een kalibratiepaar: kop A = het recept, kop B ±8 of ±15 % waar de schatting het onzekerst is. */
export function calibrationFor(sum: Summary | null, targetLn: number, n: number): CalibrationPair | null {
  if (!sum || n < 2 || !(sum.sdLn > CAL_SD)) return null;
  const pr = probBeyond(sum, targetLn);
  const dir = pr.up > pr.dn ? 1 : -1;
  const stepLn = sum.sdLn > CAL_WIDE_SD ? CAL_STEP_WIDE : CAL_STEP_NARROW;
  return { dir, stepLn, pct: Math.round((Math.exp(stepLn) - 1) * 100), variantLn: targetLn + dir * stepLn };
}

// ───────────────────────────── het advies ─────────────────────────────

export interface StrengthRequest {
  readonly method: Method;
  readonly waterG: number;
  readonly beanId: string | null;
  /** Startdosis bij dit water, zolang er nog geen koppen zijn (bepaalt de beginsterkte). */
  readonly baselineDoseG: number;
}

export interface StrengthPlan {
  readonly version: string;
  readonly doseG: number;
  readonly targetTds: number;
  readonly ratio: number;
  readonly band: { readonly lowRatio: number; readonly highRatio: number } | null;
  readonly mode: StrengthMode;
  readonly n: number;
  readonly pairs: number;
  readonly sdLn: number | null;
  readonly slopeMean: number | null;
  readonly retention: { value: number; n: number; measured: boolean };
  readonly ey: number;
  readonly baseDoseG: number;
  readonly baseTds: number;
  readonly bean: BeanOffset;
  readonly calibration: (CalibrationPair & { variantDoseG: number }) | null;
  readonly last: TrailStep | null;
  readonly trail: readonly TrailStep[];
}

export function strengthPlan(facts: FactState, req: StrengthRequest): StrengthPlan | null {
  if (!(req.baselineDoseG > 0) || !(req.waterG > 0)) return null;
  const retention = retentionFor(facts, req.method);
  const eyModel = eyModelFor(facts, req.method, retention.value);
  const ey = eyModel.n >= EY_MIN_N && eyModel.eyMean !== null ? eyModel.eyMean : EY_NOMINAL;
  const obs = observationsOf(facts);
  const baseTds = tdsOf(req.baselineDoseG, req.waterG, retention.value, ey);
  if (baseTds === null) return null;
  const dec = decide(obs, Math.log(baseTds));
  const bean = req.beanId && dec.summary ? beanOffset(obs, req.beanId, dec.targetLn, dec.summary.slopeMean) : { n: 0, offsetLn: 0, applies: false };
  // Nooit tegen het laatste antwoord in (e3-0.1: de enige afwijking van Engine 2): een afwijking per zak die de
  // andere kant op wijst dan het laatste antwoord over die zak, wordt niet toegepast.
  const lastOfBean = req.beanId ? [...obs].reverse().find((o): o is JarObs => o.type === 'jar' && o.beanId === req.beanId) : undefined;
  const lastDir = lastOfBean ? answerDirection(lastOfBean) : 0;
  const against = bean.applies && lastDir !== 0 && Math.sign(bean.offsetLn) === -lastDir;
  const beanUsed: BeanOffset = against ? { ...bean, applies: false } : bean;
  const targetLn = dec.targetLn + (beanUsed.applies ? beanUsed.offsetLn : 0);
  const targetTds = Math.exp(targetLn);
  const ratio = ratioForTdsPct(targetTds, retention.value, ey);
  const doseG = Math.round(req.waterG / ratio * 10) / 10;
  const band = dec.summary ? { lowRatio: ratioForTdsPct(Math.exp(dec.summary.q90Ln), retention.value, ey), highRatio: ratioForTdsPct(Math.exp(dec.summary.q10Ln), retention.value, ey) } : null;
  const cal = calibrationFor(dec.summary, targetLn, dec.n);
  const calibration = cal ? { ...cal, variantDoseG: Math.round(req.waterG / ratioForTdsPct(Math.exp(cal.variantLn), retention.value, ey) * 10) / 10 } : null;
  return {
    version: STRENGTH_MODEL_VERSION, doseG, targetTds, ratio, band, mode: dec.mode, n: dec.n, pairs: obs.filter(x => x.type === 'pair').length,
    sdLn: dec.summary ? dec.summary.sdLn : null, slopeMean: dec.summary ? dec.summary.slopeMean : null,
    retention, ey, baseDoseG: req.baselineDoseG, baseTds, bean: beanUsed, calibration,
    last: dec.trail.length ? dec.trail[dec.trail.length - 1]! : null, trail: dec.trail
  };
}
