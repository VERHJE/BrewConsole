// Automatisch synchroniseren (review 17 nov 2026, W1). Tot dan gebeurde het alleen met de knop "Nu synchroniseren".
//
// Wanneer:
//   - bij openen van de app: altijd;
//   - bij terugkomen in de app (`wake`): als er nog iets niet verstuurd is, of als de vorige keer lang genoeg geleden is;
//   - kort na een wijziging in het logboek (`changed`): na een rustpauze, zodat een reeks wijzigingen één keer synchroniseert.
// Er loopt nooit meer dan één synchronisatie tegelijk: ook de knop en het verbinden gaan hierdoor (`exclusive`). Wijzigingen
// die de synchronisatie zelf binnenhaalt, starten geen nieuwe (die tellen niet mee in Snapshot.localRevision). Zonder ingestelde synchronisatie kost een poging alleen het
// lezen van de instellingen. Zuiver: klok en timers komen van buiten, zodat de tests de tijd kunnen sturen.

import type { SyncOutcome } from './sync.ts';

export interface AutoSyncDeps {
  /** Eén synchronisatie (syncNow); geeft `not_connected` als synchronisatie niet is ingesteld. */
  readonly run: () => Promise<SyncOutcome>;
  /** Teller van eigen wijzigingen in het logboek (Snapshot.localRevision): wat de synchronisatie binnenhaalt telt niet mee. */
  readonly revision: () => number;
  readonly now: () => number;
  readonly setTimer: (f: () => void, ms: number) => unknown;
  readonly clearTimer: (handle: unknown) => void;
}

export interface AutoSyncOptions {
  /** Rustpauze na de laatste wijziging. */
  readonly afterChangeMs: number;
  /** Bij terugkomen in de app: niet vaker dan dit, als alles al verstuurd is. */
  readonly minGapMs: number;
  /** Na een mislukte poging (geen verbinding, serverfout): niet eerder opnieuw bij terugkomen. */
  readonly retryGapMs: number;
}

/** Aannames, geen metingen: ruim binnen het gratis plan van Cloudflare (1.000 schrijfacties per dag, zie docs/engine3/08). */
export const AUTO_SYNC_DEFAULTS: AutoSyncOptions = { afterChangeMs: 15_000, minGapMs: 5 * 60_000, retryGapMs: 60_000 };

export interface AutoSyncStatus { readonly at: number; readonly outcome: SyncOutcome; readonly auto: boolean }

export interface AutoSync {
  /** Bij openen en bij terugkomen in de app. */
  wake(): void;
  /** Na een wijziging in het logboek. */
  changed(): void;
  /** Voert `f` uit (standaard: synchroniseren) zodra er niets anders loopt; voor de knop en het verbinden. */
  exclusive(f?: () => Promise<SyncOutcome>): Promise<SyncOutcome>;
  /** De laatste poging (automatisch of met de hand), of null. */
  status(): AutoSyncStatus | null;
  subscribe(listener: (s: AutoSyncStatus) => void): () => void;
  /** Stopt de wachtende timer (tests, afsluiten). */
  stop(): void;
}

export function createAutoSync(d: AutoSyncDeps, o: AutoSyncOptions = AUTO_SYNC_DEFAULTS): AutoSync {
  let running: Promise<SyncOutcome> | null = null;
  let timer: unknown = null;
  let synced: number | null = null; // eigen revisie bij het begin van de laatste geslaagde (of niet ingestelde) poging
  let last: AutoSyncStatus | null = null;
  const listeners = new Set<(s: AutoSyncStatus) => void>();

  const clear = (): void => { if (timer !== null) { d.clearTimer(timer); timer = null; } };
  const dirty = (): boolean => synced === null || d.revision() !== synced;

  const start = (f: () => Promise<SyncOutcome>, auto: boolean): Promise<SyncOutcome> => {
    clear();
    const p = (async (): Promise<SyncOutcome> => {
      // De stand bij het begin: een eigen wijziging tijdens het synchroniseren is niet verstuurd en gaat er daarna achteraan.
      const r0 = d.revision();
      let outcome: SyncOutcome;
      try { outcome = await f(); } catch (e) { outcome = { ok: false, kind: 'server', message: (e as Error).message }; }
      // Niet ingesteld telt als "niets te doen": anders zou elke wijziging een nieuwe poging plannen.
      if (outcome.ok || outcome.kind === 'not_connected') synced = r0;
      last = { at: d.now(), outcome, auto };
      for (const l of listeners) l(last);
      return outcome;
    })();
    running = p;
    void p.finally(() => {
      running = null;
      if (dirty() && last && (last.outcome.ok || last.outcome.kind === 'not_connected')) schedule(); // wijziging tijdens het synchroniseren
    });
    return p;
  };

  const schedule = (): void => { clear(); timer = d.setTimer(() => { timer = null; if (!running) void start(d.run, true); else schedule(); }, o.afterChangeMs); };

  return {
    wake() {
      if (running) return;
      const gap = last === null ? 0 : (last.outcome.ok || last.outcome.kind === 'not_connected') ? o.minGapMs : o.retryGapMs;
      const due = last === null || d.now() - last.at >= gap;
      if (due || (dirty() && last !== null && last.outcome.ok)) void start(d.run, true);
    },
    changed() {
      if (running) return; // afgehandeld als de lopende synchronisatie klaar is
      if (dirty()) schedule();
    },
    async exclusive(f = d.run) {
      while (running) await running.catch(() => undefined);
      return start(f, false);
    },
    status: () => last,
    subscribe(l) { listeners.add(l); return () => { listeners.delete(l); }; },
    stop: clear
  };
}
