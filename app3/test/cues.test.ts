import test from 'node:test';
import assert from 'node:assert/strict';
import { CUE_SOUND_KEY, CUE_VIBRATE_KEY, CUE_VIBRATION, cueFor, readCuePrefs, saveCuePref, type CueState } from '../src/core/cues.ts';

const st = (o: Partial<CueState> = {}): CueState => ({ status: 'running', phaseKey: 'go,upcoming,upcoming', kind: 'pour', remainingSec: 20, ...o });

test('cueFor: eerste keer kijken, starten en hervatten geven geen signaal', () => {
  assert.equal(cueFor(null, st()), null);
  assert.equal(cueFor(st({ status: 'ready' }), st()), null);
  assert.equal(cueFor(st({ status: 'paused' }), st({ phaseKey: 'go,go,upcoming' })), null);
  assert.equal(cueFor(st(), st({ status: 'paused' })), null);
});

test('cueFor: een nieuwe giet is "pour", wachten op doorlopen is "hold", klaar is "done"', () => {
  assert.equal(cueFor(st(), st({ phaseKey: 'go,go,upcoming', remainingSec: 44 })), 'pour');
  assert.equal(cueFor(st(), st({ phaseKey: 'go,hold,upcoming', kind: 'hold', remainingSec: null })), 'hold');
  assert.equal(cueFor(st(), st({ status: 'complete', kind: 'done' })), 'done');
  assert.equal(cueFor(st({ status: 'complete', kind: 'done' }), st({ status: 'complete', kind: 'done' })), null, 'maar één keer');
});

test('cueFor: een tik per seconde in de laatste drie, niet vaker, niet te vroeg, niet bij onbekende tijd', () => {
  assert.equal(cueFor(st({ remainingSec: 3.4 }), st({ remainingSec: 2.9 })), 'tick');
  assert.equal(cueFor(st({ remainingSec: 2.9 }), st({ remainingSec: 2.5 })), null, 'zelfde seconde');
  assert.equal(cueFor(st({ remainingSec: 4.2 }), st({ remainingSec: 3.9 })), null, 'nog 4 seconden: nog niet');
  assert.equal(cueFor(st({ remainingSec: 1.2 }), st({ remainingSec: 0.8 })), 'tick');
  assert.equal(cueFor(st({ remainingSec: 1.2 }), st({ remainingSec: 0 })), null, 'op nul begint de giet zelf');
  assert.equal(cueFor(st({ remainingSec: null }), st({ remainingSec: null })), null);
  assert.equal(cueFor(st({ kind: 'wait', remainingSec: 3.4 }), st({ kind: 'wait', remainingSec: 2.9 })), 'tick');
  assert.equal(cueFor(st({ kind: 'drain', remainingSec: 3.4 }), st({ kind: 'drain', remainingSec: 2.9 })), null, 'de laatste giet heeft geen volgende');
});

test('voorkeuren: standaard aan, uit blijft uit, kapotte opslag geeft de standaard', () => {
  const mem = new Map<string, string>();
  const s = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } };
  assert.deepEqual(readCuePrefs(s), { sound: true, vibrate: true });
  saveCuePref(s, CUE_SOUND_KEY, false);
  assert.deepEqual(readCuePrefs(s), { sound: false, vibrate: true });
  saveCuePref(s, CUE_VIBRATE_KEY, false);
  assert.deepEqual(readCuePrefs(s), { sound: false, vibrate: false });
  assert.deepEqual(readCuePrefs({ getItem: () => { throw new Error('x'); } }), { sound: true, vibrate: true });
  assert.deepEqual(readCuePrefs(null), { sound: true, vibrate: true });
  assert.equal(CUE_VIBRATION.tick.length, 0, 'een tik trilt niet');
});
