// Engine 3 · stap 4 · tijd en molen.
//
// Model: ln(doorloop na de laatste giet) = techniek + κ·(klik − 16) + λ·ln(water/300) + zak + ruis.
//   - techniek: eigen niveau per techniek (prior ln 78 s, bij Kasuya ±0,25, anders ±0,5);
//   - κ: effect van een klik, prior −11 % per klik grover (natuurkundige verwachting, ±0,04);
//   - λ: effect van de hoeveelheid water, prior 0 ±0,5 (de bronnen houden voor 15/20/30 g ~3:30 aan);
//   - zak: afwijking per zak, prior ±0,12;
//   - ruis: 0,167 per zetsel (molenmodel uit punt 4).
// Alles samen is een Bayesiaanse lineaire regressie met een bekende ruis (geen sampling, geen toeval).
// Het verschil met Engine 2: die leert het effect van een klik pas na 6 zetsels met twee standen;
// hier geldt de natuurkundige verwachting vanaf de eerste kop en leert de data het bij.
//
// De tijd die gemeten wordt is 'bed droog' (of de 'erdoor'-tik van de laatste giet) min het geplande
// moment van de laatste giet. Bij Kasuya wacht de laatste giet soms op het doorlopen; die wachttijd
// zit dan in de gemeten tijd en dus in de ruis.

import { GRIND_PRIORS, GRINDER_C3S_PRO } from './data/grinder.ts';
import { phi } from './strength.ts';
import { TECHNIQUE_BY_ID } from './data/techniques.ts';
import type { FactState } from './state.ts';
import type { Method, TechniqueId, TechniqueRef } from './types.ts';
import type { Band } from './units.ts';

export const GRIND_MODEL_VERSION = 'e3-grind-0.1';

const P = GRIND_PRIORS;
const Z80 = 1.2815515655446004; // 80 %-interval

// ───────────────────────────── waarnemingen ─────────────────────────────

export interface TailObs {
  readonly brewId: string;
  readonly at: number;
  readonly beanId: string | null;
  readonly technique: TechniqueRef;
  readonly method: Method;
  readonly click: number;
  readonly waterG: number;
  readonly doseG: number;
  readonly tailSec: number;
  readonly via: 'drained' | 'bed_dry';
}

const TAIL_PLAUSIBLE = { lo: 5, hi: 900 } as const;

export function tailObservationsOf(facts: FactState): TailObs[] {
  const out: TailObs[] = [];
  for (const id of facts.cupOrder) {
    const c = facts.cups.get(id)!;
    if (c.status === 'abandoned' || c.grindClick === null) continue;
    const last = c.planned.pours[c.planned.pours.length - 1];
    if (!last) continue;
    let tail: number | null = null;
    let via: TailObs['via'] = 'drained';
    if (c.lastDrainSec !== null) tail = c.lastDrainSec;
    else if (c.bedDrySec !== null && c.bedDrySec > last.atSec) { tail = c.bedDrySec - last.atSec; via = 'bed_dry'; }
    if (tail === null || tail < TAIL_PLAUSIBLE.lo || tail > TAIL_PLAUSIBLE.hi) continue;
    out.push({ brewId: c.brewId, at: c.at, beanId: c.beanId, technique: c.technique, method: c.method, click: c.grindClick,
      waterG: c.planned.waterG, doseG: c.doseG, tailSec: tail, via });
  }
  return out;
}

// ───────────────────────────── lineaire algebra (klein, dicht) ─────────────────────────────

/** Cholesky van een symmetrisch positief definiete matrix; L met A = L·Lᵀ. */
function cholesky(A: number[][]): number[][] {
  const n = A.length;
  const L = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i]![j]!;
      for (let k = 0; k < j; k++) s -= L[i]![k]! * L[j]![k]!;
      if (i === j) {
        if (!(s > 0)) throw new Error('matrix is niet positief definiet');
        L[i]![j] = Math.sqrt(s);
      } else L[i]![j] = s / L[j]![j]!;
    }
  }
  return L;
}
function cholSolve(L: number[][], b: number[]): number[] {
  const n = L.length;
  const y = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) { let s = b[i]!; for (let k = 0; k < i; k++) s -= L[i]![k]! * y[k]!; y[i] = s / L[i]![i]!; }
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = y[i]!; for (let k = i + 1; k < n; k++) s -= L[k]![i]! * x[k]!; x[i] = s / L[i]![i]!; }
  return x;
}

// ───────────────────────────── het model ─────────────────────────────

/**
 * Referentiepunt van het doorloopmodel per brewer en techniek. V60: de vaste waarden van het molenmodel.
 * Chemex: er zijn geen eigen zetsels om op te steunen, dus de bronnen bepalen het beginpunt: de BrewTuner-klik (24)
 * en een doorloop na de laatste giet die het eindmoment van het recept haalt (aanname, breed: sd 0,5).
 */
/** Beginklik voor de Chemex bij een dosis: 15 bij 22 g, 9 klikken grover per verdubbeling (zie grinder.ts). */
export function chemexClickForDose(doseG: number, baseClick: number = GRINDER_C3S_PRO.chemex.defaultStartClick, baseDoseG: number = GRINDER_C3S_PRO.chemex.refDoseG): number {
  if (!(doseG > 0)) return baseClick;
  const c = Math.round(baseClick + GRINDER_C3S_PRO.chemex.clicksPerDoubling * Math.log2(doseG / baseDoseG));
  const w = GRINDER_C3S_PRO.chemex.adviceWindow;
  return Math.max(w.lo, Math.min(w.hi, c));
}

function refFor(method: Method, technique: string): { click: number; waterG: number; interceptLn: number; sd: number } {
  if (method === 'chemex') {
    const d = TECHNIQUE_BY_ID.get(technique as TechniqueId);
    const ps = d?.reference.pours, e = d?.reference.endSec;
    if (d && ps && e) {
      const tail = Math.max(30, (e.lo + e.hi) / 2 - ps[ps.length - 1]!.atSec);
      const sc = d.reference.startClick;
      const click = sc ? sc.click : chemexClickForDose(d.reference.doseG);
      return { click, waterG: d.reference.waterG, interceptLn: Math.log(tail), sd: P.interceptSdOther };
    }
    return { click: GRINDER_C3S_PRO.chemex.defaultStartClick, waterG: P.refWaterG, interceptLn: P.interceptLn, sd: P.interceptSdOther };
  }
  return { click: P.refClick, waterG: P.refWaterG, interceptLn: P.interceptLn, sd: technique === 'kasuya_46' ? P.interceptSdKasuya : P.interceptSdOther };
}

export interface GrindFit {
  readonly method: Method;
  /** Waarnemingen die meedoen (deze brewer). */
  readonly n: number;
  readonly mean: readonly number[];
  readonly chol: number[][];
  readonly index: { readonly perClick: 0; readonly water: 1; readonly technique: ReadonlyMap<string, number>; readonly bean: ReadonlyMap<string, number> };
}

export function fitGrind(obs: readonly TailObs[], method: Method, technique: TechniqueRef, beanId: string | null): GrindFit {
  const first = solveGrind(obs, method, technique, beanId, false);
  // Een grovere maling kan het doorlopen niet trager maken. Wijst de data (door ruis of een foute
  // meting) die kant op, dan geldt het klikeffect als nul in plaats van positief.
  return first.mean[0]! > 0 ? solveGrind(obs, method, technique, beanId, true) : first;
}

function solveGrind(obs: readonly TailObs[], method: Method, technique: TechniqueRef, beanId: string | null, noClickEffect: boolean): GrindFit {
  const used = obs.filter(o => o.method === method);
  const techs = new Map<string, number>();
  const beans = new Map<string, number>();
  let dim = 2;
  const addTech = (t: string): void => { if (!techs.has(t)) techs.set(t, dim++); };
  const addBean = (b: string): void => { if (!beans.has(b)) beans.set(b, dim++); };
  addTech(technique);
  used.forEach(o => addTech(o.technique));
  if (beanId) addBean(beanId);
  used.forEach(o => { if (o.beanId) addBean(o.beanId); });

  const prior = new Array<number>(dim).fill(0);
  const priorSd = new Array<number>(dim).fill(1);
  prior[0] = noClickEffect ? 0 : P.perClickLn; priorSd[0] = noClickEffect ? 1e-6 : P.perClickSd;
  prior[1] = P.waterLnMean; priorSd[1] = P.waterLnSd;
  for (const [t, i] of techs) { const r = refFor(method, t); prior[i] = r.interceptLn; priorSd[i] = r.sd; }
  for (const i of beans.values()) { prior[i] = 0; priorSd[i] = P.beanSd; }

  const A = Array.from({ length: dim }, (_, i) => Array.from({ length: dim }, (_, j) => (i === j ? 1 / (priorSd[i]! ** 2) : 0)));
  const b = prior.map((m, i) => m / (priorSd[i]! ** 2));
  const s2 = P.noiseSd ** 2;
  const sorted = [...used].sort((x, y) => x.at - y.at);
  sorted.forEach((o, k) => {
    const w = Math.pow(0.5, (sorted.length - 1 - k) / P.forgetHalfLife);
    const x = new Array<number>(dim).fill(0);
    const ro = refFor(method, o.technique);
    x[0] = o.click - ro.click;
    x[1] = Math.log(o.waterG / ro.waterG);
    x[techs.get(o.technique)!] = 1;
    if (o.beanId) x[beans.get(o.beanId)!] = 1;
    const y = Math.log(o.tailSec);
    for (let i = 0; i < dim; i++) {
      if (x[i] === 0) continue;
      b[i] = b[i]! + w * x[i]! * y / s2;
      for (let j = 0; j < dim; j++) if (x[j] !== 0) A[i]![j] = A[i]![j]! + w * x[i]! * x[j]! / s2;
    }
  });
  const chol = cholesky(A);
  return { method, n: sorted.length, mean: cholSolve(chol, b), chol, index: { perClick: 0, water: 1, technique: techs, bean: beans } };
}

export interface TailPrediction { readonly muLn: number; readonly sdLn: number; readonly median: number; readonly band: Band<number> }

export function predictTail(fit: GrindFit, q: { technique: TechniqueRef; beanId: string | null; click: number; waterG: number }): TailPrediction {
  const dim = fit.mean.length;
  const x = new Array<number>(dim).fill(0);
  const rq = refFor(fit.method, q.technique);
  x[0] = q.click - rq.click;
  x[1] = Math.log(q.waterG / rq.waterG);
  x[fit.index.technique.get(q.technique)!] = 1;
  const bi = q.beanId ? fit.index.bean.get(q.beanId) : undefined;
  if (bi !== undefined) x[bi] = 1;
  const muLn = x.reduce((a, v, i) => a + v * fit.mean[i]!, 0);
  const z = cholSolve(fit.chol, x);
  const varModel = x.reduce((a, v, i) => a + v * z[i]!, 0);
  const sdLn = Math.sqrt(varModel + P.noiseSd ** 2);
  return { muLn, sdLn, median: Math.exp(muLn), band: { lo: Math.exp(muLn - Z80 * sdLn), mid: Math.exp(muLn), hi: Math.exp(muLn + Z80 * sdLn) } };
}

/** Wat de data over één klik zegt: gemiddeld effect en onzekerheid, en of de data het al bijstuurt. */
export function perClickEffect(fit: GrindFit): { meanLn: number; sdLn: number; pctPerClick: number; learned: boolean } {
  const e = new Array<number>(fit.mean.length).fill(0);
  e[0] = 1;
  const z = cholSolve(fit.chol, e);
  const sd = Math.sqrt(z[0]!);
  const meanLn = fit.mean[0]!;
  return { meanLn, sdLn: sd, pctPerClick: Math.round((Math.exp(meanLn) - 1) * 1000) / 10, learned: sd < 0.8 * P.perClickSd };
}

// ───────────────────────────── advies ─────────────────────────────

export interface GrindRequest {
  readonly method: Method;
  readonly technique: TechniqueRef;
  readonly beanId: string | null;
  readonly waterG: number;
  /** Geplande start van de laatste giet (s). */
  readonly lastPourAtSec: number;
  /** Dosis van dit zetsel (g); op de Chemex schaalt de beginklik hiermee mee. */
  readonly doseG?: number;
  /** Gewenst einde (bed droog): ondergrens, doel en bovengrens in s. */
  readonly targetEnd: Band<number>;
  /** De klik die nu gepland staat; zonder: de laatste klik van deze zak, anders van deze techniek, anders de standaard. */
  readonly currentClick?: number | null;
}

export type GrindCode = 'ok' | 'too_slow' | 'too_fast';

export interface GrindAdvice {
  readonly click: number;
  readonly delta: number;
  readonly code: Exclude<GrindCode, 'ok'>;
  readonly pInBandNow: number;
  readonly pInBandAfter: number;
  /** Verwacht einde (bed droog) bij de geadviseerde klik. */
  readonly predictedEnd: Band<number>;
}

export interface GrindPlan {
  readonly version: string;
  readonly currentClick: number;
  readonly clickSource: 'planned' | 'bean' | 'technique' | 'recipe' | 'last' | 'default';
  readonly n: number;
  readonly nTechnique: number;
  readonly nBean: number;
  readonly perClick: ReturnType<typeof perClickEffect>;
  readonly predictedTail: Band<number>;
  readonly predictedEnd: Band<number>;
  readonly pInBand: number;
  readonly code: GrindCode;
  readonly advice: GrindAdvice | null;
  readonly warnings: readonly string[];
}

export const MAX_CLICK_STEP = 4;
/** Binnen dit aandeel van de band (kans) en dichter dan dit bij het doel (s) laten we de klik met rust. */
const KEEP_P_IN_BAND = 0.8;
const KEEP_NEAR_TARGET_SEC = 20;
const MIN_GAIN = 0.1;
/** Een klik moet het verwachte einde minstens zoveel s dichter bij het doel brengen. */
const MIN_CLOSER_SEC = 8;

function pInBand(pred: TailPrediction, lastPourAt: number, lo: number, hi: number): number {
  const a = lo - lastPourAt, b = hi - lastPourAt;
  const upper = b <= 0 ? 0 : phi((Math.log(b) - pred.muLn) / pred.sdLn);
  const lower = a <= 0 ? 0 : phi((Math.log(a) - pred.muLn) / pred.sdLn);
  return Math.max(0, upper - lower);
}

export function currentClickFor(facts: FactState, technique: TechniqueRef, beanId: string | null, planned: number | null | undefined, method: Method = 'v60', doseG?: number | null): { click: number; source: GrindPlan['clickSource'] } {
  if (typeof planned === 'number') return { click: planned, source: 'planned' };
  if (method === 'chemex') return chemexCurrentClick(facts, technique, beanId, doseG ?? null);
  // Een klik van de V60 zegt niets over de Chemex (en omgekeerd): alleen koppen van dezelfde brewer tellen.
  const cups = facts.cupOrder.map(id => facts.cups.get(id)!).filter(c => c.grindClick !== null && c.method === method);
  const byBean = beanId ? cups.filter(c => c.beanId === beanId) : [];
  if (byBean.length) return { click: byBean[byBean.length - 1]!.grindClick!, source: 'bean' };
  const byTech = cups.filter(c => c.technique === technique);
  if (byTech.length) return { click: byTech[byTech.length - 1]!.grindClick!, source: 'technique' };
  if (cups.length) return { click: cups[cups.length - 1]!.grindClick!, source: 'last' };
  return { click: GRINDER_C3S_PRO.defaultStartClick, source: 'default' };
}

/**
 * Chemex: de maling hangt sterk van de dosis af (bedhoogte). Een klik uit een eerder zetsel wordt daarom meegeschaald met de dosisverhouding.
 * Volgorde: zelfde recept (zelfde zak eerst), de beginklik van het recept zelf (bron), zelfde zak met ander recept, laatste Chemex-zetsel, standaard.
 */
function chemexCurrentClick(facts: FactState, technique: TechniqueRef, beanId: string | null, doseG: number | null): { click: number; source: GrindPlan['clickSource'] } {
  const C = GRINDER_C3S_PRO.chemex;
  const cups = facts.cupOrder.map(id => facts.cups.get(id)!).filter(c => c.grindClick !== null && c.method === 'chemex');
  const scaled = (c: { grindClick: number | null; doseG: number }): number => {
    const base = c.grindClick!;
    if (!(doseG && doseG > 0) || !(c.doseG > 0)) return base;
    return Math.max(C.adviceWindow.lo, Math.min(C.adviceWindow.hi, Math.round(base + C.clicksPerDoubling * Math.log2(doseG / c.doseG))));
  };
  const last = <T>(a: T[]): T | undefined => a[a.length - 1];
  const sameTech = cups.filter(c => c.technique === technique);
  const sameBoth = beanId ? sameTech.filter(c => c.beanId === beanId) : [];
  const t = last(sameBoth) ?? last(sameTech);
  if (t) return { click: scaled(t), source: 'technique' };
  const def = TECHNIQUE_BY_ID.get(technique as TechniqueId);
  const sc = def?.reference.startClick;
  if (def && sc) {
    const c = doseG && doseG > 0 ? Math.round(sc.click + C.clicksPerDoubling * Math.log2(doseG / def.reference.doseG)) : sc.click;
    return { click: Math.max(C.adviceWindow.lo, Math.min(C.adviceWindow.hi, c)), source: 'recipe' };
  }
  const b = beanId ? last(cups.filter(c => c.beanId === beanId)) : undefined;
  if (b) return { click: scaled(b), source: 'bean' };
  const l = last(cups);
  if (l) return { click: scaled(l), source: 'last' };
  return { click: doseG && doseG > 0 ? chemexClickForDose(doseG) : C.defaultStartClick, source: 'default' };
}

export function grindPlan(facts: FactState, req: GrindRequest): GrindPlan {
  const obs = tailObservationsOf(facts);
  const fit = fitGrind(obs, req.method, req.technique, req.beanId);
  const { click: cur, source } = currentClickFor(facts, req.technique, req.beanId, req.currentClick, req.method, req.doseG);
  const at = (click: number): TailPrediction => predictTail(fit, { technique: req.technique, beanId: req.beanId, click, waterG: req.waterG });
  const now = at(cur);
  const pNow = pInBand(now, req.lastPourAtSec, req.targetEnd.lo, req.targetEnd.hi);
  const endMid = req.lastPourAtSec + now.median;
  const warnings: string[] = [];
  if (req.targetEnd.mid - req.lastPourAtSec <= 0) warnings.push('Het gewenste einde ligt voor de laatste giet; controleer het schema.');

  let code: GrindCode = 'ok';
  let advice: GrindAdvice | null = null;
  // Chemex zonder eigen doorlooptijden voor deze techniek: het beginpunt is zelf het recept (aanname), dus er valt niets bij te stellen.
  const noChemexData = req.method === 'chemex' && obs.filter(o => o.method === 'chemex' && o.technique === req.technique).length === 0;
  if (!noChemexData && (pNow < KEEP_P_IN_BAND || Math.abs(endMid - req.targetEnd.mid) > KEEP_NEAR_TARGET_SEC)) {
    code = endMid > req.targetEnd.mid ? 'too_slow' : 'too_fast';
    const win = req.method === 'chemex' ? GRINDER_C3S_PRO.chemex.adviceWindow : GRINDER_C3S_PRO.adviceWindow;
    let best: { click: number; p: number; dist: number; band: Band<number> } | null = null;
    // Zolang er voor deze techniek weinig doorlooptijden zijn, zetten we kleinere stappen: 1 klik bij de eerste kop,
    // daarna 2, 3 en hooguit 4. De natuurkundige verwachting is een beginpunt, geen bewijs.
    const nTechNow = obs.filter(o => o.method === req.method && o.technique === req.technique).length;
    const maxStep = Math.min(MAX_CLICK_STEP, 1 + nTechNow);
    for (let c = Math.max(win.lo, cur - maxStep); c <= Math.min(win.hi, cur + maxStep); c++) {
      const pr = at(c);
      const p = pInBand(pr, req.lastPourAtSec, req.targetEnd.lo, req.targetEnd.hi);
      const dist = Math.abs(req.lastPourAtSec + pr.median - req.targetEnd.mid);
      // Beter = dichter bij het doel; kans in de band beslist alleen bij (bijna) gelijke afstand.
      if (!best || dist < best.dist - 1e-9 || (Math.abs(dist - best.dist) <= 1e-9 && p > best.p)) best = { click: c, p, dist, band: pr.band };
    }
    const devNow = Math.abs(endMid - req.targetEnd.mid);
    const better = best !== null && best.click !== cur && (best.dist <= devNow - MIN_CLOSER_SEC || best.p >= pNow + MIN_GAIN - 1e-12);
    if (best && better) {
      advice = { click: best.click, delta: best.click - cur, code: code === 'too_slow' ? 'too_slow' : 'too_fast', pInBandNow: pNow, pInBandAfter: best.p,
        predictedEnd: { lo: req.lastPourAtSec + best.band.lo, mid: req.lastPourAtSec + best.band.mid, hi: req.lastPourAtSec + best.band.hi } };
    } else warnings.push('Het einde wijkt af van het doel, maar binnen het bereik van de molen is geen duidelijk betere klik.');
  }
  const nTech = obs.filter(o => o.method === req.method && o.technique === req.technique).length;
  const nBean = req.beanId ? obs.filter(o => o.method === req.method && o.beanId === req.beanId).length : 0;
  if (fit.n === 0) warnings.push('Nog geen doorlooptijden gelogd: het advies komt uit de natuurkundige verwachting (−11 % per klik) en het molenmodel.');
  else if (nTech === 0) warnings.push('Voor deze techniek zijn nog geen doorlooptijden gelogd; de schatting is breed.');
  return {
    version: GRIND_MODEL_VERSION, currentClick: cur, clickSource: source, n: fit.n, nTechnique: nTech, nBean,
    perClick: perClickEffect(fit),
    predictedTail: now.band,
    predictedEnd: { lo: req.lastPourAtSec + now.band.lo, mid: endMid, hi: req.lastPourAtSec + now.band.hi },
    pInBand: pNow, code, advice, warnings
  };
}
