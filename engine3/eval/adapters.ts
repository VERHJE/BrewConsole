// Engine 3 · strategieën die de meetopstelling kan vergelijken. Een strategie kiest per kop een
// dosis en hoort daarna het oordeel. Engine 3 krijgt straks een adapter van hetzelfde type.

import type { StrengthOrd } from '../src/types.ts';

export interface CupContext { readonly beanId: string; readonly waterG: number; readonly cupIndex: number; readonly at: number }
export interface Strategy {
  readonly name: string;
  reset(): void;
  dose(ctx: CupContext): number;
  observe(ctx: CupContext, doseG: number, answer: StrengthOrd): void;
}

type AppApi = {
  computeRecipe: (...args: unknown[]) => { dose: number; water: number };
  engine2PlanFor: (base: unknown, method: string, store: unknown[], opts: Record<string, unknown>) => { doseG: number } | null;
};

let cached: AppApi | null = null;
async function appApi(): Promise<AppApi> {
  if (cached) return cached;
  const mod = await import('../../tests/load-app.mjs');
  cached = mod.loadApp().api as unknown as AppApi;
  return cached;
}

const ANSWER: Record<string, string> = { '-2': 'much_too_weak', '-1': 'too_weak', '0': 'just_right', '1': 'too_strong', '2': 'much_too_strong' };

/** Het basisrecept van de huidige app (V60, medium, klassiek, washed): de startdosis van iedereen. */
export async function baseRecipe(waterG: number): Promise<{ dose: number; water: number }> {
  const api = await appApi();
  return api.computeRecipe('v60', 'medium', 'klassiek', waterG, 'washed', false, 10, null, false, false, null, 0, 30);
}

/** Geen leren: altijd het basisrecept. Laat zien wat leren oplevert. */
export async function staticStrategy(waterG: number): Promise<Strategy> {
  const base = await baseRecipe(waterG);
  return { name: 'vast recept (geen leren)', reset() {}, dose: () => base.dose, observe() {} };
}

/** Engine 2 (e2-2026.5) zoals de app hem gebruikt, via zijn eigen code. */
export async function engine2Strategy(waterG: number): Promise<Strategy> {
  const api = await appApi();
  const base = await baseRecipe(waterG);
  let store: unknown[] = [];
  return {
    name: 'Engine 2 (e2-2026.5)',
    reset() { store = []; },
    dose(ctx) {
      const p = api.engine2PlanFor(base, 'v60', store, { beanId: ctx.beanId });
      return p && p.doseG > 0 ? p.doseG : base.dose;
    },
    observe(ctx, doseG, answer) {
      store.push({
        id: `sim_${store.length}`, createdAt: ctx.at, lifecycle: 'logged', beanId: ctx.beanId, deletedAt: null,
        plan: { methodId: 'v60', waterMl: ctx.waterG, doseG, technique: 'Kasuya 4:6', expectedDrainEndSec: 210, bypass: null, inputs: null },
        actual: { doseG, bedDrySec: 240, grindClick: 16 },
        tasting: { strength: ANSWER[String(answer)], late: false, acidity: 'lively', finish: [] }
      });
    }
  };
}

/** Bovengrens: kent de ware voorkeur (kan in het echt niet). Alleen ter vergelijking. */
export function oracleStrategy(doseForTarget: (ctx: CupContext) => number): Strategy {
  return { name: 'orakel (kent de voorkeur)', reset() {}, dose: doseForTarget, observe() {} };
}
