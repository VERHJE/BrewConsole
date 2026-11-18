import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, CUP_LIMITS, DOSE_LIMITS, TECHNIQUES, fitsMethod, ms, g } from '../src/index.ts';

// Audit 10 nov 2026, P1-01: binnen de kopgrenzen mag de dosis nooit zo ver afgekapt worden dat de verhouding onbruikbaar wordt.
test('kopgrenzen: elke toegestane kop en techniek geeft een verhouding tussen 1:13 en 1:18 (zonder eigen gegevens)', () => {
  const e = createEngine(); const st = e.learn([]);
  for (const method of ['v60', 'chemex'] as const) {
    const { min, max } = CUP_LIMITS[method];
    for (const t of [null, ...TECHNIQUES.filter(x => fitsMethod(x, method) && x.reference.pours !== null).map(x => x.id)]) {
      for (let c = min; c <= max; c += 10) {
        const r = e.plan(st, { at: ms(1.79e12), beanId: null, method, cupG: g(c), goal: null, technique: t }).recipe;
        const ratio = r.waterG / r.doseG;
        assert.ok(ratio >= 13 && ratio <= 18, `${method} ${t ?? 'auto'} ${c} g: 1:${ratio.toFixed(1)}`);
      }
    }
  }
});

test('kopgrenzen: de standaardkeuze kapt de dosis binnen de grenzen niet af', () => {
  const e = createEngine(); const st = e.learn([]);
  for (const method of ['v60', 'chemex'] as const) {
    const { min, max } = CUP_LIMITS[method];
    for (let c = min; c <= max; c += 10) {
      const a = e.plan(st, { at: ms(1.79e12), beanId: null, method, cupG: g(c), goal: null, technique: null });
      assert.equal(a.warnings.some(w => w.includes('bereik van de brewer')), false, `${method} ${c} g`);
    }
  }
});

test('Chemex boven de portiegrens: de uitleg noemt dat de dosis kan dalen (audit P2-01, keuze a)', () => {
  const e = createEngine(); const st = e.learn([]);
  const a = e.plan(st, { at: ms(1.79e12), beanId: null, method: 'chemex', cupG: g(450), goal: null, technique: null });
  assert.ok(a.reasons.some(r => r.text.includes('portiegrens')), a.reasons.map(r => r.text).join(' | '));
});

// Review 17 nov 2026, R1 (besluit Jelle): de V60-grens is het bereik van de doses in de eigen V60-recepten, zoals bij de Chemex.
test('V60: de dosisgrens is de laagste en hoogste dosis in de V60-recepten (15 en 32,5 g); de kop mag tot 420 g', () => {
  const doses = TECHNIQUES.filter(t => fitsMethod(t, 'v60') && !fitsMethod(t, 'chemex')).map(t => t.reference.doseG);
  assert.equal(DOSE_LIMITS.v60!.min, Math.min(...doses));
  assert.equal(DOSE_LIMITS.v60!.max, Math.max(...doses));
  assert.equal(DOSE_LIMITS.v60!.max, 32.5);
  assert.equal(CUP_LIMITS.v60.max, 420);
});

test('V60 boven de grens: de melding noemt het bereik met een komma (15–32,5 g)', () => {
  const e = createEngine(); const st = e.learn([]);
  const a = e.plan(st, { at: ms(1.79e12), beanId: null, method: 'v60', cupG: g(500), goal: null, technique: null });
  const w = a.warnings.find(x => x.includes('bereik van de brewer'));
  assert.match(w ?? '', /\(15–32,5 g\); het recept gebruikt 32,5 g/);
  assert.equal(a.recipe.doseG, 32.5);
});

// Besluit Jelle 18 nov 2026 (review 17 nov): bij een grote enkele giet op de V60 een waarschuwing, het recept blijft zoals de bron.
test('V60: waarschuwing bij een giet boven 240 g die groter is dan in de eigen bron; Wendelboe (300 g in de bron) en de standaard niet', () => {
  const e = createEngine(); const st = e.learn([]);
  const big = (t: string | null, c: number) => e.plan(st, { at: ms(1.79e12), beanId: null, method: 'v60', cupG: g(c), goal: null, technique: t as never }).warnings.find(w => w.startsWith('Grote giet'));
  assert.match(big('hedrick_one_and_done', 420) ?? '', /^Grote giet \(289 g in één keer\): in de V60 02 kan het water tot de rand komen/);
  assert.equal(big('hedrick_one_and_done', 280), undefined);
  assert.equal(big('wendelboe', 420), undefined, 'Wendelboe giet in de eigen bron 300 g in één keer (over 2 tot 2,5 minuut)');
  for (const c of [200, 300, 420]) assert.equal(big(null, c), undefined, `standaardkeuze ${c} g`);
  for (const t of TECHNIQUES.filter(x => fitsMethod(x, 'v60') && !fitsMethod(x, 'chemex') && x.reference.pours !== null && x.id !== 'hedrick_one_and_done'))
    assert.equal(big(t.id, 420), undefined, `${t.id} bij 420 g`);
});
