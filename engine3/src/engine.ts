// Engine 3 · stap 8 · samenstellen.
//
// learn() maakt van het logboek feiten; plan() zet de modules in volgorde achter elkaar:
//   techniek → water uit de kopgrootte → sterkte (dosis) → recept → molen (klik, einde) → proef.
// Alles is zuiver: dezelfde feiten en vraag geven altijd hetzelfde advies. Geen klok (de tijd zit in
// de vraag), geen toeval, geen opslag, geen netwerk.

import { DOSE_LIMITS } from './data/brewer.ts';
import { TECHNIQUE_BY_ID } from './data/techniques.ts';
import { grindPlan, type GrindPlan } from './grind.ts';
import { buildRecipe, referenceRatio } from './recipe.ts';
import { factsOf, learnFacts } from './state.ts';
import { strengthPlan, type StrengthPlan } from './strength.ts';
import { chooseTechnique, trialProposalFor, type TechniqueChoice } from './technique.ts';
import type { Advice, Engine, EngineEvent, EngineState, Goal, PlanRequest, Reason, RoastLevel } from './types.ts';
import type { Band, Clicks, Grams, Seconds, TdsPct } from './units.ts';

export const ENGINE3_VERSION = 'e3-2026.1';

/** De eerste giet van Kasuya volgt het gekozen doel (R-13 in de huidige app); Gota: zoeter 40 + 80, helderder 80 + 40. */
const GOAL_SHARE: Readonly<Record<Goal, number | null>> = { bright: 0.667, balanced: null, rich: 0.333 };

const reason = (module: Reason['module'], code: string, text: string): Reason => ({ module, code, text });
const f1 = (n: number): string => (Math.round(n * 10) / 10).toString().replace('.', ',');

function strengthReasons(sp: StrengthPlan): Reason[] {
  const out: Reason[] = [];
  if (sp.n === 0) {
    out.push(reason('strength', 'strength.start', `Nog geen geproefde koppen: startdosis ${f1(sp.baseDoseG)} g (verhouding 1:${f1(sp.baseRatio)} van de techniek).`));
    return out;
  }
  const steps = sp.last ? sp.last.steps : 0;
  if (steps > 0) out.push(reason('strength', 'strength.step_up', `Je laatste kop vroeg om sterker: de dosis gaat omhoog naar ${f1(sp.doseG)} g.`));
  else if (steps < 0) out.push(reason('strength', 'strength.step_down', `Je laatste kop vroeg om lichter: de dosis gaat omlaag naar ${f1(sp.doseG)} g.`));
  else if (sp.mode === 'rust') out.push(reason('strength', 'strength.rest', `Je zit op je doel (${f1(sp.targetTds)} % TDS): dosis ${f1(sp.doseG)} g.`));
  else out.push(reason('strength', 'strength.hold', `Nog niet genoeg bewijs om te schuiven: dosis ${f1(sp.doseG)} g.`));
  if (sp.bean.applies) out.push(reason('strength', 'strength.bean_offset', 'Deze zak proefde consequent anders dan je gemiddelde; daar is rekening mee gehouden.'));
  if (sp.calibration) out.push(reason('strength', 'strength.calibration_pair', `Nog onzeker over je voorkeur: een blind paar met ${sp.calibration.pct} % verschil in dosis zou het scherper maken.`));
  return out;
}

function grindReasons(gp: GrindPlan): Reason[] {
  const out: Reason[] = [];
  if (gp.advice) {
    const a = gp.advice;
    out.push(reason('grind_time', a.code === 'too_slow' ? 'grind_time.coarser' : 'grind_time.finer',
      a.code === 'too_slow'
        ? `Het einde komt waarschijnlijk te laat (verwacht ${Math.round(gp.predictedEnd.mid)} s): ${Math.abs(a.delta)} klik${Math.abs(a.delta) === 1 ? '' : 'ken'} grover (klik ${a.click}).`
        : `Het einde komt waarschijnlijk te vroeg (verwacht ${Math.round(gp.predictedEnd.mid)} s): ${Math.abs(a.delta)} klik${Math.abs(a.delta) === 1 ? '' : 'ken'} fijner (klik ${a.click}).`));
  } else out.push(reason('grind_time', 'grind_time.keep', `Klik ${gp.currentClick} blijft: verwacht einde ${Math.round(gp.predictedEnd.mid)} s.`));
  return out;
}

export function plan(state: EngineState, request: PlanRequest): Advice {
  const facts = factsOf(state);
  if (!(request.cupG > 0)) throw new Error('cupG moet groter dan 0 zijn');
  const warnings: string[] = [];
  const reasons: Reason[] = [];

  // 1. Techniek
  const choice: TechniqueChoice = chooseTechnique(facts, {
    beanId: request.beanId, method: request.method, cupG: request.cupG, technique: request.technique,
    ...(request.feedback ? { feedback: request.feedback } : {})
  });
  const technique = choice.technique;
  reasons.push(...choice.reasons);
  const def = TECHNIQUE_BY_ID.get(technique)!;
  if (def.reference.pours === null) throw new Error(`${def.name} heeft geen gietschema in de bron`);
  const bean = request.beanId ? facts.beans.get(request.beanId) : undefined;
  const roast: RoastLevel | null = bean?.fields.roastLevel ?? null;

  // Het aandeel van de eerste giet volgt het gekozen doel; anders de regel.
  let share = choice.kasuyaFirstPourShare;
  if (technique === 'kasuya_46' && request.goal !== null && GOAL_SHARE[request.goal] !== null) {
    share = GOAL_SHARE[request.goal];
    reasons.push(reason('recipe', 'recipe.goal_share', request.goal === 'bright' ? 'Doel helder en fris: een grotere eerste giet.' : 'Doel rond en vol: een kleinere eerste giet.'));
  }

  // 2. Water en dosis: de kop is water − (vasthouden − extractie) × dosis. Iteratief, want de dosis hangt van het water af.
  const ratio0 = referenceRatio(technique);
  let water = Math.round(request.cupG + 1.9 * (request.cupG / ratio0));
  let sp: StrengthPlan | null = null;
  for (let i = 0; i < 8; i++) {
    sp = strengthPlan(facts, { method: request.method, waterG: water, beanId: request.beanId, baselineDoseG: water / ratio0 });
    if (!sp) throw new Error('kon geen sterkte bepalen');
    const next = Math.round(request.cupG + (sp.retention.value - sp.ey) * sp.doseG);
    if (next === water) break;
    water = next;
  }
  const strength = sp!;
  let dose = strength.doseG;
  const limits = DOSE_LIMITS[request.method];
  if (limits && (dose < limits.min || dose > limits.max)) {
    const clamped = Math.min(limits.max, Math.max(limits.min, dose));
    warnings.push(`De gewenste dosis (${f1(dose)} g) ligt buiten het bereik van de brewer (${limits.min}–${limits.max} g); het recept gebruikt ${f1(clamped)} g.`);
    dose = clamped;
  }
  reasons.push(...strengthReasons(strength));

  // 3. Molen: kies de klik voor het gewenste einde en voorspel het einde.
  const provisional = buildRecipe({ technique, method: request.method, doseG: dose, waterG: water, roast, ...(share === null ? {} : { kasuyaFirstPourShare: share }) });
  const lastPourAt = provisional.recipe.pours[provisional.recipe.pours.length - 1]!.atSec;
  const srcBand = provisional.recipe.expectedEndSec;
  const gp = srcBand
    ? grindPlan(facts, { method: request.method, technique, beanId: request.beanId, waterG: water, doseG: dose, lastPourAtSec: lastPourAt, targetEnd: srcBand })
    : null;
  const click = gp ? (gp.advice ? gp.advice.click : gp.currentClick) : null;
  if (gp) { reasons.push(...grindReasons(gp)); warnings.push(...gp.warnings); }

  // 4. Recept met alles erin
  const built = buildRecipe({
    technique, method: request.method, doseG: dose, waterG: water, roast,
    ...(share === null ? {} : { kasuyaFirstPourShare: share }),
    ...(click === null ? {} : { grindClick: click as Clicks })
  });
  let recipe = built.recipe;
  warnings.push(...built.warnings);
  const endBand: Band<Seconds> | null = gp && gp.nTechnique > 0 ? (gp.advice ? gp.advice.predictedEnd : gp.predictedEnd) as Band<Seconds> : null;
  if (endBand) recipe = { ...recipe, expectedEndSec: endBand };
  if (built.tempSource) reasons.push(reason('recipe', 'recipe.temperature', `Temperatuur ${recipe.tempC} °C: ${built.tempSource}.`));

  // 5. Proef
  const trial = trialProposalFor(choice, { doseG: dose, waterG: water, method: request.method, roast, ...(click === null ? {} : { grindClick: click }) });

  const doseBand: Band<Grams> | null = strength.band
    ? { lo: (water / strength.band.highRatio) as Grams, mid: dose as Grams, hi: (water / strength.band.lowRatio) as Grams } : null;
  return {
    engine: { name: 'engine3', version: ENGINE3_VERSION },
    recipe,
    reasons,
    uncertainty: {
      targetTds: strength.tdsBand ? { lo: strength.tdsBand.lo as TdsPct, mid: strength.tdsBand.mid as TdsPct, hi: strength.tdsBand.hi as TdsPct } : null,
      doseG: doseBand,
      endSec: endBand ?? recipe.expectedEndSec
    },
    trial,
    warnings
  };
}

export function createEngine(): Engine {
  return {
    stamp: { name: 'engine3', version: ENGINE3_VERSION },
    learn: (events: readonly EngineEvent[]): EngineState => learnFacts(events),
    plan
  };
}
