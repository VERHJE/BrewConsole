// Engine 3 · meetopstelling voor de techniekkeuze.
//
// Elke zak heeft een verborgen 'beste techniek'. Een techniek heeft voor een zak een kwaliteit
// (beste: +effect, anderen 0, plus vaste ruis per zak). Een paar-proef (controle tegen variant) kiest
// de variant als het verschil in kwaliteit plus ruis boven de gelijkspelband uitkomt. Een deel van de
// zakken (ruleAccuracy) heeft precies de techniek die de regeltabel voorstelt als beste; de rest heeft
// een willekeurige beste. Zo is te meten wat de regels waard zijn én wat het kost als ze niet kloppen.
//
//   node engine3/eval/technique-sim.ts [herhalingen] [uit.json]

import { writeFileSync } from 'node:fs';
import { gauss, rng } from './simulator.ts';
import { summarize } from './metrics.ts';
import { buildRecipe } from '../src/recipe.ts';
import { learnFacts } from '../src/state.ts';
import { chooseTechnique, ruleCandidateFor } from '../src/technique.ts';
import { FLAVOR_WHEEL } from '../src/data/flavor-wheel.ts';
import type { EngineEvent, ProcessBase, RoastLevel, TechniqueId, WheelCategory } from '../src/types.ts';
import type { EpochMs, Grams } from '../src/units.ts';

export interface TechWorld { readonly name: string; readonly ruleAccuracy: number; readonly effect: number; readonly trialNoiseSd: number; readonly tie: number }

export const TECH_WORLDS: readonly TechWorld[] = [
  { name: 'regels kloppen deels (50 %)', ruleAccuracy: 0.5, effect: 1, trialNoiseSd: 0.7, tie: 0.25 },
  { name: 'regels kloppen vaak (80 %)', ruleAccuracy: 0.8, effect: 1, trialNoiseSd: 0.7, tie: 0.25 },
  { name: 'regels kloppen niet (0 %)', ruleAccuracy: 0, effect: 1, trialNoiseSd: 0.7, tie: 0.25 },
  { name: 'klein verschil tussen technieken', ruleAccuracy: 0.5, effect: 0.5, trialNoiseSd: 0.7, tie: 0.25 },
  { name: 'veel ruis in de proef', ruleAccuracy: 0.5, effect: 1, trialNoiseSd: 1.2, tie: 0.25 },
  { name: 'groot verschil tussen technieken', ruleAccuracy: 0.5, effect: 2, trialNoiseSd: 0.7, tie: 0.25 }
];

const TECHS: readonly TechniqueId[] = ['kasuya_46', 'hoffmann_ultimate', 'gagne', 'wendelboe', 'april', 'hedrick_one_and_done', 'rao'];
const PROCESSES: readonly ProcessBase[] = ['washed', 'natural', 'honey'];
const ROASTS: readonly RoastLevel[] = ['light', 'light_medium', 'medium', 'dark'];
const CATS: readonly WheelCategory[] = ['fruitig', 'bloemig', 'notig_cacao', 'zoet', 'geroosterd', 'overig'];
const firstTag = (c: WheelCategory): string => FLAVOR_WHEEL.find(x => x.key === c)!.subgroups[0]!.tags[0]!.tag;

export const TECH_SCENARIO = { bags: 12, cupsPerBag: 10, waterG: 300, doseG: 20 } as const;

interface SimBag { readonly beanId: string; readonly process: ProcessBase; readonly roast: RoastLevel; readonly cats: readonly WheelCategory[]; readonly cupG: number; best: TechniqueId; quality: Map<TechniqueId, number> }

const pick = <T>(r: () => number, xs: readonly T[]): T => xs[Math.min(xs.length - 1, Math.floor(r() * xs.length))]!;

export interface TechStrategy { readonly name: string }
export const STRATEGIES = ['altijd Kasuya', 'Engine 3 (regels + proeven)', 'proef elke techniek', 'orakel (kent de beste)'] as const;
export type StrategyName = typeof STRATEGIES[number];

export interface TechMetrics {
  /** Gemiddelde kwaliteit per kop, uitgedrukt als aandeel van het orakel (0 = altijd Kasuya-niveau van het orakel hier niet; zie regret). */
  readonly regret: number;
  readonly onBestShare: number;
  readonly trialsPerBag: number;
  /** Aandeel proeven waarbij de controle (Kasuya) al de beste was. */
  readonly superfluousTrials: number;
  readonly cupsToBest: number;
  readonly finalOnBest: number;
}

export function simulateTechnique(strategy: StrategyName, w: TechWorld, seed: number): TechMetrics {
  const sc = TECH_SCENARIO;
  const r = rng(seed);
  const events: EngineEvent[] = [];
  let at = 1_790_000_000_000;
  let seq = 0;
  let regret = 0, onBest = 0, cupsTotal = 0, trials = 0, superfluous = 0, toBest = 0, finalBest = 0;

  const addCup = (bag: SimBag, tech: TechniqueId, trialId: string | null): void => {
    const brewId = `t_${seq++}`;
    const { recipe } = buildRecipe({ technique: tech, method: 'v60', doseG: sc.doseG, waterG: sc.waterG });
    events.push({ id: `${brewId}:plan`, at: (at += 1000) as EpochMs, device: 'sim', v: 1, kind: 'brew.plan', data: { brewId, beanId: bag.beanId, goal: null, engine: { name: 'sim', version: '1' }, recipe, trialId, legacy: null } });
    events.push({ id: `${brewId}:tasting`, at: (at += 1000) as EpochMs, device: 'sim', v: 1, kind: 'tasting', data: { brewId, minutesAfter: null, late: false, strength: 0, acidity: null, finish: [], liking: null, goalHit: null, vsLast: null, missed: null, cata: [], noteHits: [], legacyScores: null, note: '' } });
  };
  const score = (bag: SimBag, tech: TechniqueId): void => { regret += bag.quality.get(bag.best)! - bag.quality.get(tech)!; if (tech === bag.best) onBest++; cupsTotal++; };

  // Bagfeatures eerst, zodat de regels voor de verborgen beste techniek dezelfde zijn als die van de engine.
  const bags: SimBag[] = [];
  for (let b = 0; b < sc.bags; b++) {
    const nCats = 1 + Math.floor(r() * 2);
    const cats = Array.from(new Set(Array.from({ length: nCats }, () => pick(r, CATS))));
    const bag: SimBag = { beanId: `zak${b + 1}`, process: pick(r, PROCESSES), roast: pick(r, ROASTS), cats, cupG: r() < 0.8 ? 300 : 200, best: 'kasuya_46', quality: new Map() };
    const u = r();
    const facts0 = learnFacts([{ id: `bean_${bag.beanId}`, at: 0 as EpochMs, device: 'sim', v: 1, kind: 'bean.upsert', data: { beanId: bag.beanId, fields: beanFields(bag), sources: {}, legacy: null } }]);
    const cand = ruleCandidateFor(facts0, { beanId: bag.beanId, method: 'v60', cupG: bag.cupG, technique: null }) ?? 'kasuya_46';
    bag.best = u < w.ruleAccuracy ? cand : pick(r, TECHS);
    for (const t of TECHS) bag.quality.set(t, (t === bag.best ? w.effect : 0) + gauss(r) * 0.3 * w.effect);
    bags.push(bag);
  }

  for (const bag of bags) {
    events.push({ id: `bean_${bag.beanId}`, at: (at += 1000) as EpochMs, device: 'sim', v: 1, kind: 'bean.upsert', data: { beanId: bag.beanId, fields: beanFields(bag), sources: {}, legacy: null } });
    let left = sc.cupsPerBag, k = 0, found = false, last: TechniqueId = 'kasuya_46';
    const brew = (tech: TechniqueId, trialId: string | null): void => {
      addCup(bag, tech, trialId); score(bag, tech); last = tech; left--; k++;
      if (!found && tech === bag.best) { found = true; toBest += k; }
    };
    const runTrial = (control: TechniqueId, variant: TechniqueId, id: string): TechniqueId => {
      brew(control, id); brew(variant, id);
      const diff = bag.quality.get(variant)! - bag.quality.get(control)! + gauss(r) * w.trialNoiseSd;
      const preferred = diff > w.tie ? 'variant' : diff < -w.tie ? 'control' : 'none';
      events.push({ id: `${id}:result`, at: (at += 1000) as EpochMs, device: 'sim', v: 1, kind: 'pair.trial', data: {
        trialId: id, beanId: bag.beanId, method: 'v60', waterG: sc.waterG as Grams, kind: 'technique',
        control: { doseG: sc.doseG as Grams, technique: control, grindClick: null }, variant: { doseG: sc.doseG as Grams, technique: variant, grindClick: null }, preferred, brighter: null } });
      trials++;
      if (control === bag.best) superfluous++;
      return preferred === 'variant' ? variant : control;
    };

    if (strategy === 'altijd Kasuya') { while (left > 0) brew('kasuya_46', null); }
    else if (strategy === 'orakel (kent de beste)') { while (left > 0) brew(bag.best, null); }
    else if (strategy === 'proef elke techniek') {
      let incumbent: TechniqueId = 'kasuya_46';
      for (const t of TECHS.slice(1)) { if (left < 2) break; incumbent = runTrial(incumbent, t, `naief:${bag.beanId}:${t}`); }
      while (left > 0) brew(incumbent, null);
    } else {
      while (left > 0) {
        const choice = chooseTechnique(learnFacts(events), { beanId: bag.beanId, method: 'v60', cupG: bag.cupG, technique: null });
        if (choice.trial && left >= 2) {
          const winner = runTrial(choice.trial.control, choice.trial.variant, choice.trial.id);
          void winner;
        } else brew(choice.technique, null);
      }
    }
    if (last === bag.best) finalBest++;
    if (!found) toBest += sc.cupsPerBag + 1;
  }
  return {
    regret: regret / cupsTotal, onBestShare: onBest / cupsTotal, trialsPerBag: trials / sc.bags,
    superfluousTrials: trials ? superfluous / trials : 0, cupsToBest: toBest / sc.bags, finalOnBest: finalBest / sc.bags
  };
}

function beanFields(bag: SimBag): Record<string, unknown> {
  return {
    name: bag.beanId, roastLevel: bag.roast,
    process: { base: bag.process, fermentation: [], experimental: false, decaf: null, ambiguousTerm: null },
    notes: { raw: bag.cats.map(firstTag), tags: bag.cats.map(firstTag), unmapped: [] }
  };
}

function main(): void {
  const runs = Number(process.argv[2] ?? 60);
  const out = process.argv[3] ?? null;
  const results: Record<string, Record<string, Record<string, { mean: number; sd: number }>>> = {};
  for (const w of TECH_WORLDS) {
    results[w.name] = {};
    for (const s of STRATEGIES) {
      const per: TechMetrics[] = [];
      for (let i = 0; i < runs; i++) per.push(simulateTechnique(s, w, 5000 + i));
      const keys = Object.keys(per[0]!) as (keyof TechMetrics)[];
      results[w.name]![s] = Object.fromEntries(keys.map(k => [k, summarize(per.map(p => p[k]))]));
    }
  }
  const pct = (v: { mean: number }): string => `${(v.mean * 100).toFixed(0)} %`;
  console.log(`Meetopstelling techniekkeuze · ${runs} herhalingen per wereld · ${TECH_SCENARIO.bags} zakken × ${TECH_SCENARIO.cupsPerBag} koppen\n`);
  console.log('| Wereld | Strategie | Spijt per kop | Op de beste techniek | Proeven per zak | Overbodige proeven | Koppen tot beste | Laatste kop op beste |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const [wName, byS] of Object.entries(results)) for (const [sName, m] of Object.entries(byS)) {
    console.log(`| ${wName} | ${sName} | ${m['regret']!.mean.toFixed(2)} | ${pct(m['onBestShare']!)} | ${m['trialsPerBag']!.mean.toFixed(1)} | ${sName.startsWith('altijd') || sName.startsWith('orakel') ? '—' : pct(m['superfluousTrials']!)} | ${m['cupsToBest']!.mean.toFixed(1)} | ${pct(m['finalOnBest']!)} |`);
  }
  if (out) writeFileSync(out, JSON.stringify({ runs, scenario: TECH_SCENARIO, worlds: TECH_WORLDS, results }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
