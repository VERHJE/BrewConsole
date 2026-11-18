// Stand van de synchronisatie voor Meer en Gegevens: verbonden, laatste keer, laatste automatische poging mislukt.
// Leest opnieuw na elke (automatische) synchronisatie (review 17 nov 2026, W1/W3).
import { useEffect, useState } from 'preact/hooks';
import { indexedDbSyncStorage } from '../core/sync.ts';
import { useApp } from './store-context.tsx';

export interface SyncInfo { readonly connected: boolean; readonly lastSyncAt: number | null; readonly failed: boolean; readonly loaded: boolean }

export function useSyncInfo(): SyncInfo {
  const { sync } = useApp();
  const [info, setInfo] = useState<SyncInfo>({ connected: false, lastSyncAt: null, failed: false, loaded: false });
  const [tick, setTick] = useState(0);
  useEffect(() => sync?.auto.subscribe(() => setTick(t => t + 1)), [sync]);
  useEffect(() => {
    let dead = false;
    void (async () => {
      try {
        const st = sync?.deps.storage ?? await indexedDbSyncStorage();
        const v = st ? await st.load() : null;
        const s = sync?.auto.status();
        const failed = !!(s && s.auto && !s.outcome.ok && s.outcome.kind !== 'not_connected');
        if (!dead) setInfo({ connected: !!v, lastSyncAt: v?.settings.lastSyncAt ?? null, failed, loaded: true });
      } catch { if (!dead) setInfo(i => ({ ...i, loaded: true })); }
    })();
    return () => { dead = true; };
  }, [sync, tick]);
  return info;
}
