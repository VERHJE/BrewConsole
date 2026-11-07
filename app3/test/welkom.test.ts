import test from 'node:test';
import assert from 'node:assert/strict';
import { WELKOM_KEY, markeerWelkomGezien, toonWelkom, welkomGezien } from '../src/core/welkom.ts';

test('welkom: alleen bij een lege app die nog niet is weggeklikt', () => {
  assert.equal(toonWelkom(0, false), true);
  assert.equal(toonWelkom(0, true), false);
  assert.equal(toonWelkom(3, false), false);
});

test('welkom: onthouden, en kapotte of ontbrekende opslag geeft geen fout', () => {
  const mem = new Map<string, string>();
  const s = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } };
  assert.equal(welkomGezien(s), false);
  markeerWelkomGezien(s);
  assert.equal(mem.get(WELKOM_KEY), '1');
  assert.equal(welkomGezien(s), true);
  const kapot = { getItem: () => { throw new Error('geblokkeerd'); }, setItem: () => { throw new Error('geblokkeerd'); } };
  assert.equal(welkomGezien(kapot), false);
  assert.doesNotThrow(() => markeerWelkomGezien(kapot));
});
