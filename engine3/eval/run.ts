// Engine 3 · meetopstelling draaien: elke strategie in elke 'wereld', met dezelfde toevalsgetallen
// (zelfde zakken, zelfde ruis), zodat verschillen van de strategie komen en niet van geluk.
//
//   node engine3/eval/run.ts            → tabel (standaard 60 herhalingen per wereld)
//   node engine3/eval/run.ts 200 out.json        → 200 herhalingen, ook als JSON
//   node engine3/eval/run.ts 200 '' 1.30         → andere voorkeur (gevoeligheid)
//
// Uitkomsten van de nulmeting staan in docs/engine3/06-meetopstelling.md.

import { writeFileSync } from 'node:fs';
import { DEFAULT_SCENARIO, WORLDS, makeBags, rng, tasteCup } from './simulator.ts';
import type { Scenario, World } from './simulator.ts';
import { runMetrics, summarize } from './metrics.ts';
import type { CupRecord, RunMetrics } from './metrics.ts';
import { engine2Strategy, oracleStrategy, staticStrategy } from './adapters.ts';
import type { Strategy } from './adapters.ts';
import { ratioForTds, ey, tdsPct } from '../src/units.ts';

export function simulate(strategy: Strategy, sc: Scenario, w: World, seed: number): RunMetrics {
  const r = rng(seed);
  const bags = makeBags(sc, w, r);
  strategy.reset();
  const cups: CupRecord[] = [];
  let cupIndex = 0;
  bags.forEach((bag, b) => {
    for (let k = 0; k < sc.cupsPerBag; k++, cupIndex++) {
      const ctx = { beanId: bag.beanId, waterG: sc.waterG, cupIndex, at: 1_790_000_000_000 + cupIndex * 86_400_000 };
      const doseG = strategy.dose(ctx);
      const cup = tasteCup(doseG, bag, cupIndex, sc, w, r);
      strategy.observe(ctx, doseG, cup.answer);
      cups.push({ bag: b, cupInBag: k, doseG, tds: cup.tds, trueTargetLn: cup.trueTargetLn, answer: cup.answer });
    }
  });
  return runMetrics(cups, sc.cupsPerBag);
}

async function main(): Promise<void> {
  const runs = Number(process.argv[2] ?? 60);
  const out = process.argv[3] ?? null;
  const target = process.argv[4] ? Number(process.argv[4]) : null;
  const sc = target ? { ...DEFAULT_SCENARIO, targetTds: target } : DEFAULT_SCENARIO;
  const strategies: Strategy[] = [await staticStrategy(sc.waterG), await engine2Strategy(sc.waterG)];
  const results: Record<string, Record<string, Record<string, { mean: number; sd: number }>>> = {};
  for (const w of WORLDS) {
    // Het orakel kent per wereld de ware voorkeur; bags worden met dezelfde seed opnieuw gemaakt.
    const oracle = (seed: number): Strategy => {
      const r = rng(seed);
      const bags = makeBags(sc, w, r);
      return oracleStrategy(ctx => {
        const bag = bags.find(b => b.beanId === ctx.beanId)!;
        const targetLn = Math.log(sc.targetTds) + bag.prefOffsetLn + w.driftPerCup * ctx.cupIndex;
        return sc.waterG / ratioForTds(tdsPct(Math.exp(targetLn)), sc.retention, ey(bag.ey));
      });
    };
    results[w.name] = {};
    const all: Array<[string, (seed: number) => Strategy]> = [
      ...strategies.map(s => [s.name, () => s] as [string, (seed: number) => Strategy]),
      ['orakel (kent de voorkeur)', oracle]
    ];
    for (const [name, make] of all) {
      const per: RunMetrics[] = [];
      for (let i = 0; i < runs; i++) per.push(simulate(make(1000 + i), sc, w, 1000 + i));
      const keys = Object.keys(per[0] as RunMetrics) as (keyof RunMetrics)[];
      results[w.name]![name] = Object.fromEntries(keys.map(k => [k, summarize(per.map(p => p[k]))]));
    }
  }
  const fmt = (v: { mean: number; sd: number }, pct = false, d = 2): string => pct ? `${(v.mean * 100).toFixed(0)} %` : v.mean.toFixed(d);
  console.log(`Meetopstelling · ${runs} herhalingen per wereld · ${sc.bags} zakken × ${sc.cupsPerBag} koppen · ${sc.waterG} g water · voorkeur ${sc.targetTds} % TDS\n`);
  console.log('| Wereld | Strategie | Precies goed | Koppen tot eerste goede | Afwijking 2e helft | Tegen het oordeel in | Dosisstap |');
  console.log('|---|---|---|---|---|---|---|');
  for (const [wName, byS] of Object.entries(results)) {
    for (const [sName, m] of Object.entries(byS)) {
      const isOracle = sName.startsWith('orakel');
      console.log(`| ${wName} | ${sName} | ${fmt(m['goodShare']!, true)} | ${fmt(m['cupsToFirstGood']!, false, 1)} | ${fmt(m['lateErrorPct']!, false, 1)} % | ${isOracle ? 'n.v.t.' : fmt(m['wrongDirShare']!, true)} | ${fmt(m['meanDoseStepG']!, false, 2)} g |`);
    }
  }
  if (out) writeFileSync(out, JSON.stringify({ runs, scenario: sc, worlds: WORLDS, results }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => { console.error(e); process.exit(1); });
}
