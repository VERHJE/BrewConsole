// Engine 3 · meetopstelling voor tijd en molen.
//
// Wereld: een zak heeft een eigen doorloop (zakniveau), een klik verandert de doorloop met een vast
// percentage, en elk zetsel heeft ruis. De doorloop na de laatste giet (tail) is het molenmodel uit
// punt 4: 78 s bij klik 16, ×0,886 per klik grover, ln-ruis 0,167. Het einde = laatste giet (160 s bij
// Kasuya) + tail. 'Op tijd' is het einde binnen 2:50–4:10 (Gota); het doel is 3:30.
//
//   node engine3/eval/grind-sim.ts [herhalingen] [uit.json]

import { writeFileSync } from 'node:fs';
import { gauss, rng } from './simulator.ts';
import { summarize } from './metrics.ts';
import { buildRecipe } from '../src/recipe.ts';
import { learnFacts } from '../src/state.ts';
import { grindPlan, predictTail, fitGrind, tailObservationsOf } from '../src/grind.ts';
import type { EngineEvent } from '../src/types.ts';
import type { Clicks, EpochMs, Seconds } from '../src/units.ts';

export interface GrindWorld {
  readonly name: string;
  readonly baseTailSec: number;
  readonly perClickLn: number;
  readonly beanSd: number;
  readonly noiseSd: number;
  readonly driftPerCup: number;
}

export const GRIND_WORLDS: readonly GrindWorld[] = [
  { name: 'basis', baseTailSec: 78, perClickLn: Math.log(0.886), beanSd: 0.10, noiseSd: 0.167, driftPerCup: 0 },
  { name: 'trager dan gedacht', baseTailSec: 110, perClickLn: Math.log(0.886), beanSd: 0.10, noiseSd: 0.167, driftPerCup: 0 },
  { name: 'sneller dan gedacht', baseTailSec: 55, perClickLn: Math.log(0.886), beanSd: 0.10, noiseSd: 0.167, driftPerCup: 0 },
  { name: 'flauw klikeffect (−7 %)', baseTailSec: 78, perClickLn: Math.log(0.93), beanSd: 0.10, noiseSd: 0.167, driftPerCup: 0 },
  { name: 'steil klikeffect (−16 %)', baseTailSec: 78, perClickLn: Math.log(0.84), beanSd: 0.10, noiseSd: 0.167, driftPerCup: 0 },
  { name: 'zakken verschillen veel', baseTailSec: 78, perClickLn: Math.log(0.886), beanSd: 0.25, noiseSd: 0.167, driftPerCup: 0 },
  { name: 'veel ruis', baseTailSec: 78, perClickLn: Math.log(0.886), beanSd: 0.10, noiseSd: 0.25, driftPerCup: 0 },
  { name: 'drift (−0,4 % per kop)', baseTailSec: 78, perClickLn: Math.log(0.886), beanSd: 0.10, noiseSd: 0.167, driftPerCup: -0.004 }
];

export const GRIND_SCENARIO = { bags: 8, cupsPerBag: 10, waterG: 300, doseG: 20, lastPourAtSec: 160, band: { lo: 170, mid: 210, hi: 250 }, startClick: 16 as number } as const;

export interface GrindCtx { readonly beanId: string; readonly cupInBag: number; readonly cupIndex: number; readonly at: number }
export interface GrindStrategy {
  readonly name: string;
  reset(): void;
  click(ctx: GrindCtx, truth: { medianEnd: (click: number) => number }): number;
  observe(ctx: GrindCtx, click: number, endSec: number): void;
}

export const fixedClick: GrindStrategy = {
  name: 'vaste klik 16', reset() {}, click: () => GRIND_SCENARIO.startClick, observe() {}
};

/** Zoals je het zelf zou doen: een klik grover als het te laat is, een klik fijner als het te vroeg is. */
export function naiveStrategy(): GrindStrategy {
  let click = GRIND_SCENARIO.startClick;
  return {
    name: 'één klik bijsturen (zelf doen)',
    reset() { click = GRIND_SCENARIO.startClick; },
    click: () => click,
    observe(_ctx, _c, end) { if (end > GRIND_SCENARIO.band.hi) click += 1; else if (end < GRIND_SCENARIO.band.lo) click -= 1; }
  };
}

export function oracleStrategy(): GrindStrategy {
  return {
    name: 'orakel (kent de molen)', reset() {},
    click(_ctx, truth) {
      let best = GRIND_SCENARIO.startClick, bestD = Infinity;
      for (let c = 8; c <= 25; c++) { const d = Math.abs(truth.medianEnd(c) - GRIND_SCENARIO.band.mid); if (d < bestD) { bestD = d; best = c; } }
      return best;
    },
    observe() {}
  };
}

export function engine3Strategy(): GrindStrategy {
  let events: EngineEvent[] = [];
  let seq = 0;
  const seen = new Set<string>();
  let lastClick = GRIND_SCENARIO.startClick;
  return {
    name: 'Engine 3 (tijd en molen)',
    reset() { events = []; seq = 0; seen.clear(); lastClick = GRIND_SCENARIO.startClick; },
    click(ctx) {
      const facts = learnFacts(events);
      const plan = grindPlan(facts, { method: 'v60', technique: 'kasuya_46', beanId: ctx.beanId, waterG: GRIND_SCENARIO.waterG,
        lastPourAtSec: GRIND_SCENARIO.lastPourAtSec, targetEnd: GRIND_SCENARIO.band, currentClick: lastClick });
      return plan.advice ? plan.advice.click : lastClick;
    },
    observe(ctx, click, endSec) {
      lastClick = click;
      const at = ctx.at as EpochMs;
      const brewId = `g_${seq++}`;
      if (!seen.has(ctx.beanId)) {
        seen.add(ctx.beanId);
        events.push({ id: `bean_${ctx.beanId}`, at, device: 'sim', v: 1, kind: 'bean.upsert', data: { beanId: ctx.beanId, fields: { name: ctx.beanId }, sources: {}, legacy: null } });
      }
      const { recipe } = buildRecipe({ technique: 'kasuya_46', method: 'v60', doseG: GRIND_SCENARIO.doseG, waterG: GRIND_SCENARIO.waterG, grindClick: click as Clicks });
      events.push({ id: `${brewId}:plan`, at, device: 'sim', v: 1, kind: 'brew.plan', data: { brewId, beanId: ctx.beanId, goal: null, engine: { name: 'sim', version: '1' }, recipe, trialId: null, legacy: null } });
      events.push({ id: `${brewId}:start`, at: (at + 1) as EpochMs, device: 'sim', v: 1, kind: 'brew.timer', data: { brewId, type: 'start', tSec: 0 as Seconds, pourIndex: null } });
      events.push({ id: `${brewId}:dry`, at: (at + 2) as EpochMs, device: 'sim', v: 1, kind: 'brew.timer', data: { brewId, type: 'bed_dry', tSec: endSec as Seconds, pourIndex: null } });
      events.push({ id: `${brewId}:done`, at: (at + 3) as EpochMs, device: 'sim', v: 1, kind: 'brew.timer', data: { brewId, type: 'complete', tSec: (endSec + 10) as Seconds, pourIndex: null } });
    }
  };
}

export interface GrindMetrics {
  /** Aandeel koppen met het einde binnen 2:50–4:10. */
  readonly inBand: number;
  /** Aandeel koppen binnen ±20 s van 3:30. */
  readonly nearTarget: number;
  /** Gemiddeld aantal koppen per zak tot de eerste 'op tijd' (nooit = koppen + 1). */
  readonly cupsToFirstInBand: number;
  /** Gemiddeld aantal klikken verschil tussen opeenvolgende koppen van dezelfde zak. */
  readonly clickStep: number;
  /** Aandeel koppen in de tweede helft van een zak dat op tijd is. */
  readonly inBandLate: number;
}

export function simulateGrind(strategy: GrindStrategy, w: GrindWorld, seed: number): GrindMetrics {
  const sc = GRIND_SCENARIO;
  const r = rng(seed);
  const beanOffsets = Array.from({ length: sc.bags }, () => gauss(r) * w.beanSd);
  strategy.reset();
  let idx = 0, inBand = 0, near = 0, first = 0, stepSum = 0, stepN = 0, lateIn = 0, lateN = 0;
  for (let b = 0; b < sc.bags; b++) {
    let firstIdx = -1;
    let prevClick: number | null = null;
    for (let k = 0; k < sc.cupsPerBag; k++, idx++) {
      const bean = beanOffsets[b]!;
      const medianTail = (c: number): number => w.baseTailSec * Math.exp(bean + w.perClickLn * (c - 16) + w.driftPerCup * idx);
      const ctx = { beanId: `zak${b + 1}`, cupInBag: k, cupIndex: idx, at: 1_790_000_000_000 + idx * 86_400_000 };
      const click = strategy.click(ctx, { medianEnd: c => sc.lastPourAtSec + medianTail(c) });
      const end = sc.lastPourAtSec + medianTail(click) * Math.exp(gauss(r) * w.noiseSd);
      strategy.observe(ctx, click, end);
      const ok = end >= sc.band.lo && end <= sc.band.hi;
      if (ok) inBand++;
      if (Math.abs(end - sc.band.mid) <= 20) near++;
      if (ok && firstIdx < 0) firstIdx = k;
      if (k >= sc.cupsPerBag / 2) { lateN++; if (ok) lateIn++; }
      if (prevClick !== null) { stepSum += Math.abs(click - prevClick); stepN++; }
      prevClick = click;
    }
    first += firstIdx >= 0 ? firstIdx + 1 : sc.cupsPerBag + 1;
  }
  const total = sc.bags * sc.cupsPerBag;
  return { inBand: inBand / total, nearTarget: near / total, cupsToFirstInBand: first / sc.bags, clickStep: stepN ? stepSum / stepN : 0, inBandLate: lateN ? lateIn / lateN : 0 };
}

function main(): void {
  const runs = Number(process.argv[2] ?? 60);
  const out = process.argv[3] ?? null;
  const strategies: GrindStrategy[] = [fixedClick, naiveStrategy(), engine3Strategy(), oracleStrategy()];
  const results: Record<string, Record<string, Record<string, { mean: number; sd: number }>>> = {};
  for (const w of GRIND_WORLDS) {
    results[w.name] = {};
    for (const s of strategies) {
      const per: GrindMetrics[] = [];
      for (let i = 0; i < runs; i++) per.push(simulateGrind(s, w, 2000 + i));
      const keys = Object.keys(per[0]!) as (keyof GrindMetrics)[];
      results[w.name]![s.name] = Object.fromEntries(keys.map(k => [k, summarize(per.map(p => p[k]))]));
    }
  }
  const pct = (v: { mean: number }): string => `${(v.mean * 100).toFixed(0)} %`;
  console.log(`Meetopstelling tijd en molen · ${runs} herhalingen per wereld · ${GRIND_SCENARIO.bags} zakken × ${GRIND_SCENARIO.cupsPerBag} koppen · band 2:50–4:10, doel 3:30\n`);
  console.log('| Wereld | Strategie | Op tijd | Dichtbij doel (±20 s) | Koppen tot eerste op tijd | Op tijd, 2e helft | Klikstap |');
  console.log('|---|---|---|---|---|---|---|');
  for (const [wName, byS] of Object.entries(results)) for (const [sName, m] of Object.entries(byS)) {
    console.log(`| ${wName} | ${sName} | ${pct(m['inBand']!)} | ${pct(m['nearTarget']!)} | ${m['cupsToFirstInBand']!.mean.toFixed(1)} | ${pct(m['inBandLate']!)} | ${m['clickStep']!.mean.toFixed(2)} |`);
  }
  if (out) writeFileSync(out, JSON.stringify({ runs, scenario: GRIND_SCENARIO, worlds: GRIND_WORLDS, results }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
void predictTail; void fitGrind; void tailObservationsOf;
