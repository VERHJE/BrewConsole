import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEME_KEY, TYPE_KEY, applyPrefs, readTheme, readType, savePref, themeColor } from '../src/core/prefs.ts';

const mem = (init: Record<string, string> = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };
const el = () => { const a = new Map<string, string>(); return { a, setAttribute: (k: string, v: string) => { a.set(k, v); }, removeAttribute: (k: string) => { a.delete(k); } }; };

test('standaard: volg toestel, koppen met schreef; onbekende waarden vallen terug', () => {
  assert.equal(readTheme(mem()), 'system'); assert.equal(readType(mem()), 'serif');
  assert.equal(readTheme(mem({ [THEME_KEY]: 'neon' })), 'system');
  assert.equal(readType(mem({ [TYPE_KEY]: 'comic' })), 'serif');
  assert.equal(readTheme(null), 'system');
  assert.equal(readTheme({ getItem: () => { throw new Error('geblokkeerd'); }, setItem: () => {} }), 'system');
});

test('opslaan en lezen; opslag die faalt breekt niets', () => {
  const s = mem(); savePref(s, THEME_KEY, 'dark'); savePref(s, TYPE_KEY, 'sans');
  assert.equal(readTheme(s), 'dark'); assert.equal(readType(s), 'sans');
  assert.doesNotThrow(() => savePref({ getItem: () => null, setItem: () => { throw new Error('vol'); } }, THEME_KEY, 'dark'));
});

test('toepassen: attributen alleen bij een bewuste keuze', () => {
  const e = el();
  applyPrefs(e, 'dark', 'sans'); assert.equal(e.a.get('data-theme'), 'dark'); assert.equal(e.a.get('data-type'), 'sans');
  applyPrefs(e, 'system', 'serif'); assert.equal(e.a.has('data-theme'), false); assert.equal(e.a.has('data-type'), false);
  applyPrefs(e, 'light', 'serif'); assert.equal(e.a.get('data-theme'), 'light');
});

test('themakleur volgt de gekozen of de systeemkleur', () => {
  assert.equal(themeColor('dark', false), '#120e0a'); assert.equal(themeColor('light', true), '#f4efe4');
  assert.equal(themeColor('system', true), '#120e0a'); assert.equal(themeColor('system', false), '#f4efe4');
});
