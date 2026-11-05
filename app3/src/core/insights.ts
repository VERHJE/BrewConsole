// Logboek en inzicht: alleen lezen uit de feiten van de engine. Er wordt hier niets zelf gerekend wat de engine ook kan.

import {
  ms, factsOf, tasteProfile, beanFit, fitGrind, perClickEffect, tailObservationsOf,
  type BeanFit, type BrewDeleteEvent, type CupFacts, type EngineState, type SensitivityStatus, type TasteProfile
} from '../../../engine3/src/index.ts';
import { newId, type Env } from './ids.ts';

export interface CupRow {
  readonly id: string;
  readonly at: number;
  readonly beanName: string | null;
  readonly technique: string;
  readonly doseG: number;
  readonly waterG: number;
  readonly click: number | null;
  readonly endSec: number | null;
  readonly status: CupFacts['status'];
  readonly strength: number | null;
  readonly liking: number | null;
  readonly tasted: boolean;
}

export function cupRows(state: EngineState, beanId: string | null = null): CupRow[] {
  const facts = factsOf(state);
  const rows: CupRow[] = [];
  for (const id of facts.cupOrder) {
    const c = facts.cups.get(id)!;
    if (beanId !== null && c.beanId !== beanId) continue;
    rows.push({
      id: c.brewId, at: c.at, beanName: c.beanId ? facts.beans.get(c.beanId)?.fields.name ?? null : null, technique: c.technique,
      doseG: c.doseG, waterG: c.waterG, click: c.grindClick, endSec: c.endSec, status: c.status,
      strength: c.tasting?.strength ?? null, liking: c.tasting?.liking ?? null, tasted: c.tasting !== null
    });
  }
  return rows.reverse();
}

export function brewDeleteEvent(env: Env, brewId: string): BrewDeleteEvent {
  return { id: newId(env, 'ev'), at: ms(env.now()), device: env.device, v: 1, kind: 'brew.delete', data: { brewId } };
}

export const STATUS_TEXT: Readonly<Record<SensitivityStatus, string>> = {
  picks_up: 'Je merkt dit op', misses: 'Je mist dit vaak', overcalls: 'Je vinkt dit vaak aan terwijl de zak het niet noemt', mixed: 'Wisselend', unknown: 'Nog te weinig zakken om iets te zeggen'
};

export function profileOf(state: EngineState): TasteProfile { return tasteProfile(factsOf(state)); }

export function fitOf(state: EngineState, beanId: string): BeanFit {
  const facts = factsOf(state);
  return beanFit(facts, tasteProfile(facts), beanId);
}

export interface GrindView {
  /** Koppen met een bruikbare doorlooptijd van de laatste giet. */
  readonly observations: number;
  readonly pctPerClick: number;
  /** De molen is door eigen metingen geleerd (anders geldt de startwaarde). */
  readonly learned: boolean;
}

export function grindView(state: EngineState): GrindView {
  const obs = tailObservationsOf(factsOf(state));
  const eff = perClickEffect(fitGrind(obs, 'v60', 'kasuya_46', null));
  return { observations: obs.length, pctPerClick: eff.pctPerClick, learned: eff.learned };
}
