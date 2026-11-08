// Engine 3 · meetopstelling: een 'virtuele Jelle'. Een proever met een verborgen voorkeur die
// koppen beoordeelt zoals de app het vraagt (te slap … te sterk). Een engine mag de nieuwe
// standaard pas worden als hij hier aantoonbaar beter is dan Engine 2 (docs/engine3/06-meetopstelling.md).
//
// Waar de getallen vandaan komen:
//   - retentie 2,1 g/g en EY 0,20: Engine 2 (E2_R_ABS, E2_EY_NOMINAL), Guinard 2023-massabalans.
//   - spreiding per zak 0,05 in ln-TDS: E2_BEAN_PRIOR_SD (aanname uit Engine 2, niet gemeten).
//   - doorloop na de laatste giet: mediaan 78 s, ln-sd 0,167, en ×0,886 per klik grover vanaf
//     klik 16 (eigen 16 zetsels + Kozeny–Carman-aanname, verslag punt 4).
// Het oordeelmodel lijkt bewust op dat van Engine 2 (ordinaal-probit); daarom draait elke meting
// ook onder afwijkende 'werelden' (scheef, drift, veel ruis), zodat geen engine wint door alleen
// op zijn eigen aannames getest te worden.

import { massBalanceTds, ey, g } from '../src/units.ts';
import type { StrengthOrd } from '../src/types.ts';

/** Kleine, reproduceerbare toevalsgenerator (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function gauss(r: () => number): number {
  const u = Math.max(r(), 1e-12), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface World {
  readonly name: string;
  /** Hoe scherp het oordeel reageert op een afwijking in ln-TDS. */
  readonly slope: number;
  /** Ruis op het oordeel (in dezelfde schaal als de drempels ±0,5 / ±1,5). */
  readonly noiseSd: number;
  /** >1: te sterk wordt sterker gevoeld dan even veel te slap. */
  readonly asymmetry: number;
  /** Verschuiving van de voorkeur per kop (ln-TDS), bv. smaak die verandert. */
  readonly driftPerCup: number;
  /** Spreiding van de voorkeur tussen zakken (ln-TDS). */
  readonly beanSd: number;
}

export const WORLDS: readonly World[] = [
  { name: 'basis', slope: 5, noiseSd: 0.7, asymmetry: 1, driftPerCup: 0, beanSd: 0.05 },
  { name: 'veel ruis', slope: 5, noiseSd: 1.1, asymmetry: 1, driftPerCup: 0, beanSd: 0.05 },
  { name: 'vlak oordeel', slope: 3, noiseSd: 0.7, asymmetry: 1, driftPerCup: 0, beanSd: 0.05 },
  { name: 'scheef (sterk weegt zwaarder)', slope: 5, noiseSd: 0.7, asymmetry: 1.6, driftPerCup: 0, beanSd: 0.05 },
  { name: 'voorkeur drift', slope: 5, noiseSd: 0.7, asymmetry: 1, driftPerCup: 0.003, beanSd: 0.05 },
  { name: 'zakken verschillen veel', slope: 5, noiseSd: 0.7, asymmetry: 1, driftPerCup: 0, beanSd: 0.10 }
];

export interface Scenario {
  readonly bags: number;
  readonly cupsPerBag: number;
  readonly waterG: number;
  /** Ware voorkeur (TDS %) van deze proever. */
  readonly targetTds: number;
  readonly retention: number;
  readonly eyMean: number;
  readonly eyBeanSd: number;
  readonly eyCupSd: number;
}

/**
 * Voorkeur 1,17 % TDS: wat Engine 2 uit Jelles eigen 9 geproefde koppen schat (15,8 g op 300 ml;
 * massabalans met R 2,1 en EY 0,20). De gevoeligheid voor deze keuze staat in de meetopstelling.
 */
export const DEFAULT_SCENARIO: Scenario = {
  bags: 8, cupsPerBag: 10, waterG: 300, targetTds: 1.17, retention: 2.1, eyMean: 0.20, eyBeanSd: 0.01, eyCupSd: 0.005
};

export interface Bag { readonly beanId: string; readonly prefOffsetLn: number; readonly ey: number }

export function makeBags(sc: Scenario, w: World, r: () => number): Bag[] {
  return Array.from({ length: sc.bags }, (_, i) => ({
    beanId: `zak${i + 1}`,
    prefOffsetLn: gauss(r) * w.beanSd,
    ey: sc.eyMean + gauss(r) * sc.eyBeanSd
  }));
}

const CUTS = [-1.5, -0.5, 0.5, 1.5];

/** Eén kop: de werkelijke TDS en het oordeel van de proever. */
export function tasteCup(doseG: number, bag: Bag, cupIndex: number, sc: Scenario, w: World, r: () => number): { tds: number; trueTargetLn: number; answer: StrengthOrd } {
  const cupEy = bag.ey + gauss(r) * sc.eyCupSd;
  const tds = massBalanceTds(g(doseG), g(sc.waterG), sc.retention, ey(cupEy)) ?? 0.01;
  const trueTargetLn = Math.log(sc.targetTds) + bag.prefOffsetLn + w.driftPerCup * cupIndex;
  const d = Math.log(tds) - trueTargetLn;
  const latent = w.slope * d * (d > 0 ? w.asymmetry : 1) + gauss(r) * w.noiseSd;
  let k = 0;
  while (k < CUTS.length && latent > (CUTS[k] as number)) k++;
  return { tds, trueTargetLn, answer: (k - 2) as StrengthOrd };
}

/**
 * Doorlooptijd na de laatste giet (s) bij een klik, volgens het molenmodel uit punt 4:
 * 78 s bij klik 16, ×0,886 per klik grover, ln-ruis 0,167 per kop en een zakniveau.
 */
export function drainAfterLastPourSec(click: number, beanDrainOffsetLn: number, r: () => number): number {
  return 78 * Math.exp(beanDrainOffsetLn + Math.log(0.886) * (click - 16) + gauss(r) * 0.167);
}
