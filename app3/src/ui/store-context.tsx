import { createContext } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import type { Engine } from '../../../engine3/src/index.ts';
import type { Env } from '../core/ids.ts';
import type { Snapshot, Store } from '../core/store.ts';
import { bagPalette, type PhotoStore } from '../core/photos.ts';
import type { PhotoSyncRun } from '../core/photosync.ts';
import type { JSX } from 'preact';

export interface AppContext { readonly store: Store; readonly engine: Engine; readonly env: Env; readonly photos: PhotoStore; /** Foto's meesynchroniseren (alleen in de echte app). */ readonly photoSync?: PhotoSyncRun }

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

/** De foto van een zak als object-URL (of null). `bump` ververst na wijzigen. */
export function usePhoto(beanId: string | null, bump = 0): string | null {
  const { photos } = useApp();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let dead = false; let made: string | null = null;
    setUrl(null);
    if (beanId) void photos.get(beanId).then(b => { if (!dead && b) { made = URL.createObjectURL(b); setUrl(made); } }).catch(() => { /* geen foto */ });
    return () => { dead = true; if (made) URL.revokeObjectURL(made); };
  }, [photos, beanId, bump]);
  return url;
}

/** Foto of, zonder foto, een getekende zak in kleuren die bij de naam passen. */
export function BagArt({ beanId, name, bump = 0, large = false }: { beanId: string; name: string; bump?: number; large?: boolean }): JSX.Element {
  const url = usePhoto(beanId, bump);
  if (url) return <img class={large ? 'bagart photo large' : 'bagart photo'} src={url} alt="" />;
  const { hue, hue2 } = bagPalette(name);
  const a = `hsl(${hue} 38% 38%)`; const b = `hsl(${hue2} 42% 26%)`;
  return (
    <svg class={large ? 'bagart large' : 'bagart'} viewBox="-30 0 160 120" style={`background:${b}`} aria-hidden="true" focusable="false">
      <rect x="-30" width="160" height="120" fill={b} />
      <path d="M26 30h48l6 12v62a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6V42z" fill={a} />
      <path d="M26 30h48l6 12H20z" fill="rgb(255 255 255 / .18)" />
      <rect x="34" y="62" width="32" height="26" rx="3" fill="rgb(255 255 255 / .88)" />
      <path d="M50 66c5 4 5 12 0 18-5-6-5-14 0-18z" fill={b} />
    </svg>
  );
}
