// Proeven (A tegen B): twee koppen met hetzelfde water en dezelfde dosis, daarna kiezen welke je liever drinkt.
// De engine stelt de proef voor (Advice.trial); hier worden de twee koppen gezet en de uitkomst vastgelegd als pair.trial.

import {
  factsOf, ms,
  type Advice, type BrewPlanEvent, type CupFacts, type EngineState, type PairArm, type PairTrialEvent
} from '../../../engine3/src/index.ts';
import { brewPlanEvent, type BrewForm } from './brew.ts';
import { newId, type Env } from './ids.ts';

export type TrialArm = 'control' | 'variant';

/** brew.plan voor één kant van de voorgestelde proef; het recept komt ongewijzigd uit het voorstel. */
export function trialPlanEvent(env: Env, advice: Advice, form: BrewForm, arm: TrialArm): BrewPlanEvent {
  const trial = advice.trial;
  if (!trial) throw new Error('dit advies bevat geen proef');
  const base = brewPlanEvent(env, advice, form);
  return { ...base, data: { ...base.data, recipe: trial[arm], trialId: trial.id } };
}

export interface PendingTrial {
  readonly trialId: string;
  readonly control: CupFacts;
  readonly variant: CupFacts;
}

/** De proef waar dit zetsel bij hoort, als beide koppen geproefd zijn en de keuze nog niet is vastgelegd. */
export function pendingTrialFor(state: EngineState, brewId: string): PendingTrial | null {
  const facts = factsOf(state);
  const cup = facts.cups.get(brewId);
  if (!cup?.trialId || facts.trials.has(cup.trialId)) return null;
  const trialId = cup.trialId;
  const cups = [...facts.cups.values()].filter(c => c.trialId === trialId && c.tasting !== null && c.status !== 'abandoned');
  // Opbouw van het id (engine): tech:<zak-id>:<variant>:<n>. Een zak-id kan zelf ':' bevatten, dus van achteren lezen.
  const parts = trialId.split(':');
  const variantTech = parts[parts.length - 2];
  const variant = cups.find(c => c.technique === variantTech);
  const control = cups.find(c => c !== variant && c.technique !== variantTech);
  return variant && control ? { trialId, control, variant } : null;
}

export function pairTrialEvent(env: Env, p: PendingTrial, preferred: PairArm | 'none', brighter: PairArm | 'none' | null): PairTrialEvent {
  const side = (c: CupFacts) => ({ doseG: c.doseG, technique: c.technique, grindClick: c.grindClick });
  return {
    id: newId(env, 'ev'), at: ms(env.now()), device: env.device, v: 1, kind: 'pair.trial',
    data: {
      trialId: p.trialId, beanId: p.control.beanId, method: p.control.method, waterG: p.control.waterG, kind: 'technique',
      control: side(p.control), variant: side(p.variant), preferred, brighter
    }
  };
}
