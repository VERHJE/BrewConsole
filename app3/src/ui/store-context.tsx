import { createContext } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import type { Engine } from '../../../engine3/src/index.ts';
import type { Env } from '../core/ids.ts';
import type { Snapshot, Store } from '../core/store.ts';

export interface AppContext { readonly store: Store; readonly engine: Engine; readonly env: Env }

export const Ctx = createContext<AppContext | null>(null);

export function useApp(): AppContext {
  const c = useContext(Ctx);
  if (!c) throw new Error('geen AppContext');
  return c;
}

export function useSnapshot(): Snapshot {
  const { store } = useApp();
  const [snap, setSnap] = useState(store.snapshot());
  useEffect(() => store.subscribe(setSnap), [store]);
  return snap;
}
