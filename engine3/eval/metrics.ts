// Engine 3 · maatstaven voor de meetopstelling. Elke maatstaf is iets wat Jelle merkt.

import type { StrengthOrd } from '../src/types.ts';

export interface CupRecord {
  readonly bag: number;
  readonly cupInBag: number;
  readonly doseG: number;
  readonly tds: number;
  readonly trueTargetLn: number;
  readonly answer: StrengthOrd;
}

export interface RunMetrics {
  /** Aandeel koppen 'precies goed'. */
  readonly goodShare: number;
  /** Gemiddeld aantal koppen per zak tot de eerste 'precies goed' (nooit = koppen + 1). */
  readonly cupsToFirstGood: number;
  /** Gemiddelde afwijking van de ware voorkeur in de tweede helft van elke zak (% TDS). */
  readonly lateErrorPct: number;
  /** Aandeel stappen tegen het laatste oordeel in (meer koffie na 'te sterk' of minder na 'te slap'). */
  readonly wrongDirShare: number;
  /** Gemiddelde verandering in dosis tussen opeenvolgende koppen van dezelfde zak (g). */
  readonly meanDoseStepG: number;
}

export function runMetrics(cups: readonly CupRecord[], cupsPerBag: number): RunMetrics {
  const good = cups.filter(c => c.answer === 0).length;
  const byBag = new Map<number, CupRecord[]>();
  for (const c of cups) { const a = byBag.get(c.bag) ?? []; a.push(c); byBag.set(c.bag, a); }
  let firstSum = 0, lateSum = 0, lateN = 0;
  for (const list of byBag.values()) {
    const idx = list.findIndex(c => c.answer === 0);
    firstSum += idx >= 0 ? idx + 1 : cupsPerBag + 1;
    for (const c of list.slice(Math.floor(list.length / 2))) {
      lateSum += Math.abs(Math.exp(Math.log(c.tds) - c.trueTargetLn) - 1) * 100;
      lateN++;
    }
  }
  let wrong = 0, moves = 0, stepSum = 0;
  let pairs = 0;
  for (let i = 1; i < cups.length; i++) {
    const prev = cups[i - 1] as CupRecord, cur = cups[i] as CupRecord;
    if (prev.bag !== cur.bag) continue; // een nieuwe zak telt niet als stap
    pairs++;
    const dDose = cur.doseG - prev.doseG;
    stepSum += Math.abs(dDose);
    if (prev.answer !== 0 && Math.abs(dDose) > 0.05) {
      moves++;
      if ((prev.answer > 0 && dDose > 0) || (prev.answer < 0 && dDose < 0)) wrong++;
    }
  }
  return {
    goodShare: cups.length ? good / cups.length : 0,
    cupsToFirstGood: byBag.size ? firstSum / byBag.size : 0,
    lateErrorPct: lateN ? lateSum / lateN : 0,
    wrongDirShare: moves ? wrong / moves : 0,
    meanDoseStepG: pairs ? stepSum / pairs : 0
  };
}

export function summarize(values: readonly number[]): { mean: number; sd: number } {
  const n = values.length;
  if (!n) return { mean: NaN, sd: NaN };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1));
  return { mean, sd };
}
