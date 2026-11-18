import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAutoSync, AUTO_SYNC_DEFAULTS, type AutoSyncDeps } from '../src/core/autosync.ts';
import type { SyncOutcome } from '../src/core/sync.ts';

// Review 17 nov 2026, W1: automatisch synchroniseren. Een nagebootste klok en timers; `run` telt en kan wachten.
function rig(outcomes: SyncOutcome[] = []) {
  let t = 1_000_000; let rev = 0; let next = 1;
  const timers = new Map<number, { at: number; f: () => void }>();
  const calls: number[] = [];
  let gate: (() => void) | null = null;
  let hold = false;
  const OK: SyncOutcome = { ok: true, pushed: 0, fetched: 0, added: 0 };
  const deps: AutoSyncDeps = {
    run: async () => {
      calls.push(t);
      if (hold) await new Promise<void>(r => { gate = r; });
      return outcomes.shift() ?? OK;
    },
    revision: () => rev,
    now: () => t,
    setTimer: (f, ms) => { const id = next++; timers.set(id, { at: t + ms, f }); return id; },
    clearTimer: h => { timers.delete(h as number); }
  };
  const a = createAutoSync(deps);
  const flush = async (): Promise<void> => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
  const advance = async (ms: number): Promise<void> => {
    t += ms;
    for (const [id, x] of [...timers]) if (x.at <= t) { timers.delete(id); x.f(); }
    await flush();
  };
  return {
    a, calls, flush, advance,
    change: () => { rev++; a.changed(); },
    hold: (v: boolean) => { hold = v; },
    release: async () => { const g = gate; gate = null; g?.(); await flush(); },
    pendingTimers: () => timers.size
  };
}

test('bij openen synchroniseert de app meteen; daarna bij terugkomen pas na 5 minuten', async () => {
  const r = rig();
  r.a.wake(); await r.flush();
  assert.equal(r.calls.length, 1);
  await r.advance(60_000); r.a.wake(); await r.flush();
  assert.equal(r.calls.length, 1, 'na 1 minuut niet opnieuw');
  await r.advance(AUTO_SYNC_DEFAULTS.minGapMs); r.a.wake(); await r.flush();
  assert.equal(r.calls.length, 2, 'na 5 minuten wel');
});

test('na een reeks wijzigingen één synchronisatie, 15 s na de laatste', async () => {
  const r = rig();
  r.a.wake(); await r.flush();
  r.change(); await r.advance(5_000); r.change(); await r.advance(5_000); r.change();
  await r.advance(14_000);
  assert.equal(r.calls.length, 1, 'nog binnen de rustpauze');
  await r.advance(1_000);
  assert.equal(r.calls.length, 2);
  await r.advance(60_000);
  assert.equal(r.calls.length, 2, 'niets meer te doen');
});

test('wat de synchronisatie zelf binnenhaalt, start geen nieuwe synchronisatie', async () => {
  const r = rig();
  r.hold(true);
  r.a.wake(); await r.flush();
  r.a.changed(); // de samenvoeging: het scherm verandert, de eigen revisie niet
  await r.release();
  r.a.changed();
  await r.advance(60_000);
  assert.equal(r.calls.length, 1);
  assert.equal(r.pendingTimers(), 0);
});

test('nooit twee tegelijk: de knop wacht op een lopende automatische synchronisatie', async () => {
  const r = rig();
  r.hold(true);
  r.a.wake(); await r.flush();
  assert.equal(r.calls.length, 1);
  const manual = r.a.exclusive();
  await r.flush();
  assert.equal(r.calls.length, 1, 'de knop start pas als de eerste klaar is');
  r.hold(false);
  await r.release();
  const o = await manual;
  assert.equal(o.ok, true);
  assert.equal(r.calls.length, 2);
  assert.equal(r.a.status()?.auto, false, 'de laatste poging was met de hand');
});

test('een eigen wijziging tijdens het synchroniseren gaat er daarna alsnog achteraan', async () => {
  const r = rig();
  r.hold(true);
  r.a.wake(); await r.flush();
  r.change(); // eigen wijziging terwijl er gesynchroniseerd wordt: die zat niet in wat er verstuurd werd
  r.hold(false);
  await r.release();
  assert.equal(r.calls.length, 1);
  await r.advance(AUTO_SYNC_DEFAULTS.afterChangeMs);
  assert.equal(r.calls.length, 2, 'de wijziging gaat er alsnog achteraan');
  await r.advance(60_000);
  assert.equal(r.calls.length, 2);
});

test('zonder verbinding: bij terugkomen na 1 minuut opnieuw proberen, en de wijziging blijft staan tot het lukt', async () => {
  const offline: SyncOutcome = { ok: false, kind: 'offline', message: 'Geen verbinding.' };
  const r = rig([offline, offline]);
  r.a.wake(); await r.flush();
  r.change(); await r.advance(AUTO_SYNC_DEFAULTS.afterChangeMs);
  assert.equal(r.calls.length, 2);
  assert.equal(r.a.status()?.outcome.ok, false);
  await r.advance(30_000); r.a.wake(); await r.flush();
  assert.equal(r.calls.length, 2, 'niet binnen een minuut opnieuw');
  await r.advance(30_000); r.a.wake(); await r.flush();
  assert.equal(r.calls.length, 3, 'na een minuut wel');
  assert.equal(r.a.status()?.outcome.ok, true);
  await r.advance(60_000); r.a.wake(); await r.flush();
  assert.equal(r.calls.length, 3, 'gelukt en niets nieuw: weer de gewone 5 minuten');
});

test('niet ingesteld: één goedkope poging per wijziging, geen herhaling', async () => {
  const off: SyncOutcome = { ok: false, kind: 'not_connected', message: 'Synchronisatie staat niet aan.' };
  const r = rig([off, off, off]);
  r.a.wake(); await r.flush();
  r.change(); await r.advance(AUTO_SYNC_DEFAULTS.afterChangeMs);
  await r.advance(10 * 60_000);
  assert.equal(r.calls.length, 2);
  assert.equal(r.pendingTimers(), 0);
});

test('een fout in run wordt een uitkomst, geen onafgehandelde fout', async () => {
  const r = rig();
  const a = createAutoSync({ run: async () => { throw new Error('kapot'); }, revision: () => 0, now: () => 0, setTimer: () => 0, clearTimer: () => {} });
  const o = await a.exclusive();
  assert.equal(o.ok, false);
  assert.equal(a.status()?.outcome.ok, false);
  void r;
});
