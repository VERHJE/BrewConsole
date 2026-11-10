import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEME_COLOR, TYPE_KEY, applyPrefs, readType, savePref } from '../src/core/prefs.ts';

const mem = (init: Record<string, string> = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };
const el = () => { const a = new Map<string, string>(); return { a, setAttribute: (k: string, v: string) => { a.set(k, v); }, removeAttribute: (k: string) => { a.delete(k); } }; };

test('standaard: koppen met schreef; onbekende waarden vallen terug', () => {
  assert.equal(readType(mem()), 'serif');
  assert.equal(readType(mem({ [TYPE_KEY]: 'comic' })), 'serif');
  assert.equal(readType(null), 'serif');
  assert.equal(readType({ getItem: () => { throw new Error('geblokkeerd'); }, setItem: () => {} }), 'serif');
});

test('opslaan en lezen; opslag die faalt breekt niets', () => {
  const s = mem(); savePref(s, TYPE_KEY, 'sans');
  assert.equal(readType(s), 'sans');
  assert.doesNotThrow(() => savePref({ getItem: () => null, setItem: () => { throw new Error('vol'); } }, TYPE_KEY, 'sans'));
});

test('toepassen: het attribuut alleen bij een bewuste keuze', () => {
  const e = el();
  applyPrefs(e, 'sans'); assert.equal(e.a.get('data-type'), 'sans');
  applyPrefs(e, 'serif'); assert.equal(e.a.has('data-type'), false);
});

test('de statusbalk heeft de kleur van de achtergrond van het thema', () => {
  assert.equal(THEME_COLOR, '#13201a');
});
