import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, CUP_LIMITS, TECHNIQUES, fitsMethod, ms, g } from '../src/index.ts';

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
