// Engine 3 · eigen zetsels opnieuw afspelen (alleen lokaal; de back-up gaat nooit in de repo).
//
//   node engine3/eval/replay-local.ts pad/naar/brew-console-backup.json
//
// Per geproefde kop: wat had de strategie geadviseerd met alleen de koppen dáárvóór, en klopt de
// richting met het oordeel? Bijvoorbeeld: je zette 17 g en vond het 'te sterk'; adviseerde de
// strategie minder dan 17 g, dan wees het advies de goede kant op.
// Uitvoer: alleen tellingen, geen namen of notities.

import { readFileSync } from 'node:fs';
import { migrateBackupV3 } from '../src/migrate/v3.ts';
import { learnFacts } from '../src/state.ts';
import { strengthPlan } from '../src/strength.ts';
import { createEngine } from '../src/engine.ts';
import type { EpochMs, Grams } from '../src/units.ts';

type Rec = { id: string; createdAt: number; lifecycle: string; beanId: string | null; deletedAt: unknown; plan?: { methodId?: string; waterMl?: number; doseG?: number }; actual?: { doseG?: number | null }; tasting?: { strength?: string; late?: boolean } | null };
type Api = {
  computeRecipe: (...a: unknown[]) => { dose: number; water: number };
  engine2PlanFor: (base: unknown, method: string, store: unknown[], opts: Record<string, unknown>) => { doseG: number } | null;
};

const ORD: Record<string, number> = { much_too_weak: -2, too_weak: -1, just_right: 0, too_strong: 1, much_too_strong: 2 };

async function main(): Promise<void> {
  const file = process.argv[2];
  if (!file) { console.error('gebruik: node engine3/eval/replay-local.ts <back-up.json>'); process.exit(2); }
  const backup = JSON.parse(readFileSync(file, 'utf8')) as { brews?: Rec[] };
  const { loadApp } = await import('../../tests/load-app.mjs');
  const api = loadApp().api as unknown as Api;
  const brews = (backup.brews ?? []).filter(r => !r.deletedAt && r.lifecycle !== 'abandoned').sort((a, b) => a.createdAt - b.createdAt);
  const events = migrateBackupV3(backup as never).events;
  const engine = createEngine();
  const tally = { judged: 0, right: 0, wrong: 0, neutral: 0, absDiff: 0 };
  const e3 = { ...tally }, e3full = { ...tally };
  const count = (t: typeof tally, ord: number, dose: number, advised: number): void => {
    t.judged++;
    const diff = advised - dose;
    t.absDiff += Math.abs(diff);
    if (ord === 0 || Math.abs(diff) < 0.2) t.neutral++;
    else if ((ord > 0 && diff < 0) || (ord < 0 && diff > 0)) t.right++;
    else t.wrong++;
  };
  let judged = 0, right = 0, wrong = 0, neutral = 0, absDiff = 0;
  for (let i = 0; i < brews.length; i++) {
    const r = brews[i]!;
    const ord = r.tasting && r.tasting.strength ? ORD[r.tasting.strength] : undefined;
    const method = r.plan?.methodId, water = r.plan?.waterMl, dose = r.actual?.doseG ?? r.plan?.doseG;
    if (ord === undefined || !method || !water || !dose) continue;
    const base = api.computeRecipe(method, 'medium', 'klassiek', water, 'washed', false, 10, null, false, false, null, 0, 30);
    const advised = api.engine2PlanFor(base, method, brews.slice(0, i), { beanId: r.beanId })?.doseG;
    if (!(advised && advised > 0)) continue;
    // Engine 3 met alleen de koppen vóór deze kop: sterktemodule met hetzelfde basisrecept, en het volledige plan() bij dezelfde kopgrootte.
    const before = events.filter(e => e.at < (r.createdAt as number));
    const facts = learnFacts(before);
    const sp = strengthPlan(facts, { method: method as 'v60' | 'chemex', waterG: water, beanId: r.beanId, baselineDoseG: base.dose });
    if (sp) count(e3, ord, dose, sp.doseG);
    const ad = engine.plan(engine.learn(before), { at: r.createdAt as EpochMs, beanId: r.beanId, method: method as 'v60' | 'chemex', cupG: Math.max(1, water - 38) as Grams, goal: null, technique: null });
    count(e3full, ord, dose, ad.recipe.waterG === water ? ad.recipe.doseG : ad.recipe.doseG * (water / ad.recipe.waterG));
    judged++;
    const diff = advised - dose;
    absDiff += Math.abs(diff);
    if (ord === 0 || Math.abs(diff) < 0.2) neutral++;
    else if ((ord > 0 && diff < 0) || (ord < 0 && diff > 0)) right++;
    else wrong++;
  }
  console.log(`Engine 2 op eigen koppen: ${judged} geproefde koppen met een sterkte-oordeel`);
  console.log(`  advies wees de goede kant op: ${right}, de verkeerde kant: ${wrong}, geen richting (goed of < 0,2 g verschil): ${neutral}`);
  console.log(`  gemiddeld verschil tussen advies en gezette dosis: ${judged ? (absDiff / judged).toFixed(2) : '–'} g`);
  const show = (name: string, t: typeof tally): void => {
    console.log(`${name}: ${t.judged} koppen · goede kant ${t.right} · verkeerde kant ${t.wrong} · geen richting ${t.neutral} · gemiddeld verschil ${t.judged ? (t.absDiff / t.judged).toFixed(2) : '–'} g`);
  };
  show('Engine 3 sterkte (zelfde basisrecept)', e3);
  show('Engine 3 volledig plan (dosis omgerekend naar dezelfde waterhoeveelheid)', e3full);
}

main().catch(e => { console.error(e); process.exit(1); });
