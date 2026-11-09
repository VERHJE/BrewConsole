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
  /** Korte smaakregel voor in de lijst (eigen notitie, anders herkende notities en oordeel), of null. */
  readonly taste: string | null;
}

const STRENGTH_SHORT: Readonly<Record<string, string>> = { '-2': 'veel te slap', '-1': 'iets slap', '0': 'precies goed', '1': 'iets sterk', '2': 'veel te sterk' };
const ACIDITY_SHORT: Readonly<Record<string, string>> = { flat: 'vlak', lively: 'levendig', sharp: 'scherp' };
const FINISH_SHORT: Readonly<Record<string, string>> = { sweet_clean: 'zoet en schoon', bitter: 'bitter', drying: 'droog in de mond', hollow: 'hol' };

/**
 * Eén korte regel over hoe de kop was, zodat een rij meer zegt dan alleen sterren: je eigen notitie als je die schreef,
 * anders de notities die je herkende, plus sterkte, zuur en afdronk. Null als er niets te zeggen valt.
 */
export function tasteLine(t: CupFacts['tasting']): string | null {
  if (!t) return null;
  const note = t.note.trim().replace(/\s+/g, ' ');
  if (note) return note.length > 60 ? note.slice(0, 57).trimEnd() + '…' : note;
  const hits = t.noteHits.filter(h => h.hit === 'yes').map(h => h.note);
  const parts = [
    hits.length ? `herkend: ${hits.slice(0, 3).join(', ')}` : null,
    t.strength !== null ? STRENGTH_SHORT[String(t.strength)] ?? null : null,
    t.acidity ? ACIDITY_SHORT[t.acidity] ?? null : null,
    t.finish[0] ? FINISH_SHORT[t.finish[0]] ?? null : null
  ].filter((x): x is string => !!x);
  if (parts.length === 0) return null;
  const text = parts.join(' · ');
  return text.charAt(0).toUpperCase() + text.slice(1);
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
      strength: c.tasting?.strength ?? null, liking: c.tasting?.liking ?? null, tasted: c.tasting !== null, taste: tasteLine(c.tasting)
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
