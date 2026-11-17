// Engine 3 · strategieën die de meetopstelling kan vergelijken. Een strategie kiest per kop een
// dosis en hoort daarna het oordeel.

import { learnFacts } from '../src/state.ts';
import { strengthPlan } from '../src/strength.ts';
import { buildRecipe } from '../src/recipe.ts';
import type { EngineEvent, StrengthOrd } from '../src/types.ts';
import type { EpochMs } from '../src/units.ts';

export interface CupContext { readonly beanId: string; readonly waterG: number; readonly cupIndex: number; readonly at: number }
export interface Strategy {
  readonly name: string;
  reset(): void;
  dose(ctx: CupContext): number;
  observe(ctx: CupContext, doseG: number, answer: StrengthOrd): void;
}

/**
 * Het basisrecept van de oude app (V60, medium, klassiek, washed): de startdosis van iedereen. Vastgelegd op 17 nov 2026 uit
 * computeRecipe van brewconsole_v2_2.html, vlak voordat die app uit de repo ging. De meetopstelling gebruikt alleen 300 g water.
 * Engine 2 (de lerende strategie van de oude app) is daarmee uit de meetopstelling verdwenen; zijn opgeslagen uitkomsten staan in
 * baseline-e2.json (besluit Jelle, 17 nov 2026).
 */
const BASE_DOSE_G: Readonly<Record<number, number>> = { 300: 18.8 };
export async function baseRecipe(waterG: number): Promise<{ dose: number; water: number }> {
  const dose = BASE_DOSE_G[waterG];
  if (dose === undefined) throw new Error(`geen vastgelegd basisrecept voor ${waterG} g water (alleen ${Object.keys(BASE_DOSE_G).join(', ')} g)`);
  return { dose, water: waterG };
}

/** Geen leren: altijd het basisrecept. Laat zien wat leren oplevert. */
export async function staticStrategy(waterG: number): Promise<Strategy> {
  const base = await baseRecipe(waterG);
  return { name: 'vast recept (geen leren)', reset() {}, dose: () => base.dose, observe() {} };
}

/** Bovengrens: kent de ware voorkeur (kan in het echt niet). Alleen ter vergelijking. */
export function oracleStrategy(doseForTarget: (ctx: CupContext) => number): Strategy {
  return { name: 'orakel (kent de voorkeur)', reset() {}, dose: doseForTarget, observe() {} };
}

/** Engine 3, sterktemodule: dezelfde gebeurtenissen die de app straks schrijft, via learn en strengthPlan. */
export async function engine3StrengthStrategy(waterG: number): Promise<Strategy> {
  const base = await baseRecipe(waterG);
  let events: EngineEvent[] = [];
  let seq = 0;
  const seenBeans = new Set<string>();
  return {
    name: 'Engine 3 (sterkte)',
    reset() { events = []; seq = 0; seenBeans.clear(); },
    dose(ctx) {
      const plan = strengthPlan(learnFacts(events), { method: 'v60', waterG: ctx.waterG, beanId: ctx.beanId, baselineDoseG: base.dose });
      return plan && plan.doseG > 0 ? plan.doseG : base.dose;
    },
    observe(ctx, doseG, answer) {
      const at = ctx.at as EpochMs;
      const brewId = `sim_${seq++}`;
      if (!seenBeans.has(ctx.beanId)) {
        seenBeans.add(ctx.beanId);
        events.push({ id: `bean_${ctx.beanId}`, at, device: 'sim', v: 1, kind: 'bean.upsert', data: { beanId: ctx.beanId, fields: { name: ctx.beanId }, sources: {}, legacy: null } });
      }
      const { recipe } = buildRecipe({ technique: 'kasuya_46', method: 'v60', doseG, waterG: ctx.waterG });
      events.push({ id: `${brewId}:plan`, at, device: 'sim', v: 1, kind: 'brew.plan', data: { brewId, beanId: ctx.beanId, goal: null, engine: { name: 'sim', version: '1' }, recipe, trialId: null, legacy: null } });
      events.push({ id: `${brewId}:tasting`, at: (at + 1) as EpochMs, device: 'sim', v: 1, kind: 'tasting', data: {
        brewId, minutesAfter: null, late: false, strength: answer, acidity: null, finish: [], liking: null, goalHit: null, vsLast: null, missed: null, cata: [], noteHits: [], legacyScores: null, note: '' } });
    }
  };
}
